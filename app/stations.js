// Live Indian radio. Every entry below was checked to return 200 with an audio
// or HLS content-type, and every URL is https — plain http streams are blocked
// as mixed content once this is deployed, which rules out a lot of what the
// public directories list.
//
// Station list sourced from radio-browser.info. If one goes off air, check it
// there rather than guessing a replacement URL.
export const STATIONS = [
  // AIR's classic film-song service — the one this whole app is dressed as.
  { name: 'Vividh Bharati', band: 'AIR', hls: true, url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8' },
  { name: 'AIR FM Gold', band: 'DELHI', hls: true, url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio005/hlspbaudio00564kbps.m3u8' },
  { name: 'AIR FM Gold', band: 'MUMBAI', hls: true, url: 'https://airhlspush.pc.cdn.bitgravity.com/httppush/hlspbaudio007/hlspbaudio007_Auto.m3u8' },
  { name: 'AIR FM Rainbow', band: 'BENGALURU', hls: true, url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio031/playlist.m3u8' },
  { name: 'AIR FM Gold', band: 'CHENNAI', hls: true, url: 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio021/chunklist.m3u8' },
  { name: 'Radio Mirchi', band: 'HINDI', hls: false, url: 'https://eu8.fastcast4u.com/proxy/clyedupq/stream' },
  { name: 'Mirchi Love', band: 'HINDI', hls: false, url: 'https://nl4.mystreaming.net/uber/bollywoodlove/icecast.audio' },
  { name: 'Mirchi Top 20', band: 'HINDI', hls: false, url: 'https://drive.uber.radio/uber/bollywoodnow/icecast.audio' },
  { name: 'Red FM', band: 'HINDI', hls: false, url: 'https://funasia.streamguys1.com/live9' },
]
