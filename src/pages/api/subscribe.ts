import type { APIRoute } from "astro";
import { serviceClient } from "../../lib/supabase";
import { hitOrReject } from "../../lib/rate-limit";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const { ok, retryAfterSec } = hitOrReject(ip);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec), "Content-Type": "application/json" },
    });
  }

  const body = await request.json();

  if (body.website) {
    return new Response(JSON.stringify({ ok: true, message: "Thanks for subscribing!" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  }

  if (Date.now() - Number(body.renderedAt || 0) < 3000) {
    return new Response(JSON.stringify({ error: "Submitted too fast" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const sb = serviceClient();
  if (sb) {
    await sb.from("subscribers").upsert({ email, subscribed_at: new Date().toISOString() }, { onConflict: "email" });
  }

  return new Response(JSON.stringify({ ok: true, message: "You're in! Check your inbox for early access." }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
};
