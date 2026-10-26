-- 🔗 রেফারার লিংক লগ: কেউ যে লিংক/পেইজ থেকে ক্লিক করে সাইটে ঢুকলে তার আগের পুরো লিংক (document.referrer) জমা থাকে।
-- একই ব্যক্তির জন্য একই লিংক হলে নতুন সারি হয় না — একটাই থাকে (শুধু "কতবার" ও "শেষ কখন" বাড়ে)।
-- Supabase → SQL Editor-এ একবার Run করুন (বারবার চালালেও ক্ষতি নেই)। নির্ভর করে আগে থেকে থাকা mc2_is_admin()-এর ওপর।
--
-- ⚠ ব্রাউজার/অ্যাপ অনেক সময় রেফারারে শুধু ডোমেইন পাঠায় (যেমন https://l.facebook.com/) বা কিছুই পাঠায় না — ওটা ওয়েবসাইট থেকে বদলানো যায় না।
--   যা আসে তার পুরোটাই (পাথ ও প্যারামিটারসহ) এখানে রাখা হয়।

create table if not exists mc2_fa_ref_log (
  voter      text not null,
  ref        text not null,               -- আগের পুরো লিংক
  landing    text not null default '',    -- যে লিংকে ঢুকেছিল (প্রথমবার)
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  hits       int not null default 1,
  primary key (voter, ref)                -- একই ব্যক্তি + একই লিংক = একটাই সারি
);
create index if not exists mc2_fa_ref_log_ref on mc2_fa_ref_log (ref);
alter table mc2_fa_ref_log enable row level security;   -- সরাসরি টেবিল বন্ধ; শুধু নিচের ফাংশন

-- সাইট থেকে (সবার জন্য)
create or replace function mc2_fa_ref(p_voter text, p_ref text, p_landing text)
returns void language plpgsql security definer set search_path = public as $$
declare r text := btrim(coalesce(p_ref, ''));
begin
  if p_voter is null or length(p_voter) < 4 or length(p_voter) > 80 then return; end if;
  if r = '' or r !~* '^https?://' then return; end if;
  r := left(r, 2000);
  insert into mc2_fa_ref_log (voter, ref, landing) values (p_voter, r, left(coalesce(p_landing, ''), 500))
  on conflict (voter, ref) do update set last_seen = now(), hits = mc2_fa_ref_log.hits + 1;
end $$;
grant execute on function mc2_fa_ref(text, text, text) to anon, authenticated;

-- অ্যাডমিনের জন্য (শুধু অ্যাডমিন): সব লিংক
create or replace function mc2_fa_ref_list()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.last_seen desc) from (select * from mc2_fa_ref_log order by last_seen desc limit 20000) x), '[]'::jsonb);
end $$;
revoke all on function mc2_fa_ref_list() from public, anon;
grant execute on function mc2_fa_ref_list() to authenticated;

select count(*) as ref_rows from mc2_fa_ref_log;
