/** @type {import('next').NextConfig} */
const nextConfig = {
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
