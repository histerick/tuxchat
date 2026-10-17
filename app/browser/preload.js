"use strict";

/* global document */

function injectScript() {
  const script = document.createElement("script");
  script.textContent = `
    function abrirChatComMensagem(numero, mensagem = "") {
        // 1. Limpa o número mantendo apenas os dígitos
        let numeroLimpo = String(numero).replace(/\\D/g, '');
        if ((numeroLimpo.length === 10 || numeroLimpo.length === 11) && !numeroLimpo.startsWith('55')) {
            numeroLimpo = '55' + numeroLimpo;
        }

        // 2. Codifica a mensagem para formato de URL (substitui espaços por %20, etc.)
        const mensagemCodificada = encodeURIComponent(mensagem || '');

        // 3. Constrói o link interno contendo o número e o texto
        const linkInvisivel = document.createElement('a');
        linkInvisivel.setAttribute('href', \`https://web.whatsapp.com/send?phone=\${numeroLimpo}&text=\${mensagemCodificada}\`);
        linkInvisivel.setAttribute('style', 'display:none;');
        document.body.appendChild(linkInvisivel);

        // 4. Dispara o clique interno para o aplicativo carregar a conversa e o texto
        linkInvisivel.click();

        // 5. Remove o elemento temporário do HTML
        document.body.removeChild(linkInvisivel);

        console.log(\`%c[Sucesso] Abrindo chat para \${numeroLimpo} com mensagem pré-definida.\`, "color: #25D366; font-weight: bold;");
    }

    window.abrirChatComMensagem = abrirChatComMensagem;
  `;
  (document.head || document.documentElement).appendChild(script);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectScript);
} else {
  injectScript();
}
