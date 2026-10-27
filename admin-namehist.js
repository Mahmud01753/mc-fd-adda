// অ্যাডমিন: "📝 নামের ইতিহাস" — কে কখন নাম বদলেছে (পুরনো → নতুন), ইউজার আইডি/নাম দিয়ে খোঁজা যায়। শুধু অ্যাডমিন।
// SQL: sql/SQL-6-NAME-HISTORY.sql + sql/SQL-7-NAME-HISTORY-LIST.sql + sql/SQL-10-NAME-RECORD-ON-CHAT-ENTER.sql (চ্যাটে ঢোকার সময়ও নাম লেখে)। admin.js-এর আগে লোড হয়।
(function () {
  var M = function () { return window.MCA; };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["nh", "📝 নামের ইতিহাস"]]);
  var QV = "", NHL = [], NHP = 0;
  if (window.MCPG) window.MCPG.onPer(function () { NHP = 0; });
  function paintNh() {
    var $ = M().$, per = window.MCPG ? window.MCPG.per() : 20, pages = Math.max(1, Math.ceil(NHL.length / per));
    if (NHP >= pages) NHP = pages - 1; if (NHP < 0) NHP = 0;
    $("#nhl").innerHTML = "<p class='sm'>" + NHL.length + "টি এন্ট্রি (সর্বশেষ ১০০ পর্যন্ত, নতুন আগে)</p>" + draw(NHL.slice(NHP * per, NHP * per + per));
    var pg = $("#nhpg"); if (pg) pg.innerHTML = window.MCPG ? window.MCPG.html(NHP, NHL.length, per, "data-nhp") : "";
  }
  function draw(L) {
    var esc = M().esc;
    return L.length ? L.map(function (h) {
      return "<div class='it'><div><b>" + (h.o ? esc(h.o) : "<span class='sm'>(প্রথমবার)</span>") + "</b> → <b>" + esc(h.n) + "</b></div>" +
        "<div class='sm'>ইউজার আইডি: <span class='tag'>" + esc(h.u || "—") + "</span> · " + esc(M().tm(h.t)) + (h.u ? " <button type='button' class='l s' data-nhmn='" + esc(h.u) + "'>🎭 সব নাম / একই ব্যক্তি?</button>" : "") + "</div></div>";
    }).join("") : "<p class='sm'>কোনো নাম-বদল পাওয়া যায়নি। (হোম থেকে নাম লিখে ঢোকার রেকর্ড আসতে sql/SQL-10-NAME-RECORD-ON-CHAT-ENTER.sql চালাতে হবে।)</p>";
  }
  function load() {
    var $ = M().$, esc = M().esc;
    $("#nhl").innerHTML = "<p class='sm'>⏳ লোড হচ্ছে…</p>";
    return M().rpc("fa_admin_name_history_all", { p_q: QV || null, p_limit: 100 }).then(function (L) {
      NHL = Array.isArray(L) ? L : []; NHP = 0; paintNh();
    }).catch(function (e) {
      var t = e && e.message ? e.message : String(e);
      $("#nhl").innerHTML = "<p class='warn'>লোড হয়নি: " + esc(t) + "</p><p class='sm'>sql/SQL-6-NAME-HISTORY.sql, sql/SQL-7-NAME-HISTORY-LIST.sql আর sql/SQL-10-NAME-RECORD-ON-CHAT-ENTER.sql একবার Supabase SQL Editor-এ চালান, তারপর রিফ্রেশ করুন।</p>";
    });
  }
  function view() {
    var $ = M().$;
    $("#view").innerHTML = "<h2>📝 নামের ইতিহাস</h2>" +
      "<div class='row'><label>খুঁজুন (ইউজার আইডি বা নাম)<input id='nhq' type='text' maxlength='40' placeholder='যেমন: রাফি বা ইউজার আইডি' value='" + M().esc(QV) + "'></label><button id='nhs' type='button'>🔍 খুঁজুন</button><button id='nhr' type='button' class='l'>সব দেখান</button></div>" +
      "" + (window.MCPG ? window.MCPG.box("", "nhl") : "<div id='nhl'></div>") + "<div id='nhpg'></div><p class='sm'>ইউজার একই নামে ফিরে গেলেও প্রতিটা বদল আলাদা এন্ট্রি। প্রতি ইউজারের সর্বশেষ ২০০টা বদল রাখা হয়। এই তথ্য শুধু অ্যাডমিন দেখে। 🎭 বাটনে চাপলে সেই ডিভাইস আইডির সব নাম ও (শক্ত প্রমাণ থাকলে) একই ব্যক্তির পপআপ খোলে।</p>";
    var go = function () { QV = ($("#nhq").value || "").trim(); load(); };
    $("#view").onclick = function (e) {
      var mb = e.target && e.target.closest ? e.target.closest("[data-nhmn]") : null;
      if (mb && window.MCA_NAMEPOP) { mb.disabled = true; window.MCA_NAMEPOP.mnUid(mb.dataset.nhmn).then(function () { mb.disabled = false; }, function (er) { mb.disabled = false; M().fail(er); }); return; }
      var pb = e.target && e.target.closest ? e.target.closest("[data-nhp]") : null; if (pb) { if (!pb.disabled) { NHP = +pb.dataset.nhp; paintNh(); } return; }
      var id = e.target && e.target.id;
      if (id === "nhs") go();
      else if (id === "nhr") { $("#nhq").value = ""; QV = ""; load(); }
    };
    $("#nhq").onkeydown = function (e) { if (e.key === "Enter") go(); };
    return load();
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { nh: view });
})();
