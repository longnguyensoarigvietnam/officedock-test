/** @type {import('next').NextConfig} */


const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
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
      }
    ]
  },
};

export default nextConfig;
