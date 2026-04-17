// supabase/functions/rpc_send_custom_smtp_email/index.ts
// Deno Edge Function — raw SMTP over STARTTLS (port 587). NO Node Buffer polyfills.
// Env vars required: SMTP_HOST, SMTP_PORT (optional, default 587), SMTP_USER, SMTP_PASS, SMTP_FROM (optional)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function jsonResponse(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function b64Ascii(s: string) {
  // use btoa for ASCII credentials
  return btoa(s);
}

async function writeLine(conn: Deno.Conn, line: string) {
  await conn.write(enc.encode(line + "\r\n"));
}

async function readReply(conn: Deno.Conn): Promise<string> {
  const buf = new Uint8Array(8192);
  const n = await conn.read(buf);
  if (n === null) throw new Error("SMTP connection closed");
  return dec.decode(buf.subarray(0, n));
}

async function expectCode(reply: string, code: string) {
  if (!reply.startsWith(code)) {
    throw new Error(`SMTP expected ${code}, got: ${reply.trim()}`);
  }
}

function makeMessage(fromEmail: string, to: string, subject: string, text?: string, html?: string) {
  const boundary = "----dd_boundary_" + crypto.randomUUID();
  const headers = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    html
      ? `Content-Type: multipart/alternative; boundary="${boundary}"`
      : `Content-Type: text/plain; charset=utf-8`,
  ].join("\r\n");

  if (!html) {
    return headers + `\r\n\r\n${text ?? ""}\r\n`;
  }

  const parts = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="utf-8"`,
    ``,
    text ?? "",
    `--${boundary}`,
    `Content-Type: text/html; charset="utf-8"`,
    ``,
    html,
    `--${boundary}--`,
    ``,
  ].join("\r\n");

  return headers + `\r\n\r\n` + parts + `\r\n`;
}

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
      return jsonResponse({ success: false, error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const to: string | undefined = body?.to;
    const subject: string | undefined = body?.subject;
    const text: string | undefined = body?.text || body?.content || "";
    const html: string | undefined = body?.html;

    if (!to || !subject) {
      return jsonResponse({ success: false, error: "Missing to or subject" }, 400);
    }

    const host = Deno.env.get("SMTP_HOST");
    const port = Number(Deno.env.get("SMTP_PORT") ?? "587");
    const user = Deno.env.get("SMTP_USER");
    const pass = Deno.env.get("SMTP_PASS");
    const fromEmail = Deno.env.get("SMTP_FROM") ?? user;

    if (!host || !user || !pass || !fromEmail) {
      return jsonResponse({ success: false, error: "SMTP environment not configured" }, 500);
    }

    // 1) Connect plain TCP and read greeting
    let conn = await Deno.connect({ hostname: host, port });
    let reply = await readReply(conn);
    await expectCode(reply, "220");

    // 2) EHLO
    await writeLine(conn, `EHLO dinedeals.local`);
    reply = await readReply(conn);
    await expectCode(reply, "250");

    // 3) STARTTLS
    await writeLine(conn, `STARTTLS`);
    reply = await readReply(conn);
    await expectCode(reply, "220");

    // 4) Upgrade to TLS
    // Deno.startTls should be available in Edge runtime
    // @ts-ignore
    conn = await Deno.startTls(conn, { hostname: host });

    // 5) EHLO again
    await writeLine(conn, `EHLO dinedeals.local`);
    reply = await readReply(conn);
    await expectCode(reply, "250");

    // 6) AUTH LOGIN
    await writeLine(conn, `AUTH LOGIN`);
    reply = await readReply(conn);
    await expectCode(reply, "334");
    await writeLine(conn, b64Ascii(user));
    reply = await readReply(conn);
    await expectCode(reply, "334");
    await writeLine(conn, b64Ascii(pass));
    reply = await readReply(conn);
    await expectCode(reply, "235");

    // 7) MAIL FROM / RCPT TO
    await writeLine(conn, `MAIL FROM:<${fromEmail}>`);
    reply = await readReply(conn);
    await expectCode(reply, "250");

    await writeLine(conn, `RCPT TO:<${to}>`);
    reply = await readReply(conn);
    if (!reply.startsWith("250") && !reply.startsWith("251")) {
      throw new Error(`RCPT failed: ${reply.trim()}`);
    }

    // 8) DATA
    await writeLine(conn, `DATA`);
    reply = await readReply(conn);
    await expectCode(reply, "354");

    const message = makeMessage(fromEmail, to, subject, text, html);
    await conn.write(enc.encode(message + "\r\n.\r\n"));
    reply = await readReply(conn);
    await expectCode(reply, "250");

    // 9) QUIT
    await writeLine(conn, `QUIT`);
    try { await conn.close(); } catch {}

    return jsonResponse({ success: true });
  } catch (err) {
    try { /* attempt close if conn exists */ } catch {}
    const msg = err && typeof err === "object" && "message" in err ? (err as any).message : String(err);
    return jsonResponse({ success: false, error: msg }, 200);
  }
});
