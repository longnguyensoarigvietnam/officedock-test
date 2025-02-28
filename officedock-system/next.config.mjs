/** @type {import('next').NextConfig} */

const backendUrl = process.env.NEXT_PUBLIC_API_URL;

const backendHost = new URL(backendUrl).hostname;

const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    remotePatterns: [
      {
          protocol: 'https',
          hostname: backendHost,
          port: '',
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
