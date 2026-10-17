"use strict";

const { ipcRenderer, webFrame } = require("electron");

function injectMainWorldScripts() {
  const code = `
    (function() {
      // Chat opener helper
      if (typeof window.abrirChatComMensagem !== 'function') {
        window.abrirChatComMensagem = function(numero, mensagem = "") {
          let numeroLimpo = String(numero).replace(/\\D/g, '');
          if ((numeroLimpo.length === 10 || numeroLimpo.length === 11) && !numeroLimpo.startsWith('55')) {
            numeroLimpo = '55' + numeroLimpo;
          }
          const mensagemCodificada = encodeURIComponent(mensagem || '');
          const linkInvisivel = document.createElement('a');
          linkInvisivel.setAttribute('href', 'https://web.whatsapp.com/send?phone=' + numeroLimpo + '&text=' + mensagemCodificada);
          linkInvisivel.setAttribute('style', 'display:none;');
          document.body.appendChild(linkInvisivel);
          linkInvisivel.click();
          document.body.removeChild(linkInvisivel);
        };
      }

      // TuxChat Audio Controller (intercepts HTMLMediaElement and AudioContext)
      if (window.__tuxchatAudioHooked) return;
      window.__tuxchatAudioHooked = true;

      window.__tuxchatInstanceVolume = typeof window.__tuxchatInstanceVolume === 'number' ? window.__tuxchatInstanceVolume : 1;
      window.__tuxchatInstanceMuted = Boolean(window.__tuxchatInstanceMuted);
      window.__tuxchatActiveAudioElements = window.__tuxchatActiveAudioElements || new Set();
      window.__tuxchatAudioContexts = window.__tuxchatAudioContexts || new Set();

      function getEffectiveFactor() {
        if (window.__tuxchatInstanceMuted) return 0;
        if (typeof window.__tuxchatInstanceVolume === 'number') {
          return Math.max(0, Math.min(1, window.__tuxchatInstanceVolume));
        }
        return 1;
      }

      // 1. Hook HTMLMediaElement.prototype.volume & muted
      const volDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume") || {};
      const origVolGet = volDesc.get;
      const origVolSet = volDesc.set;

      const mutedDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "muted") || {};
      const origMutedGet = mutedDesc.get;
      const origMutedSet = mutedDesc.set;

      window.__tuxchatOrigMedia = {
        origVolGet,
        origVolSet,
        origMutedGet,
        origMutedSet,
      };

      Object.defineProperty(HTMLMediaElement.prototype, "volume", {
        configurable: true,
        enumerable: true,
        get() {
          if (this.__tuxchatVirtualVolume !== undefined) {
            return this.__tuxchatVirtualVolume;
          }
          return origVolGet ? origVolGet.call(this) : 1;
        },
        set(val) {
          const num = Math.max(0, Math.min(1, Number(val) || 0));
          this.__tuxchatVirtualVolume = num;
          window.__tuxchatActiveAudioElements.add(this);
          const real = num * getEffectiveFactor();
          if (origVolSet) origVolSet.call(this, real);
        }
      });

      Object.defineProperty(HTMLMediaElement.prototype, "muted", {
        configurable: true,
        enumerable: true,
        get() {
          if (this.__tuxchatVirtualMuted !== undefined) {
            return this.__tuxchatVirtualMuted;
          }
          return origMutedGet ? origMutedGet.call(this) : false;
        },
        set(val) {
          const b = Boolean(val);
          this.__tuxchatVirtualMuted = b;
          window.__tuxchatActiveAudioElements.add(this);
          const real = b || window.__tuxchatInstanceMuted || getEffectiveFactor() === 0;
          if (origMutedSet) origMutedSet.call(this, real);
        }
      });

      const origPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function(...args) {
        window.__tuxchatActiveAudioElements.add(this);
        const v = this.__tuxchatVirtualVolume !== undefined ? this.__tuxchatVirtualVolume : 1;
        const real = v * getEffectiveFactor();
        if (origVolSet) {
          try { origVolSet.call(this, real); } catch(_) {}
        }
        if (origMutedSet && (window.__tuxchatInstanceMuted || getEffectiveFactor() === 0)) {
          try { origMutedSet.call(this, true); } catch(_) {}
        }
        return origPlay.apply(this, args);
      };

      // Hook window.Audio constructor
      const origAudio = window.Audio;
      if (typeof origAudio === 'function') {
        window.Audio = function(...args) {
          const el = new origAudio(...args);
          window.__tuxchatActiveAudioElements.add(el);
          const factor = getEffectiveFactor();
          if (origVolSet) {
            try { origVolSet.call(el, (el.__tuxchatVirtualVolume !== undefined ? el.__tuxchatVirtualVolume : 1) * factor); } catch(_) {}
          }
          return el;
        };
        window.Audio.prototype = origAudio.prototype;
      }

      // 2. Hook Web Audio API (AudioContext)
      const origConnect = AudioNode.prototype.connect;
      window.__tuxchatOrigConnect = origConnect;

      function hookContext(NativeContext) {
        if (!NativeContext) return NativeContext;
        const Wrapped = function(...args) {
          const ctx = new NativeContext(...args);
          window.__tuxchatAudioContexts.add(ctx);
          try {
            const masterGain = ctx.createGain();
            masterGain.gain.value = getEffectiveFactor();
            origConnect.call(masterGain, ctx.destination);
            ctx.__tuxchatMasterGain = masterGain;
          } catch (_) {}
          return ctx;
        };
        Wrapped.prototype = NativeContext.prototype;
        return Wrapped;
      }

      AudioNode.prototype.connect = function(destination, outputIndex, inputIndex) {
        if (destination && destination instanceof AudioDestinationNode) {
          const ctx = destination.context;
          if (ctx && ctx.__tuxchatMasterGain && this !== ctx.__tuxchatMasterGain) {
            return origConnect.call(this, ctx.__tuxchatMasterGain, outputIndex, inputIndex);
          }
        }
        return origConnect.apply(this, arguments);
      };

      if (window.AudioContext) window.AudioContext = hookContext(window.AudioContext);
      if (window.webkitAudioContext) window.webkitAudioContext = hookContext(window.webkitAudioContext);

      // 3. Global update function
      window.__tuxchatUpdateVolume = function(volPercent, isMuted) {
        window.__tuxchatInstanceVolume = Math.max(0, Math.min(1, (Number(volPercent) || 0) / 100));
        window.__tuxchatInstanceMuted = Boolean(isMuted);
        const factor = getEffectiveFactor();

        const curVolSet = window.__tuxchatOrigMedia?.origVolSet;
        const curMutedSet = window.__tuxchatOrigMedia?.origMutedSet;

        document.querySelectorAll('audio, video').forEach((el) => {
          window.__tuxchatActiveAudioElements.add(el);
        });

        for (const el of window.__tuxchatActiveAudioElements) {
          try {
            const v = el.__tuxchatVirtualVolume !== undefined ? el.__tuxchatVirtualVolume : 1;
            if (curVolSet) {
              curVolSet.call(el, v * factor);
            } else {
              el.volume = v * factor;
            }
            if (curMutedSet) {
              if (window.__tuxchatInstanceMuted || factor === 0) {
                curMutedSet.call(el, true);
              } else if (el.__tuxchatVirtualMuted !== undefined) {
                curMutedSet.call(el, el.__tuxchatVirtualMuted);
              } else {
                curMutedSet.call(el, false);
              }
            } else if (window.__tuxchatInstanceMuted || factor === 0) {
              el.muted = true;
            }
          } catch (_) {}
        }

        for (const ctx of window.__tuxchatAudioContexts) {
          try {
            if (ctx && ctx.__tuxchatMasterGain) {
              ctx.__tuxchatMasterGain.gain.value = factor;
              try {
                ctx.__tuxchatMasterGain.gain.setValueAtTime(factor, ctx.currentTime);
              } catch (_) {}
            }
          } catch (_) {}
        }
      };
    })();
  `;

  try {
    webFrame.executeJavaScript(code);
  } catch {
    // webFrame error during window closure
  }
}

