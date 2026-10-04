import { kv } from "@vercel/kv";
import { NextResponse, type NextRequest } from "next/server";

const LIMIT = 20;
const WINDOW = 60; // seconds

export async function proxy(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `rl:chat:${ip}`;

  try {
    const count = await kv.incr(key);
    if (count === 1) await kv.expire(key, WINDOW);
    if (count > LIMIT) {
      return NextResponse.json(
        { detail: "Too many requests. Please wait before sending more." },
        { status: 429 },
      );
    }
  } catch {
    // KV unavailable (local dev without env vars) — pass through
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/assistant/chat",
};
