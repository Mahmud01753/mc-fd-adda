-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৮, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-36 (part159): অ্যাডমিন যেকোনো সময় (মেয়াদ চলাকালে বা শেষ হওয়ার পরেও) "ভুল ছিল" বলে মেসেজের লেখা আবার দেখাতে পারবে
-- Supabase -> SQL Editor-এ পুরোটা পেস্ট করে একবার Run করুন (আবার চালালেও ক্ষতি নেই)। আগে SQL-35 চালানো থাকতে হবে।
--
-- কী বদলায়: নতুন ফাংশন fa_restriction_forgive(মেসেজ-id) — ওই বার্তার সব Restriction (চলমান বা মেয়াদ-শেষ) ক্ষমা ধরে, লেখা আবার সবার কাছে দেখা যায়।
-- মেয়াদ নিজে শেষ হলে লেখা আগের মতোই লুকানো থাকে — অ্যাডমিন চাইলে তবেই ফেরে।
-- না চালালে: চ্যাটের অ্যাডমিন মেনুর "✅ ভুল ছিল — লেখা আবার দেখান" বোতামে "হয়নি" দেখাবে; বাকি সব আগের মতো।

create or replace function fa_restriction_forgive(p_msg bigint)
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; adm text; v text; nk text; rid bigint;
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  if p_msg is null then return 0; end if;
  begin adm := coalesce(auth.jwt() ->> 'email', ''); exception when others then adm := ''; end;

  with u as (
    update fa_restrictions set forgiven = true, lifted_at = coalesce(lifted_at, now())
     where msg_id = p_msg and (not forgiven or lifted_at is null)
    returning id, voter, uid, nick, until, reason
  )
  insert into fa_restrict_log (rid, voter, uid, nick, action, old_until, new_until, reason, by_admin)
  select id, voter, uid, nick, 'end', until, now(), reason, adm from u;
  get diagnostics n = row_count;

  -- কোনো Restriction-রো নেই (যেমন শুধু খারাপ-শব্দ তালিকার কারণে লুকানো) — তবু যেন লেখা দেখা যায়
  if n = 0 and not exists (select 1 from fa_restrictions where msg_id = p_msg) then
    select voter, nick into v, nk from mc2_ac_messages where id = p_msg;
    if v is not null then
      insert into fa_restrictions (voter, uid, nick, reason, until, lifted_at, by_admin, kind, msg_id, forgiven)
      values (v, '', left(coalesce(nk, ''), 40), 'অ্যাডমিন: লেখা ঠিক আছে (ভুল ছিল)', now(), now(), adm, 'admin', p_msg, true)
      returning id into rid;
      perform fa_log_restrict(rid, v, '', left(coalesce(nk, ''), 40), 'end', null, now(), now(), 'ভুল ছিল', adm);
      n := 1;
    end if;
  end if;
  return n;
end $$;
revoke all on function fa_restriction_forgive(bigint) from public, anon;
grant execute on function fa_restriction_forgive(bigint) to authenticated;
