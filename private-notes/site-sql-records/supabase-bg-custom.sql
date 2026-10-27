-- ব্যাকগ্রাউন্ডে কাস্টম ছবি চালু করতে Supabase SQL Editor-এ একবার চালান (আগে supabase-bg.sql চালানো থাকলেও চলবে)।
create or replace function public.mc2_admin_set_bg(p_on boolean, p_pick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mc2_is_admin() then raise exception 'not admin'; end if;
  if p_pick !~ '^(00|12)$' and not (p_pick ~ '^custom:(https://|data:image/)[^[:space:]"''\\()]+$' and length(p_pick) < 600000) then raise exception 'bad pick'; end if;
  update public.mc2_site_bg set enabled = p_on, pick = p_pick, updated_at = now() where id = 1;
end $$;
revoke all on function public.mc2_admin_set_bg(boolean, text) from public, anon;
grant execute on function public.mc2_admin_set_bg(boolean, text) to authenticated;
