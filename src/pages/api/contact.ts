import type { APIRoute } from "astro";
import { serviceClient } from "../../lib/supabase";
import { sendContactAck } from "../../lib/email";
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
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (Date.now() - Number(body.renderedAt || 0) < 3000) {
    return new Response(JSON.stringify({ error: "Submitted too fast" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { name, email, message } = body;
  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const sb = serviceClient();
  if (sb) {
    await sb.from("contact_messages").insert({
      name: String(name).slice(0, 100),
      email: String(email).slice(0, 200),
      message: String(message).slice(0, 2000),
    });
  }

  await sendContactAck({ to: String(email), name: String(name) });

  return new Response(JSON.stringify({ ok: true, message: "Message sent! We'll reply within 1 business day." }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
};
