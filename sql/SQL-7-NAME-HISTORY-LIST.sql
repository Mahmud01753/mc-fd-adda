-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালানোর দরকার নেই
-- কাজ: অ্যাডমিন প্যানেলে "📝 নামের ইতিহাস" ট্যাব।
-- SQL-7: অ্যাডমিন প্যানেলের "📝 নামের ইতিহাস" ট্যাবের জন্য — সব ইউজারের নাম-বদলের তালিকা (খোঁজা যায়)।
-- আগে SQL-6 চালানো থাকতে হবে (fa_name_history টেবিল)। আবার চালালেও ক্ষতি নেই।
-- না চালালে: ট্যাব খুললে "SQL-7 চালান" লেখা আসবে; বাকি সব আগের মতো চলবে। শুধু অ্যাডমিন দেখে (সার্ভারেও যাচাই)।
create or replace function fa_admin_name_history_all(p_q text default null, p_limit int default 100) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare q text := nullif(btrim(coalesce(p_q, '')), ''); lim int := least(greatest(coalesce(p_limit, 100), 1), 300);
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('u', x.uid, 'o', x.old_nick, 'n', x.new_nick, 't', (extract(epoch from x.changed_at) * 1000)::bigint) order by x.id desc)
                   from (select * from fa_name_history
                         where q is null or uid ilike '%' || q || '%' or old_nick ilike '%' || q || '%' or new_nick ilike '%' || q || '%'
                         order by id desc limit lim) x), '[]'::jsonb);
end $$;
grant execute on function fa_admin_name_history_all(text, int) to authenticated;
