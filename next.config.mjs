/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        destination: 'https://greeneco-navy.vercel.app/login/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
