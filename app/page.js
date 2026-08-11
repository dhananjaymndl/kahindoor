'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTube } from './useTube'
import { useFm } from './useFm'

// The clips share framing at slightly different moments, so crossfading between
// them reads as one unbroken journey rather than a cut.
const clips = ['/scenery/a.mp4', '/scenery/b.mp4', '/scenery/c.mp4', '/scenery/d.mp4']

// Real corridors, not a bag of station names. One route is picked per visit and
// walked in order, so "Somewhere after ITARSI JN" is never followed by "Passing
// GUWAHATI" — a random draw across the whole country reads as a bug, not a dream.
// Names are as they appear on the platform boards.
const routes = [
  // Grand Chord — Howrah to Delhi
  ['HOWRAH JN', 'BARDDHAMAN JN', 'ASANSOL JN', 'DHANBAD JN', 'GAYA JN',
   'DEEN DAYAL UPADHYAYA JN', 'PRAYAGRAJ JN', 'KANPUR CENTRAL', 'TUNDLA JN', 'NEW DELHI'],
  // Mumbai to Howrah, the long way through the middle
  ['CHHATRAPATI SHIVAJI TERMINUS', 'KALYAN JN', 'IGATPURI', 'BHUSAVAL JN', 'NAGPUR JN',
   'RAIPUR JN', 'BILASPUR JN', 'ROURKELA', 'TATANAGAR JN', 'KHARAGPUR JN', 'HOWRAH JN'],
  // Grand Trunk — Delhi to Madras
  ['NEW DELHI', 'MATHURA JN', 'GWALIOR', 'JHANSI JN', 'BHOPAL JN', 'ITARSI JN',
   'NAGPUR JN', 'BALLARSHAH', 'KAZIPET JN', 'VIJAYAWADA JN', 'GUDUR JN', 'CHENNAI CENTRAL'],
  // Up the west coast and into Rajasthan
  ['MUMBAI CENTRAL', 'BORIVALI', 'VAPI', 'SURAT', 'VADODARA JN', 'AHMEDABAD JN',
   'ABU ROAD', 'MARWAR JN', 'AJMER JN', 'JAIPUR JN'],
  // Across the south, Coromandel to Malabar
  ['CHENNAI EGMORE', 'ARAKKONAM JN', 'KATPADI JN', 'JOLARPETTAI JN', 'SALEM JN',
   'ERODE JN', 'TIRUPPUR', 'COIMBATORE JN', 'PALAKKAD JN', 'THRISSUR', 'ERNAKULAM JN'],
  // Konkan, all tunnels and estuaries
  ['MADGAON JN', 'RATNAGIRI', 'CHIPLUN', 'KHED', 'ROHA', 'PANVEL JN', 'THANE'],
  // North to the hills
  ['NEW DELHI', 'PANIPAT JN', 'AMBALA CANTT', 'LUDHIANA JN', 'JALANDHAR CITY',
   'PATHANKOT', 'JAMMU TAWI'],
  // Bengal into Assam
  ['HOWRAH JN', 'MALDA TOWN', 'NEW JALPAIGURI', 'NEW COOCH BEHAR',
   'NEW BONGAIGAON JN', 'GUWAHATI'],
  // Deccan — Bengaluru up to Pune
  ['KSR BENGALURU', 'TUMAKURU', 'ARSIKERE JN', 'DAVANGERE', 'HUBBALLI JN',
   'BELAGAVI', 'MIRAJ JN', 'SATARA', 'PUNE JN'],
  // Bihar and the Kosi plains
  ['PATNA JN', 'MUZAFFARPUR JN', 'SAMASTIPUR JN', 'BARAUNI JN', 'KATIHAR JN',
   'NEW JALPAIGURI'],
]

// Spotify's own editorial playlist rather than a user-made one, which can be
// deleted or go private without warning. Verified via Spotify's oEmbed endpoint;
// re-check with it if you swap the id, since a wrong id still resolves — to the
// wrong playlist.
const SPOTIFY_PLAYLIST = 'https://open.spotify.com/playlist/37i9dQZF1DWYRTlrhMB12D'

const HOLD = 8200   // ms a clip stays in front
const FADE = 2600   // ms crossfade, must match .plate transition

// The mix. Music carries the room; the rails sit under it rather than beside it.
// Opening the window lets the night in — ambience rises, music steps back — but
// the gap between the two states is narrower than the gap between the two beds.
const MUSIC = { closed: 1, open: 0.72 }
const AMBIENCE = { closed: 0.16, open: 0.4 }

