// Swap Screen Contents — a KWin script for KDE Plasma 6.
//
// Swaps (with two monitors) or rotates (with three or more) the windows visible
// on each screen's currently-active virtual desktop. It respects Plasma 6.7
// per-output virtual desktops — a moved window is reassigned to the destination
// screen's active desktop — and refits each window to the destination screen's
// panel-aware work area, so full-size windows are trimmed/expanded rather than
// clipped or left floating over a panel.
//
// Options (System Settings → KWin Scripts → Configure): include minimized
// windows, include windows shown on all desktops, keep focus on the current
// screen (activating the most recently used window arriving there), and exclude
// screens by output name — excluded screens are left alone and the rest rotate
// among themselves.
//
// Copyright (C) 2026 Cyrus Omar
// SPDX-License-Identifier: GPL-3.0-or-later

var MAXIMIZE_AREA = 2; // workspace.clientArea() option: panel-aware "maximize" rect

// Read on every invocation, so new values apply as soon as KWin reloads its config.
// Apply in the config dialog alone doesn't trigger that reload for scripts
// (KDE bug 505251): toggle the script or run `qdbus6 org.kde.KWin /KWin reconfigure`.
function loadConfig() {
    var excluded = String(readConfig("ExcludedScreens", "")).split(/[\s,]+/)
        .filter(function (name) { return name.length > 0; });
    return {
        includeMinimized: readConfig("IncludeMinimized", false),
        includeAllDesktops: readConfig("IncludeAllDesktops", true),
        keepFocusOnScreen: readConfig("KeepFocusOnScreen", false),
        excluded: excluded
    };
}

function workArea(screen, desktop) { return workspace.clientArea(MAXIMIZE_AREA, screen, desktop); }

// Active desktop of a specific output. Falls back to the global current desktop
// on Plasma < 6.7 (before per-output desktops existed).
function screenDesktop(screen) {
    return (typeof workspace.currentDesktopForScreen === "function")
        ? workspace.currentDesktopForScreen(screen)
        : workspace.currentDesktop;
}

function onScreen(w, s) { return w.output && w.output.name === s.name; }

function onActiveDesktop(w, d, cfg) {
    if (w.onAllDesktops) return cfg.includeAllDesktops;
    var ds = w.desktops || [];
    for (var i = 0; i < ds.length; i++) if (ds[i].id === d.id) return true;
    return false;
}

function movable(w, cfg) {
    return w.normalWindow && (cfg.includeMinimized || !w.minimized)
        && w.moveableAcrossScreens !== false;
}

// Returned in stacking order, bottom → top.
function visibleWindows(screen, desktop, cfg) {
    var out = [], all = workspace.stackingOrder;
    for (var i = 0; i < all.length; i++) {
        var w = all[i];
        if (movable(w, cfg) && onScreen(w, screen) && onActiveDesktop(w, desktop, cfg)) out.push(w);
    }
    return out;
}

// Is a window "full" along an axis (fills the source work-area extent within tolerance)?
function isFull(len, full) { return Math.abs(len - full) <= Math.max(8, full * 0.02); }

// Map one axis (x/width or y/height) from the source work area to the destination:
//  - a window that filled the source is expanded/trimmed to fill the destination;
//  - any other window keeps its size but is SHRUNK to fit if it exceeds the
//    destination extent, then placed at the same fractional offset.
// No window ever ends up larger than the destination work area. Works for any
// relative monitor placement, resolution, or scale.
function mapAxis(pos, size, srcPos, srcExt, dstPos, dstExt) {
    if (isFull(size, srcExt)) return [dstPos, dstExt];
    var newSize = Math.min(size, dstExt);   // shrink-to-fit: never exceed the target
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

// Focus history, most recent first. KWin's own focus chain isn't exposed to
// scripts, so record activations here. Reset on every script load and seeded
// from the stacking order, which approximates recency until real activations
// come in.
var MRU_MAX = 64, mru = [];

function forget(w) {
    var i = mru.indexOf(w);
    if (i >= 0) mru.splice(i, 1);
}

function touch(w) {
    if (!w) return;
    forget(w);
    mru.unshift(w);
    if (mru.length > MRU_MAX) mru.length = MRU_MAX;
}

// The most recently used focusable window of a group (bottom → top). Falls back
// to the topmost one when none of them has been seen activating.
function focusTarget(group) {
    var best = null, bestRank = -1;
    for (var i = 0; i < group.length; i++) {
        var w = group[i];
        if (w.minimized || w.wantsInput === false) continue;
        var rank = mru.indexOf(w);
        if (rank < 0) rank = MRU_MAX + group.length - i;   // unseen: rank below seen ones, topmost first
        if (!best || rank < bestRank) { best = w; bestRank = rank; }
    }
    return best;
}

// Rotate each screen's visible windows to the next screen (dir = +1 / -1).
// With exactly two screens this is a straight swap in either direction.
// Excluded screens are skipped entirely.
function rotate(dir) {
    var cfg = loadConfig();
    var screens = [], all = workspace.screens;
    for (var j = 0; j < all.length; j++) {
        if (cfg.excluded.indexOf(all[j].name) < 0) screens.push(all[j]);
    }
    var n = screens.length;
    if (n < 2) return;

    var desk = [], area = [], wins = [];
    for (var i = 0; i < n; i++) {
        desk[i] = screenDesktop(screens[i]);
        area[i] = workArea(screens[i], desk[i]);
        wins[i] = visibleWindows(screens[i], desk[i], cfg);   // snapshot ALL before moving anything
    }

    // Keep focus on the active screen: choose among the windows arriving there.
    // Pick from this pre-move snapshot; window outputs may lag right after moving.
    var target = null, active = workspace.activeWindow;
    if (cfg.keepFocusOnScreen && active) {
        for (var a = 0; a < n; a++) {
            if (onScreen(active, screens[a])) {
                target = focusTarget(wins[((a - dir) % n + n) % n]);
                break;
            }
        }
    }

    for (var s = 0; s < n; s++) {
        var t = ((s + dir) % n + n) % n;
        for (var k = 0; k < wins[s].length; k++) {
            relocate(wins[s][k], area[s], area[t], screens[t], desk[t]);
        }
    }
    if (target) workspace.activeWindow = target;
}

// Key auto-repeat fires the shortcut many times per second, faster than clients
// apply the previous move. Rate-limit: ignore any press within COOLDOWN_MS of the
// last swap, so a held key swaps at a steady pace and every swap can settle.
var COOLDOWN_MS = 200, lastSwap = 0;
function onPress(dir) {
    var now = Date.now();
    if (now - lastSwap < COOLDOWN_MS) return;
    lastSwap = now;
    rotate(dir);
}

var seed = workspace.stackingOrder;
for (var i = 0; i < seed.length; i++) if (seed[i].normalWindow) touch(seed[i]);
touch(workspace.activeWindow);
workspace.windowActivated.connect(touch);
workspace.windowRemoved.connect(forget);

registerShortcut("SwapScreenContents",
    "Swap Screen Contents (forward)", "",
    function () { onPress(1); });
registerShortcut("SwapScreenContentsReverse",
    "Swap Screen Contents (reverse)", "",
    function () { onPress(-1); });
