/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next's gzip middleware buffers proxied responses, which turns the dev
  // proxy below into a non-streaming one (chat replies arrive in one burst).
  // In production /api/* never passes through Next, and Vercel compresses at
  // the edge, so nothing is lost by turning it off.
  compress: false,
  // In production this is a no-op — vercel.json routes /api/* to the
  // Python serverless function. Locally, `next dev` has no Python runtime,
  // so this proxies to a `uvicorn` instance you run alongside it:
  //   uvicorn api.index:app --reload --port 8000
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }];
  },
};
module.exports = nextConfig;
