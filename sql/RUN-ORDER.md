# Supabase-এ SQL চালানোর ক্রম ও অবস্থা (শুধু মালিকের "ওকে" দেওয়া ✅ থাকে; পেন্ডিং এখানে লেখা হয় না)

Supabase → SQL Editor → New query → ফাইলের পুরোটা পেস্ট → Run। প্রতিটা ফাইল আবার চালালেও ক্ষতি নেই।
(AI আপনার Supabase-এ নিজে SQL চালাতে পারে না — আপনাকেই চালাতে হয়।)
হিসাব ফাইলের নাম ধরে: `sql/SQL-DONE.txt`। 

| ক্রম | ফাইল | কী কাজ | অবস্থা |
|---|---|---|---|
| ১ | `sql/SQL-1-CORE-contest-chat-admin-tables-NO-RERUN.sql` | মূল সেটআপ: কন্টেস্ট, চ্যাট/অ্যাডমিন টেবিল ও ফাংশন, বাকেট | ✅ চালানো হয়েছে |
| ২ | `sql/SQL-2-BIN-CLEANUP-moderation-roompassword-NO-RERUN.sql` | রিসাইকেল বিন, ক্লিনআপ, মডারেশন, রুমের পাসওয়ার্ড | ✅ চালানো হয়েছে |
| ৩ | `sql/SQL-3-RESTRICT-LOCK-BADGES-GENDER-VISITORS-NO-RERUN.sql` | রেস্ট্রিকশন, লক, ব্যাজ, জেন্ডার, ভিজিটর তথ্য | ✅ চালানো হয়েছে |
| ৪ | `sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql` | গ্লোবাল নোটিশ, সাইট ব্যাকগ্রাউন্ড | ✅ চালানো হয়েছে |
| ৫ | `sql/SQL-4-ADMIN-USER.sql` | অ্যাডমিন ইউজার | ✅ চালানো হয়েছে |
| ৬ | `sql/messages-import-OLD-57-MESSAGES.sql` | পুরোনো ৫৭ বার্তা আমদানি | ✅ চালানো হয়েছে |
| ৭ | `sql/RUN-NOW-LIMITS-STORAGE-BADWORDS.sql` | লিমিট মেনু, স্টোরেজ অটো-ক্লিন, ডিফল্ট খারাপ শব্দ | ✅ চালানো হয়েছে |
| ৮ | `sql/SQL-5-USERINFO-BLOCK-RESTRICT-DAILYMSG-COUNTS.sql` | ইউজার কার্ডে ব্লক/রেস্ট্রিকশন/দৈনিক বার্তা | ✅ চালানো হয়েছে |
| ৯ | `sql/SQL-6-NAME-HISTORY.sql` | নামের ইতিহাস; নাম বদল ঘণ্টায় ১০ বার | ✅ চালানো হয়েছে |
| ১০ | `sql/SQL-7-NAME-HISTORY-LIST.sql` | অ্যাডমিন "📝 নামের ইতিহাস" ট্যাব | ✅ চালানো হয়েছে |
| ১১ | `sql/SQL-8-MEMBERS-LIST-MSG-RESTRICTION-COUNTS.sql` | User Info তালিকায় বার্তা/রেস্ট্রিকশন সংখ্যা | ✅ চালানো হয়েছে |
| ১২ | `sql/SQL-9-ADMIN-REMOVE-MSG-NOTE-VISIBLE-TO-ALL.sql` | অ্যাডমিন সরানো বার্তার নোট | ✅ চালানো হয়েছে |
| ১৩ | `sql/SQL-10-NAME-RECORD-ON-CHAT-ENTER.sql` | ঢোকার সময় নাম রেকর্ড | ✅ চালানো হয়েছে |
| ১৪ | `sql/SQL-11-LOCK-PASSWORD-SHOW-IN-ADMIN.sql` | লকের পাসওয়ার্ড দেখা | ✅ চালানো হয়েছে |
| ১৫ | `sql/SQL-12-SPLIT-MASTERS-HONOURS-ROOMS-NO-RERUN.sql` | মাস্টার্স/অনার্স আলাদা রুম (আর চালাবেন না) | ✅ চালানো হয়েছে |
| ১৬ | `sql/SQL-13-MASTERS-SESSION-ORDER-FIX.sql` | মাস্টার্স সেশনের ক্রম | ✅ চালানো হয়েছে |
| ১৭ | `sql/SQL-14-EDIT-MSG-5MIN-EDITED-LABEL-HISTORY.sql` | Edit + Edited + Edit History (শেষে চালাতে হয়) | ✅ চালানো হয়েছে |
| ১৮ | `sql/SQL-15-HOME-MENU-BUTTON-ONOFF.sql` | হোমের ওপরের বিভাগ·সেশন বাটন অন/অফ (ডিফল্ট অফ) | ✅ চালানো হয়েছে |
| ১৯ | `sql/SQL-16-HOME-MENU-DEFAULT-ON.sql` | হোমের ওপরের বাটন ডিফল্টে অন | ✅ চালানো হয়েছে |
| ২০ | `sql/SQL-17-ANIMATION-DOOR-SETTINGS.sql` | এনিমেশন ও দরজার সেটিং সার্ভারে সেভ | ✅ চালানো হয়েছে |
| ২১ | `sql/SQL-18-DOOR-SETTINGS-RAISE-SIZE-LIMIT.sql` | দরজার সেটিংয়ের সীমা ৩০০০০ অক্ষর (SQL-17-এর পর) | ✅ চালানো হয়েছে |

- নতুন Supabase প্রজেক্ট ছাড়া SQL-1, 2, 3, 3b আবার চালাবেন না।
