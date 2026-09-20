#!/bin/bash
# Example of how a second, fully isolated WhatsApp session is launched.
# Mirrors the pattern documented by teams-for-linux for multi-instance use:
# --user-data-dir isolates cookies/localStorage, --class isolates the
# window's WM_CLASS so the dock doesn't group it with the first profile.

exec electron /home/erick/Proyectos/tuxchat \
  --user-data-dir="$HOME/.config/tuxchat-work" \
  --class=tuxchat-work \
  --profile-name=Trabajo
