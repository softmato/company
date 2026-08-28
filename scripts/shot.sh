#!/usr/bin/env bash
# Screenshot a local page with headless Chrome.
#
#   scripts/shot.sh <name> [path] [scroll-y] [width] [height]
#
# Why this exists: the design of the public site was built and shipped once
# without anyone ever looking at it. Every check that was run — contrast
# ratios, geometry, server-rendered completeness, bundle splitting — passed,
# and the page still looked wrong, because none of those things are what a
# page looks like. This makes looking at it a single command with no
# dependency on an editor pane being open.
#
# `--virtual-time-budget` lets entrance animations settle before the capture;
# without it every shot catches the page mid-fade.
set -euo pipefail

NAME="${1:?usage: shot.sh <name> [path] [scroll-y] [width] [height]}"
PATH_="${2:-/}"
SCROLL="${3:-0}"
WIDTH="${4:-1440}"
HEIGHT="${5:-900}"

CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
OUT_DIR="${SHOT_DIR:-/c/Users/Aanand/AppData/Local/Temp/claude/D--company/945fbd41-9310-46a0-ae29-0925e98b29c9/scratchpad/shots}"
mkdir -p "$OUT_DIR"

URL="http://localhost:3000${PATH_}"

# Scrolling needs a real page load, so it goes through a data-URI-free hash
# trick: the app has no hash routing, so `#` plus a scroll script is not
# available. Instead Chrome is told to scroll via a tiny extension-free
# workaround — load the page, then re-capture after a scripted scroll is not
# possible in one-shot mode, so a non-zero scroll uses a wrapper page.
if [ "$SCROLL" != "0" ]; then
  WRAP="$OUT_DIR/.wrap-${NAME}.html"
  cat > "$WRAP" <<HTML
<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100vw;height:100vh}</style>
<iframe src="${URL}" id="f"></iframe>
<script>
  document.getElementById('f').addEventListener('load', () => {
    const w = document.getElementById('f').contentWindow;
    w.scrollTo(0, ${SCROLL});
  });
</script>
HTML
  TARGET="file:///$(cygpath -m "$WRAP")"
else
  TARGET="$URL"
fi

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --virtual-time-budget=7000 --window-size="${WIDTH},${HEIGHT}" \
  --screenshot="$(cygpath -w "$OUT_DIR/${NAME}.png")" "$TARGET" 2>/dev/null | tail -1

echo "$OUT_DIR/${NAME}.png"
