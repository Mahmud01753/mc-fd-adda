-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৫, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই
-- Friend Adda: অ্যাডমিন → 🎞 এনিমেশন ও দরজা সেটিং সার্ভারে সেভ রাখার জন্য। Supabase SQL Editor-এ একবার চালান। আবার চালালেও ক্ষতি নেই।
-- চালালে: অ্যাডমিনে সেভ করা এনিমেশন ও চ্যাটের দরজার সেটিং সব ইউজার পাবে। না চালালে: সেভ কাজ করবে না; সাইট ডিফল্ট এনিমেশন ও ডিফল্ট দরজা দেখাবে।
create table if not exists public.mc2_bg12_cfg (
  id int primary key default 1 check (id = 1),
  cfg jsonb not null default '{}'::jsonb,   -- এনিমেশনের সেটিং
  door jsonb not null default '{}'::jsonb,  -- দরজার সেটিং
  updated_at timestamptz not null default now()
);
insert into public.mc2_bg12_cfg (id) values (1) on conflict (id) do nothing;
alter table public.mc2_bg12_cfg enable row level security;
drop policy if exists "mc2_bg12_cfg read" on public.mc2_bg12_cfg;
create policy "mc2_bg12_cfg read" on public.mc2_bg12_cfg for select to anon, authenticated using (true);
grant select on public.mc2_bg12_cfg to anon, authenticated;

create or replace function public.mc2_admin_set_bg12(p_cfg jsonb, p_door jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mc2_is_admin() then raise exception 'not admin'; end if;
  if jsonb_typeof(p_cfg) <> 'object' or jsonb_typeof(p_door) <> 'object' then raise exception 'bad cfg'; end if;
  if length(p_cfg::text) > 4000 or length(p_door::text) > 4000 then raise exception 'cfg too long'; end if;
  update public.mc2_bg12_cfg set cfg = p_cfg, door = p_door, updated_at = now() where id = 1;
end $$;
revoke all on function public.mc2_admin_set_bg12(jsonb, jsonb) from public, anon;
grant execute on function public.mc2_admin_set_bg12(jsonb, jsonb) to authenticated;
