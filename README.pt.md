# TuxChat

![License](https://img.shields.io/github/license/histerick/tuxchat)
![Latest release](https://img.shields.io/github/v/release/histerick/tuxchat)

[English](README.md) · [Español](README.es.md) · **Português (Brasil)**

Cliente desktop não-oficial para WhatsApp Web no Linux e Windows (Electron), com suporte completo a chamadas de voz e vídeo, compartilhamento de tela, múltiplas contas isoladas em abas integradas com barra lateral estilo Discord, personalização de cores independentes por sessão e suporte a links `whatsapp://` e `wa.me`.

---

## Recursos e Novidades

### 👥 Múltiplas Sessões Isoladas em Abas

- **Barra lateral estilo Discord**: gerencie até 6 contas do WhatsApp simultaneamente na mesma janela.
- **Arrastar para reordenar**: organize suas sessões arrastando os ícones para cima e para baixo livremente com pré-visualização fluida.
- **Identificação visual rápida**: foto de perfil personalizada (com recorte quadrado e compressão automática em WebP) ou iniciais automáticas com alto contraste.
- **Alternância instantânea**: troca fluida entre contas utilizando `WebContentsView` do Electron, mantendo o consumo de memória otimizado e conexões ativas.
- **Controle de áudio individual e mutar**: clique com botão direito na sessão para mutar seu som instantaneamente ou escolher o nível de volume individual (100%, 75%, 50%, 25%, 10%, Mudo). Sessões mutadas recebem um badge indicador de som.
- **Menu de contexto completo**: clique com o botão direito para editar nome/foto, alterar cor, ajustar volume, mutar ou excluir a sessão.

### 🎨 Cores de Sessão Independentes e Dinâmicas

- Cada sessão possui sua própria cor salva de forma independente na configuração.
- **Seletor de cor personalizado**: paleta com cores predefinidas e colorpicker hexadecimal para qualquer tonalidade customizada.
- **Barra lateral**:
  - Sessão inativa: ícone ou borda do avatar na cor definida.
  - Sessão ativa: preenchimento completo na cor da sessão com texto de alto contraste calculado automaticamente (YIQ), efeito de brilho (_glow_) e indicador lateral (_pill_).
- **Barra de título sincronizada**: ao alternar entre as abas de sessão, a barra superior atualiza sua tonalidade automaticamente para a cor da conta ativa.

### 🌐 Suporte a Múltiplos Idiomas

- Três idiomas completos suportados:
  - **Inglês (English)** — definido como padrão na instalação e primeiro uso.
  - **Espanhol (Español)**
  - **Português do Brasil (Português - Brasil)**
- Alterne o idioma a qualquer momento pelo menu **Arquivo > Idioma** / **File > Language**. Todas as barras, menus e caixas de diálogo são atualizados em tempo real e a preferência é salva.

### ℹ️ Janela "Sobre o TuxChat"

- Acesse via menu superior **Sobre > Sobre o TuxChat**.
- Exibe versão do aplicativo, runtime (Electron, Chromium, Node.js), arquitetura da plataforma e link direto para o repositório do projeto no GitHub.

### 🔗 Suporte a Links do WhatsApp (`whatsapp://` e `wa.me`)

- O TuxChat se registra no sistema operacional como aplicativo padrão para o protocolo `whatsapp://`.
- Links clicados em navegadores ou e-mails abrem diretamente a conversa na sessão ativa ou no seletor integrado de contas.
- **Seletor de conta com opção de ocultar**: escolha rapidamente qual sessão abrirá o link, selecione com duplo-clique ou Enter, e oculte sessões que não deseja que apareçam na lista de escolha.
- Sessão padrão configurável a qualquer momento em **Arquivo > Configurações > Links do WhatsApp...**.

### 💬 Links dentro de Conversas

- Links recebidos em conversas (Google Meet, Zoom, sites) abrem diretamente no seu navegador padrão em vez de popups internos.
- Menu de clique com botão direito permite copiar o link com facilidade.

---

## Instalação

Baixe o instalador na página de [Releases](https://github.com/histerick/tuxchat/releases):

- **Ubuntu/Debian (.deb):**
  ```bash
  sudo apt install ./tuxchat_<versao>_amd64.deb
  ```
  Ou abra com dois cliques no instalador gráfico de pacotes da sua distribuição.
- **Qualquer outra distribuição Linux (AppImage):**
  Torne o arquivo executável e execute diretamente. Não requer instalação nem dependência do `libfuse2`.
- **Windows:**
  Execute via terminal ou instalador compatível.

### Atualizações

- **AppImage:** atualiza silenciosamente em segundo plano, verificando novas versões na inicialização e a cada 4 horas. Na próxima inicialização, uma janela com as novidades da versão é apresentada.
- **.deb:** gerenciado pelo `apt` — baixe o novo pacote `.deb` nas versões lançadas.

---

## Desenvolvimento Local

Requisitos: Node.js (v20+ recomendado) e npm.

```bash
# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento com hot reload (nodemon)
npm run dev

# Executar aplicação diretamente com Electron
npm start

# Verificar estilo de código e lint
npm run lint

# Formatar código com Prettier
npm run format
```

---

## Licença

Distribuído sob a licença [MIT](LICENSE).
