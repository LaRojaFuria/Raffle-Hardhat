/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Define any environment variables used in your project here.
    // Example: API_ENDPOINT: process.env.API_ENDPOINT,
  },
  images: {
    loader: "custom",
    // Define any custom image loader configuration here, if needed.
  },
  // Enabling HTTP compression for improved performance.
  compress: true,
  // Disabling the X-Powered-By header for security reasons.
  poweredByHeader: false,
  // Defining custom HTTP headers for enhanced security.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // Additional configuration options can be added here.
};

// Example security headers - adjust according to your specific requirements.
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; script-src 'self'; object-src 'none';`,
  },
  // More headers can be added as per your security needs.
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer-when-downgrade',
  },
];

module.exports = nextConfig;
