-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই (SQL-9 চালালে তার পরে শেষে এটা চালান)
-- কাজ: নিজের বার্তা ৫ মিনিটের মধ্যে Edit; "✎ Edited" চিহ্ন ও Edit History পপআপ।
-- ============================================================================
-- SQL-14-EDIT-MSG-5MIN-EDITED-LABEL-HISTORY.sql
-- Supabase → SQL Editor → New query → পুরোটা পেস্ট → Run (আবার চালালেও ক্ষতি নেই)
--
-- নিজের পাঠানো টেক্সট বার্তা পাঠানোর ৫ মিনিটের মধ্যে সম্পাদনা (Edit)। ৫ মিনিট পরে সার্ভারই আটকায়।
-- ১) mc2_ac_messages.edited_at কলাম
-- ২) mc2_ac_msg_edits — প্রতিটা সম্পাদনার আগের লেখা জমা থাকে (শুধু সার্ভার/অ্যাডমিন দেখে; সাধারণ ইউজার পায় না)
-- ৩) mc2_ac_edit(p_msg, p_voter, p_body): শুধু নিজের বার্তা, মোছা/সরানো নয়, ৫ মিনিটের মধ্যে, ব্যান/লক/পাসওয়ার্ড যাচাই,
--    মিনিটে ১০ বারের বেশি নয়। ফল: >০ হয়েছে · ০ সময় শেষ/নিজের নয় · -১ লেখা ঠিক নয় · -৩ নিষেধ · -৪ খুব দ্রুত · -৬ পাসওয়ার্ড
--    যে বার্তাগুলো এই বার্তার রিপ্লাই, তাদের উদ্ধৃত লেখাও নতুনটায় বদলায়।
-- ৪) mc2_ac_meta: SQL-9-এরটাই + প্রতি বার্তায় 'ed' (সম্পাদিত কিনা) ও 'b' (সম্পাদিত নতুন লেখা) —
--    তাই যাঁরা চ্যাট খুলে আছেন তাঁদের স্ক্রিনেও সাথে সাথে বদলায়। (SQL-9 আর আলাদা করে চালাবেন না; চালালে এটা আবার চালান।)
-- ৫) mc2_ac_edit_history(p_msg, p_voter): বার্তার "✎ সম্পাদিত" লেখায় চাপলে সবাই কতবার বদলেছে + আগের সব লেখা (সময়সহ) ও এখনকার লেখা দেখে।
--    শুধু ওই সেশনে ঢোকার অধিকার থাকলে (পাসওয়ার্ড দেওয়া রুমে ঢুকেছে এমন) ও বার্তা মোছা/সরানো না হলে।
-- না চালালে: সাইট আগের মতো চলে, শুধু ✏️ সম্পাদনা চাপলে "সম্পাদনা হয়নি" আসে।
-- ============================================================================
alter table mc2_ac_messages add column if not exists edited_at timestamptz;
alter table mc2_ac_messages add column if not exists mod_note text;       -- SQL-9-এর কলাম (meta-র জন্য লাগে; থাকলে কিছু হয় না)
grant select (mod_note) on mc2_ac_messages to anon;

create table if not exists mc2_ac_msg_edits (
  id bigserial primary key,
  message_id bigint not null references mc2_ac_messages(id) on delete cascade,
  voter text,
  old_body text,
  new_body text,
  edited_at timestamptz not null default now()
);
alter table mc2_ac_msg_edits enable row level security;
revoke all on mc2_ac_msg_edits from anon, authenticated;
create index if not exists mc2_ac_msg_edits_msg on mc2_ac_msg_edits(message_id);