export default function Home() {
  const [entered, setEntered] = useState(false)
  const [lightsOff, setLightsOff] = useState(true)
  const [windowOpen, setWindowOpen] = useState(false)
  const [station, setStation] = useState(null)
  const [passengers, setPassengers] = useState(43)
  const [glitch, setGlitch] = useState(false)
  // Master level. Everything audible is scaled by it, so one control moves the
  // whole carriage rather than just the song.
  const [volume, setVolume] = useState(0.85)

  // Two decks, not one per clip. Only two videos are ever fetched or decoded at
  // a time, which keeps the initial download halved and stays inside the
  // concurrent-video limit mobile Safari enforces.
  const [turn, setTurn] = useState(0)
  const [decks, setDecks] = useState([0, 1])
  const deckRefs = useRef([])

  const ambienceRef = useRef(null)
  const [band, setBand] = useState('tape') // 'tape' = the record library, 'fm' = live radio
  // Built on entry, not on band — tearing the player down every time someone
  // glances at FM would cost a fresh iframe and lose the place in the playlist.
  const tape = useTube(entered)
  const fm = useFm(band === 'fm')
  const source = band === 'fm' ? fm : tape
  // One corridor per visit, boarded at its origin and walked stop by stop.
  const route = useMemo(() => routes[Math.floor(Math.random() * routes.length)], [])
  const [leg, setLeg] = useState(0)
  // The interval reads the current leg, and re-creating it on every stop would
  // reset the 36s clock. A ref keeps the count outside the effect's closure.
  const legRef = useRef(0)

  const front = turn % 2

  useEffect(() => {
    const id = setInterval(() => {
      setPassengers(p => Math.max(12, p + (Math.random() > 0.5 ? 1 : -1)))
    }, 7000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTurn(t => t + 1), HOLD)
    return () => clearInterval(id)
  }, [])

  // Queue the next clip into the deck that just went to the back, but only once
  // its fade-out has finished — swapping sooner would show the change on screen.
  useEffect(() => {
    if (turn === 0) return
    const back = 1 - (turn % 2)
    const id = setTimeout(() => {
      setDecks(d => {
        const n = [...d]
        n[back] = (turn + 1) % clips.length
        return n
      })
    }, FADE + 200)
    return () => clearTimeout(id)
  }, [turn])

  // Both decks run continuously so the incoming clip is already in motion.
  useEffect(() => {
    deckRefs.current.forEach(v => v?.play().catch(() => {}))
  }, [decks])

  useEffect(() => {
    if (!entered) return
    // Stations are only a line of text now — the drawn platform that used to
    // slide across the footage was competing with it.
    const stationTimer = setInterval(() => {
      const next = (legRef.current + 1) % route.length
      legRef.current = next
      setStation(route[next])
      // Held back until the platform has gone by, so the "somewhere after" line
      // reads as the stop just passed rather than the one being passed.
      setTimeout(() => { setLeg(next); setStation(null) }, 8500)
    }, 36000)
    // Occasional tape-tracking slip keeps the picture feeling like worn stock.
    // Rare enough to be noticed rather than watched for, and off the 36s station
    // beat so the two never land together and start reading as a cycle.
    const glitchTimer = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 420)
    }, 31000)
    return () => { clearInterval(stationTimer); clearInterval(glitchTimer) }
  }, [entered, route])

  // Opening the window lets the night in and pushes the music back. Both beds
  // ride the master level, so muting is one move.
  const setTapeVolume = tape.setVolume
  const setFmVolume = fm.setVolume
  useEffect(() => {
    const state = windowOpen ? 'open' : 'closed'
    const music = MUSIC[state] * volume
    setTapeVolume(music)
    setFmVolume(music)
    if (ambienceRef.current) ambienceRef.current.volume = AMBIENCE[state] * volume
    // tape.ready is a dependency because the YouTube player can't take a volume
    // until it exists; this re-applies the mix the moment it does.
  }, [windowOpen, volume, tape.ready, setTapeVolume, setFmVolume])

  // Only one source is ever audible; switching bands hands playback over.
  const tapePause = tape.pause
  const fmPause = fm.pause
  useEffect(() => {
    if (!entered) return
    if (band === 'fm') { tapePause(); fm.play() } else { fmPause(); tape.play() }
    // Deliberately keyed on band alone — this is the hand-off, not a play/pause sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band, entered])

  function enter() {
    setEntered(true)
    source.play()
    ambienceRef.current?.play().catch(() => {})
  }

  const nowPlaying = band === 'fm'
    ? {
        title: fm.error ? 'Static' : fm.station?.name ?? 'Tuning…',
        artist: fm.error ? `${fm.station?.band ?? ''} · ${fm.error}` : fm.station?.band ?? '',
      }
    : tape.error
      ? { title: 'Radio silence', artist: tape.error }
      : tape.loading
        ? { title: 'Threading the tape…', artist: 'a moment' }
        : tape.current ?? { title: 'Old Hindi', artist: '' }

  return (
    <main className={`scene ${lightsOff ? 'lights-off' : ''} ${windowOpen ? 'window-open' : ''} ${glitch ? 'glitching' : ''}`}>
      <audio {...fm.bind} />
      <audio ref={ambienceRef} src="/audio/train-ambience.mp3" loop preload="none" />

      {/* The tape deck. Kept at a real 640x360 and moved off-screen rather than
          display:none — a player that is never laid out gets throttled or
          refuses to start in some browsers, and zero-sizing it does the same.
          Note this is contrary to YouTube's terms, which require the player to
          stay visible; the "listen on youtube" link under the controls is the
          attribution that goes with taking the audio alone. Making the deck
          visible again is a CSS change in `.deck`, nothing more. */}
      <div className="deck" aria-hidden="true">
        <div ref={tape.hostRef} />
      </div>

      <div className="world" aria-hidden="true">
        {decks.map((clipIndex, deck) => (
          <video
            key={deck}
            ref={el => { deckRefs.current[deck] = el }}
            className={`plate ${front === deck ? 'live' : ''}`}
            src={clips[clipIndex]}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
          />
        ))}
        <div className="coach-light" />
        <div className="scanlines" />
        <div className="vignette" />
        <div className="tracking" />
      </div>

      {!entered && (
        <section className="entry">
          <p className="eyebrow">KAHIN DOOR</p>
          <h1>Somewhere between<br />two stations.</h1>
          <p className="entry-copy">A little music. A dark window. Nowhere you need to be.</p>
          <button className="enter-button" onClick={enter}>Take the window seat <span>→</span></button>
        </section>
      )}

      {entered && (
        <>
          <header className="topline">
            <div>
              <strong>KAHIN DOOR</strong>
              <span>night journey</span>
            </div>
            <div className="passengers"><i /> {passengers} window seats occupied</div>
          </header>

          <div className="journey-note">
            {station ? <>Passing <strong>{station}</strong></> : <>Somewhere after <strong>{route[leg]}</strong></>}
          </div>

          <section className="player">
            <div className="band" role="group" aria-label="Source">
              <button
                className={band === 'tape' ? 'on' : ''}
                aria-pressed={band === 'tape'}
                onClick={() => setBand('tape')}
              >TAPE</button>
              <i aria-hidden="true">/</i>
              <button
                className={band === 'fm' ? 'on' : ''}
                aria-pressed={band === 'fm'}
                onClick={() => setBand('fm')}
              >FM</button>
            </div>

            <strong className="title">{nowPlaying.title}</strong>
            <span className="credit">{nowPlaying.artist}</span>

            <div className="controls">
              <button aria-label={band === 'fm' ? 'Previous station' : 'Previous track'} onClick={source.prev}>‹‹</button>
              <button
                className="play"
                aria-label={source.playing ? 'Pause' : 'Play'}
                onClick={() => (source.playing ? source.pause() : source.play())}
              >
                {source.playing ? '❚❚' : '▶'}
              </button>
              <button aria-label={band === 'fm' ? 'Next station' : 'Next track'} onClick={source.next}>››</button>
            </div>

            {/* A hairline, not a widget. Left at full width on touch, where
                there is no hover to reveal anything. */}
            <label className="level">
              <span className="sr-only">Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                style={{ '--fill': `${volume * 100}%` }}
              />
            </label>

            {band === 'tape' && tape.current?.id && (
              <a
                className="tube-link"
                href={`https://www.youtube.com/watch?v=${tape.current.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                listen on youtube <span>↗</span>
              </a>
            )}
          </section>

          <footer>
            <button onClick={() => setLightsOff(!lightsOff)}>{lightsOff ? 'turn light on' : 'turn light off'}</button>
            <span>·</span>
            <button onClick={() => setWindowOpen(!windowOpen)}>{windowOpen ? 'close window' : 'open window'}</button>
            <span>·</span>
            <button onClick={() => navigator.share?.({ title: 'Kahin Door', text: 'Somewhere between two stations.', url: window.location.href })}>share journey</button>
          </footer>

          <a
            className="spotify-link"
            href={SPOTIFY_PLAYLIST}
            target="_blank"
            rel="noopener noreferrer"
          >
            ♫ also on spotify <span>→</span>
          </a>
        </>
      )}

      <div className="grain" aria-hidden="true" />
    </main>
  )
}
