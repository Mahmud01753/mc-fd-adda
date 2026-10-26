-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৫, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই (SQL-17-এর পর)
-- Friend Adda: দরজার সেটিং (mc2_bg12_cfg.door)-এর আকারের সীমা ৪০০০ → ৩০০০০ অক্ষর। অ্যাডমিনে কাস্টম প্রশ্ন–উত্তর জোড়া অনেক হলে দরকার। Supabase SQL Editor-এ একবার চালান। আবার চালালেও ক্ষতি নেই।
-- চালালে: অ্যাডমিন → 🎞 এনিমেশন ও দরজা → 💭 চ্যাটের নাম ও মেসেজে প্রচুর কাস্টম জোড়া সেভ করা যাবে। না চালালে: ডিফল্ট জোড়া ও অল্প বদল আগের মতো সেভ হবে, কিন্তু বেশি কাস্টম জোড়ায় সেভ "cfg too long" দিয়ে আটকাবে (অ্যাডমিনে বার্তা আসবে)।
create or replace function public.mc2_admin_set_bg12(p_cfg jsonb, p_door jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mc2_is_admin() then raise exception 'not admin'; end if;
  if jsonb_typeof(p_cfg) <> 'object' or jsonb_typeof(p_door) <> 'object' then raise exception 'bad cfg'; end if;
  if length(p_cfg::text) > 4000 or length(p_door::text) > 30000 then raise exception 'cfg too long'; end if;
  update public.mc2_bg12_cfg set cfg = p_cfg, door = p_door, updated_at = now() where id = 1;
end $$;
revoke all on function public.mc2_admin_set_bg12(jsonb, jsonb) from public, anon;
grant execute on function public.mc2_admin_set_bg12(jsonb, jsonb) to authenticated;
