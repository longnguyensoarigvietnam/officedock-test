/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
    proxyTimeout: 1800000
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_INTERNAL_URL}/api/v1/:path*/`,
      },
      {
        source: '/media/:path*',
        destination: `${process.env.API_INTERNAL_URL}/media/:path*/`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_API_URL.replace(
          /^https?:\/\/|:\d+$/g,
          '',
        ),
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: process.env.NEXT_PUBLIC_API_URL.replace(
          /^http?:\/\/|:\d+$/g,
          '',
        ),
        port: '8000',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
