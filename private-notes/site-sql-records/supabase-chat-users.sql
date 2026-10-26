-- 💬 চ্যাট ইউজার ট্যাবের জন্য: কে কোন অ্যাপ/লিংক থেকে সাইটে ঢুকেছে (Messenger, Facebook, Instagram, WhatsApp…) তার রেকর্ড।
-- Supabase → SQL Editor-এ একবার Run করুন (অন্য SQL-এর সাথে একসাথে চালালেও চলবে; বারবার চালালেও ক্ষতি নেই)।
-- বার্তার সংখ্যা, সতর্কতা, ব্যান/Restriction — এগুলোর জন্য নতুন SQL লাগে না, আগে থেকে থাকা mc2_ac_admin_active থেকে আসে।
-- নির্ভর করে শুধু আগে থেকে থাকা mc2_is_admin() ফাংশনের ওপর (অ্যাডমিন লগইনে যেটা যাচাই হয়)।
--
-- ⚠ কী সংরক্ষণ হয়: কোন অ্যাপ (Messenger/Facebook/…), রেফারার লিংক (কোন পেইজ থেকে ক্লিক করে এসেছে), ল্যান্ডিং লিংক ও fbclid।
-- ফেসবুক/মেসেঞ্জারে ইউজারের নিজের প্রোফাইল আইডি বা প্রোফাইল লিংক ওয়েবসাইট কখনো জানতে পারে না — তাই সেটা সংরক্ষণ করা যায় না।

create table if not exists mc2_fa_sources (
  voter         text primary key,
  app           text not null default '',   -- সর্বশেষ ঢোকার অ্যাপ
  ref           text not null default '',   -- সর্বশেষ রেফারার লিংক
  landing       text not null default '',   -- সর্বশেষ ল্যান্ডিং লিংক
  fbclid        text not null default '',   -- ফেসবুকের ক্লিক আইডি (প্রোফাইল আইডি নয়)
  first_app     text not null default '',   -- প্রথমবার যে অ্যাপ থেকে এসেছিল
  first_ref     text not null default '',
  first_landing text not null default '',
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  visits        int not null default 1
);

-- সরাসরি টেবিল পড়া/লেখা বন্ধ (কোনো policy নেই); শুধু নিচের দুই ফাংশন দিয়ে।
alter table mc2_fa_sources enable row level security;

-- সাইট থেকে (সবার জন্য): নিজের ঢোকার তথ্য জমা
create or replace function mc2_fa_src(p_voter text, p_app text, p_ref text, p_landing text, p_fbclid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_voter is null or length(p_voter) < 4 or length(p_voter) > 80 then return; end if;
  insert into mc2_fa_sources (voter, app, ref, landing, fbclid, first_app, first_ref, first_landing)
  values (p_voter, left(coalesce(p_app, ''), 40), left(coalesce(p_ref, ''), 500), left(coalesce(p_landing, ''), 500), left(coalesce(p_fbclid, ''), 300),
          left(coalesce(p_app, ''), 40), left(coalesce(p_ref, ''), 500), left(coalesce(p_landing, ''), 500))
  on conflict (voter) do update set
    app = excluded.app, ref = excluded.ref, landing = excluded.landing,
    fbclid = case when excluded.fbclid <> '' then excluded.fbclid else mc2_fa_sources.fbclid end,
    last_seen = now(), visits = mc2_fa_sources.visits + 1;
end $$;
grant execute on function mc2_fa_src(text, text, text, text, text) to anon, authenticated;

-- অ্যাডমিন প্যানেলের জন্য (শুধু অ্যাডমিন): সবার তালিকা
create or replace function mc2_fa_src_list()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(to_jsonb(s)) from mc2_fa_sources s), '[]'::jsonb);
end $$;
revoke all on function mc2_fa_src_list() from public, anon;
grant execute on function mc2_fa_src_list() to authenticated;

-- যাচাই: 0 বা তার বেশি সংখ্যা এলে ঠিক আছে।
select count(*) as rows_saved from mc2_fa_sources;
