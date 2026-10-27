-- 📸 স্ক্রীনশট নোটিশ (শুধু অ্যাডমিন দেখবে)
-- Supabase → SQL Editor-এ একবার Run করুন (আবার চালালেও ক্ষতি নেই)। নির্ভর করে আগে থেকে থাকা mc2_is_admin()-এর ওপর।
-- কেউ স্ক্রীনশটের চেষ্টা করলে (PrintScreen, Cmd+Shift+3/4/5, Win+Shift+S, ৩-আঙুলের স্পর্শ) এখানে লগ জমে।
-- সাধারণ ইউজার (এমনকি যে স্ক্রীনশট নিল সে-ও) এই তালিকা পড়তে পারে না — পড়ার ফাংশন শুধু অ্যাডমিনের জন্য।

create table if not exists fa_shot_log (
  id         bigserial primary key,
  session_id bigint not null,
  voter      text   not null,
  nick       text   not null default '',
  created_at timestamptz not null default now()
);
create index if not exists fa_shot_log_sess_idx  on fa_shot_log (session_id, id desc);
create index if not exists fa_shot_log_voter_idx on fa_shot_log (voter, created_at desc);

-- সরাসরি টেবিল পড়া/লেখা বন্ধ (কোনো policy নেই); শুধু নিচের ফাংশন দিয়ে।
alter table fa_shot_log enable row level security;

-- সাইট থেকে (সবার জন্য): নিজের স্ক্রীনশট-চেষ্টা জমা। ৫ সেকেন্ডের মধ্যে একই ডিভাইসের পরপর চেষ্টা একবার গণনা হয়।
create or replace function fa_log_shot(p_session bigint, p_voter text, p_nick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_session is null or p_voter is null or length(p_voter) < 4 or length(p_voter) > 80 then return; end if;
  if exists (select 1 from fa_shot_log where voter = p_voter and created_at > now() - interval '5 seconds') then return; end if;
  insert into fa_shot_log (session_id, voter, nick) values (p_session, p_voter, left(coalesce(p_nick, ''), 40));
  if random() < 0.02 then delete from fa_shot_log where created_at < now() - interval '60 days'; end if; -- পুরোনো লগ নিজে পরিষ্কার
end $$;
grant execute on function fa_log_shot(bigint, text, text) to anon, authenticated;

-- অ্যাডমিনের জন্য (শুধু অ্যাডমিন): এই সেশনের স্ক্রীনশট লগ। p_after = শেষ দেখা id (প্রথমবার 0 → সর্বশেষ ৩০০টি)
create or replace function fa_admin_shots(p_session bigint, p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'v', voter, 'n', nick, 't', (extract(epoch from created_at) * 1000)::bigint) order by id)
    from (select * from fa_shot_log where session_id = p_session and id > coalesce(p_after, 0) order by id desc limit 300) q
  ), '[]'::jsonb);
end $$;
revoke all on function fa_admin_shots(bigint, bigint) from public, anon;
grant execute on function fa_admin_shots(bigint, bigint) to authenticated;

-- যাচাই: সংখ্যা (0 বা বেশি) এলে ঠিক আছে।
select count(*) as shots_logged from fa_shot_log;
