-- Friend Adda: সাইটের ব্যাকগ্রাউন্ড (অ্যাডমিন → 🖼 ব্যাকগ্রাউন্ড)। Supabase SQL Editor-এ একবার চালান।
create table if not exists public.mc2_site_bg (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  pick text not null default '12',          -- '00' = ব্যাকগ্রাউন্ড ছাড়া (ডিফল্ট সবুজ হেডার), '01'..'20' = ছবি
  updated_at timestamptz not null default now()
);
insert into public.mc2_site_bg (id) values (1) on conflict (id) do nothing;
alter table public.mc2_site_bg enable row level security;
drop policy if exists "mc2_site_bg read" on public.mc2_site_bg;
create policy "mc2_site_bg read" on public.mc2_site_bg for select to anon, authenticated using (true);
grant select on public.mc2_site_bg to anon, authenticated;

create or replace function public.mc2_admin_set_bg(p_on boolean, p_pick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mc2_is_admin() then raise exception 'not admin'; end if;
  if p_pick !~ '^(00|12)$' and not (p_pick ~ '^custom:(https://|data:image/)[^[:space:]"''\\()]+$' and length(p_pick) < 600000) then raise exception 'bad pick'; end if;
  update public.mc2_site_bg set enabled = p_on, pick = p_pick, updated_at = now() where id = 1;
end $$;
revoke all on function public.mc2_admin_set_bg(boolean, text) from public, anon;
grant execute on function public.mc2_admin_set_bg(boolean, text) to authenticated;
