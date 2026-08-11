'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TRACKS } from './tracks'

/**
 * The tape deck, backed by YouTube's IFrame player.
 *
 * Chosen over a music API because it is the only source that gives full tracks,
 * needs no account from the listener, and streams from the rights holder's own
 * upload — so it scales to an audience instead of to a demo.
 *
 * The running order is ours (see `./tracks`) and tracks are driven one at a time
 * with loadVideoById, rather than handing the embed a playlist id and hoping.
 * The deck plays off-screen; see the note on `.deck` in globals.css.
 */

const API_SRC = 'https://www.youtube.com/iframe_api'

const shuffle = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// One script, one global callback, however many mounts. React strict mode
// double-invokes effects in development, so this has to be idempotent.
let apiPromise = null
function loadApi() {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT) }
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const s = document.createElement('script')
      s.src = API_SRC
      s.async = true
      s.onerror = () => reject(new Error('could not load the player'))
      document.head.appendChild(s)
    }
  })
  return apiPromise
}

export function useTube(active) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [error, setError] = useState(null)

  // Volume can be set before the player exists; it is replayed on ready.
  const pendingVolume = useRef(1)
  const wantPlay = useRef(false)
  // Shuffled once per visit and held in a ref, so the running order survives
  // every re-render without reshuffling under the listener.
  const order = useRef(null)
  if (order.current === null) order.current = shuffle(TRACKS)

  // The interval-free equivalent of next/prev: move the pointer and hand the
  // player the new id. `load` starts playback, which is what is wanted whenever
  // a track changes for any reason other than first paint.
  const step = useCallback(dir => {
    setIndex(i => {
      const n = (i + dir + order.current.length) % order.current.length
      playerRef.current?.loadVideoById?.(order.current[n].id)
      return n
    })
  }, [])

  const current = order.current[index]

  useEffect(() => {
    // This does load on first paint, unlike the FM tuner. It has to: autoplay
    // with sound is only granted inside a user gesture, so the player must
    // already exist when the entry button is clicked for that click to start
    // it. Building it on entry meant playVideo ran on `onReady`, seconds after
    // the gesture had expired, and the browser refused it in silence.
    if (!active || !hostRef.current || playerRef.current) return

    let cancelled = false

    // The iframe is built here rather than by handing YT.Player a <div>.
    //
    // Given a div, the API creates its own iframe, which is briefly about:blank
    // — and about:blank inherits *this* page's origin. The widget then posts its
    // handshake with targetOrigin https://www.youtube.com, the browser compares
    // that against a window still on our origin, and rejects it:
    //
    //   Failed to execute 'postMessage' ... target origin
    //   ('https://www.youtube.com') does not match the recipient window's
    //   origin ('https://kahindoor.vercel.app')
    //
    // Constructing the iframe with a real src means it is never on our origin,
    // so the handshake has a youtube.com window to talk to from the start.
    // Passing an existing iframe also sidesteps the other problem with a div:
    // YT.Player *replaces* the node it is given, and replacing a node React
    // rendered leaves React holding a detached reference that throws on unmount.
    const first = order.current[0]
    const params = new URLSearchParams({
      autoplay: '0',
      controls: '0',
      disablekb: '1',
      modestbranding: '1',
      rel: '0',
      playsinline: '1',
      iv_load_policy: '3',
      enablejsapi: '1',
      origin: window.location.origin,
    })
    const frame = document.createElement('iframe')
    frame.src = `https://www.youtube.com/embed/${first.id}?${params}`
    frame.width = '640'
    frame.height = '360'
    frame.allow = 'autoplay; encrypted-media'
    frame.setAttribute('frameborder', '0')
    frame.title = 'Tape deck'
    hostRef.current.appendChild(frame)

    loadApi()
      .then(YT => {
        if (cancelled) return
        playerRef.current = new YT.Player(frame, {
          events: {
            onReady: e => {
              if (cancelled) return
              e.target.setVolume(Math.round(pendingVolume.current * 100))
              setReady(true)
              if (wantPlay.current) e.target.playVideo()
            },
            onStateChange: e => {
              setPlaying(e.data === YT.PlayerState.PLAYING)
              // The playlist is ours, so the end of a track is our cue to move.
              if (e.data === YT.PlayerState.ENDED) step(1)
            },
            // A pulled or region-blocked video shouldn't strand the deck on
            // silence. Errors 100/101/150 are exactly that case.
            onError: () => { step(1) },
          },
        })
      })
      .catch(() => { if (!cancelled) setError('could not load the player') })

    return () => {
      cancelled = true
      playerRef.current?.destroy?.()
      playerRef.current = null
      setReady(false)
      // destroy() removes the iframe itself; clearing the wrapper covers the
      // case where the player was never constructed.
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [active, step])

  const play = useCallback(() => {
    wantPlay.current = true
    playerRef.current?.playVideo?.()
  }, [])

  const pause = useCallback(() => {
    wantPlay.current = false
    playerRef.current?.pauseVideo?.()
  }, [])

  const setVolume = useCallback(v => {
    pendingVolume.current = v
    playerRef.current?.setVolume?.(Math.round(v * 100))
  }, [])

  const next = useCallback(() => step(1), [step])
  const prev = useCallback(() => step(-1), [step])

  return {
    hostRef,
    ready,
    playing,
    current,
    error,
    loading: active && !ready && !error,
    play,
    pause,
    setVolume,
    next,
    prev,
  }
}
