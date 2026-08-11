# Kahin Door

A one-screen ambient web experience: an Indian night train, seen from the
window. Real footage, old film music, rails underneath. No nav, no account,
no feed.

Built with Next.js 15 and React 19.

```bash
npm install
npm run dev   # http://localhost:3000
```

## Design constraints

These are load-bearing. Changing them changes what the thing is.

- One screen. No navbar, account, feed, search, feature cards or marketing
  sections.
- The window comes first; controls are subordinate to it.
- Mobile-first, and fast — first load is ~104 kB of JS.
- Copy stays sparse.
- Indian Railways nostalgia without kitsch: dark navy, weathered metal, warm
  coach light, platform-board typography, film grain.

## Scenery

The window is real footage, not CSS. Four 10s 720p clips live in
`public/scenery/{a,b,c,d}.mp4`, with masters kept in `media/`. They share
framing, so the app crossfades between them and the journey never visibly cuts.

Playback uses **two video elements**, not one per clip. The decks alternate and
the back deck loads the next clip during the hold. This halves the initial
download and stays within the concurrent-decode limit mobile Safari enforces.
When adding clips, extend the `clips` array only — the deck count stays at two.

The source clips carry a generator watermark in the bottom-right; `.plate` in
`app/globals.css` crops it past the right edge with `scale(1.14) translate(...)`.
Re-check that transform if the footage is replaced.

## The journey line

`routes` in `app/page.js` holds ten real corridors — Grand Chord, Grand Trunk,
Konkan, Bengal–Assam and others — roughly ninety stations between them. Each
visit picks one route and walks it in order, one stop every 36s.

It is a list of routes rather than a flat list of stations on purpose. Drawing
at random across the whole country puts "Passing GUWAHATI" straight after
"Somewhere after ITARSI JN", which reads as a bug. Add stations by extending a
corridor or adding a new one, in geographic order, using platform-board
spelling.

## Audio

Three sources, mixed in `app/page.js`:

| Bed | Source | Notes |
| --- | --- | --- |
| Music (TAPE) | YouTube IFrame player, `app/useTube.js` | 96 verified ids in `app/tracks.js`, shuffled |
| Music (FM) | Live Indian radio, `app/stations.js` | HLS; `hls.js` loaded on demand |
| Ambience | `public/audio/train-ambience.mp3` | Loops under the music |

A master level scales everything, exposed as the hairline slider under the
transport controls. `MUSIC` and `AMBIENCE` at the top of `app/page.js` hold the
per-bed mix for both window states — music leads, rails sit underneath, and
opening the window raises the ambience while stepping the music back.

Autoplay requires a user gesture; the "Take the window seat" button is it.

### TAPE

YouTube's IFrame player, driven from an explicit list of 96 songs in
`app/tracks.js`, taken from Saregama's "Old Hindi Songs" playlist. This replaced
an unofficial JioSaavn API that could not survive an audience: it rate-limited a
handful of page reloads to a Cloudflare 429, it was someone else's free
instance, and it served commercial copyrighted music without authorisation.
YouTube is free to the listener, requires no account, and streams from the
rights holder's own upload.

**Verify any video id before trusting it.** A video that exists but has
embedding disabled looks fine everywhere except in the player, where it plays
silently. The oEmbed endpoint is the cheap check — 200 for embeddable, 403 for
blocked:

```bash
curl "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json"
```

All 96 ids in `tracks.js` returned 200. A candidate compilation from another
channel returned 403, which is exactly the failure this check exists to catch.

Three things here are load-bearing, and each one was a bug first:

- **The player is built on mount, not on entry.** Autoplay with sound is only
  granted inside a user gesture. Creating the player on entry meant the click
  set a flag, the iframe and API then loaded over the network, and `playVideo`
  ran on `onReady` — seconds later, outside the gesture, where the browser
  refuses audio *silently*. The player has to exist before the click. That costs
  an iframe on first paint.
- **The iframe is constructed here, not by `YT.Player`.** Handed a `<div>`, the
  API makes its own iframe, which is briefly `about:blank` — and `about:blank`
  inherits this page's origin, so the widget's handshake to
  `https://www.youtube.com` is rejected against a window still on our origin.
  Building the iframe with a real `src` avoids that, and also avoids `YT.Player`
  replacing a React-rendered node and leaving React with a detached reference.
