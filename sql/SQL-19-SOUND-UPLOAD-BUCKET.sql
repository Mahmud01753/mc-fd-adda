-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৬, মালিক নিশ্চিত করেছেন) | আবার চালালে ক্ষতি নেই
-- Friend Adda: অ্যাডমিন → 🎞 → 🔊 মাছ ও পাখির শব্দ-এ নিজের mp3 আপলোডের জন্য শব্দের ফোল্ডার (বাকেট mc2-sounds)। Supabase SQL Editor-এ একবার চালান।
-- চালালে: অ্যাডমিন mp3 আপলোড করতে ও ডিলিট করতে পারবে; সবাই শুনতে পারবে। না চালালে: আপলোড কাজ করবে না (লিংক বসানো ও বাকি সব আগের মতো চলবে)।
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mc2-sounds', 'mc2-sounds', true, 1048576,
  array['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/webm'])
on conflict (id) do update set public = true, file_size_limit = 1048576,
  allowed_mime_types = array['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/webm'];

drop policy if exists "sounds upload" on storage.objects;
drop policy if exists "sounds delete" on storage.objects;
create policy "sounds upload" on storage.objects for insert to authenticated with check (bucket_id = 'mc2-sounds' and mc2_is_admin());
create policy "sounds delete" on storage.objects for delete to authenticated using (bucket_id = 'mc2-sounds' and mc2_is_admin());
