-- 🔒 Restriction v3 — "ওয়ার্নিংয়ের কারণ কারা দেখবে" সেটিং।
-- চালানোর ক্রম: (মূল SQL) → supabase-restrict.sql → supabase-restrict-v2.sql → supabase-restrict-v3.sql (এটি)। একবার চালান; আবার চালালেও ক্ষতি নেই।
--
-- মোড (অ্যাডমিন → 🛡️ মডারেশন → ⚠️ Restriction তালিকা-র ওপরের বোতাম):
--   all     (ডিফল্ট) = ⛔ চাপলে সবাই কারণ, বাকি সময় ও কে দিয়েছে দেখে।
--   private = শুধু ওই ইউজার নিজে আর অ্যাডমিন দেখে; বাকিদের কাছে সার্ভার কারণ/কে দিয়েছে পাঠায়ই না (শুধু ⛔ চিহ্ন + মেয়াদ থাকে)।
-- দুই মোডেই আসল আপত্তিকর মেসেজ সবার কাছে লুকানো বক্সে থাকে।

create or replace function fa_rs_vis() returns text language sql stable security definer set search_path = public as $$
  select case when coalesce((select val #>> '{}' from fa_settings where key = 'rs_vis'), 'all') = 'private' then 'private' else 'all' end;
$$;
revoke all on function fa_rs_vis() from public, anon, authenticated;

create or replace function fa_set_rs_vis(p_mode text)
returns text language plpgsql security definer set search_path = public as $$
declare m text := case when p_mode = 'private' then 'private' else 'all' end;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  insert into fa_settings (key, val) values ('rs_vis', to_jsonb(m))
  on conflict (key) do update set val = excluded.val, updated_at = now();
  return m;
end $$;
revoke all on function fa_set_rs_vis(text) from public, anon;
grant execute on function fa_set_rs_vis(text) to authenticated;

-- fa_rs: 'vis' যোগ; private হলে 'p'-তে কারণ/কে দিয়েছে (r, k) থাকে না। 'm' (নিজের) সবসময় পূর্ণ।
create or replace function fa_rs(p_voter text default null)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'on', fa_restrict_on(),
    'vis', fa_rs_vis(),
    'p', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('u', g.uid, 'w', g.w)) from (
          select uid, jsonb_agg(
                   case when fa_rs_vis() = 'private'
                        then jsonb_build_object('c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint)
                        else jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind) end
                   order by created_at) w
            from fa_restrictions where lifted_at is null and until > now() and uid <> '' group by uid) g), '[]'::jsonb) end,
    'm', case when not fa_restrict_on() then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('r', reason, 'c', (extract(epoch from created_at) * 1000)::bigint, 'e', (extract(epoch from until) * 1000)::bigint, 'k', kind) order by created_at)
            from fa_restrictions where p_voter is not null and voter = p_voter and lifted_at is null and until > now()), '[]'::jsonb) end,
    'lk', (select jsonb_build_object('r', reason) from fa_locks where p_voter is not null and voter = p_voter and lifted_at is null limit 1),
    'shot', coalesce((select val = 'true'::jsonb from fa_settings where key = 'shot'), false),
    'now', (extract(epoch from now()) * 1000)::bigint
  );
$$;
grant execute on function fa_rs(text) to anon, authenticated;

select fa_rs_vis() as ওয়ার্নিং_কারা_দেখবে;