create or replace function mc2_ac_edit(p_msg bigint, p_voter text, p_body text) returns int
language plpgsql security definer set search_path = public as $$
declare m record; b text := mc2_ac_clean(p_body, 400); v text := coalesce(p_voter, '');
begin
  if v !~ '^[A-Za-z0-9_-]{8,80}$' then return -1; end if;
  select id, session_id, voter, body, kind, deleted, hidden, created_at into m from mc2_ac_messages where id = p_msg;
  if not found or m.voter <> v or m.deleted or m.hidden or coalesce(m.kind, 'text') <> 'text' then return 0; end if;
  if m.created_at <= now() - interval '5 minutes' then return 0; end if;          -- ৫ মিনিট পেরিয়ে গেলে আর নয়
  if mc2_ac_block(v) is not null then return -3; end if;
  if not mc2_ac_can(m.session_id, v) then return -6; end if;
  if b = '' then return -1; end if;
  if (select count(*) from regexp_matches(b, '(https?://|www\.)', 'gi')) > 3 then return -1; end if;
  if b = m.body then return 1; end if;
  if not mc2_ac_rl('edit:v:' || v || ':60', 10, 60) then return -4; end if;
  insert into mc2_ac_msg_edits(message_id, voter, old_body, new_body) values (p_msg, v, m.body, b);
  update mc2_ac_messages set body = b, edited_at = now() where id = p_msg;
  update mc2_ac_messages set reply_text = left(b, 80) where reply_to = p_msg and reply_text is not null;
  return 1;
end $$;
revoke all on function mc2_ac_edit(bigint, text, text) from public;
grant execute on function mc2_ac_edit(bigint, text, text) to anon, authenticated;

create or replace function mc2_ac_meta(p_session int, p_min bigint, p_voter text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('up', mc2_ac_upload_on(), 'me', mc2_ac_me(p_voter),
    'on', (select count(*) from mc2_presence p where p.chat_session_id = p_session and p.page = '#anon' and mc2_online(p.last_seen, p.offline)),
    'rows', coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', m.id, 'n', m.nick, 'd', m.deleted, 'o', m.voter = p_voter, 'u', mc2_uid(m.voter),
      'a', exists (select 1 from mc2_presence p where p.voter = m.voter and mc2_online(p.last_seen, p.offline)),
      'r', (select coalesce(jsonb_object_agg(e, c), '{}'::jsonb) from (select emoji e, count(*) c from mc2_ac_reactions r where r.message_id = m.id group by emoji) z),
      'm', (select emoji from mc2_ac_reactions r where r.message_id = m.id and r.voter = p_voter),
      's', (select count(*) from mc2_ac_seen s where s.session_id = m.session_id and s.last_id >= m.id and s.voter <> m.voter),
      'mr', m.mod_removed, 'mn', m.mod_note,
      'ed', (m.edited_at is not null and not m.deleted), 'b', case when m.edited_at is not null and not m.deleted then m.body end) x
    from mc2_ac_messages m where m.session_id = p_session and m.id >= p_min and not m.hidden order by m.id desc limit 500) t), '[]'::jsonb)) $$;
grant execute on function mc2_ac_meta(int, bigint, text) to anon, authenticated;


create or replace function mc2_ac_edit_history(p_msg bigint, p_voter text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m record;
begin
  select id, session_id, body, deleted, hidden, edited_at into m from mc2_ac_messages where id = p_msg;
  if not found or m.deleted or m.hidden or m.edited_at is null then return null; end if;
  if not mc2_ac_can(m.session_id, coalesce(p_voter, '')) then return null; end if;
  return jsonb_build_object('cur', m.body,
    'versions', coalesce((select jsonb_agg(jsonb_build_object('b', e.old_body, 't', e.edited_at) order by e.id) from mc2_ac_msg_edits e where e.message_id = p_msg), '[]'::jsonb));
end $$;
revoke all on function mc2_ac_edit_history(bigint, text) from public;
grant execute on function mc2_ac_edit_history(bigint, text) to anon, authenticated;

-- ফল: ৪টা সারি আসা উচিত (কলাম, দুটো ফাংশন, টেবিল) (কলাম, ফাংশন, টেবিল)
select 'edited_at কলাম' as item, exists (select 1 from information_schema.columns where table_name = 'mc2_ac_messages' and column_name = 'edited_at') as ok
union all select 'mc2_ac_edit ফাংশন', to_regprocedure('mc2_ac_edit(bigint,text,text)') is not null
union all select 'mc2_ac_edit_history ফাংশন', to_regprocedure('mc2_ac_edit_history(bigint,text)') is not null
union all select 'mc2_ac_msg_edits টেবিল', to_regclass('mc2_ac_msg_edits') is not null;
