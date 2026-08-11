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
| Music (TAPE) | YouTube IFrame player, `app/useTube.js` | Saregama playlist, shuffled |
| Music (FM) | Live Indian radio, `app/stations.js` | HLS; `hls.js` loaded on demand |
| Ambience | `public/audio/train-ambience.mp3` | Loops under the music |

A master level scales everything, exposed as the hairline slider under the
transport controls. `MUSIC` and `AMBIENCE` at the top of `app/page.js` hold the
per-bed mix for both window states — music leads, rails sit underneath, and
opening the window raises the ambience while stepping the music back.

Autoplay requires a user gesture; the "Take the window seat" button is it.

### TAPE

YouTube's IFrame player, pointed at Saregama's "Old Hindi Songs" playlist
(`PLAYLIST` in `app/useTube.js`). This replaced an unofficial JioSaavn API that
could not survive an audience: it rate-limited a handful of page reloads to a
Cloudflare 429, it was someone else's free instance, and it served commercial
copyrighted music without authorisation. YouTube is free to the listener,
requires no account, and streams from the rights holder's own upload.

**Verify any playlist or video id before trusting it.** A video that exists but
has embedding disabled looks fine everywhere except in the player, where it is
silent. The oEmbed endpoint is the cheap check — it returns 200 for embeddable
videos and 403 for blocked ones:

```bash
curl "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json"
```

Every video sampled from the current playlist returned 200. A candidate
compilation from another channel returned 403, which is exactly the failure this
check exists to catch.

Two details worth knowing:

- **The player must stay visible.** YouTube's terms do not permit hiding it or
  extracting audio only, so it is rendered as a 356x200 screen at the head of
  the player stack — 16:9 at YouTube's 200px minimum — graded to match the
  footage. It is stowed only when FM has taken over and the deck is paused.
- **Titles are cleaned, not trusted.** These uploads pack the billing into the
  title (`Chura Liya Hai Tumne Jo Dil Ko | Lyrical | Zeenat Aman | Asha
  Bhosle`). `parseTitle` takes the first segment as the song and filters upload
  furniture — "Lyrical", "Audio Jukebox", "Full Video" — out of the credits.

Videos that are pulled or region-blocked fire `onError`, which steps to the next
track rather than stranding the deck on silence.

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
