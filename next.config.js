/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Next serves everything in public/ with `max-age=0, must-revalidate`,
        // which costs a round-trip per visit on files that never change. The
        // scenery and ambience are versioned by filename, so pin them.
        source: '/:dir(scenery|audio)/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
