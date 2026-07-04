# Swap Screen Contents

A KWin script for KDE Plasma 6 that **swaps** (two monitors) or **rotates** (three
or more) the windows visible on each screen, in one keystroke.

Unlike the older "move all windows to the next screen" scripts, this one is built
for **Plasma 6.7 per-output virtual desktops**: it only moves the windows on each
screen's *currently-active* desktop, and reassigns each moved window to the
*destination* screen's active desktop. It also refits windows to the destination
screen's **panel-aware work area**, so a full-height window doesn't end up clipped
by (or floating over) a panel when it lands on a screen with a different usable size.

## Features

- Two monitors → swap their contents; three or more → rotate by one (forward/reverse).
- Per-output-desktop aware (Plasma 6.7+). Degrades gracefully to the global current
  desktop on Plasma 6.6 and earlier.
- Handles any monitor arrangement (side-by-side, stacked, mixed) and differing
  resolutions/scales — geometry is mapped on both axes relative to each screen's
  work area.
- Full-size windows are trimmed/expanded to fit; partial windows keep their size and
  relative position. Maximized/fullscreen windows are re-fit by KWin.
- Zero configuration.

## Install

**From the KDE Store:** System Settings → Window Management → KWin Scripts →
*Get New Scripts…* → search "Swap Screen Contents".

**From a file:**
```sh
kpackagetool6 --type KWin/Script --install swap-screen-contents.kwinscript
# or upgrade:  kpackagetool6 --type KWin/Script --upgrade swap-screen-contents.kwinscript
```

**From source (this repo):**
```sh
cp -r . ~/.local/share/kwin/scripts/swap-screen-contents
kwriteconfig6 --file kwinrc --group Plugins --key swap-screen-contentsEnabled true
```

## Enable & bind a shortcut

1. System Settings → Window Management → **KWin Scripts** → enable **Swap Screen Contents**.
2. System Settings → Keyboard → **Shortcuts** → search **"Swap / rotate screen contents"**
   and assign a key (e.g. `Meta+Ctrl+Up`). Optionally bind
   **"Rotate screen contents (reverse direction)"** too (e.g. `Meta+Ctrl+Down`).

> Tip: on a single row of virtual desktops, the vertical desktop-switch shortcuts
> (`Meta+Ctrl+Up`/`Down`) are unused and make natural bindings.

## How it works

Uses the KWin scripting API: `workspace.currentDesktopForScreen()` for per-output
desktops, `workspace.clientArea(MaximizeArea, …)` for the panel-aware work rect,
`workspace.sendClientToScreen()` to move windows, and writable `frameGeometry` /
`desktops` to place and reassign them.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
