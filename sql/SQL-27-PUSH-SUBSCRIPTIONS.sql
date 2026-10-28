-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৮, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-27: ওয়েব-পুশ গ্রাহক তালিকা (ফোনে/ব্রাউজারে ব্যাকগ্রাউন্ড নোটিফিকেশন)
-- চালানোর পর: Edge Function "send-push" (supabase/functions/send-push) এই টেবিল পড়ে পুশ পাঠায়।
-- আবার চালালেও ক্ষতি নেই। না চালালে: ⋯ মেনুর "🔔 পুশ" চালু করলে সেভ হবে না, ব্যাকগ্রাউন্ড পুশ আসবে না (বাকি সাইট ঠিক চলবে)।
-- সুরক্ষা: টেবিলে সরাসরি কেউ ঢুকতে পারে না (RLS চালু + কোনো policy নেই + anon/authenticated-এর সব অনুমতি বাতিল)।
--         সেভ/মোছা শুধু নিচের দুই RPC দিয়ে; পাঠানোর সময় Edge Function service_role দিয়ে পড়ে (কী শুধু Supabase-এর ভেতরে)।

create table if not exists fa_push_subs (
  id bigserial primary key,
  endpoint text not null unique check (char_length(endpoint) between 20 and 1000 and endpoint like 'https://%'),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  session_id int not null references mc2_ac_sessions(id) on delete cascade,
  nick text,
  voter text not null,            -- mc2_ac_messages.voter-এর সাথে মেলে: পাঠানোর সময় প্রেরককে (voter = মেসেজের voter) বাদ দেওয়া হয়
  created_at timestamptz not null default now()
);
create index if not exists fa_push_subs_session on fa_push_subs (session_id);
create index if not exists fa_push_subs_voter on fa_push_subs (voter);

alter table fa_push_subs enable row level security;
revoke all on fa_push_subs from public, anon, authenticated;
revoke all on sequence fa_push_subs_id_seq from public, anon, authenticated;

-- সেভ/নবায়ন: ফেরত 1 = ঠিক, 0 = চ্যাট বন্ধ, -1 = ভুল তথ্য, -3 = ব্যান, -4 = বেশি অনুরোধ, -6 = পাসওয়ার্ড-চ্যাটে ঢোকেনি
create or replace function fa_push_save(p_endpoint text, p_p256dh text, p_auth text, p_session int, p_nick text, p_voter text) returns int
language plpgsql security definer set search_path = public as $$
declare v text := coalesce(p_voter, ''); ep text := trim(coalesce(p_endpoint, '')); nk text := nullif(mc2_ac_clean(p_nick, 30), '');
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' then return -1; end if;
  if ep !~ '^https://[^[:space:]]+$' or char_length(ep) > 1000 then return -1; end if;
  if coalesce(p_p256dh, '') !~ '^[A-Za-z0-9_=-]{20,200}$' or coalesce(p_auth, '') !~ '^[A-Za-z0-9_=-]{8,100}$' then return -1; end if;
  if not mc2_ac_rl('push:v:' || v, 30, 3600) then return -4; end if;
  if not exists (select 1 from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = p_session and s.active and d.active) then return 0; end if;
  if not mc2_ac_can(p_session, v) then return -6; end if;
  if mc2_ac_block(v) is not null then return -3; end if;
  insert into fa_push_subs(endpoint, p256dh, auth, session_id, nick, voter)
  values (ep, p_p256dh, p_auth, p_session, nk, v)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, session_id = excluded.session_id, nick = excluded.nick, voter = excluded.voter;
  -- একজনের সর্বোচ্চ ৫টি ডিভাইস/ব্রাউজার; বেশি হলে সবচেয়ে পুরোনোগুলো মোছে
  delete from fa_push_subs where voter = v and id not in (select id from fa_push_subs where voter = v order by id desc limit 5);
  return 1;
end $$;
grant execute on function fa_push_save(text, text, text, int, text, text) to anon, authenticated;

-- মোছা: শুধু নিজের (voter মিললে); ফেরত true = মুছেছে
create or replace function fa_push_delete(p_endpoint text, p_voter text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' or coalesce(p_endpoint, '') = '' then return false; end if;
  delete from fa_push_subs where endpoint = p_endpoint and voter = p_voter;
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function fa_push_delete(text, text) to anon, authenticated;
