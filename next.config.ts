import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

let exportedConfig = nextConfig;

if (process.env.NODE_ENV === 'production') {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
  });
  exportedConfig = withPWA(nextConfig);
}

export default exportedConfig;
