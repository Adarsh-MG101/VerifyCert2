/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:8080",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com http://localhost:8080",
              "font-src 'self' https://fonts.gstatic.com http://localhost:8080",
              "img-src 'self' data: blob: http://localhost:8080 http://localhost:5000 https://placehold.co",
              "frame-src 'self' http://localhost:8080",
              "connect-src 'self' http://localhost:5000 http://localhost:8080 ws://localhost:8080",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
