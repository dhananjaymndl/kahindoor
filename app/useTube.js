'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * The tape deck, backed by YouTube's IFrame player.
 *
 * Chosen over a music API because it is the only source that gives full tracks,
 * needs no account from the listener, and streams from the rights holder's own
 * upload — so it scales to an audience instead of to a demo.
 *
 * YouTube's terms require the player stay visible and un-obscured, so it is
 * rendered as a small screen in the corner rather than hidden at 1px. See
 * `.deck` in globals.css.
 */

// Saregama's "Old Hindi Songs" playlist — 100 tracks, verified live, and every
// video sampled from it returned 200 from the oEmbed endpoint, which is the
// cheapest way to check a video is actually embeddable. A video that exists but
// has embedding disabled fails there with a 403, and would otherwise only show
// up as a silent player at runtime.
const PLAYLIST = 'PLP7LBOIQKXnC-LDzuYY7o9kX80WTdjE_t'

const API_SRC = 'https://www.youtube.com/iframe_api'

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

// These uploads pack the whole billing into the title:
//   "Chura Liya Hai Tumne Jo Dil Ko | Lyrical | Zeenat Aman | Asha Bhosle"
// The song is the first segment; the rest is a mix of credits and channel
// boilerplate. Anything matching NOISE is upload furniture, not a person.
const NOISE = /^(lyrical|lyrical video|video song|full song|full video|audio|audio jukebox|jukebox|old hindi songs?|song|hd|4k|remastered|official)$/i

export function parseTitle(raw, author) {
  const parts = String(raw ?? '').split('|').map(s => s.trim()).filter(Boolean)
  if (!parts.length) return { title: 'Old Hindi', artist: '' }

  const title = parts[0]
  const credits = parts.slice(1).filter(p => !NOISE.test(p))
  const artist = credits.slice(0, 2).join(' · ')

  // The channel name is a poor last resort, but better than an empty line.
  return { title, artist: artist || (NOISE.test(author ?? '') ? '' : author ?? '') }
}

export function useTube(active) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(null)
  const [error, setError] = useState(null)

  // Volume can be set before the player exists; it is replayed on ready.
  const pendingVolume = useRef(1)
  const wantPlay = useRef(false)

  const readTrack = useCallback(() => {
    const p = playerRef.current
    if (!p?.getVideoData) return
    const data = p.getVideoData()
    if (data?.title) setCurrent({ ...parseTitle(data.title, data.author), id: data.video_id })
  }, [])

  useEffect(() => {
    // Nothing is fetched until someone has actually taken the seat — an API
    // script and a player iframe on every page load is precisely the eager
    // loading this app avoids elsewhere.
    if (!active || !hostRef.current || playerRef.current) return

    let cancelled = false
    // YT.Player *replaces* the element it is handed with an iframe. Handing it
    // a node React rendered leaves React holding a reference to a node that is
    // no longer in the tree, and unmount then throws on removeChild. So the
    // mount point is created here, outside React's ownership, inside a wrapper
    // React does own.
    const mount = document.createElement('div')
    hostRef.current.appendChild(mount)

    loadApi()
      .then(YT => {
        if (cancelled) return
        playerRef.current = new YT.Player(mount, {
          width: '100%',
          height: '100%',
          playerVars: {
            listType: 'playlist',
            list: PLAYLIST,
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            // Without these the widget posts to 'https://www.youtube.com' and
            // the browser rejects every message with an origin mismatch, which
            // is the console error this whole player used to spew.
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: e => {
              if (cancelled) return
              e.target.setShuffle(true)
              e.target.setVolume(Math.round(pendingVolume.current * 100))
              setReady(true)
              readTrack()
              if (wantPlay.current) e.target.playVideo()
            },
            onStateChange: e => {
              setPlaying(e.data === YT.PlayerState.PLAYING)
              if (e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.CUED) readTrack()
            },
            // A pulled or region-blocked video shouldn't strand the deck on
            // silence; step past it the way the old player stepped past a dead
            // URL. Errors 100/101/150 are exactly that case.
            onError: () => { playerRef.current?.nextVideo?.() },
          },
        })
      })
      .catch(() => { if (!cancelled) setError('could not load the player') })

    return () => {
      cancelled = true
      playerRef.current?.destroy?.()
      playerRef.current = null
      setReady(false)
      // The iframe replaced `mount`, so clear the wrapper rather than the node.
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [active, readTrack])

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

  const next = useCallback(() => { playerRef.current?.nextVideo?.() }, [])
  const prev = useCallback(() => { playerRef.current?.previousVideo?.() }, [])

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
