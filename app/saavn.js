// Old Hindi film music with proper metadata, via an unofficial JioSaavn API.
//
// Nothing is bundled and nothing is proxied through this app — the browser
// fetches track lists from the API and streams audio straight off JioSaavn's
// CDN, so none of it touches your own bandwidth.
//
// See the README on why this is an unofficial source and how to self-host it.
export const API = process.env.NEXT_PUBLIC_SAAVN_API || 'https://saavn.sumit.co'

// Curated JioSaavn playlists. One request each returns ~100 fully tagged songs.
export const PLAYLISTS = [
  '1219015193', // Old Hindi Hits
  '1262712286', // Old Hindi Songs
  '1214349424', // Old Hit Songs
]

// Lower bitrates start faster, which matters more here than fidelity — this is
// background music behind a window. Falls through if a track lacks the size.
const QUALITY = ['160kbps', '320kbps', '96kbps', '48kbps', '12kbps']

const pickUrl = urls => {
  if (!Array.isArray(urls)) return null
  for (const q of QUALITY) {
    const hit = urls.find(u => u?.quality === q && u?.url)
    if (hit) return hit.url
  }
  return urls.find(u => u?.url)?.url ?? null
}

// JioSaavn returns HTML entities in titles ("Dil Ka Bhanwar &amp; ...").
const decode = s =>
  String(s ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()

// These playlists run well past the era this app is going for, so anything
// after this is dropped. Raise it if you want the 90s back.
const MAX_YEAR = 1985

function toTrack(song) {
  const src = pickUrl(song?.downloadUrl)
  if (!src || !song?.name) return null

  const year = song.year ? Number(song.year) : null
  if (year && year > MAX_YEAR) return null

  // `artists.primary` mixes composers and lyricists in with the singers, which
  // is how a Kishore song ends up credited to R.D. Burman. Prefer the ones
  // actually marked as singing.
  const people = [...(song.artists?.primary ?? []), ...(song.artists?.all ?? [])]
  const sung = people.filter(a => /singer/i.test(a?.role ?? ''))
  const credited = (sung.length ? sung : (song.artists?.primary ?? []))
    .map(a => decode(a?.name))
    .filter(Boolean)

  const singers = [...new Set(credited)].slice(0, 2).join(' & ')
  // Some album names already carry the year ("Manzil (1977)"), which would
  // otherwise render as "Manzil (1977) (1977)".
  const album = decode(song.album?.name).replace(/\s*\((?:19|20)\d{2}\)\s*$/, '').trim()

  return {
    src,
    // Drop the "(From "Some Album")" tail these titles often carry.
    title: decode(song.name).replace(/\s*\(From\s+".*?"\s*\)\s*$/i, '').trim(),
    artist: [singers, album && year ? `${album} (${year})` : album]
      .filter(Boolean)
      .join(' · ') || 'Old Hindi',
  }
}

const shuffle = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Builds a shuffled track list. Playlists that fail are skipped, so one bad id
 * or a partial outage can't take the whole radio down.
 */
export async function loadTracks(signal) {
  const results = await Promise.allSettled(
    PLAYLISTS.map(async id => {
      const res = await fetch(`${API}/api/playlists?id=${id}&limit=100`, { signal })
      if (!res.ok) throw new Error(`${id}: ${res.status}`)
      const json = await res.json()
      return (json?.data?.songs ?? []).map(toTrack).filter(Boolean)
    })
  )

  const tracks = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []))

  // The same song appears across several of these playlists.
  const seen = new Set()
  const unique = tracks.filter(t => {
    const key = `${t.title}|${t.artist}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (!unique.length && results.every(r => r.status === 'rejected')) {
    throw new Error('Could not reach the music API')
  }
  return shuffle(unique)
}
