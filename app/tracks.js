// Old Hindi film songs, from Saregama's "Old Hindi Songs" playlist.
//
// Two filters made this list, and both matter.
//
// **Single songs only.** That playlist is mostly audio jukeboxes -- 62 of its
// 100 entries run past ten minutes, one of them for 289 -- and a jukebox makes
// the now-playing line a lie for the next forty minutes. Entries are kept only
// if they run between 1:30 and 10:00. Duration is the honest signal here;
// titles are not, since "Kishore Kumar Hits" and a single Kishore song look
// alike until you read the length.
//
// **Embeddable only.** Every id was checked against YouTube's oEmbed endpoint,
// which returns 200 for an embeddable video and 403 for one with embedding
// disabled. A blocked video is invisible until it plays silently in the deck:
//
//   curl "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json"
//
// Durations come from the watch page ("lengthSeconds"), not from oEmbed, which
// does not carry them.
//
// Titles are cleaned of upload furniture ("Lyrical", "Audio", "Trending") here
// rather than at runtime, so the player has nothing to parse and the song is
// known before the player is.
//
// 34 songs, about 183 minutes.
export const TRACKS = [
  { id: 'KqGPnBpw4kQ', title: "Aa Chal Ke Tujhe", artist: "Father's Day Special · Kishore Kumar" },
  { id: 'gsZjJGUVny8', title: "Aaja Tujhko Pukare Mera Pyar", artist: "Neel Kamal · Waheeda Rehman, Raaj Kumar, Manoj Kumar, Mohammad Rafi" },
  { id: '5X2ZrM268Cc', title: "Ae Yaar Sun Yaari Teri", artist: "Amitabh Bachchan · Shashi Kapoor" },
  { id: 'ME0fguaRPhA', title: "Ajib Dastan Hai Yeh", artist: "Dil Apna Aur Preet Parai · Raaj Kumar, Meena Kumari, Lata Mangeshkar" },
  { id: 'x5N8p6kvuBY', title: "Aur Is Dil Mein", artist: "Asha Bhosle · Suresh Wadkar" },
  { id: 'rVr29AqvST4', title: "Chhupa Lo Yun Dil Men", artist: "Hemant Kumar · Lata Mangeshkar" },
  { id: 'i1y9V8DiNtY', title: "Chup Gaye Sare Nazare", artist: "Lata Mangeshkar · Mohammed Rafi" },
  { id: 'XuCp0r3vhPQ', title: "Chura Liya Hai Tumne Jo Dil Ko", artist: "Zeenat Aman · Asha Bhosle" },
  { id: 'WZ395Yay2f0', title: "Dard-E-Dil Dard-E-Jigar", artist: "Karz · Rishi Kapoor" },
  { id: 'uEe94AhRwBI', title: "Dil Cheez Kya Hai", artist: "Umrao Jaan · Rekha" },
  { id: 'NJzNMjFPhgc', title: "Din Maheene Saal", artist: "Kishore Kumar · Lata Mangeshkar" },
  { id: '_YzYm_jyQ6E', title: "Dum Maro Dum", artist: "Hare Rama Hare Krishna · Dev Anand, Zeenat Aman, Asha Bhosle, R.D. Burman" },
  { id: 'HrbiT0ntqZw', title: "Ek Roz Main Tadapkar", artist: "Bemisal · Kishore Kumar" },
  { id: 'sU5phTlw32E', title: "Faza Bhi Hai Jawan", artist: "Nikaah · Salma Agha" },
  { id: '1n13FVRtVxs', title: "Hum Tere Pyar Mein", artist: "Dil Ek Mandir · Lata Mangeshkar, Meena Kumari" },
  { id: 'TYU3TJAyBgA', title: "Intaha Ho Gai Intezar Ki", artist: "Amitabh Bachchan · Asha Bhosle" },
  { id: 'PUBaJz8eoRk', title: "Itna Na Mujhse Tu Pyar Badha", artist: "Chhaya · Lata Mangeshkar, Talat Mahmood, Sunil Dutt, Asha Parekh" },
  { id: 'f7ZxrbcBAfY', title: "Ja Re Ja O Harjaee", artist: "Kalicharan · Shatrughan Sinha" },
  { id: 'Mer7TMWR31U', title: "Jhoot Bole Kauva Kate", artist: "Bobby · Lata Mangeshkar" },
  { id: 'IbR8qDhuwyc', title: "Jooma Chumma De De", artist: "Hum · Amitabh Bachchan, Sudesh Bhosle, Kavita Krishnamurthy, Anand B" },
  { id: 'THZNB0BU0fs', title: "Kya Hua Tera Vada", artist: "Hum Kisise Kum Naheen · Mohammed Rafi, Sushma Shresth, R.D. Burman" },
  { id: 'TXLxM3dLQZY', title: "Lakhon Hain Yahan Dilwale", artist: "Kismat · Mahendra Kapoor" },
  { id: 'sk8OCQhFbgo', title: "Mausam Pyar Ka", artist: "Sitamgar · Asha Bhosle" },
  { id: 'sr9b_6zFWxw', title: "Mere Mehboob Qayamat Hogi", artist: "Mr. X In Bombay · Kishore Kumar" },
  { id: 'cS59NcunnZU', title: "My Name Is Lakhan", artist: "Ram Lakhan · Anil Kapoor, Madhuri Dixit, Mohammed Aziz, Anuradha Paudwal" },
  { id: '3rRdJNNK2-Y', title: "Pathar Ke Sanam", artist: "Manoj Kumar · Mumtaz" },
  { id: 'xONG-upaK14', title: "Piya Tu Ab To Aaja", artist: "Caravan 1971 · Asha Bhosle, R D Burman, Helen, Jeetendra" },
  { id: 'f08OSVD4CyQ', title: "Rahen Na Rahen", artist: "Mamta · Lata Mangeshkar" },
  { id: 'zS5y8a5wkno', title: "Ramba Ho-Ho-Ho Samba Ho-Ho-Ho", artist: "Armaan · Usha Uthup" },
  { id: 'ShASaB9Zmn4', title: "Tadpaoge Tadpa Lo", artist: "Barkha · Lata Mangeshkar" },
  { id: 'yrUjIrWA0g0', title: "Teri Yaad Aa Rahi Hai", artist: "Lata Mangeshkar · Amit Kumar" },
  { id: '6rQYVedjo0g', title: "Yaad Aa Raha Hai", artist: "Disco Dancer · Mithun Chakraborty" },
  { id: 's__8bWTBYqI', title: "Zindagi Aa Raha Hoon Main", artist: "Mashaal · Kishore Kumar" },
  { id: '468bT5DHBBA', title: "Zindagi Ki Na Toote Ladi", artist: "Kranti · Lata Mangeshkar" },
]
