-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালানোর দরকার নেই
-- কাজ: নামের ইতিহাস রেকর্ড; নাম বদল ঘণ্টায় সর্বোচ্চ ১০ বার।
-- SQL-6: নামের ইতিহাস রেকর্ড (শুধু অ্যাডমিন দেখে)। নাম বদলের সীমা আগের মতোই — ঘণ্টায় সর্বোচ্চ ১০ বার (মালিকের সিদ্ধান্ত)।
-- আবার চালালেও ক্ষতি নেই। না চালালে: নাম বদলানো আগের মতোই চলবে, শুধু অ্যাডমিন কার্ডে "নামের ইতিহাস" আসবে না (সাইট ভাঙবে না)।
-- ইতিহাসে আছে: ইউজার আইডি, পুরনো নাম, নতুন নাম, সময়। আইপি/ডিভাইস আইডি পাবলিকে যায় না; দেখতে অ্যাডমিন লগইন লাগে (সার্ভারেও যাচাই)।

create table if not exists fa_name_history (
  id         bigserial primary key,
  voter      text not null,
  uid        text not null default '',
  old_nick   text not null default '',
  new_nick   text not null,
  changed_at timestamptz not null default now()
);
create index if not exists fa_name_history_uid on fa_name_history (uid, id desc);
create index if not exists fa_name_history_voter on fa_name_history (voter, id desc);
alter table fa_name_history enable row level security;   -- সরাসরি টেবিল বন্ধ; শুধু নিচের অ্যাডমিন ফাংশনে

-- নাম বদল: ঘণ্টায় ১০ বারের সীমা আগের মতোই; এর ওপর ইতিহাস লেখে (প্রতি ইউজারের সর্বশেষ ২০০টা রাখে)
create or replace function mc2_ac_rename(p_voter text, p_nick text) returns void language plpgsql security definer set search_path = public as $$
declare n text := mc2_ac_clean(p_nick, 30); old text;
begin
  if n = '' or coalesce(p_voter, '') !~ '^[A-Za-z0-9_-]{8,80}$' then return; end if;
  if mc2_ac_block(p_voter) is not null then return; end if;
  if not mc2_ac_rl('ren:v:' || p_voter || ':3600', 10, 3600) then return; end if;   -- আগের সীমা: ঘণ্টায় ১০ বার
  select m.nick into old from mc2_ac_messages m where m.voter = p_voter order by m.id desc limit 1;
  if old is null then select pr.nick into old from mc2_presence pr where pr.voter = p_voter; end if;
  if coalesce(old, '') <> n then
    insert into fa_name_history (voter, uid, old_nick, new_nick) values (p_voter, coalesce(mc2_uid(p_voter), ''), coalesce(old, ''), n);
    delete from fa_name_history where voter = p_voter and id not in (select id from fa_name_history where voter = p_voter order by id desc limit 200);
  end if;
  update mc2_ac_messages set nick = n where voter = p_voter and nick <> n;
  update mc2_ac_seen set nick = n where voter = p_voter;
end $$;
grant execute on function mc2_ac_rename(text, text) to anon, authenticated;

-- অ্যাডমিন: একটা ইউজারের (পাবলিক ইউজার আইডি দিয়ে) নামের ইতিহাস, নতুন আগে (সর্বোচ্চ ৫০)
create or replace function fa_admin_name_history(p_uid text) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(mc2_is_admin(), false) then raise exception 'not admin'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('o', x.old_nick, 'n', x.new_nick, 't', (extract(epoch from x.changed_at) * 1000)::bigint) order by x.id desc)
                   from (select * from fa_name_history where uid = p_uid order by id desc limit 50) x), '[]'::jsonb);
end $$;
grant execute on function fa_admin_name_history(text) to authenticated;
