# Swap Screen Contents

A KWin script for KDE Plasma 6 that **swaps** (two monitors) or **rotates** (three
or more) the windows visible on each screen, in one keystroke.

📦 **KDE Store:** https://www.opendesktop.org/p/2364570/

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
- Windows are refit to the destination's usable area: any window taller than the
  target screen's available height is shrunk to fit (e.g. when one screen has a panel
  and another doesn't), and a window that filled its source screen is expanded/trimmed
  to fill the target. Smaller windows keep their size and relative position.
  Maximized/fullscreen windows are re-fit by KWin.
- Optional settings: include minimized windows, include windows shown on all
  desktops, keep focus on the current screen, and exclude specific screens (see [Configuration](#configuration)).

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
2. System Settings → Keyboard → **Shortcuts** → search **"swap"** and assign a shortcut
   to **"Swap Screen Contents (forward)"**. The actions ship with **no
   default binding**, so nothing of KDE's is overridden until you pick one. Optionally
   bind **"Swap Screen Contents (reverse)"** too.

> Tip: if you *don't* use a two-dimensional grid of virtual desktops, KDE's vertical
> desktop-switch shortcuts (`Meta+Ctrl+Up`/`Down`) are effectively free on your system
> and make intuitive bindings — but leave them be if you navigate desktops in 2D.

## Configuration

System Settings → Window Management → KWin Scripts → **Swap Screen Contents** →
*Configure…*:

- **Include minimized windows** (off by default): minimized windows move too, and
  stay minimized.
- **Include windows shown on all desktops** (on by default): when off, windows pinned
  to all desktops stay where they are.
- **Keep focus on the current screen** (off by default): after a swap, focus stays on
  the screen you were on and goes to the most recently used of the windows that just
  arrived there, instead of following the focused window to its new screen. The
  script records focus history itself (KWin doesn't expose its own to scripts), so
  history starts over whenever the script or KWin restarts. Until then, the stacking
  order stands in for it.
- **Excluded screens**: comma-separated output names (list them with
  `kscreen-doctor -o`, e.g. `DP-2, HDMI-A-1`). Windows on excluded screens are left
  alone and the remaining screens swap / rotate among themselves; with fewer than two
  screens left the shortcut does nothing.

Shortcuts aren't set here. KDE manages them in the Shortcuts settings (see above).

> **Note:** *Apply* in the Configure dialog doesn't notify running scripts — a KWin
> limitation ([KDE bug 505251](https://bugs.kde.org/show_bug.cgi?id=505251)). After
> changing settings, disable and re-enable the script, or run
> `qdbus6 org.kde.KWin /KWin reconfigure`.

## How it works

Uses the KWin scripting API: `workspace.currentDesktopForScreen()` for per-output
desktops, `workspace.clientArea(MaximizeArea, …)` for the panel-aware work rect,
`workspace.sendClientToScreen()` to move windows, and writable `frameGeometry` /
`desktops` to place and reassign them.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
