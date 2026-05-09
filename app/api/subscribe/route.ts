import { createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type SubscribeLang = "es" | "en";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10;
const PAYLOAD_LIMIT_BYTES = 1024;
const MIN_FORM_FILL_MS = 3000;
const FIRSTNAME_MAX = 50;

// In-process sliding window. Vercel serverless instances are ephemeral and
// not shared, so this is best-effort. For hard guarantees, swap to Vercel KV
// or Upstash Redis.
const ipBuckets = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipBuckets.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    ipBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipBuckets.set(ip, recent);
  return false;
}

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  const allowed = new Set([`https://${host}`, `http://${host}`]);
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    allowed.add(process.env.NEXT_PUBLIC_SITE_URL);
  }
  return allowed.has(origin);
}

function sanitizeFirstName(raw: string): string {
  return raw
    .trim()
    .slice(0, FIRSTNAME_MAX)
    .replace(/[\x00-\x1f<>|]/g, "");
}

const generic = (status = 500) =>
  Response.json({ error: "something went wrong" }, { status });

async function fireMetaLeadEvent(email: string): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token) return;

  const hashedEmail = createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Lead",
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_source_url: siteUrl,
            user_data: { em: [hashedEmail] },
          },
        ],
        access_token: token,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // CAPI failure or timeout must not block the subscription response
  }
}

export async function POST(request: Request) {
  // 1. Same-origin check — reject anything not from our own page
  if (!isSameOrigin(request)) return generic(403);

  // 2. Payload size — reject obviously oversized bodies before parsing
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > PAYLOAD_LIMIT_BYTES) return generic(413);

  // 3. Rate limit — 3 per IP per hour
  const ip = getClientIp(request);
  if (isRateLimited(ip)) return generic(429);

  // 4. Parse + revalidate body size after read
  let email = "";
  let language: SubscribeLang = "es";
  let firstName = "";
  let honeypot = "";
  let loadedAt: number | null = null;
  try {
    const raw = await request.text();
    if (raw.length > PAYLOAD_LIMIT_BYTES) return generic(413);
    const body = JSON.parse(raw) as {
      email?: unknown;
      language?: unknown;
      firstName?: unknown;
      company?: unknown;
      loadedAt?: unknown;
    };
    if (typeof body?.email === "string") email = body.email.trim();
    if (body?.language === "en" || body?.language === "es") {
      language = body.language;
    }
    if (typeof body?.firstName === "string") {
      firstName = sanitizeFirstName(body.firstName);
    }
    if (typeof body?.company === "string") honeypot = body.company;
    if (typeof body?.loadedAt === "number" && Number.isFinite(body.loadedAt)) {
      loadedAt = body.loadedAt;
    }
  } catch {
    return generic(400);
  }

  // 5. Honeypot — silent fake-success so bots don't iterate
  if (honeypot.length > 0) {
    return Response.json({ success: true });
  }

  // 6. Timestamp — submissions faster than 3s after page load are bots
  if (loadedAt !== null && Date.now() - loadedAt < MIN_FORM_FILL_MS) {
    return Response.json({ success: true });
  }

  // 7. Email format
  if (!email || !EMAIL_RE.test(email)) return generic(400);

  // 8. Server config
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const server = process.env.MAILCHIMP_SERVER;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!apiKey || !server || !audienceId) return generic(500);

  const url = `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}/members`;
  const auth = Buffer.from(`anystring:${apiKey}`).toString("base64");

  const mergeFields: Record<string, string> = { LANGUAGE: language };
  if (firstName) mergeFields.FNAME = firstName;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        merge_fields: mergeFields,
      }),
    });
  } catch {
    return generic(502);
  }

  if (res.status === 200 || res.status === 204) {
    await fireMetaLeadEvent(email);
    return Response.json({ success: true });
  }

  if (res.status === 400) {
    try {
      const data = (await res.json()) as { title?: unknown };
      if (
        typeof data?.title === "string" &&
        data.title.includes("Member Exists")
      ) {
        return Response.json({ error: "already subscribed" }, { status: 200 });
      }
    } catch {
      // fall through
    }
  }

  return generic(500);
}
