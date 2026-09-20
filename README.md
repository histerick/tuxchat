# whatsapp-linux-app

Cliente de escritorio no oficial de WhatsApp Web para Linux (Electron), con
soporte completo de llamadas/video y screen share, y múltiples sesiones
aisladas en paralelo.

**Estado: en desarrollo temprano (v0.1), no listo para uso diario.**

## Desarrollo

```bash
npm install
npm start
```

Segunda sesión aislada (ejemplo):

```bash
npm start -- --user-data-dir=$HOME/.config/whatsapp-linux-app-work --class=whatsapp-linux-app-work --profile-name=Trabajo
```

La bitácora de desarrollo detallada vive fuera de este repo mientras el
proyecto madura; ver `whatsapp-linux-app.md` en el equipo de desarrollo.
