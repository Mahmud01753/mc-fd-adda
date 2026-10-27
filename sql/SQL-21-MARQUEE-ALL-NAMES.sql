-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৬, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-21: চ্যাটের নিচের মার্কিউ (অনলাইন নামের স্ট্রিপ) — একই মোবাইল/ডিভাইস থেকে যত নামে ঢুকবে সব নাম মার্কিউতে।
-- 🔒 শুধু মার্কিউর জন্য: নতুন আলাদা টেবিল fa_bub_names। অ্যাডমিনের ভিজিটর/অনলাইন লিস্ট, "একই ব্যক্তি", ব্যান/রেস্ট্রিকশন, উপস্থিতি (mc2_presence), নামের ইতিহাস — কোনোটায় হাত পড়ে না, আগের মতোই চলে।
-- আবার চালালেও ক্ষতি নেই। না চালালে: মার্কিউ আগের মতো (সর্বশেষ বার্তার নামে) চলবে, শুধু একই ডিভাইসের একাধিক নাম একসাথে দেখাবে না।
-- ডেটা: ডিভাইস আইডি + নাম + শেষ দেখা; প্রতি ডিভাইসে সর্বোচ্চ ১০ নাম; ১ দিনের পুরোনো সারি অটো মোছে। পাবলিকে শুধু নাম ও ছদ্ম-আইডি (U…) যায়, ডিভাইস আইডি যায় না।

create table if not exists fa_bub_names (
  voter      text        not null,
  session_id int         not null,
  nick       text        not null,
  last_seen  timestamptz not null default now(),
  primary key (voter, session_id, nick)
);
create index if not exists fa_bub_names_ls on fa_bub_names (session_id, last_seen desc);
alter table fa_bub_names enable row level security;   -- সরাসরি টেবিল বন্ধ; শুধু নিচের দুই ফাংশনে

-- চ্যাটে থাকা অবস্থায় ক্লায়েন্ট প্রতি ~২০ সেকেন্ডে ডাকে: "এই ডিভাইস এই নামে এখন আছে"
create or replace function mc2_bub_ping(p_voter text, p_session int, p_nick text) returns void
language plpgsql security definer set search_path = public as $$
declare v text := left(coalesce(p_voter, ''), 80); n text := mc2_ac_clean(p_nick, 30);
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' or p_session is null then return; end if;
  if mc2_ac_block(v) is not null then return; end if;
  if n = '' then n := 'বেনামি'; end if;
  insert into fa_bub_names(voter, session_id, nick, last_seen) values (v, p_session, n, now())
  on conflict (voter, session_id, nick) do update set last_seen = now();
  -- প্রতি ডিভাইস+রুমে সর্বশেষ ১০টা নাম রাখে
  delete from fa_bub_names where voter = v and session_id = p_session
    and nick not in (select nick from fa_bub_names where voter = v and session_id = p_session order by last_seen desc limit 10);
  if random() < 0.02 then delete from fa_bub_names where last_seen < now() - interval '1 day'; end if;
end $$;
grant execute on function mc2_bub_ping(text, int, text) to anon, authenticated;

-- মার্কিউর তালিকা: গত ১০০ সেকেন্ডে যে নামগুলো "আছে" দেখা গেছে
create or replace function mc2_bub_online(p_session int) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('u', mc2_uid(voter), 'n', nick, 'k', mc2_uid(voter) || substr(md5(nick), 1, 6)) order by last_seen desc), '[]'::jsonb)
  from (select voter, nick, last_seen from fa_bub_names
        where session_id = p_session and last_seen > now() - interval '100 seconds'
        order by last_seen desc limit 80) x $$;
grant execute on function mc2_bub_online(int) to anon, authenticated;

-- চেক (চালানোর পর): select mc2_bub_online(<session_id>);
