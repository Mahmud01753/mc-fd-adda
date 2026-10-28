-- SQL-29: SQL-28-এর ট্রিগারে apikey হেডার যোগ (Supabase এখন function-এ ঢুকতে apikey চায় — না দিলে 401 MISSING_CREDENTIALS)।
-- anon key পাবলিক (config.js-এ আছে), গোপন নয়। সিক্রেট জায়গায় নিজের PUSH_WEBHOOK_SECRET বসান (জিপে টেমপ্লেট: PASTE_PUSH_WEBHOOK_SECRET_HERE)।
-- SQL-28-এর পরে চালান। না চালালে: পুশ 401 পায়, নোটিফিকেশন যায় না (বাকি সাইট ঠিক চলে)। আবার চালালে ক্ষতি নেই।
create extension if not exists pg_net;
create or replace function fa_push_hook() returns trigger language plpgsql security definer set search_path = public, extensions as $f$
begin
  perform net.http_post(
    url := 'https://ynbkemwbznuxfhskkqqs.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYmtlbXdiem51eGZoc2trcXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODIzODcsImV4cCI6MjEwNzY1ODM4N30.GS4N90yY21j7AXG1G90cPTR8XdeOYCoJBN7dqsklZCE', 'x-webhook-secret', 'PASTE_PUSH_WEBHOOK_SECRET_HERE'),
    body := jsonb_build_object('type', 'INSERT', 'table', 'mc2_ac_messages', 'record', to_jsonb(new)),
    timeout_milliseconds := 5000);
  return new;
exception when others then return new;
end $f$;
revoke all on function fa_push_hook() from public, anon, authenticated;
drop trigger if exists fa_push_hook_t on mc2_ac_messages;
create trigger fa_push_hook_t after insert on mc2_ac_messages for each row execute function fa_push_hook();
