#!/bin/sh
# Package the KWin script as a .kwinscript archive for the KDE Store / kpackagetool6.
set -e
NAME=swap-screen-contents
rm -f "$NAME.kwinscript"
tar czf "$NAME.kwinscript" metadata.json contents LICENSE README.md
echo "built $NAME.kwinscript"
