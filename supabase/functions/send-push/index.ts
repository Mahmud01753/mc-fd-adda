// Friend Adda — send-push (Supabase Edge Function)
// Database Webhook (mc2_ac_messages INSERT) থেকে ডাকা হয় → ওই session-এর গ্রাহকদের web-push পাঠায়।
// Secrets (শুধু Supabase → Edge Functions → Secrets; সাইটের কোনো ফাইলে নয়):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:আপনার@ইমেইল), PUSH_WEBHOOK_SECRET
//   (SUPABASE_URL ও SUPABASE_SERVICE_ROLE_KEY Supabase নিজেই দেয়)
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const FRONT_SECS = 25;   // গত এই কয়েক সেকেন্ডে চ্যাট সামনে খোলা (mc2_ac_here হাজিরা) থাকলে পাঠানো হয় না
const MAX_SHOW = 99;     // সংখ্যা এর বেশি হলে "৯৯+"
const BN = "০১২৩৪৫৬৭৮৯";
const bn = (n: number | string) => String(n).replace(/\d/g, (d) => BN[+d]);

const env = (k: string) => Deno.env.get(k) ?? "";
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:admin@example.com", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));

function same(a: string, b: string) { // সময়-নিরপেক্ষ তুলনা
  if (a.length !== b.length || !a) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!same(req.headers.get("x-webhook-secret") ?? "", env("PUSH_WEBHOOK_SECRET"))) return json({ error: "unauthorized" }, 401);

  let body: any; try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const rec = body?.record;
  if (body?.type !== "INSERT" || body?.table !== "mc2_ac_messages" || !rec?.id || !rec?.session_id) return json({ skipped: "not a message insert" });
  // লুকানো / মডারেটেড / মোছা বার্তায় পুশ নয়
  if (rec.hidden || rec.mod_removed || rec.deleted) return json({ skipped: "hidden or moderated" });

  const sid = Number(rec.session_id), mid = Number(rec.id);
  const { data: subs, error: e1 } = await db.from("fa_push_subs").select("endpoint,p256dh,auth,voter,created_at")
    .eq("session_id", sid).neq("voter", String(rec.voter ?? "")).limit(1000); // প্রেরক বাদ
  if (e1) return json({ error: e1.message }, 500);
  if (!subs?.length) return json({ sent: 0, subs: 0 });

  const since = new Date(Date.now() - FRONT_SECS * 1000).toISOString();
  const [here, seen, mod] = await Promise.all([
    db.from("mc2_ac_here").select("voter").eq("session_id", sid).gte("at", since),
    db.from("mc2_ac_seen").select("voter,last_id").eq("session_id", sid),
    db.from("mc2_ac_mod").select("voter,until").eq("state", "banned").in("voter", subs.map((s) => s.voter)),
  ]);
  const front = new Set((here.data ?? []).map((x: any) => x.voter));           // চ্যাট এখন সামনে খোলা
  const last = new Map((seen.data ?? []).map((x: any) => [x.voter, Number(x.last_id) || 0]));
  const banned = new Set((mod.data ?? []).filter((x: any) => !x.until || new Date(x.until) > new Date()).map((x: any) => x.voter));

  const cand = subs.filter((s) => !front.has(s.voter) && !banned.has(s.voter));
  if (!cand.length) return json({ sent: 0, subs: subs.length, skipped: "front/banned" });

  // শেষ-দেখা থেকে নতুন বার্তা গণনা (লুকানো/মোছা/মডারেটেড বাদ, নিজের বাদ)
  const minId = Math.min(...cand.map((s) => last.get(s.voter) ?? 0));
  const minAt = cand.map((s) => s.created_at).sort()[0];
  const { data: ms } = await db.from("mc2_ac_messages").select("id,voter,created_at").eq("session_id", sid)
    .gt("id", minId).gte("created_at", minAt).eq("hidden", false).eq("deleted", false).eq("mod_removed", false)
    .order("id", { ascending: false }).limit(500);
  const list = (ms ?? []).some((m: any) => m.id === mid) ? (ms ?? []) : [{ id: mid, voter: rec.voter, created_at: rec.created_at }, ...(ms ?? [])];

  let sent = 0, removed = 0, failed = 0;
  const gone: string[] = [];
  const jobs = cand.map((s) => async () => {
    const base = last.get(s.voter) ?? 0;
    const n = list.filter((m: any) => m.id > base && m.voter !== s.voter && m.created_at >= s.created_at).length;
    if (n < 1) return; // সে আগেই দেখে ফেলেছে
    const txt = n > MAX_SHOW ? bn(MAX_SHOW) + "+" : bn(n);
    const payload = JSON.stringify({ t: "msg", n: Math.min(n, MAX_SHOW), s: sid, tag: "fa-new", b: txt + "টি নতুন মেসেজ" }); // বার্তার লেখা কখনো যায় না
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600, urgency: "normal", topic: "fa-new" });
      sent++;
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) gone.push(s.endpoint); // মেয়াদোত্তীর্ণ/ভুল
      else { failed++; console.error("push fail", err?.statusCode, String(err?.body ?? err?.message ?? err).slice(0, 200)); }
    }
  });
  for (let i = 0; i < jobs.length; i += 20) await Promise.all(jobs.slice(i, i + 20).map((j) => j()));

  if (gone.length) { const { error } = await db.from("fa_push_subs").delete().in("endpoint", gone); if (!error) removed = gone.length; }
  return json({ sent, removed, failed, subs: subs.length, candidates: cand.length });
});
