-- SQL-30: fa_push_save ঠিক করা (Postgres regex-এ {10,990} চলে না, সর্বোচ্চ ২৫৫ — তাই সেভ করতে 400 এরর আসছিল)।
-- SQL-27 চালানো থাকলে এটাই চালান (শুধু ফাংশন বদলায়, টেবিল/ডাটা অক্ষত)। আবার চালালে ক্ষতি নেই।
-- না চালালে: ফোনের পুশ সেভ হবে না ("পুশ চালু করা যায়নি — সেভ: 400"), নোটিফিকেশন আসবে না। বাকি সাইট ঠিক চলবে।
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
