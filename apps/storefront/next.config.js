const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

const isProd = process.env.NODE_ENV === "production"
/** Public address of the Everwear API; product images are served from its /uploads. */
const API_PUBLIC_URL = process.env.NEXT_PUBLIC_API_PUBLIC_URL || process.env.EVERWEAR_API_URL || "http://localhost:9100"
const api = new URL(API_PUBLIC_URL)

/**
 * Content Security Policy. Next.js injects inline bootstrap scripts into
 * statically rendered pages, and nonces would force every page to be dynamic,
 * so scripts allow 'unsafe-inline'. The browser only talks to this site;
 * images may also come from the API's upload folder.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://js.stripe.com${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.razorpay.com ${api.origin}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' https://api.razorpay.com https://api.stripe.com${isProd ? "" : " ws: wss:"}`,
  "frame-src 'self' https://checkout.razorpay.com https://js.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=*" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
]

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: process.env.BUILD_STANDALONE === "true" || process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/:countryCode/products/:handle", headers: [{ key: "Vary", value: "Accept" }] },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:countryCode/products/:handle([^/.]+).md",
          destination: "/:countryCode/products/:handle/markdown",
        },
        {
          source: "/:countryCode/products/:handle([^/.]+)",
          has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
          destination: "/:countryCode/products/:handle/markdown",
        },
      ],
    }
  },
  logging: { fetches: { fullUrl: true } },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75],
    // The API runs on localhost in development, which the optimizer refuses by default.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: api.protocol.replace(":", ""),
        hostname: api.hostname,
        ...(api.port ? { port: api.port } : {}),
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
}

module.exports = nextConfig
