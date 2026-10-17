"use strict";

const menusEl = document.getElementById("menus");
const titleEl = document.getElementById("title");
const sidebarEl = document.getElementById("sessions-sidebar");

let currentActiveId = "tuxchat";
let currentSessions = [];

let currentAddSessionLabel = "Add session";
let currentMutedLabel = "Mute audio";

function renderTitlebar({ title, bg, fg, menus, addSessionLabel, mutedLabel }) {
  document.documentElement.style.setProperty("--bg", bg);
  document.documentElement.style.setProperty("--fg", fg);
  if (title) {
    titleEl.textContent = title;
    document.title = title;
  }

  if (mutedLabel) {
    currentMutedLabel = mutedLabel;
  }

  if (addSessionLabel) {
    currentAddSessionLabel = addSessionLabel;
    const addBtn = document.querySelector(".add-session-btn");
    if (addBtn) addBtn.setAttribute("aria-label", addSessionLabel);
    const addTooltip =
      addBtn && addBtn.parentElement
        ? addBtn.parentElement.querySelector(".session-tooltip")
        : null;
    if (addTooltip) addTooltip.textContent = addSessionLabel;
  }

  menusEl.innerHTML = "";
  for (const { id, label } of menus) {
    const button = document.createElement("button");
    button.textContent = label;
    if (id !== "about") {
      button.setAttribute("aria-haspopup", "menu");
    }
    button.addEventListener("click", () => {
      const rect = button.getBoundingClientRect();
      window.titlebar.openMenu(
        id,
        Math.round(rect.left),
        Math.round(rect.bottom),
      );
    });
    menusEl.appendChild(button);
  }
}

