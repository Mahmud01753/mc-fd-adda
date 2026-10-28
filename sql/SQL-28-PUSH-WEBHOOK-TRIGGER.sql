-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৮, আসল সিক্রেটসহ কপি দিয়ে; এই ফাইল টেমপ্লেট) | আবার চালালে ক্ষতি নেই (সিক্রেট আগেরটাই বসাতে হবে)
-- SQL-28: নতুন মেসেজ INSERT হলে Edge Function send-push ডাকে (ডাটাবেস ট্রিগার, pg_net)।
-- SQL-27-এর পরে চালান। না চালালে: পুশ কখনো পাঠানো হবে না (বাকি সাইট ঠিক চলবে)। ব্যর্থ হলেও মেসেজ পাঠানো আটকায় না।
-- ⚠ এই ফাইলে সিক্রেট বসানোর জায়গা: জিপের টেমপ্লেটে আসল সিক্রেট নেই — চালানোর আগে PASTE_PUSH_WEBHOOK_SECRET_HERE বদলে নিজের PUSH_WEBHOOK_SECRET বসান।
create extension if not exists pg_net;
create or replace function fa_push_hook() returns trigger language plpgsql security definer set search_path = public, extensions as $f$
begin
  perform net.http_post(
    url := 'https://ynbkemwbznuxfhskkqqs.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'PASTE_PUSH_WEBHOOK_SECRET_HERE'),
    body := jsonb_build_object('type', 'INSERT', 'table', 'mc2_ac_messages', 'record', to_jsonb(new)),
    timeout_milliseconds := 5000);
  return new;
exception when others then return new;
end $f$;
revoke all on function fa_push_hook() from public, anon, authenticated;
drop trigger if exists fa_push_hook_t on mc2_ac_messages;
create trigger fa_push_hook_t after insert on mc2_ac_messages for each row execute function fa_push_hook();
