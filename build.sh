#!/bin/sh
# Package the KWin script as a .kwinscript (a ZIP archive, as KPackage/kpackagetool6
# and the KDE Store expect) with metadata.json at the archive root.
set -e
NAME=swap-screen-contents
rm -f "$NAME.kwinscript"
zip -r -q "$NAME.kwinscript" metadata.json contents LICENSE README.md -x '*.git*'
echo "built $NAME.kwinscript"
