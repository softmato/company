# `/watch` — giving Claude a video input

Installed 2026-08-28. Paste this file (or point at it) when starting a fresh
session that needs to look at a video or at the site.

---

## What it is

[`bradautomates/claude-video`](https://github.com/bradautomates/claude-video) —
MIT. A `/watch` skill that takes a video (URL **or local file path**), extracts
frames with ffmpeg, transcribes audio if there is any, and hands the frames to
Claude as images so it can actually see what is in the video.

Installed as a Claude Code plugin at **user scope**, already enabled:

```
marketplace: claude-video   (github: bradautomates/claude-video)
plugin:      watch@claude-video   v0.2.0
```

## How to use it

```
/watch "C:/Users/Aanand/Downloads/some-video.mp4" what happens in the first 3 seconds?
```

Useful flags (pass them in the request, the skill forwards them):
`--detail transcript|efficient|balanced|token-burner`, `--resolution 1200`,
`--start 0:03 --end 0:09`, `--fps 6`, `--no-whisper`.

## Three things a fresh session needs to know

1. **A new session is required for the slash command.** Plugins load at session
   start. If `/watch` is not in the skill list, either restart, or drive the
   script directly — it works exactly the same:

   ```bash
   PYTHONIOENCODING=utf-8 python \
     "/c/Users/Aanand/.claude/plugins/cache/claude-video/watch/0.2.0/skills/watch/scripts/watch.py" \
     "C:/path/to/video.mp4" --detail balanced --resolution 1000 --no-whisper \
     --out-dir /path/to/scratch
   ```

   Then `Read` each `frame_NNNN.jpg` path it prints.

2. **Windows: use `python`, not `python3`.** `python3` on Windows is the
   Microsoft Store stub and will not run the script.

3. **`PYTHONIOENCODING=utf-8` is already set** in `~/.claude/settings.json`.
   Without it the script crashes with `UnicodeEncodeError` — its report prints
   a `→` and Python's stdout defaults to cp1252 on Windows. Frames extract
   fine; it dies while printing. Worth reporting upstream.

## Setup state

- `ffmpeg` — present (chocolatey)
- `yt-dlp` — installed via pip on 2026-08-28
- `~/.config/watch/.env` — scaffolded, `SETUP_COMPLETE=true`, `WATCH_DETAIL=balanced`
- **No Whisper API key, deliberately.** The videos this is used for are silent
  screen recordings of the website; there is no audio to transcribe. Add
  `GROQ_API_KEY` to that file if you ever point it at something with speech.
- The session hook may warn the `.env` is mode 644. That is a POSIX check on
  Windows — the real NTFS ACL is user-only, and the file holds no keys.

---

## Related: seeing the site itself

`scripts/shot.mjs` was written in the same session and matters just as much.
It screenshots a local page with headless Chrome over the DevTools protocol —
no Playwright, no Puppeteer, no dependency at all.

```bash
node scripts/shot.mjs hero /            0     1440 900   # viewport shot
node scripts/shot.mjs mid  /            2400  1440 900   # scrolled
node scripts/shot.mjs all  /            full  1440 900   # whole page
node scripts/shot.mjs team /team        0     375  812   # mobile
```

It prints the PNG path; `Read` it.

**Why it exists:** the public site's design was built and shipped once without
anyone ever looking at it. Contrast ratios, geometry, server-rendered
completeness and bundle splitting all passed, and the page still looked wrong,
because none of those are what a page looks like. Do not trust a UI change you
have not seen.
