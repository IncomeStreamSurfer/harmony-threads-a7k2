import type { APIRoute } from "astro";
import { stripe } from "../../../lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmation } from "../../../lib/email";

export const prerender = false;

const WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET ?? "";
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE = import.meta.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE ?? "";

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get("stripe-signature");
  if (!sig) return new Response("no sig", { status: 400 });

  if (!WEBHOOK_SECRET) {
    console.warn("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return new Response("webhook secret not configured", { status: 500 });
  }

  const rawBody = await request.text();
  let event: any;
  try {
    event = await stripe().webhooks.constructEventAsync(rawBody, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[webhook] sig error:", err.message);
    return new Response(`invalid sig: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;

    if (SUPABASE_URL && SERVICE_ROLE) {
      const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
      await sb.from("orders").insert({
        stripe_session_id: s.id,
        customer_email: s.customer_details?.email ?? s.customer_email ?? null,
        amount_total_pence: s.amount_total ?? 0,
        currency: s.currency,
        status: "paid",
        cart_json: s.metadata?.cart ? JSON.parse(s.metadata.cart) : [],
        shipping_address: s.shipping_details?.address ?? null,
      });
    }

    const email = s.customer_details?.email ?? s.customer_email;
    if (email) {
      await sendOrderConfirmation({
        to: email,
        orderId: s.id.slice(-10).toUpperCase(),
        amount: ((s.amount_total ?? 0) / 100).toFixed(2),
        currency: (s.currency ?? "gbp").toUpperCase(),
      });
    }
  }

  return new Response("ok", { status: 200 });
};
