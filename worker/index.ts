/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RESEND_API_KEY?: string;
  RSVP_EMAIL?: string;
  RSVP_FROM_EMAIL?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const RSVP_ORIGINS = new Set([
  "https://arinaexe.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function rsvpHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    vary: "Origin",
  };
  if (origin && RSVP_ORIGINS.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-methods"] = "POST, OPTIONS";
    headers["access-control-allow-headers"] = "Content-Type";
  }
  return headers;
}

function rsvpJson(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: rsvpHeaders(request) });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/rsvp") {
      const origin = request.headers.get("origin");
      if (origin && !RSVP_ORIGINS.has(origin)) {
        return rsvpJson(request, { error: "Origin is not allowed" }, 403);
      }
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: rsvpHeaders(request) });
      }
      if (request.method !== "POST") {
        return rsvpJson(request, { error: "Method not allowed" }, 405);
      }
      if (!env.RESEND_API_KEY || !env.RSVP_EMAIL || !env.RSVP_FROM_EMAIL) {
        return rsvpJson(request, { error: "RSVP delivery is not configured" }, 503);
      }

      try {
        const data = await request.json() as {
          name?: unknown;
          attendance?: unknown;
          company?: unknown;
          companion?: unknown;
          drinks?: unknown;
          comment?: unknown;
          website?: unknown;
          submissionId?: unknown;
        };
        if (typeof data.website === "string" && data.website.trim()) {
          return rsvpJson(request, { ok: true });
        }
        const name = typeof data.name === "string" ? data.name.trim().slice(0, 120) : "";
        const attendance = typeof data.attendance === "string" ? data.attendance.trim().slice(0, 120) : "";
        const company = typeof data.company === "string" ? data.company.trim().slice(0, 120) : "";
        const companion = typeof data.companion === "string" ? data.companion.trim().slice(0, 120) : "";
        const drinks = Array.isArray(data.drinks)
          ? data.drinks.filter((drink): drink is string => typeof drink === "string").map((drink) => drink.trim().slice(0, 80)).filter(Boolean).slice(0, 10)
          : [];
        const comment = typeof data.comment === "string" ? data.comment.trim().slice(0, 1000) : "";
        const submissionId = typeof data.submissionId === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(data.submissionId)
          ? data.submissionId
          : crypto.randomUUID();
        if (!name || !attendance) return rsvpJson(request, { error: "Invalid RSVP" }, 400);

        const text = [
          "Новый ответ на свадьбу Арины и Максима",
          "",
          `Гость: ${name}`,
          `Ответ: ${attendance}`,
          company ? `Придёт: ${company}` : "Придёт: —",
          companion ? `Второй гость: ${companion}` : "Второй гость: —",
          drinks.length ? `Напитки: ${drinks.join(", ")}` : "Напитки: —",
          comment ? `Комментарий: ${comment}` : "Комментарий: —",
        ].join("\n");
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${env.RESEND_API_KEY}`,
            "idempotency-key": `wedding-rsvp/${submissionId}`,
          },
          body: JSON.stringify({
            from: env.RSVP_FROM_EMAIL,
            to: [env.RSVP_EMAIL],
            subject: `RSVP: ${name}`,
            text,
          }),
        });
        if (!emailResponse.ok) {
          console.error("RSVP email rejected", emailResponse.status, await emailResponse.text());
          return rsvpJson(request, { error: "Unable to deliver RSVP" }, 502);
        }
        return rsvpJson(request, { ok: true });
      } catch (error) {
        console.error("RSVP submission failed", error);
        return rsvpJson(request, { error: "Unable to send RSVP" }, 502);
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