// Crisp Plus Icon SVG for Add Session button
const PLUS_ICON_SVG = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
`;

function getInitials(name) {
  if (!name) return "S";
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (clean.slice(0, 2) || name.slice(0, 2) || "S").toUpperCase();
}

function getContrastColor(hexColor) {
  if (!hexColor) return "#1D1F1F";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#111b21" : "#ffffff";
}

function applySessionStyle(wrapper, session, isCurrent) {
  const sessionColor = session ? session.color : null;
  const btn = wrapper.querySelector(".session-btn");
  const pill = wrapper.querySelector(".session-pill");
  if (!btn) return;

  if (pill) {
    pill.style.backgroundColor = sessionColor && isCurrent ? sessionColor : "";
  }

  const hasAvatar = session && Boolean(session.avatar);
  if (hasAvatar) {
    if (sessionColor) {
      btn.style.border = isCurrent
        ? `2.5px solid ${sessionColor}`
        : `2px solid ${sessionColor}aa`;
      btn.style.boxShadow = isCurrent ? `0 4px 14px ${sessionColor}66` : "";
    } else {
      btn.style.border = "";
      btn.style.boxShadow = "";
    }
    btn.style.backgroundColor = "";
    btn.style.color = "";
  } else {
    if (sessionColor) {
      if (isCurrent) {
        btn.style.backgroundColor = sessionColor;
        btn.style.color = getContrastColor(sessionColor);
        btn.style.boxShadow = `0 4px 14px ${sessionColor}66`;
        btn.style.border = "";
      } else {
        btn.style.backgroundColor = "var(--item-bg)";
        btn.style.color = sessionColor;
        btn.style.border = `1.5px solid ${sessionColor}aa`;
        btn.style.boxShadow = "";
      }
    } else {
      btn.style.backgroundColor = "";
      btn.style.color = "";
      btn.style.border = "";
      btn.style.boxShadow = "";
    }
  }
}

function updateActiveSidebar() {
  const wrappers = sidebarEl.querySelectorAll(".session-wrapper");
  for (const w of wrappers) {
    const id = w.getAttribute("data-desktop-id");
    if (id) {
      const isCurrent = id === currentActiveId;
      w.classList.toggle("active", isCurrent);
      const s = currentSessions.find((item) => item.desktopId === id);
      applySessionStyle(w, s, isCurrent);
    }
  }

  const activeSession = currentSessions.find(
    (s) => s.desktopId === currentActiveId,
  );
  if (activeSession) {
    let name = activeSession.profileName || "";
    const m = /^TuxChat\s*\((.+)\)$/i.exec(name);
    if (m) {
      name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    }
    const titleText = name ? `TuxChat - ${name}` : "TuxChat";
    titleEl.textContent = titleText;
    document.title = titleText;
  }
}

let draggedDesktopId = null;

function buildSidebarDOM() {
  sidebarEl.innerHTML = "";

  // Render each session icon
  for (const session of currentSessions) {
    const isCurrent = session.desktopId === currentActiveId;
    const wrapper = document.createElement("div");
    wrapper.className = `session-wrapper${isCurrent ? " active" : ""}`;
    wrapper.setAttribute("data-desktop-id", session.desktopId);
    wrapper.setAttribute("draggable", "true");

    // Discord-style Pill Indicator
    const pill = document.createElement("div");
    pill.className = "session-pill";
    wrapper.appendChild(pill);

    // Discord-style Icon Button
    const btn = document.createElement("button");
    btn.className = "session-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", session.profileName);

    if (session.avatar) {
      const img = document.createElement("img");
      img.className = "session-avatar-img";
      img.src = session.avatar;
      img.alt = session.profileName;
      img.setAttribute("draggable", "false");
      btn.appendChild(img);
    } /* else if (session.desktopId === "tuxchat") {
      btn.innerHTML = WHATSAPP_ICON_SVG;
    }  */ else {
      btn.textContent = getInitials(session.profileName);
    }

    // Left-click switches session tab in the same window
    btn.addEventListener("click", () => {
      if (session.desktopId !== currentActiveId) {
        currentActiveId = session.desktopId;
        updateActiveSidebar();
        window.sessionsSidebar.switch(session.desktopId);
      }
    });

    // Right-click opens context menu to Edit / Delete
    const onContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.sessionsSidebar.showContextMenu(session.desktopId);
    };
    wrapper.addEventListener("contextmenu", onContextMenu);
    btn.addEventListener("contextmenu", onContextMenu);

    // Drag and drop reordering
    wrapper.addEventListener("dragstart", (e) => {
      draggedDesktopId = session.desktopId;
      document.body.classList.add("is-dragging");
      wrapper.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", session.desktopId);
    });

    wrapper.addEventListener("dragover", (e) => {
      if (!draggedDesktopId || draggedDesktopId === session.desktopId) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      for (const w of sidebarEl.querySelectorAll(".session-wrapper")) {
        if (w !== wrapper) {
          w.classList.remove("drag-over-top", "drag-over-bottom");
        }
      }

      const rect = wrapper.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const isTop = e.clientY < midY;
      wrapper.classList.toggle("drag-over-top", isTop);
      wrapper.classList.toggle("drag-over-bottom", !isTop);
    });

    wrapper.addEventListener("dragleave", (e) => {
      if (!wrapper.contains(e.relatedTarget)) {
        wrapper.classList.remove("drag-over-top", "drag-over-bottom");
      }
    });

    wrapper.addEventListener("drop", (e) => {
      if (!draggedDesktopId || draggedDesktopId === session.desktopId) {
        return;
      }
      e.preventDefault();
      const isTop = wrapper.classList.contains("drag-over-top");
      wrapper.classList.remove("drag-over-top", "drag-over-bottom");

      const fromIndex = currentSessions.findIndex(
        (s) => s.desktopId === draggedDesktopId,
      );
      const targetIndex = currentSessions.findIndex(
        (s) => s.desktopId === session.desktopId,
      );

      if (fromIndex !== -1 && targetIndex !== -1 && fromIndex !== targetIndex) {
        const newSessions = [...currentSessions];
        const [movedItem] = newSessions.splice(fromIndex, 1);
        let insertIndex = newSessions.findIndex(
          (s) => s.desktopId === session.desktopId,
        );
        if (!isTop) {
          insertIndex += 1;
        }
        newSessions.splice(insertIndex, 0, movedItem);
        currentSessions = newSessions;

        buildSidebarDOM();
        const orderedIds = currentSessions.map((s) => s.desktopId);
        window.sessionsSidebar.reorder(orderedIds);
      }
    });

    wrapper.addEventListener("dragend", () => {
      draggedDesktopId = null;
      document.body.classList.remove("is-dragging");
      for (const w of sidebarEl.querySelectorAll(".session-wrapper")) {
        w.classList.remove("dragging", "drag-over-top", "drag-over-bottom");
      }
    });

    wrapper.appendChild(btn);

    if (session.muted) {
      const mutedBadge = document.createElement("div");
      mutedBadge.className = "session-muted-badge";
      mutedBadge.title = currentMutedLabel || "Áudio mutado";
      mutedBadge.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      `;
      wrapper.appendChild(mutedBadge);
    }

    applySessionStyle(wrapper, session, isCurrent);

    // Floating Discord-style Tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "session-tooltip";
    tooltip.textContent = session.profileName;
    wrapper.appendChild(tooltip);

    sidebarEl.appendChild(wrapper);
  }

  // Divider
  const divider = document.createElement("div");
  divider.className = "sessions-divider";
  sidebarEl.appendChild(divider);

  // Add Session (+) Button
  const addWrapper = document.createElement("div");
  addWrapper.className = "session-wrapper";

  const addBtn = document.createElement("button");
  addBtn.className = "add-session-btn";
  addBtn.type = "button";
  addBtn.innerHTML = PLUS_ICON_SVG;
  addBtn.setAttribute("aria-label", currentAddSessionLabel || "Add session");
  addBtn.addEventListener("click", () => {
    window.sessionsSidebar.openAdd();
  });
  addWrapper.appendChild(addBtn);

  const addTooltip = document.createElement("div");
  addTooltip.className = "session-tooltip";
  addTooltip.textContent = currentAddSessionLabel || "Add session";
  addWrapper.appendChild(addTooltip);

  sidebarEl.appendChild(addWrapper);

  updateActiveSidebar();
}

