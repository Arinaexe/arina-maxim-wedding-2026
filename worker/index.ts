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

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/rsvp") {
      if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
      }
      if (!env.RESEND_API_KEY || !env.RSVP_EMAIL || !env.RSVP_FROM_EMAIL) {
        return Response.json({ error: "RSVP delivery is not configured" }, { status: 503 });
      }

      try {
        const data = await request.json() as { name?: unknown; attendance?: unknown; comment?: unknown };
        const name = typeof data.name === "string" ? data.name.trim().slice(0, 120) : "";
        const attendance = typeof data.attendance === "string" ? data.attendance.trim().slice(0, 120) : "";
        const comment = typeof data.comment === "string" ? data.comment.trim().slice(0, 1000) : "";
        if (!name || !attendance) return Response.json({ error: "Invalid RSVP" }, { status: 400 });

        const text = [
          "Новый ответ на свадьбу Арины и Максима",
          "",
          `Гость: ${name}`,
          `Ответ: ${attendance}`,
          comment ? `Комментарий: ${comment}` : "Комментарий: —",
        ].join("\n");
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: env.RSVP_FROM_EMAIL,
            to: [env.RSVP_EMAIL],
            subject: `RSVP: ${name}`,
            text,
          }),
        });
        if (!emailResponse.ok) throw new Error("Email provider rejected the message");
        return Response.json({ ok: true });
      } catch {
        return Response.json({ error: "Unable to send RSVP" }, { status: 502 });
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
