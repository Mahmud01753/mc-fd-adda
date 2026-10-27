// অ্যাডমিন: "🎨 থিম" ট্যাব — চ্যাট ও হোমের থিম আলাদা, মোড, অ্যাডজাস্ট, লাইভ প্রিভিউ, ডিফল্টে ফেরা, অন/অফ সুইচ, নিজের থিম বানান, র‍্যান্ডম ঘোরা। সব কাজ theme.js-এর FATheme.panel()-এ। SQL: sql/SQL-25-CHAT-THEME.sql (একবার)।
(function () {
  window.MCA_TABS = (window.MCA_TABS || []).concat([["theme", "🎨 থিম"]]);
  function view() {
    var m = window.MCA;
    m.$("#view").innerHTML = "<h2>🎨 থিম (চ্যাট ও হোম আলাদা)</h2><div class='sm'>এখানে প্রিভিউ শুধু নিচের বক্সে দেখায়। “সবার জন্য চালু করুন” চাপলে সবার জন্য বদলায়। ডিফল্ট ক্লাসিক = আজকের চেহারা। নিচে “✨ নিজের থিম বানান” ও “🔀 র‍্যান্ডম ঘোরা” আছে (চ্যাট আর হোমের র‍্যান্ডম আলাদা)। সেভের জন্য SQL-25 একবার চালাতে হয়।</div><div id='thHost' style='margin-top:8px'></div>";
    if (!window.FATheme) { m.$("#thHost").textContent = "theme.js লোড হয়নি।"; return Promise.resolve(); }
    return window.FATheme.panel(m.$("#thHost"), { rpc: m.rpc });
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { theme: view });
})();