async function renderSidebar() {
  if (!sidebarEl || !window.sessionsSidebar) return;
  if (draggedDesktopId) return;

  const [sessions, current] = await Promise.all([
    window.sessionsSidebar.list(),
    window.sessionsSidebar.current(),
  ]);

  currentSessions = sessions || [];
  if (current && current.desktopId) {
    currentActiveId = current.desktopId;
  }

  buildSidebarDOM();
}

if (sidebarEl) {
  sidebarEl.addEventListener("dragover", (e) => {
    if (!draggedDesktopId) return;
    const sessionWrappers = Array.from(
      sidebarEl.querySelectorAll(".session-wrapper[data-desktop-id]"),
    );
    if (sessionWrappers.length === 0) return;

    const firstWrapper = sessionWrappers[0];
    const firstRect = firstWrapper.getBoundingClientRect();
    if (e.clientY < firstRect.top && e.clientY > firstRect.top - 40) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      for (const w of sessionWrappers) {
        if (w !== firstWrapper) {
          w.classList.remove("drag-over-top", "drag-over-bottom");
        }
      }
      firstWrapper.classList.add("drag-over-top");
      firstWrapper.classList.remove("drag-over-bottom");
      return;
    }

    const lastWrapper = sessionWrappers[sessionWrappers.length - 1];
    const lastRect = lastWrapper.getBoundingClientRect();
    if (e.clientY > lastRect.bottom && e.clientY < lastRect.bottom + 60) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      for (const w of sessionWrappers) {
        if (w !== lastWrapper) {
          w.classList.remove("drag-over-top", "drag-over-bottom");
        }
      }
      lastWrapper.classList.add("drag-over-bottom");
      lastWrapper.classList.remove("drag-over-top");
    }
  });

  sidebarEl.addEventListener("drop", (e) => {
    if (!draggedDesktopId) return;
    const sessionWrappers = Array.from(
      sidebarEl.querySelectorAll(".session-wrapper[data-desktop-id]"),
    );
    if (sessionWrappers.length === 0) return;

    const firstWrapper = sessionWrappers[0];
    if (
      firstWrapper.classList.contains("drag-over-top") &&
      !e.defaultPrevented
    ) {
      e.preventDefault();
      firstWrapper.classList.remove("drag-over-top");
      const firstId = firstWrapper.getAttribute("data-desktop-id");
      if (draggedDesktopId !== firstId) {
        const fromIndex = currentSessions.findIndex(
          (s) => s.desktopId === draggedDesktopId,
        );
        if (fromIndex !== -1) {
          const newSessions = [...currentSessions];
          const [movedItem] = newSessions.splice(fromIndex, 1);
          newSessions.unshift(movedItem);
          currentSessions = newSessions;
          buildSidebarDOM();
          const orderedIds = currentSessions.map((s) => s.desktopId);
          window.sessionsSidebar.reorder(orderedIds);
        }
      }
      return;
    }

    const lastWrapper = sessionWrappers[sessionWrappers.length - 1];
    if (
      lastWrapper.classList.contains("drag-over-bottom") &&
      !e.defaultPrevented
    ) {
      e.preventDefault();
      lastWrapper.classList.remove("drag-over-bottom");
      const lastId = lastWrapper.getAttribute("data-desktop-id");
      if (draggedDesktopId !== lastId) {
        const fromIndex = currentSessions.findIndex(
          (s) => s.desktopId === draggedDesktopId,
        );
        if (fromIndex !== -1) {
          const newSessions = [...currentSessions];
          const [movedItem] = newSessions.splice(fromIndex, 1);
          newSessions.push(movedItem);
          currentSessions = newSessions;
          buildSidebarDOM();
          const orderedIds = currentSessions.map((s) => s.desktopId);
          window.sessionsSidebar.reorder(orderedIds);
        }
      }
    }
  });
}

/* ============================================================
   IPC EVENT LISTENERS
   ============================================================ */
window.titlebar.get().then(renderTitlebar);
window.titlebar.onState(renderTitlebar);

if (window.sessionsSidebar) {
  renderSidebar();

  window.sessionsSidebar.onChanged(() => {
    renderSidebar();
  });

  window.sessionsSidebar.onActiveChanged((id) => {
    currentActiveId = id;
    updateActiveSidebar();
  });

  window.sessionsSidebar.onFullscreen((isFullscreen) => {
    document.body.classList.toggle("fullscreen", isFullscreen);
  });
}
