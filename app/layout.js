import './globals.css'

export const metadata = {
  title: 'Kahin Door — Somewhere Between Two Stations',
  description: 'A tiny nostalgic Indian train-window experience.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
