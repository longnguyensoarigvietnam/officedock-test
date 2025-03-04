/** @type {import('next').NextConfig} */

const backendUrl = process.env.NEXT_PUBLIC_API_URL;

const { hostname, protocol, port } = new URL(backendUrl);

const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: protocol.replace(':', ''),
        hostname,
        port: port || '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
