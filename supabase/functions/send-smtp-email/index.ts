import { serve } from "@supabase/functions";
import { createClient } from "@supabase/supabase-js";
import { BufReader, BufWriter } from "https://deno.land/std@0.170.0/io/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const { to, subject, content } = await req.json();
  const { data: [s], error } = await supabase.rpc("public.get_admin_email_settings");
  if (error) throw error;

  let socket = await Deno.connect({ hostname: s.smtp_host, port: s.smtp_port });
  let reader = new BufReader(socket), writer = new BufWriter(socket), enc = new TextEncoder();

  async function rl() {
    const buf = new Uint8Array(1024);
    const n = await reader.read(buf);
    return n ? new TextDecoder().decode(buf.subarray(0, n)) : "";
  }
  async function wl(l: string) {
    await writer.write(enc.encode(l + "\r\n"));
    await writer.flush();
  }

  await rl(); await wl(`EHLO ${new URL(Deno.env.get("SUPABASE_URL")!).hostname}`); await rl();
  await wl("STARTTLS"); await rl();
  socket = await Deno.startTls(socket, { hostname: s.smtp_host }) as unknown as Deno.Conn;
  reader = new BufReader(socket); writer = new BufWriter(socket);
  await wl(`EHLO ${new URL(Deno.env.get("SUPABASE_URL")!).hostname}`); await rl();
  await wl("AUTH LOGIN"); await rl(); await wl(btoa(s.smtp_user)); await rl(); await wl(btoa(s.smtp_pass)); await rl();
  await wl(`MAIL FROM:<${s.from_email}>`); await rl();
  await wl(`RCPT TO:<${to}>`); await rl();
  await wl("DATA"); await rl();
  await wl(`Subject: ${subject}\r\nFrom: ${s.from_email}\r\nTo: ${to}\r\nReply-To: ${s.reply_to}\r\n\r\n${content}\r\n.`);
  await rl(); await wl("QUIT"); await rl();
  socket.close();

  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { "Content-Type": "application/json" }
  });
});
