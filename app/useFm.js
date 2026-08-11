'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { STATIONS } from './stations'

/**
 * Live radio tuner.
 *
 * The AIR streams are HLS, which only Safari plays natively — everything else
 * needs hls.js. That import is dynamic so the library never lands in the bundle
 * for people who stay on the tape deck.
 */
export function useFm(active) {
  const audioRef = useRef(null)
  const hlsRef = useRef(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState(null)

  // Whether sound has been asked for, so retuning keeps playing instead of
  // waiting for another click.
  const wantPlay = useRef(false)
  const station = STATIONS[index]

  useEffect(() => {
    const el = audioRef.current
    // Nothing is fetched until the listener actually switches to FM. Without
    // this the hls.js chunk downloads for everyone and a live stream connection
    // opens on page load, which defeats the point of the dynamic import.
    if (!active || !el || !station) return

    let cancelled = false
    setError(null)
    hlsRef.current?.destroy?.()
    hlsRef.current = null

    const nativeHls = !!el.canPlayType('application/vnd.apple.mpegurl')

    if (station.hls && !nativeHls) {
      import('hls.js')
        .then(({ default: Hls }) => {
          if (cancelled || !audioRef.current) return
          if (!Hls.isSupported()) { setError('not supported here'); return }

          const hls = new Hls({ enableWorker: true })
          hlsRef.current = hls
          hls.on(Hls.Events.ERROR, (_, data) => {
            // Only fatal errors are worth surfacing; hls.js recovers from the rest.
            if (data?.fatal) setError('off air')
          })
          hls.loadSource(station.url)
          hls.attachMedia(audioRef.current)
          if (wantPlay.current) audioRef.current.play().catch(() => {})
        })
        .catch(() => { if (!cancelled) setError('tuner failed') })
    } else {
      el.src = station.url
      el.load()
      if (wantPlay.current) el.play().catch(() => {})
    }

    return () => {
      cancelled = true
      hlsRef.current?.destroy?.()
      hlsRef.current = null
    }
  }, [station, active])

  const play = useCallback(() => {
    wantPlay.current = true
    audioRef.current?.play().catch(() => {})
  }, [])

  const pause = useCallback(() => {
    wantPlay.current = false
    audioRef.current?.pause()
  }, [])

  const setVolume = useCallback(v => {
    if (audioRef.current) audioRef.current.volume = v
  }, [])

  const step = useCallback(dir => {
    setIndex(i => (i + dir + STATIONS.length) % STATIONS.length)
  }, [])

  const bind = {
    ref: audioRef,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onError: () => setError('off air'),
    preload: 'none',
  }

  return {
    bind,
    station,
    playing,
    error,
    play,
    pause,
    setVolume,
    next: () => step(1),
    prev: () => step(-1),
  }
}
