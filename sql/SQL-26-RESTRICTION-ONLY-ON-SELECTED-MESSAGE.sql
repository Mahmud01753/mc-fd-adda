-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৭, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- ⚠️ Restriction এখন শুধু যে বার্তায় বসানো হয়েছে সেই বার্তাতেই দেখাবে (আগে ইউজারের সব বার্তায় দেখাত)।
-- Supabase → SQL Editor-এ পুরোটা পেস্ট করে একবার Run করুন (আবার চালালেও ক্ষতি নেই)।
-- আগে SQL-3 চালানো থাকতে হবে (আছে)।
--
-- কী বদলায়:
--  ১) fa_restrict-এ নতুন ঐচ্ছিক প্যারামিটার p_msg (কোন বার্তার জন্য)। চ্যাটে বার্তা চেপে "⚠️ Restriction দিন" করলে ও
--     অ্যাডমিন রিপোর্ট-তালিকা থেকে দিলে বার্তার id যায় (fa_restrictions.msg_id কলামে আগে থেকেই আছে; অটো-Restriction আগে থেকেই বার্তা ধরে রাখত)।
--  ২) fa_rs-এ প্রতিটা ওয়ার্নিংয়ের সাথে 'mid' (বার্তার id; বার্তা বাছা না হলে 0) যায় — চ্যাট পেইজ শুধু ওই বার্তায় ⛔ বসায়।
--
-- চালালে: নতুন Restriction শুধু বাছা বার্তায় দেখাবে। না চালালে: সাইট আগের মতোই চলবে (ইউজারের সব বার্তায় ⛔), কিছু ভাঙবে না।
-- ⚠️ যে চলমান Restriction-গুলো বার্তা না বেছে দেওয়া হয়েছিল (আগে থেকে আছে), সেগুলো চালানোর পর কোনো বার্তায় ⛔ দেখাবে না —
--    ইউজার নিজের ওপরের ওয়ার্নিং-বার ঠিকই দেখবে, অ্যাডমিন তালিকায়ও থাকবে।

-- পুরোনো ৫-প্যারামিটারের ফাংশন সরাই (নইলে একই নামে দুটো থেকে কল গুলিয়ে যায়)
drop function if exists fa_restrict(text, text, text, text, int);

create or replace function fa_restrict(p_voter text, p_uid text, p_nick text, p_reason text, p_minutes int, p_msg bigint default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare nid bigint; adm text; u timestamptz; mid bigint := null;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if not fa_restrict_on() then raise exception 'Restriction সিস্টেম এখন বন্ধ (আগে চালু করুন)'; end if;
  if p_voter is null or length(p_voter) < 4 then raise exception 'voter'; end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 525600 then raise exception 'minutes 1..525600'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason'; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;
  -- বার্তাটা সত্যিই এই ইউজারেরই কিনা মিলিয়ে নিই (অন্য কারো বার্তায় বসানো যাবে না)
  if p_msg is not null then
    select m.id into mid from mc2_ac_messages m where m.id = p_msg and m.voter = p_voter;
  end if;
  u := now() + make_interval(mins => p_minutes);
  insert into fa_restrictions (voter, uid, nick, reason, until, by_admin, kind, msg_id)
  values (p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), left(btrim(p_reason), 300), u, adm, 'admin', mid)
  returning id into nid;
  perform fa_log_restrict(nid, p_voter, left(coalesce(p_uid, ''), 80), left(coalesce(p_nick, ''), 40), 'give', p_minutes, null, u, left(btrim(p_reason), 300), adm);
  return nid;
end $$;
revoke all on function fa_restrict(text, text, text, text, int, bigint) from public, anon;
grant execute on function fa_restrict(text, text, text, text, int, bigint) to authenticated;

-- fa_rs: আগের (SQL-3-এর শেষ) ভার্সনের হুবহু, শুধু 'p' ও 'm'-এর প্রতিটা ওয়ার্নিংয়ে 'mid' যোগ
create or replace function fa_rs(p_voter text default null)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'on', fa_restrict_on(),
    'vis', fa_rs_vis(),
    'p', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('u', g.uid, 'w', g.w)) from (
          select uid, jsonb_agg(
                   case when fa_rs_vis() = 'private'
                        then jsonb_build_object('c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'mid', coalesce(msg_id, 0))
                        else jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind, 'mid', coalesce(msg_id, 0)) end
                   order by created_at) w
            from fa_restrictions where lifted_at is null and until > now() and uid <> '' group by uid) g), '[]'::jsonb) end,
    'm', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind, 'mid', coalesce(msg_id, 0)) order by created_at)
            from fa_restrictions where p_voter is not null and voter = p_voter and lifted_at is null and until > now()), '[]'::jsonb) end,
    'lk', (select jsonb_build_object('r', reason, 'e', case when until_at is null then null else (extract(epoch from until_at) * 1000)::bigint end)
             from fa_locks where p_voter is not null and voter = p_voter and lifted_at is null and (until_at is null or until_at > now()) limit 1),
    'shot', coalesce((select val = 'true'::jsonb from fa_settings where key = 'shot'), false),
    'now', (extract(epoch from now()) * 1000)::bigint
  );
$$;
grant execute on function fa_rs(text) to anon, authenticated;

-- চেক (চালানোর পর): ১টা সারি আসবে — fa_restrict ফাংশনে p_msg আছে
select pg_get_function_arguments(oid) as fa_restrict_args from pg_proc where proname = 'fa_restrict';
