// অ্যাডমিন: "📢 সর্বজনীন নোটিশ" — সব রুমের হোমে সবার জন্য একটা নোটিশ বক্স (রুম/সেশন নির্ভর নয়)। ডিফল্টে বন্ধ।
// SQL: sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql (অংশ ৪)। admin.js-এর আগে লোড হয়।
(function () {
  var M = function () { return window.MCA; };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["gn", "📢 সর্বজনীন নোটিশ"]]);
  function view() {
    var $ = M().$, esc = M().esc, A = M().A;
    return A("fa_global_notice?select=show_menu&id=eq.1").then(function (m) { return !!(m && m[0] && m[0].show_menu); }).catch(function () { return null; }).then(function (menuOn) { // null = কলাম নেই (SQL চালানো হয়নি)
    return A("fa_global_notice?select=enabled,body&id=eq.1").then(function (d) {
      var on = !!(d && d[0] && d[0].enabled), body = (d && d[0] && d[0].body) || "";
      $("#view").innerHTML = "<h2>📢 সর্বজনীন নোটিশ</h2>" +
        "<div class='it'><div><b>অবস্থা</b> " + (on ? "<span class='tag'>🟢 হোমে দেখাচ্ছে</span>" : "<span class='tag'>⚪ বন্ধ (হোমে দেখায় না)</span>") + "</div>" +
        "<label>নোটিশের লেখা (সর্বোচ্চ ৫০০ অক্ষর)<textarea id='gnt' rows='5' maxlength='500' placeholder='যেমন: আজ রাত ৯টায় সবার আড্ডা।'>" + esc(body) + "</textarea></label>" +
        "<div class='act'><button id='gns' type='button'>💾 সেভ</button><button id='gnt2' type='button' class='" + (on ? "d" : "") + "' data-v='" + (on ? 0 : 1) + "'>" + (on ? "⏻ বন্ধ করুন" : "⏻ চালু করুন (হোমে দেখাবে)") + "</button></div>" +
        "<div class='sm'>এটা সব বিভাগ ও সেশনের হোমে, “রুম · চ্যাট · নোটিশ” বাটনের ঠিক নিচে সবসময় খোলা অবস্থায় সবাইকে দেখায়। বন্ধ থাকলে কিছুই দেখায় না। লেখা সেভ থাকে।</div></div>" +
        "<div class='it'><div><b>🔘 হোমের ওপরের “রুম · চ্যাট · নোটিশ” (বিভাগ · সেশন) বাটন</b> " + (menuOn === null ? "<span class='tag'>⚠ SQL চালাতে হবে</span>" : menuOn ? "<span class='tag'>🟢 অন (হোমে দেখাচ্ছে)</span>" : "<span class='tag'>⚪ অফ (লুকানো — ডিফল্ট)</span>") + "</div>" +
        "<div class='act'><button id='gnmenu' type='button' class='" + (menuOn ? "d" : "") + "' data-v='" + (menuOn ? 0 : 1) + "'>" + (menuOn ? "⏻ অফ করুন (লুকান)" : "⏻ অন করুন (দেখান)") + "</button></div>" +
        "<div class='sm'>অফ থাকলে হোমে ওই বাটনটা দেখা যায় না; চ্যাট, “নাম ছাড়া Enter” ও “নামসহ Enter” আগের মতোই চলে। ডিফল্ট = অফ। ইউজাররা রিফ্রেশ করলে বদল পাবে।</div></div><p class='sm' id='gnm'></p>";
      var save = function (en) {
        var txt = $("#gnt").value.trim();
        if (en && !txt) { alert("আগে নোটিশের লেখা দিন।"); return; }
        return A("fa_global_notice", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: 1, enabled: en, body: txt, updated_at: new Date().toISOString() }) })
          .then(function () { return view(); })
          .catch(function (e) { var t = e && e.message ? e.message : String(e); alert(/fa_global_notice|404|PGRST205|42P01/.test(t) ? "সার্ভারে টেবিল নেই। sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql একবার Supabase SQL Editor-এ চালান।\n\n" + t : t); });
      };
      $("#view").onclick = function (e) {
        var id = e.target && e.target.id;
        if (id === "gns") save(on);
        else if (id === "gnt2") save(e.target.dataset.v === "1");
        else if (id === "gnmenu") A("fa_global_notice", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ id: 1, show_menu: e.target.dataset.v === "1", updated_at: new Date().toISOString() }) })
          .then(function () { return view(); })
          .catch(function (er) { var t = er && er.message ? er.message : String(er); alert(/show_menu|PGRST204|42703|400/.test(t) ? "আগে sql/SQL-15-HOME-MENU-BUTTON-ONOFF.sql একবার Supabase SQL Editor-এ চালান।\n\n" + t : t); });
      };
    }).catch(function (e) {
      var t = e && e.message ? e.message : String(e);
      $("#view").innerHTML = "<h2>📢 সর্বজনীন নোটিশ</h2><p class='warn'>লোড হয়নি: " + M().esc(t) + "</p><p class='sm'>sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql একবার Supabase SQL Editor-এ চালান, তারপর রিফ্রেশ করুন।</p>";
    });
    });
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { gn: view });
})();
