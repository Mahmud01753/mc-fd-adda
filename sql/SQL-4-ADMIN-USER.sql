-- ✅ STATUS: চালানো হয়েছে (২০২৬-১০-২৪, মালিক নিশ্চিত করেছেন) | আবার চালানোর দরকার নেই
-- কাজ: অ্যাডমিন ইউজার বসানো।
-- ⚠ ইমেইল লুকানো: চালানোর আগে নিচের YOUR-ADMIN-EMAIL@example.com বদলে নিজের অ্যাডমিন ইমেইল বসান
-- সবার শেষে চালান। আগে Authentication > Users > Add user (Auto Confirm টিক) দিয়ে অ্যাডমিন ইউজার বানান।
-- নিচের ইমেইল ছোট হাতের অক্ষরে নিজের ইমেইল দিয়ে বদলান:
insert into mc2_admins(email) values ('YOUR-ADMIN-EMAIL@example.com') on conflict do nothing;
-- এরপর অ্যাডমিন প্যানেলে ঢুকে 🔒 লক ট্যাব থেকে নিজের লক কোড দিন।
