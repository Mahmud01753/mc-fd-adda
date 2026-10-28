// অ্যাডমিন: "↔ রিপ্লাই swipe" ট্যাব — চ্যাটে বার্তা টেনে রিপ্লাই/মেনশন করতে কতটুকু (px) টানতে হবে তা নিজে ঠিক করা।
// সেটিং mc2_theme_cfg.opts.swipe-এ সেভ হয় (SQL-25 আগেই চালানো; নতুন SQL লাগে না)। ডিফল্ট ৩০px। সীমা ১০–১৫০।
(function () {
  window.MCA_TABS = (window.MCA_TABS || []).concat([["swipe", "↔ রিপ্লাই swipe"]]);
  var DEF = 30, MIN = 10, MAX = 150;
  function view() {
    var m = window.MCA, C = window.MC_CFG || {}, base = String(C.url || "").replace(/\/$/, "");
    m.$("#view").innerHTML = "<h2>↔ রিপ্লাই swipe (টানার দূরত্ব)</h2>" +
      "<div class='sm'>চ্যাটে কোনো বার্তা আঙুল দিয়ে ডানে বা বামে টানলে রিপ্লাই/মেনশন হয়। এখানে ঠিক করুন কত px টানলে কাজ করবে। <b>ছোট সংখ্যা = অল্প টানেই রিপ্লাই</b> (ভুলে হয়ে যেতে পারে); <b>বড় সংখ্যা = বেশি টানতে হবে</b>। ডিফল্ট " + DEF + "px। সেভের পর ইউজাররা রিফ্রেশ করলে বা কিছুক্ষণের মধ্যে নতুন মান পাবে।</div>" +
      "<div style='margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap'>" +
      "<input id='swR' type='range' min='" + MIN + "' max='" + MAX + "' step='1' value='" + DEF + "' style='flex:1;min-width:160px'>" +
      "<input id='swN' type='number' min='" + MIN + "' max='" + MAX + "' step='1' value='" + DEF + "' style='width:76px'> <span>px</span></div>" +
      "<div style='margin-top:10px;display:flex;gap:8px;flex-wrap:wrap'>" +
      "<button type='button' id='swSave'>💾 সেভ করুন</button>" +
      "<button type='button' class='l' id='swDef'>↩ ডিফল্ট (" + DEF + ")</button></div>" +
      "<div id='swMs' class='sm' style='margin-top:8px'>⏳ বর্তমান মান আনছি…</div>";
    var R = m.$("#swR"), N = m.$("#swN"), MS = m.$("#swMs");
    function clamp(v) { v = Math.round(Number(v)); if (!isFinite(v)) v = DEF; return Math.max(MIN, Math.min(MAX, v)); }
    R.oninput = function () { N.value = R.value; };
    N.oninput = function () { if (N.value !== "") R.value = clamp(N.value); };
    m.$("#swDef").onclick = function () { R.value = N.value = DEF; MS.textContent = "ডিফল্ট বসেছে — সেভ করুন চাপলে চালু হবে।"; };
    function cfgGet() {
      return fetch(base + "/rest/v1/mc2_theme_cfg?id=eq.1&select=chat,home,opts", { headers: { apikey: C.key, Authorization: "Bearer " + C.key } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (a) { var x = (a && a[0]) || {}; return { chat: x.chat || {}, home: x.home || {}, opts: x.opts || {} }; });
    }
    cfgGet().then(function (c) {
      var v = Number(c.opts.swipe); v = (v >= MIN && v <= MAX) ? v : DEF; R.value = N.value = v;
      MS.textContent = "বর্তমান মান: " + v + "px" + (c.opts.swipe ? "" : " (ডিফল্ট)");
    }).catch(function () { MS.textContent = "⚠ বর্তমান মান আনা যায়নি (SQL-25 চালানো আছে তো?) — তবু সেভ চেষ্টা করতে পারেন।"; });
    m.$("#swSave").onclick = function () {
      var v = clamp(N.value); R.value = N.value = v; MS.textContent = "⏳ সেভ হচ্ছে…";
      cfgGet().then(function (c) { // বাকি থিম-সেটিং অক্ষত রেখে শুধু swipe বদলানো হয়
        var o = JSON.parse(JSON.stringify(c.opts)); o.swipe = v;
        return m.rpc("mc2_admin_set_theme", { p_chat: c.chat, p_home: c.home, p_opts: o });
      }).then(function () { MS.textContent = "✅ সেভ হয়েছে — এখন " + v + "px টানলে রিপ্লাই হবে।"; })
        .catch(function () { MS.textContent = "❌ সেভ হয়নি — অ্যাডমিন লগইন ও SQL-25 চালানো আছে কিনা দেখুন।"; });
    };
    return Promise.resolve();
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { swipe: view });
})();
