'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { loadTracks } from './saavn'

/**
 * The coach radio. Plain HTML5 audio streamed straight off the CDN — no API key,
 * no third-party player, nothing bundled.
 *
 * Tracks that fail to load are skipped rather than stalling on silence, since
 * individual URLs do occasionally go stale.
 */
export function useRadio() {
  const audioRef = useRef(null)
  const [tracks, setTracks] = useState([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Set once the user has asked for sound, so a track that loads later still
  // starts on its own instead of waiting for another click.
  const wantPlay = useRef(false)
  // Guards against an unreachable item spinning through the whole list.
  const failures = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    loadTracks(controller.signal)
      .then(list => {
        if (controller.signal.aborted) return
        if (!list.length) setError('No tracks found')
        setTracks(list)
        setLoading(false)
      })
      .catch(err => {
        if (controller.signal.aborted) return
        setError(err.message)
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const step = useCallback(dir => {
    setTracks(t => {
      if (t.length) setIndex(i => (i + dir + t.length) % t.length)
      return t
    })
  }, [])

  const next = useCallback(() => { failures.current = 0; step(1) }, [step])
  const prev = useCallback(() => { failures.current = 0; step(-1) }, [step])

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

  // Point the element at the current track and, if sound was already wanted,
  // keep it rolling across the change.
  const current = tracks[index]
  useEffect(() => {
    const el = audioRef.current
    if (!el || !current) return
    el.src = current.src
    el.load()
    if (wantPlay.current) el.play().catch(() => {})
  }, [current])

  const onEnded = useCallback(() => { failures.current = 0; step(1) }, [step])

  const onError = useCallback(() => {
    // Walk past dead files, but stop if the whole list is unreachable so the
    // UI can say so instead of cycling forever.
    failures.current += 1
    if (failures.current > 8) {
      setError('signal lost')
      setPlaying(false)
      return
    }
    step(1)
  }, [step])

  const bind = {
    ref: audioRef,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded,
    onError,
    onCanPlay: () => { failures.current = 0 },
    preload: 'none',
  }

  return { bind, tracks, current, playing, loading, error, play, pause, setVolume, next, prev }
}