- **The running order is ours.** Handing the embed a `videoseries` playlist id
  put order, shuffle and metadata inside the player, leaving nothing to inspect
  when it failed to start. Tracks are driven with `loadVideoById`; `ENDED` and
  `onError` both step forward, so a pulled or region-blocked video is walked
  past rather than stranding the deck.

Titles are cleaned of upload furniture ("Lyrical", "Audio Jukebox", "Full
Video") when `tracks.js` is generated, so nothing is parsed at runtime and the
song is known before the player is.

> **The deck plays off-screen, which is contrary to YouTube's terms** — they
> require the player stay visible and do not permit taking the audio alone. The
> "listen on youtube" link under the controls carries the attribution and points
> at the current video. Making the deck visible again is a change to `.deck` in
> `app/globals.css` and nothing else. It is laid out at a real 640x360 rather
> than `display:none` or 1px, because a player that is never laid out gets
> throttled or refuses to start.

### FM

Live stations in `app/stations.js`, sourced from
[radio-browser.info](https://www.radio-browser.info/). Two rules that list obeys:

- **https only.** A deployed site is https, so plain-http streams are blocked as
  mixed content. Check the scheme before adding a station.
- **Verified reachable.** Each was checked for a 200 and an audio/HLS
  content-type; directories carry plenty of dead entries.

The AIR streams are HLS and need `hls.js` everywhere except Safari. That import
is dynamic, so it stays out of the bundle unless FM is actually selected.

Vividh Bharati is the pick of them: All India Radio's classic film-song service,
which is roughly what this whole app is dressed as. It is also government-run
and openly streamed, so it carries none of the licensing caveats above.

### Ambience

`media/train-ambience-source.mp3` is a running-train sound effect the uploader
marked copyright-free / Creative Commons. That provenance came from the original
filename rather than a licence document — confirm it before commercial use.

## Spotify

A link out to a playlist, not an embedded player. Spotify's embed gives
**30-second previews** unless the visitor is a logged-in Premium user on desktop
(mobile gets previews regardless), it cannot autoplay, and the iframe cannot be
restyled — all three break the one-click-and-you're-there flow.

`SPOTIFY_PLAYLIST` in `app/page.js` points at Spotify's own editorial "Old is
Gold" rather than a user-made playlist, which can be deleted or go private.
Verify any replacement with the oEmbed endpoint — **a wrong id still resolves,
just to the wrong playlist**:

```bash
curl "https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/<id>"
```

## Media pipeline

`public/` is compressed: **15.85 MB → 3.67 MB** (77% smaller), first paint
~1.1 MB instead of ~5.2 MB. `next.config.js` pins the media directories to
`immutable`, so repeat visits cost nothing.

Originals are untouched in `media/`. Always re-encode from there, never from
`public/`, or the loss compounds.

```bash
# Video: ~2.6 MB -> 380-860 KB each, still 1280x720 / 24fps.
# -an matters: every clip carried a 128 kbps AAC track that was pure waste,
# since the elements are muted.
ffmpeg -i in.mp4 -an -vf "hqdn3d=1.5:1:2:2" -c:v libx264 -crf 33 \
  -preset slow -pix_fmt yuv420p -movflags +faststart out.mp4

# Ambience: 320 kbps stereo -> 64 kbps mono, 5.5 MB -> 1.1 MB.
ffmpeg -i train-ambience.mp3 -ac 1 -b:a 64k -ar 44100 out.mp3
```

CRF 33 was chosen by encoding a detail crop at 28/31/34 and comparing frames —
34 was already indistinguishable, and the grain, scanlines and vignette layered
on top hide far more than the encoder loses. The light `hqdn3d` denoise helps
because the CSS re-adds its own grain anyway. `-movflags +faststart` moves the
index to the front so playback starts before the file finishes downloading.

## Roadmap

- Crossfades between tracks.
- Ambience mixer: rails, wind, distant horn, station ambience.
- Passing-train event with parallax and a short sound burst.
- Glass reflections that react to the coach-light state.
- Station announcements, from owned or licensed recordings only.
- Reduced-motion and accessibility preferences beyond the current defaults.
