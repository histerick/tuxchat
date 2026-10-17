# TuxChat

![License](https://img.shields.io/github/license/histerick/tuxchat)
![Latest release](https://img.shields.io/github/v/release/histerick/tuxchat)

[English](README.md) · **Español** · [Português](README.pt.md)

Cliente de escritorio no oficial de WhatsApp Web para Linux y Windows (Electron), con soporte completo de llamadas/videollamadas y compartir pantalla, múltiples cuentas aisladas en pestañas con barra lateral estilo Discord, personalización independiente de colores por sesión y soporte de enlaces `whatsapp://` y `wa.me`.

---

## Características y Novedades

### 👥 Múltiples Sesiones Aisladas en Pestañas

- **Barra lateral derecha estilo Discord**: administrá hasta 6 cuentas de WhatsApp simultáneamente en una sola ventana.
- **Arrastrar para reordenar**: ordená tus sesiones arrastrando los íconos hacia arriba o abajo libremente con respuesta visual fluida.
- **Identificación visual rápida**: foto de perfil personalizada (con recorte cuadrado y compresión automática en WebP) o iniciales dinámicas con alto contraste.
- **Cambio instantáneo**: alternancia fluida entre cuentas gracias a `WebContentsView` de Electron, manteniendo bajo el consumo de memoria y las conexiones activas.
- **Control de audio individual y silenciar**: hacé clic derecho en la sesión para silenciar su audio al instante o elegir el nivel de volumen individual (100%, 75%, 50%, 25%, 10%, Mudo). Las sesiones silenciadas muestran un distintivo visual.
- **Menú contextual completo**: hacé clic derecho para editar nombre/foto, cambiar color, ajustar volumen, silenciar o eliminar la sesión.

### 🎨 Colores de Sesión Independientes y Dinámicos

- Cada sesión guarda su propio color de manera independiente.
- **Selector de color personalizado**: paleta con colores predefinidos y selector hexadecimal para cualquier tono personalizado.
- **Barra lateral**:
  - Sesión inactiva: ícono o borde del avatar con el color configurado.
  - Sesión activa: relleno completo con el color de la sesión, texto de alto contraste calculado automáticamente (YIQ), efecto de resplandor (_glow_) e indicador lateral (_pill_).
- **Barra de título sincronizada**: al cambiar de pestaña de sesión, la barra superior actualiza automáticamente su color para coincidir con la cuenta activa.

### 🌐 Soporte Multi-idioma

- Tres idiomas completos disponibles:
  - **Inglés (English)** — predeterminado al instalar o en el primer inicio.
  - **Español**
  - **Português (Brasil)**
- Cambiá de idioma en cualquier momento desde **Archivo > Idioma** / **File > Language**. Todos los menús, modales y barras se actualizan en el momento y la preferencia queda guardada.

### ℹ️ Diálogo "Acerca de TuxChat"

- Accesible desde el menú superior **Acerca de > Acerca de TuxChat**.
- Muestra la versión de la app, versiones del runtime (Electron, Chromium, Node.js), plataforma del sistema y enlace directo al repositorio en GitHub.

### 🔗 Enlaces de WhatsApp (`whatsapp://` y `wa.me`)

- TuxChat se registra ante el sistema como el manejador predeterminado del esquema `whatsapp://`.
- Los enlaces en navegadores o correos abren directamente el chat en la sesión activa o en el selector integrado de cuentas.
- **Selector de cuenta con opción para ocultar**: elegí con qué sesión abrir el link, confirmá con doble clic o tecla Enter, y ocultá sesiones que no desees que aparezcan en la lista.
- Sesión predeterminada configurable en **Archivo > Configuración > Enlaces de WhatsApp...**.

### 💬 Enlaces dentro de los Chats

- Los enlaces recibidos en los chats (Zoom, Google Meet, sitios web) se abren en tu navegador predeterminado en lugar de ventanas emergentes internas.
- Clic derecho en cualquier enlace para **Copiar enlace**.

---

## Instalación

Descargá el instalador desde la página de [Releases](https://github.com/histerick/tuxchat/releases):

- **Ubuntu/Debian (.deb):**
  ```bash
  sudo apt install ./tuxchat_<version>_amd64.deb
  ```
  O doble clic para abrirlo con el instalador de software de tu distribución.
- **Cualquier otra distribución Linux (AppImage):**
  Dale permiso de ejecución (`chmod +x TuxChat-*.AppImage`) y ejecutalo directamente. No requiere instalación ni `libfuse2`.
- **Windows:**
  Ejecutá mediante instalador o terminal.

### Actualizaciones

- **AppImage:** se actualiza en segundo plano, revisando al inicio y cada 4 horas. Al abrir luego de una actualización, se muestra una ventana con las novedades de la versión.
- **.deb:** administrado por `apt` — descargá el nuevo paquete `.deb` de los lanzamientos.

---

## Desarrollo

Requisitos: Node.js (v20+ recomendado) y npm.

```bash
# Instalar dependencias
npm install

# Iniciar en modo de desarrollo con recarga automática (nodemon)
npm run dev

# Ejecutar directamente con Electron
npm start

# Verificar estilo y linter
npm run lint

# Formatear código con Prettier
npm run format
```

---

## Licencia

Distribuido bajo la licencia [MIT](LICENSE).
