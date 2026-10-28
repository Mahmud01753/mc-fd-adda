-- SQL-31: ট্রিগারের apikey হেডারে নতুন ধরনের publishable key (পুরোনো anon JWT key এই প্রজেক্টে 401 INVALID_API_KEY পাচ্ছিল)।
-- publishable key পাবলিক (গোপন নয়)। সিক্রেট জায়গায় নিজের PUSH_WEBHOOK_SECRET বসান (জিপে টেমপ্লেট: PASTE_PUSH_WEBHOOK_SECRET_HERE)।
-- SQL-28/29-এর পরে চালান; ট্রিগার ফাংশন fa_push_hook বদলায়। না চালালে: পুশ 401 পায়, নোটিফিকেশন যায় না। আবার চালালে ক্ষতি নেই।
create extension if not exists pg_net;
create or replace function fa_push_hook() returns trigger language plpgsql security definer set search_path = public, extensions as $f$
begin
  perform net.http_post(
    url := 'https://ynbkemwbznuxfhskkqqs.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'sb_publishable_yHxhAi_a-EQYJpf6muEaVg_c-kJEvdB', 'x-webhook-secret', 'PASTE_PUSH_WEBHOOK_SECRET_HERE'),
    body := jsonb_build_object('type', 'INSERT', 'table', 'mc2_ac_messages', 'record', to_jsonb(new)),
    timeout_milliseconds := 5000);
  return new;
exception when others then return new;
end $f$;
revoke all on function fa_push_hook() from public, anon, authenticated;
drop trigger if exists fa_push_hook_t on mc2_ac_messages;
create trigger fa_push_hook_t after insert on mc2_ac_messages for each row execute function fa_push_hook();