// Inject immediately so audio is intercepted before WhatsApp scripts run
injectMainWorldScripts();

function extractUnreadCount() {
  try {
    // 1. WhatsApp Web navbar item for "Conversas" / "Chats"
    const chatBtn = document.querySelector(
      'button[data-navbar-item-index="0"], ' +
      'button[aria-label="Conversas"], ' +
      'button[aria-label="Chats"], ' +
      'button[aria-label="Chats "], ' +
      'button[aria-label="Conversaciones"], ' +
      'button[data-navbar-item="true"]',
    );
    if (chatBtn && chatBtn.parentElement) {
      const statusSpan = chatBtn.parentElement.querySelector('[role="status"]');
      if (statusSpan) {
        const text = statusSpan.textContent.trim();
        const num = parseInt(text, 10);
        if (!isNaN(num) && num > 0) return num;
        if (text && text.length > 0) return text;
      }
    }

    // 2. Check title attribute in SVG icon
    const chatTitleSvg = document.querySelector("svg title");
    if (
      chatTitleSvg &&
      chatTitleSvg.textContent &&
      chatTitleSvg.textContent.includes("chat")
    ) {
      const container = chatTitleSvg.closest("button")?.parentElement;
      if (container) {
        const statusSpan = container.querySelector('[role="status"]');
        if (statusSpan) {
          const num = parseInt(statusSpan.textContent.trim(), 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    }

    // 3. Fallback: document.title "(43) WhatsApp"
    if (document.title) {
      const match = document.title.match(/^\((\d+)\)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) return num;
      }
    }
  } catch {
    // DOM access error
  }
  return 0;
}

let lastSentUnreadCount = null;

function syncUnreadCount() {
  const currentCount = extractUnreadCount();
  if (currentCount !== lastSentUnreadCount) {
    lastSentUnreadCount = currentCount;
    try {
      ipcRenderer.send("session:unread-count", currentCount);
    } catch {
      // IPC send error during destruction
    }
  }
}

function initUnreadTracker() {
  syncUnreadCount();

  // Watch document.title mutations
  const titleEl = document.querySelector("title");
  if (titleEl) {
    const titleObs = new MutationObserver(() => syncUnreadCount());
    titleObs.observe(titleEl, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  // Watch body mutations (debounced)
  if (document.body) {
    let debounceTimer = null;
    const bodyObs = new MutationObserver(() => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        syncUnreadCount();
      }, 250);
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });
  }

  // Periodic heartbeat every 1s to guarantee real-time sync
  setInterval(syncUnreadCount, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    injectMainWorldScripts();
    initUnreadTracker();
  });
} else {
  injectMainWorldScripts();
  initUnreadTracker();
}
