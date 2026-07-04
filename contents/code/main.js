// Swap Screen Contents — a KWin script for KDE Plasma 6.
//
// Swaps (with two monitors) or rotates (with three or more) the windows visible
// on each screen's currently-active virtual desktop. It respects Plasma 6.7
// per-output virtual desktops — a moved window is reassigned to the destination
// screen's active desktop — and refits each window to the destination screen's
// panel-aware work area, so full-size windows are trimmed/expanded rather than
// clipped or left floating over a panel.
//
// Copyright (C) 2026 Cyrus Omar
// SPDX-License-Identifier: GPL-3.0-or-later

var MAXIMIZE_AREA = 2; // workspace.clientArea() option: panel-aware "maximize" rect

function workArea(screen, desktop) { return workspace.clientArea(MAXIMIZE_AREA, screen, desktop); }

// Active desktop of a specific output. Falls back to the global current desktop
// on Plasma < 6.7 (before per-output desktops existed).
function screenDesktop(screen) {
    return (typeof workspace.currentDesktopForScreen === "function")
        ? workspace.currentDesktopForScreen(screen)
        : workspace.currentDesktop;
}

function onScreen(w, s) { return w.output && w.output.name === s.name; }

function onActiveDesktop(w, d) {
    if (w.onAllDesktops) return true;
    var ds = w.desktops || [];
    for (var i = 0; i < ds.length; i++) if (ds[i].id === d.id) return true;
    return false;
}

function movable(w) {
    return w.normalWindow && !w.minimized && w.moveableAcrossScreens !== false;
}

function visibleWindows(screen, desktop) {
    var out = [], all = workspace.windowList();
    for (var i = 0; i < all.length; i++) {
        var w = all[i];
        if (movable(w) && onScreen(w, screen) && onActiveDesktop(w, desktop)) out.push(w);
    }
    return out;
}

// Is a window "full" along an axis (fills the work-area extent within tolerance)?
function isFull(len, full) { return Math.abs(len - full) <= Math.max(8, full * 0.02); }

// Map one axis (x/width or y/height) from the source work area to the destination.
// Full extent -> fill (trim/expand); otherwise keep size (clamped) at the same
// fractional offset. Works for any relative monitor placement or resolution.
function mapAxis(pos, size, srcPos, srcExt, dstPos, dstExt) {
    if (isFull(size, srcExt)) return [dstPos, dstExt];
    var newSize = Math.min(size, dstExt);
    var frac = srcExt > 0 ? (pos - srcPos) / srcExt : 0;
    var newPos = dstPos + frac * dstExt;
    if (newPos + newSize > dstPos + dstExt) newPos = dstPos + dstExt - newSize;
    if (newPos < dstPos) newPos = dstPos;
    return [Math.round(newPos), Math.round(newSize)];
}

function relocate(w, srcArea, dstArea, dstScreen, dstDesktop) {
    // Maximized / fullscreen windows: let KWin re-fit the destination itself.
    if (w.fullScreen || w.maximizeMode === 3) {
        workspace.sendClientToScreen(w, dstScreen);
        if (!w.onAllDesktops) w.desktops = [dstDesktop];
        return;
    }
    var g = w.frameGeometry;
    var ax = mapAxis(g.x, g.width, srcArea.x, srcArea.width, dstArea.x, dstArea.width);
    var ay = mapAxis(g.y, g.height, srcArea.y, srcArea.height, dstArea.y, dstArea.height);
    workspace.sendClientToScreen(w, dstScreen);
    w.frameGeometry = { x: ax[0], y: ay[0], width: ax[1], height: ay[1] };
    if (!w.onAllDesktops) w.desktops = [dstDesktop];
}

// Rotate each screen's visible windows to the next screen (dir = +1 / -1).
// With exactly two screens this is a straight swap in either direction.
function rotate(dir) {
    var screens = workspace.screens, n = screens.length;
    if (n < 2) return;

    var desk = [], area = [], wins = [];
    for (var i = 0; i < n; i++) {
        desk[i] = screenDesktop(screens[i]);
        area[i] = workArea(screens[i], desk[i]);
        wins[i] = visibleWindows(screens[i], desk[i]);   // snapshot ALL before moving anything
    }
    for (var s = 0; s < n; s++) {
        var t = ((s + dir) % n + n) % n;
        for (var k = 0; k < wins[s].length; k++) {
            relocate(wins[s][k], area[s], area[t], screens[t], desk[t]);
        }
    }
}

registerShortcut("SwapScreenContents",
    "Swap / rotate screen contents", "",
    function () { rotate(1); });
registerShortcut("SwapScreenContentsReverse",
    "Rotate screen contents (reverse direction)", "",
    function () { rotate(-1); });
