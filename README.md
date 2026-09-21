# TuxChat

![License](https://img.shields.io/github/license/histerick/tuxchat)
![Latest release](https://img.shields.io/github/v/release/histerick/tuxchat)

Cliente de escritorio no oficial de WhatsApp Web para Linux (Electron), con
soporte completo de llamadas/video y screen share, múltiples sesiones
aisladas en paralelo, y soporte de enlaces `whatsapp://`.

**Estado: en desarrollo temprano (v0.2), no listo para uso diario.**

Probado en Ubuntu 26.04 con GPU NVIDIA. Debería funcionar en otras
distros/GPUs (el `.deb` solo depende de librerías estándar de
GTK/Debian, y `--ozone-platform=x11` solo se fuerza si detecta NVIDIA en
Wayland), pero todavía no está verificado — reportes de otros entornos son
bienvenidos.

## Instalación

Descargá el instalador desde
[Releases](https://github.com/histerick/tuxchat/releases):

- **Ubuntu/Debian:** `tuxchat_<version>_amd64.deb` — `sudo apt install ./tuxchat_<version>_amd64.deb`, o doble clic para abrirlo con el instalador de software.
- **Cualquier otra distro:** `TuxChat-<version>.AppImage` — dale permiso de ejecución y corrélo directo, no requiere instalación.

## Múltiples sesiones

Desde el menú de la ventana: **Sesiones > Añadir sesión...** crea una
sesión de WhatsApp completamente aislada (login, caché y datos propios),
con su propio ícono y entrada en el menú de aplicaciones. **Renombrar** y
**Eliminar** funcionan igual, desde el mismo menú.

## Enlaces de WhatsApp (whatsapp://)

TuxChat se registra ante el sistema como manejador del esquema
`whatsapp://`, así que un link tipo `wa.me/<numero>` o
`whatsapp://send?phone=...&text=...` clickeado desde cualquier otra app
(navegador, mail, etc.) abre el chat directo en TuxChat, en vez de quedar
atrapado en la versión de WhatsApp del navegador. Con más de una sesión
configurada, la primera vez pregunta con cuál abrirlo (con opción de
recordar la elección); se administra desde **Sesiones > Enlaces de
WhatsApp...**.

## Desarrollo

```bash
npm install
npm start
```

La bitácora de desarrollo detallada vive fuera de este repo mientras el
proyecto madura; ver `tuxchat.md` en el equipo de desarrollo.
