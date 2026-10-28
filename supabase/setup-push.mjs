// Friend Adda — পুশ সেটআপ (এক কমান্ডে)। চালান:  node supabase/setup-push.mjs
// কী করে: VAPID কী বানায় → Supabase লগইন/লিংক → Secrets সেট → send-push deploy → config.js-এ public কী বসায়
//         → একটা SQL ফাইল বানায় (SQL-27 + Webhook) যেটা আপনি Supabase SQL Editor-এ একবার পেস্ট করবেন।
// private কী/সিক্রেট কোনো সাইট-ফাইলে লেখা হয় না। SQL ফাইল যায় আপনার Desktop-এ (সাইট ফোল্ডারের বাইরে)।
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DRY = process.argv.includes("--dry");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const b64u = (b) => Buffer.from(b).toString("base64url");

// ১) VAPID কী (P-256)
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pj = publicKey.export({ format: "jwk" }), vj = privateKey.export({ format: "jwk" });
const VAPID_PUBLIC = b64u(Buffer.concat([Buffer.from([4]), Buffer.from(pj.x, "base64url"), Buffer.from(pj.y, "base64url")]));
const VAPID_PRIVATE = vj.d;
const HOOK_SECRET = randomBytes(24).toString("hex");

// ২) প্রজেক্ট রেফ config.js থেকে
const cfgPath = join(root, "config.js");
const cfg = readFileSync(cfgPath, "utf8");
const m = cfg.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (!m) { console.error("❌ config.js-এ Supabase URL পাওয়া যায়নি।"); process.exit(1); }
const REF = m[1];

let email = "admin@example.com";
if (!DRY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = (await rl.question("📧 আপনার ইমেইল লিখুন (পুশ সার্ভিস এটা শুধু যোগাযোগের জন্য চায়): ")).trim();
  rl.close();
  if (a) email = a;
}

const run = (args, label) => {
  console.log("\n▶ " + label);
  if (DRY) { console.log("   (dry-run) npx supabase " + args.join(" ").replace(VAPID_PRIVATE, "***").replace(HOOK_SECRET, "***")); return true; }
  const r = spawnSync("npx", ["--yes", "supabase@latest", ...args], { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) { console.error("❌ ধাপটা ফেল করেছে: " + label + "\n   উপরের লাল লেখাটা আমাকে (চ্যাটে) পাঠান।"); process.exit(1); }
  return true;
};

run(["login"], "Supabase লগইন (ব্রাউজার খুলবে — Allow/Confirm দিন)");
run(["link", "--project-ref", REF], "প্রজেক্ট লিংক (ডাটাবেস পাসওয়ার্ড চাইলে শুধু Enter চাপুন)");
run(["secrets", "set", "VAPID_PUBLIC_KEY=" + VAPID_PUBLIC, "VAPID_PRIVATE_KEY=" + VAPID_PRIVATE, "VAPID_SUBJECT=mailto:" + email, "PUSH_WEBHOOK_SECRET=" + HOOK_SECRET], "Secrets সেট");
run(["functions", "deploy", "send-push", "--no-verify-jwt"], "send-push ডিপ্লয়");

// ৩) config.js-এ public কী (url/key অপরিবর্তিত)
if (/vapid:\s*"[^"]*"/.test(cfg)) {
  if (!DRY) writeFileSync(cfgPath, cfg.replace(/vapid:\s*"[^"]*"/, 'vapid: "' + VAPID_PUBLIC + '"'));
  console.log("\n✅ config.js-এ public কী বসেছে" + (DRY ? " (dry-run: লেখা হয়নি)" : "") + ".");
} else console.log("\n⚠ config.js-এ vapid: \"\" লাইন নেই — public কী নিজে বসান: " + VAPID_PUBLIC);

// ৪) SQL ফাইল = SQL-27 + Webhook (ডাটাবেস ট্রিগার)
const sql27 = readFileSync(join(root, "sql", "SQL-27-PUSH-SUBSCRIPTIONS.sql"), "utf8");
const hook = `

-- ========== Webhook: নতুন মেসেজ INSERT হলে send-push ডাকে ==========
-- (ড্যাশবোর্ডের Webhook বানানোর বদলে এই ট্রিগারই কাজটা করে। ব্যর্থ হলেও মেসেজ পাঠানো আটকায় না।)
create extension if not exists pg_net;
create or replace function fa_push_hook() returns trigger language plpgsql security definer set search_path = public, extensions as $f$
begin
  perform net.http_post(
    url := 'https://${REF}.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', '${HOOK_SECRET}'),
    body := jsonb_build_object('type', 'INSERT', 'table', 'mc2_ac_messages', 'record', to_jsonb(new)),
    timeout_milliseconds := 5000);
  return new;
exception when others then return new;
end $f$;
revoke all on function fa_push_hook() from public, anon, authenticated;
drop trigger if exists fa_push_hook_t on mc2_ac_messages;
create trigger fa_push_hook_t after insert on mc2_ac_messages for each row execute function fa_push_hook();
`;
const desk = existsSync(join(homedir(), "Desktop")) ? join(homedir(), "Desktop") : homedir();
const out = join(desk, "PASTE-THIS-SQL-friend-adda-push.sql");
writeFileSync(out, sql27 + hook);
console.log("\n✅ SQL ফাইল তৈরি: " + out);
console.log(`
🎯 এখন বাকি ২টা কাজ:
  ১) Supabase → SQL Editor → New query → ওই ফাইলের পুরোটা পেস্ট → Run (Success আসবে)।
     ⚠ এই ফাইলে গোপন সিক্রেট আছে — কাউকে দেবেন না, সাইটে/জিপে রাখবেন না; Run করার পর মুছে ফেলুন।
  ২) config.js বদলেছে — সাইট আবার পাবলিশ করুন।
তারপর ফোনে: চ্যাটে ঢুকে ⋯ → পুশ চালু করুন → Allow।`);
