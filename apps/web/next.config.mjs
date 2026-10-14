import { fileURLToPath } from 'node:url';

/** Frontend preview only. No backend proxy, production origins or environment secrets. */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  transpilePackages: ['@muhami/ui', '@muhami/shared'],
  webpack(config) {
    config.resolve.alias['@muhami/shared'] = fileURLToPath(
      new URL('../../packages/shared/src/index.ts', import.meta.url),
    );
    return config;
  },
  experimental: { optimizePackageImports: ['lucide-react'] },
  env: { NEXT_PUBLIC_API_URL: '/preview-api-disabled', NEXT_PUBLIC_REGISTRATION_ENABLED: 'false' },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};

export default nextConfig;
