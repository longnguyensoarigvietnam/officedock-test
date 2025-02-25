/** @type {import('next').NextConfig} */

const backendUrl = process.env.NEXT_PUBLIC_API_URL;

const backendHost = new URL(backendUrl).hostname;

const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    domains: [backendHost],
  },
};

export default nextConfig;
