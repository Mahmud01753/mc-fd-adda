-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৭, মালিকের নির্দেশে চিহ্নিত) | আবার চালালে ক্ষতি নেই
-- SQL-25: চ্যাট ও হোমের থিম — অ্যাডমিনের সেটিং সার্ভারে সেভ (সব ইউজার একই ডিফল্ট পাবে)।
-- চালানোর নিয়ম: Supabase → SQL Editor → New query → পুরোটা পেস্ট → Run।
-- চালালে: অ্যাডমিনের "সবার জন্য চালু করুন" সেভ হবে, হোম ও চ্যাটের থিম সব ইউজার পাবে।
-- না চালালে: সাইট আজকের চেহারাতেই চলবে (হোম ডার্ক সবুজ, চ্যাট সাদা + নীল বাবল), কিছু ভাঙবে না, শুধু অ্যাডমিনের সেভ কাজ করবে না।
-- খালি {} মানে ডিফল্ট (আজকের চেহারা)। chat = চ্যাটের থিম, home = হোমের থিম (আলাদা), opts = সুইচ, কাস্টম থিম, র‍্যান্ডম ঘোরার তালিকা ও সেকেন্ড।

create table if not exists public.mc2_theme_cfg (
  id int primary key default 1 check (id = 1),
  chat jsonb not null default '{}'::jsonb,
  home jsonb not null default '{}'::jsonb,
  opts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.mc2_theme_cfg (id) values (1) on conflict (id) do nothing;
alter table public.mc2_theme_cfg enable row level security;
drop policy if exists "mc2_theme_cfg read" on public.mc2_theme_cfg;
create policy "mc2_theme_cfg read" on public.mc2_theme_cfg for select to anon, authenticated using (true);
grant select on public.mc2_theme_cfg to anon, authenticated;

create or replace function public.mc2_admin_set_theme(p_chat jsonb, p_home jsonb, p_opts jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.mc2_is_admin() then raise exception 'not admin'; end if;
  if jsonb_typeof(p_chat) <> 'object' or jsonb_typeof(p_home) <> 'object' or jsonb_typeof(p_opts) <> 'object' then raise exception 'bad cfg'; end if;
  if length(p_chat::text) > 30000 or length(p_home::text) > 30000 or length(p_opts::text) > 30000 then raise exception 'cfg too long'; end if;
  update public.mc2_theme_cfg set chat = p_chat, home = p_home, opts = p_opts, updated_at = now() where id = 1;
end $$;
revoke all on function public.mc2_admin_set_theme(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.mc2_admin_set_theme(jsonb, jsonb, jsonb) to authenticated;
