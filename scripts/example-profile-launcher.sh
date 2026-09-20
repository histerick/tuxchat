#!/bin/bash
# Example of how a second, fully isolated WhatsApp session is launched.
# Mirrors the pattern documented by teams-for-linux for multi-instance use:
# --user-data-dir isolates cookies/localStorage, --class isolates the
# window's WM_CLASS so the dock doesn't group it with the first profile.

exec electron /home/erick/Proyectos/whatsapp-linux-app \
  --ozone-platform=x11 \
  --user-data-dir="$HOME/.config/whatsapp-linux-app-work" \
  --class=whatsapp-linux-app-work \
  --profile-name=Trabajo
