-- Friend Adda: বার্তা পাঠানোর সব গতি-সীমা তুলে দেওয়া (আনলিমিটেড) — একসাথে অনেকে দ্রুত চ্যাট করলেও আটকাবে না।
-- Supabase SQL Editor-এ একবার চালান। আবার চালালেও ক্ষতি নেই।
-- তোলা হয়েছে: (১) দুই বার্তার মাঝের ২ সেকেন্ড বিরতি  (২) একই লেখা ২০ সেকেন্ডে আবার না পাঠানো  (৩) ডিভাইস প্রতি মিনিটে ২০টার সীমা
--           (৪) একই IP-র প্রতি মিনিটে ৬০টার সীমা (মোবাইল নেটওয়ার্কে অনেকের IP এক)  (৫) ফাইল পাঠানোর মিনিট/ঘণ্টার সীমা
-- আগের মতোই আছে: পাসওয়ার্ড দেওয়া রুমে ঢোকা, ব্যান করা ইউজারের বাধা, লিংক ≤৩টি, ফাইলের ধরন/সাইজ যাচাই।
-- ⚠ এতে mc2_ac_send আবার তৈরি হয়; ডাটাবেসে supabase-new-20261017d.sql (বা পরের সব SQL) চালানো থাকতে হবে।

create or replace function mc2_ac_send(p_session int, p_nick text, p_body text, p_voter text, p_reply bigint default null, p_kind text default 'text', p_path text default null, p_fname text default null, p_size bigint default null, p_mime text default null) returns bigint
language plpgsql security definer set search_path = public as $$
declare q record; o record; ft jsonb; ext text; kd text := 'text'; fn text; fsz bigint; fmt text; r bigint; rid bigint; rn text; rt text;
  b text := mc2_ac_clean(p_body, 400); nk text := mc2_ac_clean(p_nick, 30); v text := coalesce(p_voter, ''); ip text := mc2_ip();
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' then return -1; end if;
  select s.id, s.dept_id into q from mc2_ac_sessions s join mc2_ac_depts d on d.id = s.dept_id where s.id = p_session and s.active and d.active;
  if not found then return 0; end if;
  if not mc2_ac_can(p_session, v) then return -6; end if;   -- পাসওয়ার্ড দেওয়া চ্যাটে ঢোকেনি
  if mc2_ac_block(v) is not null then return -3; end if;
  perform mc2_ac_tick();
  if nk = '' then nk := 'বেনামি'; end if;
  if p_path is null then
    -- টেক্সট বার্তা
    if b = '' then return -1; end if;
    if (select count(*) from regexp_matches(b, '(https?://|www\.)', 'gi')) > 3 then return -1; end if;
  else
    -- ফাইল বার্তা: ধরন সার্ভারেই বের হয় (ক্লায়েন্টের দেওয়া ধরন/সাইজ/মাইম বিশ্বাস করা হয় না)
    if not mc2_ac_upload_on() then return -2; end if;
    if p_path !~ ('^' || p_session::text || '/[a-z0-9]{8,40}\.[a-z0-9]{1,5}$') then return -5; end if;
    ext := lower(substring(p_path from '\.([a-z0-9]+)$'));
    ft := mc2_ac_ftypes() -> ext;
    if ft is null then return -5; end if;
    select (metadata ->> 'size')::bigint as sz, metadata ->> 'mimetype' as mt, created_at as ca into o from storage.objects where bucket_id = 'mc2-chat' and name = p_path;
    if not found then return -5; end if;
    if o.ca < now() - interval '15 minutes' then return -5; end if;                       -- পুরোনো/অন্যের ফাইল নয়
    if split_part(coalesce(o.mt, ''), ';', 1) <> (ft ->> 1) then return -5; end if;       -- মাইম মিলতে হবে
    if o.sz is null or o.sz < 1 or o.sz > (ft ->> 2)::bigint * 1048576 then return -5; end if;
    if exists (select 1 from mc2_ac_messages where file_path = p_path) then return -5; end if;
    kd := ft ->> 0; fsz := o.sz; fmt := ft ->> 1;
    fn := mc2_ac_clean(translate(coalesce(p_fname, ''), '/\', '__'), 120);
    if fn = '' then fn := 'ফাইল.' || ext; end if;
  end if;
  if p_reply is not null then
    select id, nick, left(case when deleted then 'মুছে ফেলা বার্তা' when body = '' then '📎 ' || coalesce(file_name, 'ফাইল') else body end, 80) into rid, rn, rt
      from mc2_ac_messages where id = p_reply and session_id = p_session and not hidden;
  end if;
  insert into mc2_ac_messages(dept_id, session_id, nick, body, voter, ip, reply_to, reply_nick, reply_text, kind, file_path, file_name, file_size, file_mime)
  values (q.dept_id, q.id, nk, b, v, ip, rid, rn, rt, kd, case when kd = 'text' then null else p_path end, case when kd = 'text' then null else fn end,
          case when kd = 'text' then null else fsz end, case when kd = 'text' then null else fmt end)
  returning id into r;
  return r;
end $$;
grant execute on function mc2_ac_send(int, text, text, text, bigint, text, text, text, bigint, text) to anon, authenticated;
