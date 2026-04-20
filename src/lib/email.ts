const RESEND_KEY = import.meta.env.RESEND_API_KEY ?? process.env.RESEND_API_KEY ?? "";
const FROM = import.meta.env.EMAIL_FROM ?? process.env.EMAIL_FROM ?? "Harmony Threads <onboarding@resend.dev>";
const REPLY_TO = import.meta.env.EMAIL_REPLY_TO ?? process.env.EMAIL_REPLY_TO ?? undefined;

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_KEY) {
    console.warn("[email] RESEND_API_KEY not set; skipping");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
        reply_to: args.replyTo ?? REPLY_TO,
        tags: args.tags,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = await res.json() as { id?: string };
    return { ok: true, id: json.id };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

const BRAND_NAME = "Harmony Threads";
const BRAND_ACCENT = "#c0392b";
const SITE_URL = (import.meta.env.PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

function layout(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { margin:0; padding:0; background:#faf7f2; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif; color:#1a1009; }
  .preheader { display:none !important; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; }
  .container { max-width:560px; margin:0 auto; padding:32px 24px; }
  .card { background:#fff; border:1px solid #e8e2d6; border-radius:4px; padding:32px; }
  h1 { font-family:Georgia,'Times New Roman',serif; font-size:28px; line-height:1.2; margin:0 0 16px; letter-spacing:-0.01em; }
  p { font-size:15px; line-height:1.6; margin:0 0 16px; color:#3a3a3a; }
  .btn { display:inline-block; background:${BRAND_ACCENT}; color:#fff !important; padding:12px 24px; border-radius:2px; text-decoration:none; font-weight:600; }
  .muted { color:#8a8a8a; font-size:13px; line-height:1.5; }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:${BRAND_ACCENT}; margin-right:8px; vertical-align:middle; }
  a { color:${BRAND_ACCENT}; }
</style></head><body>
<span class="preheader">${preheader}</span>
<div class="container">
  <div style="margin-bottom:24px;"><span class="dot"></span><strong style="font-size:18px;">${BRAND_NAME}</strong></div>
  <div class="card">${content}</div>
  <p class="muted" style="text-align:center;margin-top:24px;">
    <a href="${SITE_URL}">${SITE_URL.replace(/^https?:\/\//, "")}</a>
  </p>
</div>
</body></html>`;
}

export async function sendOrderConfirmation(args: { to: string; orderId: string; amount: string; currency: string }) {
  const html = layout(`
    <h1>Order confirmed</h1>
    <p>Thanks for your order! We've received your payment and are getting it ready to ship.</p>
    <p><strong>Order number:</strong> ${args.orderId}<br /><strong>Total:</strong> ${args.currency} ${args.amount}</p>
    <p><a class="btn" href="${SITE_URL}">Continue shopping</a></p>
    <p class="muted">You'll receive another email when your order ships. Questions? Reply to this email.</p>
  `, `Order ${args.orderId} confirmed — ${args.currency} ${args.amount}`);
  return sendEmail({
    to: args.to,
    subject: `Order ${args.orderId} confirmed — ${args.currency} £${args.amount}`,
    html,
    tags: [{ name: "type", value: "order_confirmation" }, { name: "order_id", value: args.orderId }],
  });
}

export async function sendContactAck(args: { to: string; name: string }) {
  const html = layout(`
    <h1>Got your message</h1>
    <p>Hey ${args.name} — thanks for reaching out. We read every message and we'll get back to you within 1 business day.</p>
    <p class="muted">In the meantime, you might find answers in our <a href="${SITE_URL}/faq">FAQ</a>.</p>
  `, "We got your message");
  return sendEmail({
    to: args.to,
    subject: "We got your message — Harmony Threads",
    html,
    tags: [{ name: "type", value: "contact_ack" }],
  });
}
