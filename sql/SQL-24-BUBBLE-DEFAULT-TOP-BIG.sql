-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৬, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-24: বাবলের ডিফল্ট — ওপরের দিকে (pos = top) আর বড় সাইজ (size = 3) — সার্ভারে সেভ করা সেটিংয়েও।
-- কাজ: mc2_bub_cfg-এ শুধু pos ও size বসায়, বাকি সব সেটিং যেমন আছে তেমনই। আবার চালালেও ক্ষতি নেই। পরে অ্যাডমিন → 💬 চ্যাট বাবল থেকে যেকোনো সময় বদলানো যায়।
-- না চালালে: আগে অ্যাডমিন থেকে জায়গা/সাইজ সেভ করা থাকলে সেটাই চলবে (সাইটের কোডের নতুন ডিফল্ট শুধু তখনই কাজ করে যখন সার্ভারে কিছু সেভ করা নেই)।

alter table public.mc2_bub_cfg alter column cfg set default '{"userShow": true, "anonOn": true, "pos": "top", "size": 3}'::jsonb;
update public.mc2_bub_cfg set cfg = coalesce(cfg, '{}'::jsonb) || '{"pos": "top", "size": 3}'::jsonb, updated_at = now() where id = 1;
