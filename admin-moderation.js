// অ্যাডমিন: "🛡️ মডারেশন" ট্যাব — রিপোর্ট দেখা/বৈধ-অবৈধ করা, বার্তা মোছা, সতর্ক করা, সাময়িক Restriction/ব্যান, Unban, যাচাই (Verify), ইতিহাস, আর ফাইল আপলোড সেটিংস।
// admin-users.js-এর পরে ও admin.js-এর আগে লোড হয়। SQL: supabase-moderation.sql (সব নিয়ম সার্ভারে যাচাই হয়; এই ফাইল শুধু বোতাম/তালিকা)।
(function () {
  var SUB = "reports", ST = "open", OFF = 0, HV = "", M = null, LIM = 50, AH = 24, AD = "", XOLD = 0, RSM = {}, RSF = true, LKM = {};
  if (!document.getElementById("mcChkFix")) { var cf = document.createElement("style"); cf.id = "mcChkFix"; cf.textContent = "[hidden]{display:none!important}label.chk{display:flex;gap:8px;align-items:center;cursor:pointer}label.chk input[type=checkbox],.xg input[type=checkbox]{width:auto;flex:none;margin:0}"; document.head.appendChild(cf); }
  window.MCA_TABS = (window.MCA_TABS || []).concat([["mod", "🛡️ মডারেশন"]]);
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { mod: view });
  if (window.MCPG) window.MCPG.onPer(function () { OFF = 0; });
  window.MCA_MODGO = function (sub) { SUB = sub; OFF = 0; var b = document.querySelector('#tabs [data-t="mod"]'); if (b) b.click(); }; // বেনামি চ্যাট ট্যাব থেকে "সক্রিয় ইউজার" খোলে
  var RS = { abuse: "🤬 গালিগালাজ/অশ্লীল ভাষা", harass: "😡 হয়রানি/বুলিং", threat: "⚠️ হুমকি/সহিংসতা", adult: "🔞 অশালীন কনটেন্ট", spam: "📢 স্প্যাম/বিজ্ঞাপন", privacy: "🔒 ব্যক্তিগত তথ্য", illegal: "🚫 বেআইনি/ক্ষতিকর ফাইল", other: "✍️ অন্য কারণ" };
  var STL = { open: "অপেক্ষমান", valid: "বৈধ", rejected: "অবৈধ" };
  var RLA = { give: "⚠️ Restriction দেওয়া হয়েছে", auto: "🤖 অটো Restriction (খারাপ শব্দ)", shorten: "⏱ সময় কমানো হয়েছে", extend: "⏱ সময় বাড়ানো হয়েছে", end: "🔓 Restriction বন্ধ করা হয়েছে" };
  function rlogHtml(L) { // Restriction অ্যাকশন লগ (supabase-restrict-v2.sql: fa_restrict_log)
    var E = M.esc;
    return (L || []).map(function (l) {
      return '<div class="it"><div><b>' + E(RLA[l.a] || l.a) + '</b> <span class="sm">' + M.tm(l.c) + " · " + E(l.by || "") + "</span></div>" +
        '<div class="sm">' + (l.nick ? E(l.nick) + " · " : "") + (l.m ? "মিনিট: " + bd(l.m) + " · " : "") + (l.o ? "আগের মেয়াদ: " + M.tm(l.o) + " " : "") + (l.n ? "→ নতুন মেয়াদ: " + M.tm(l.n) : "") + "</div>" + (l.r ? '<div class="sm">' + E(l.r) + "</div>" : "") + "</div>";
    }).join("") || '<p class="sm">এখনো কোনো লগ নেই।</p>';
  }
  var ACT = { warn: "⚠️ সতর্ক করা হয়েছে", restrict: "⏳ Restriction", ban: "⛔ সাময়িক ব্যান", ban_perm: "⛔ স্থায়ী ব্যান", unban: "✅ Unban", review_flag: "🔎 Review-তে উঠেছে", review_clear: "Review শেষ (শাস্তি ছাড়া)", verify: "✔ যাচাই (Verify)", report_valid: "রিপোর্ট বৈধ", report_rejected: "রিপোর্ট অবৈধ", report_reopen: "রিপোর্ট আবার খোলা", msg_remove: "🗑 বার্তা সরানো", upload_on: "📎 ফাইল আপলোড চালু", upload_off: "📎 ফাইল আপলোড বন্ধ", keep_set: "🕒 মোছার সময় বদল", purge: "🗑 এখনই মোছা" };
  var DUR = [["১ ঘণ্টা", 60], ["৬ ঘণ্টা", 360], ["২৪ ঘণ্টা", 1440], ["৩ দিন", 4320], ["৭ দিন", 10080], ["৩০ দিন", 43200]];
  var DUR2 = [["১৫ মিনিট", 15]].concat(DUR); // Restriction-এর সময়ের তালিকা (কাস্টমে ১ মিনিট – ৩৬৫ দিন)
  var bd = function (s) { return String(s).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  function left(t0) { var t = Math.max(1, Math.ceil((new Date(t0).getTime() - Date.now()) / 60000)), d = Math.floor(t / 1440), h = Math.floor(t % 1440 / 60), m = t % 60; return d ? bd(d) + " দিন " + bd(h) + " ঘণ্টা" : h ? bd(h) + " ঘণ্টা " + bd(m) + " মিনিট" : bd(m) + " মিনিট"; }
  function stl(st, until) { return st === "banned" ? (until ? "⛔ সাময়িক ব্যান (বাকি " + left(until) + ")" : "⛔ স্থায়ী ব্যান") : st === "restricted" ? "⏳ Restriction (বাকি " + (until ? left(until) : "—") + ")" : "✅ স্বাভাবিক"; }
  function fileUrl(p) { return M.base + "/storage/v1/object/public/mc2-chat/" + String(p).split("/").map(encodeURIComponent).join("/"); }
  function nav() {
    var t = [["reports", "🚩 রিপোর্ট"], ["users", "👥 Review/ব্যান/লক তালিকা"], ["upload", "📎 ফাইল আপলোড সেটিংস"], ["rst", "⚠️ Restriction তালিকা"], ["lck", "🛡 স্ক্রীনশট সুরক্ষা"], ["keep", "🕒 স্বয়ংক্রিয় মোছা"], ["active", "🟢 সক্রিয় ইউজার"]];
    return '<div class="tabs" style="margin-bottom:10px">' + t.map(function (x) { return '<button type="button" data-s="' + x[0] + '" class="' + (SUB === x[0] || (SUB === "hist" && x[0] === "users") ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>";
  }
  var RULE = '<p class="sm">নিয়ম: একই ইউজারের বিরুদ্ধে ৩ জন আলাদা ইউজারের রিপোর্ট আপনি "বৈধ" করলে সে নিজে থেকে <b>Review</b> তালিকায় ওঠে; তখন সাময়িক Restriction/ব্যান দেওয়া যায়। <b>স্থায়ী ব্যান</b> শুধু ৩টি বৈধ রিপোর্ট + প্রমাণ দেখে <b>যাচাই (Verify)</b> করার পরেই সম্ভব — সার্ভার এটা জোর করে মানায়।</p>';

  // ---------- ছোট ডায়ালগ: সময় + কারণ ----------
  function dlg(title, o) {
    M = M || window.MCA;
    return new Promise(function (ok) {
      var Z = document.createElement("div"); Z.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:50;display:flex;align-items:center;justify-content:center;padding:12px";
      Z.innerHTML = '<div class="c" style="width:100%;max-width:420px;display:grid;gap:8px"><h2>' + M.esc(title) + "</h2>" +
        (o.dur ? '<label>সময়কাল<select id="mdD">' + o.dur.map(function (d) { return '<option value="' + d[1] + '">' + M.esc(d[0]) + "</option>"; }).join("") + (o.custom ? '<option value="custom">✏️ কাস্টম সময়…</option>' : "") + "</select></label>" + (o.custom ? '<div class="row" id="mdCW" hidden><label>কত<input id="mdCN" type="number" min="1" inputmode="numeric" placeholder="যেমন ৪৫"></label><label>একক<select id="mdCU"><option value="1">মিনিট</option><option value="60">ঘণ্টা</option><option value="1440">দিন</option><option value="10080">সপ্তাহ</option></select></label></div>' : "") : "") +
        "<label>" + M.esc(o.label || "কারণ (ইউজারকে দেখানো হতে পারে)") + '<textarea id="mdR" rows="3" maxlength="300"></textarea></label><div class="sm" id="mdE" style="color:var(--red)"></div>' +
        '<div class="act"><button id="mdOk" type="button">নিশ্চিত করুন</button><button class="l" id="mdNo" type="button">বাতিল</button></div></div>';
      document.body.appendChild(Z);
      var done = function (v) { Z.remove(); ok(v); };
      Z.querySelector("#mdNo").onclick = function () { done(null); };
      if (o.custom) Z.querySelector("#mdD").onchange = function () { Z.querySelector("#mdCW").hidden = this.value !== "custom"; };
      Z.querySelector("#mdOk").onclick = function () {
        var r = Z.querySelector("#mdR").value.trim(), min = o.min == null ? 3 : o.min;
        if (r.length < min) { Z.querySelector("#mdE").textContent = min ? "অন্তত " + bd(min) + " অক্ষরে লিখুন।" : ""; if (min) return; }
        var mn = o.dur ? Z.querySelector("#mdD").value : null;
        if (mn === "custom") { var cn = Math.floor(+Z.querySelector("#mdCN").value * +Z.querySelector("#mdCU").value); var lo = o.cmin || 5, hi = o.cmax || 43200; if (!(cn >= lo && cn <= hi)) { Z.querySelector("#mdE").textContent = "কাস্টম সময় " + fmt(lo) + " থেকে " + fmt(hi) + "-এর মধ্যে দিন।"; return; } mn = cn; }
        done({ minutes: o.dur ? +mn : null, reason: r });
      };
    });
  }

  // ---------- মূল ভিউ ----------
  function loadRS() { // চলমান Restriction-এর তালিকা (ট্যাগ ও "তুলুন" বোতামের জন্য); SQL না থাকলে ফাঁকা
    M = window.MCA;
    return M.rpc("fa_admin_restrictions", { p_active_only: true }).then(function (L) { RSM = {}; (L || []).forEach(function (r) { (RSM[r.voter] = RSM[r.voter] || []).push(r); }); }).catch(function () { RSM = {}; }).then(function () {
      return M.rpc("fa_admin_locks", {}).then(function (L) { LKM = {}; (L || []).forEach(function (r) { LKM[r.voter] = r; }); }).catch(function () { LKM = {}; });
    });
  }
  function lockBtn(v, u, n) { var E = M.esc; return LKM[v] ? '<button class="s" data-a="ul" data-v="' + E(v) + '">🔓 লক খুলুন</button>' : '<button class="d s" data-a="lk" data-v="' + E(v) + '" data-u="' + E(u || "") + '" data-n="' + E(n || "") + '">🔒 লক</button>'; }
  function rtag(v) { var K = LKM[v] ? ' <span class="tag" style="background:#1f2937;color:#fff">🔒 লকড (' + (LKM[v].e ? "বাকি " + left(LKM[v].e) : "স্থায়ী") + ")</span>" : ""; var L = RSM[v]; if (!L || !L.length) return K; var e = Math.max.apply(null, L.map(function (r) { return r.e; })); return K + ' <span class="tag" style="background:#fecaca;color:#7f1d1d">⚠️ Restricted · বাকি ' + left(e) + "</span>"; }
  function lift(v) { return RSM[v] ? '<button class="s" data-a="ra" data-v="' + M.esc(v) + '">🔓 Restriction তুলুন</button>' : ""; }
  function view() { M = window.MCA; return loadRS().then(view2); }
  function view2() {
    M = window.MCA; var V = M.$("#view");
    V.onclick = click;
    if (SUB === "users") return users(V);
    if (SUB === "hist") return hist(V);
    V.onchange = chg;
    if (SUB === "rst") return rstView(V);
    if (SUB === "lck") return lckView(V);
    if (SUB === "active") return active(V);
    if (SUB === "upload") return upload(V);
    if (SUB === "keep") return keep(V);
    return reports(V);
  }
  function go() { view().catch(function (e) { M.fail(e); }); }


  // ---------- ⚠️ Restriction (ওয়ার্নিং-চিহ্ন, কাস্টম সময়) ----------
  function restrictDlg(b) {
    if (!b.dataset.u) alert("এই ইউজারের পাবলিক আইডি পাওয়া যায়নি — ❌ চিহ্ন সবার কাছে দেখাবে না, শুধু তার নিজের চ্যাটের ওপরে ওয়ার্নিং দেখাবে। (সক্রিয় ইউজার তালিকা থেকে দিলে আইডিসহ যায়।)");
    return dlg("⚠️ Restriction — " + (b.dataset.n || "ইউজার"), { dur: DUR2, custom: 1, cmin: 1, cmax: 525600, label: "⚠️ ওয়ার্নিং লিখুন (ইউজার ও সবাই দেখবে)" }).then(function (d) {
      if (!d) return "x";
      return M.rpc("fa_restrict", { p_voter: b.dataset.v, p_uid: b.dataset.u || "", p_nick: b.dataset.n || "", p_reason: d.reason, p_minutes: d.minutes }).then(function () { toastK("✅ Restriction দেওয়া হয়েছে"); return "ok"; });
    });
  }
  function rstView(V) {
    return Promise.all([M.rpc("fa_admin_restrictions", { p_active_only: RSF }), M.rpc("fa_admin_restrict_log", {}).catch(function () { return null; }), M.rpc("fa_rs", { p_voter: null }).catch(function () { return null; })]).then(function (R) {
      var L = R[0], LG = R[1], ON = !R[2] || R[2].on !== false, PV = !!R[2] && R[2].vis === "private", E = M.esc, now = Date.now();
      var h = nav() + '<div class="it"><div><b>⚠️ Restriction সিস্টেম (সবার জন্য):</b> <span class="tag">' + (ON ? "চালু" : "বন্ধ") + '</span></div><div class="act"><button class="' + (ON ? "d" : "") + ' s" data-a="rson" data-v="' + (ON ? 0 : 1) + '">' + (ON ? "⛔ বন্ধ করুন" : "✅ চালু করুন") + '</button></div><div class="sm">বন্ধ থাকলে: খারাপ শব্দে অটো-Restriction হয় না, নতুন Restriction দেওয়া যায় না, আর চ্যাটে কারো ⛔ চিহ্ন, লুকানো লেখা বা ওয়ার্নিং-বার দেখায় না। পুরোনো রেকর্ড ও লগ থাকে; আবার চালু করলে চলমানগুলো আগের মতো কাজ করে।</div></div>' +
        '<div class="it"><div><b>👁 ওয়ার্নিংয়ের কারণ কারা দেখবে:</b> <span class="tag">' + (PV ? "🔒 শুধু ইউজার নিজে ও অ্যাডমিন" : "🌐 সবাই") + '</span></div><div class="act"><button class="' + (PV ? "" : "l ") + 's" data-a="rsvis" data-v="all">🌐 সবাই</button><button class="' + (PV ? "l " : "") + 's" data-a="rsvis" data-v="private">🔒 শুধু ইউজার ও অ্যাডমিন</button></div><div class="sm">⛔ চিহ্নে চাপলে কারণ/বাকি সময়/কে দিয়েছে কারা দেখবে। "শুধু ইউজার ও অ্যাডমিন" দিলে সার্ভার অন্যদের কাছে এসব পাঠায়ই না। দুই ক্ষেত্রেই আসল আপত্তিকর মেসেজ সবার কাছে লুকানো থাকে। (supabase-restrict-v3.sql লাগে)</div></div>' + '<p class="sm"><b>⚠️ Restriction</b> = ইউজার চ্যাট করতে পারে, কিন্তু তার ছবির কোনায় ❌, মেসেজে "RESTRICTED" শাস্তি-ডিজাইন আসে, সবাই চাপলে তার ওয়ার্নিং দেখে, আর সে নিজে চ্যাটের ওপরে সবসময় ওয়ার্নিং দেখে। সময় শেষ হলে নিজে চলে যায়। <b>🤖 অটো:</b> খারাপ শব্দ লিখলে সার্ভার নিজেই ১ ঘণ্টা → ২ → ৪ → ৮ … (প্রতিবার দ্বিগুণ) Restriction দেয়; চলমানটার পাশে <b>⏱ সময় কমাও / ⏱ সময় বাড়াও / 🔓 বন্ধ করো</b> বোতাম আছে, অটো-Restriction আগে বন্ধ করলে সেটা দ্বিগুণ-গণনায় ধরা হয় না। সব কাজ নিচের লগে থাকে। বার্তা পাঠানো বন্ধ করতে চাইলে <b>⛔ ব্যান</b> দিন। নতুন Restriction দিতে "🟢 সক্রিয় ইউজার" বা "👥 Review/ব্যান তালিকা" থেকে ইউজারের পাশে ⚠️ Restriction চাপুন।</p>' +
        '<div class="act" style="margin-bottom:8px"><button type="button" class="' + (RSF ? "" : "l ") + 's" data-rf="1">চলমান</button><button type="button" class="' + (RSF ? "l " : "") + 's" data-rf="0">ইতিহাস (সাম্প্রতিক ২০০)</button></div>';
      h += (L || []).map(function (r) {
        var act = !r.l && r.e > now, stt = r.l ? "🔓 তোলা হয়েছে" : r.e > now ? "⚠️ চলমান — বাকি " + left(r.e) : "⌛ মেয়াদ শেষ";
        var vv = ' data-v="' + E(r.voter) + '" data-u="' + E(r.uid || "") + '" data-n="' + E(r.nick || "") + '"';
        return '<div class="it"><div><button class="lk" type="button" data-uu="' + E(r.voter) + '"><b>' + E(r.nick || "বেনামি") + '</b></button> <span class="tag">' + E(r.uid || "—") + '</span><span class="tag">' + stt + '</span><span class="tag">' + (r.k === "auto" ? "🤖 অটো" : "👮 অ্যাডমিন") + "</span>" + (r.k === "auto" && r.wd ? '<span class="tag">শব্দ: ' + E(r.wd) + "</span>" : "") + (r.fg ? '<span class="tag">ক্ষমা — গণনায় বাদ</span>' : "") + "</div>" +
          '<div style="border-left:3px solid #d93025;padding-left:8px">⚠️ ' + E(r.reason) + '</div><div class="sm">দেওয়া হয়েছে: ' + M.tm(r.c) + " · মেয়াদ শেষ: " + M.tm(r.e) + (r.l ? " · তোলা: " + M.tm(r.l) : "") + (r.by ? " · " + E(r.by) : "") + "</div>" +
          (act ? '<div class="act"><button class="l s" data-a="rcut" data-id="' + r.id + '" data-n="' + E(r.nick || "") + '">⏱ সময় কমাও</button><button class="l s" data-a="rext" data-id="' + r.id + '" data-n="' + E(r.nick || "") + '">⏱ সময় বাড়াও</button><button class="d s" data-a="rl" data-id="' + r.id + '" data-k="' + E(r.k || "") + '">🔓 বন্ধ করো</button><button class="l s" data-a="ra"' + vv + '>🔓 সব তুলুন</button><button class="l s" data-a="rs"' + vv + ">➕ আরেকটি ওয়ার্নিং</button></div>" : "") + "</div>";
      }).join("") || '<p class="sm">' + (RSF ? "এখন কেউ Restriction-এ নেই।" : "কোনো রেকর্ড নেই।") + "</p>";
      h += "<h2>📜 Restriction অ্যাকশন লগ (সাম্প্রতিক ২০০)</h2>" + (LG ? rlogHtml(LG) : '<p class="sm warn">লগ লোড হয়নি — supabase-restrict-v2.sql একবার Supabase SQL Editor-এ চালান।</p>');
      V.innerHTML = h;
    }).catch(function (er) { V.innerHTML = nav() + '<p class="sm warn">তালিকা লোড হয়নি — supabase-restrict.sql একবার Supabase SQL Editor-এ চালান। (' + M.esc(er && er.message ? er.message : "") + ")</p>"; });
  }

  // ---------- 🛡 স্ক্রীনশট সুরক্ষা (লকের তালিকা এখন 👥 Review/ব্যান/লক তালিকা ট্যাবে) ----------
  function lckView(V) {
    return M.rpc("fa_rs", { p_voter: null }).catch(function () { return null; }).then(function (st) {
      if (!st) { V.innerHTML = nav() + '<p class="sm warn">লোড হয়নি — supabase-restrict.sql একবার Supabase SQL Editor-এ চালান।</p>'; return; }
      var on = !!st.shot;
      V.innerHTML = nav() + '<div class="it"><div><b>🛡 চ্যাটে স্ক্রীনশট সুরক্ষা:</b> <span class="tag">' + (on ? "চালু" : "বন্ধ (ডিফল্ট)") + '</span></div><div class="act"><button class="' + (on ? "l" : "d") + ' s" data-a="shot" data-v="' + (on ? 0 : 1) + '">' + (on ? "বন্ধ করুন" : "🛡 চালু করুন (বিপদ দেখলে)") + '</button></div>' +
        '<div class="sm">চালু করলে চ্যাটে: উইন্ডো/ট্যাব ছাড়লে বা PrintScreen/Ctrl+P/Cmd+Shift+3-4-5 চাপলে লেখা ঢেকে যায়; কপি, প্রিন্ট ও ডান-ক্লিক মেনু বন্ধ; পর্দায় ইউজারের নাম-আইডির ঝাপসা ওয়াটারমার্ক থাকে (ছবি ফাঁস হলে কার থেকে তা বোঝা যায়)। কয়েক সেকেন্ডের মধ্যে সবার চ্যাটে কার্যকর হয়।<br>চালু থাকলে স্ক্রীন কালো হয় যখন: ট্যাব/অ্যাপ বদলায়, উইন্ডো ফোকাস হারায়, PrintScreen/স্ক্রীনশট কী চাপা হয়, ৩ আঙুলে স্পর্শ, বা পর্দার ওপর/নিচের কিনার থেকে টানা হয় (নোটিফিকেশন শেড/স্ক্রীন রেকর্ড বোতাম)।<br>⚠ সীমা: ফোনের ব্রাউজারে পাওয়ার+ভলিউম স্ক্রীনশট, শেডের স্ক্রীন রেকর্ড চালু হওয়া বা বাইরের ক্যামেরা আসলে আটকানো/ধরা যায় না — এটা বাধা ও ট্র্যাকিংয়ের ব্যবস্থা, ১০০% তালা নয়। পুরো আটকাতে Android অ্যাপ (APK) লাগে।</div></div>' +
        '<p class="sm">🔒 লকের তালিকা ও লক খোলা/মেয়াদ বদলানো এখন <b>👥 Review/ব্যান/লক তালিকা</b> ট্যাবে।</p>';
    });
  }

  function reports(V) {
    var f = function (k, l) { return '<button type="button" class="' + (ST === k ? "" : "l ") + 's" data-f="' + k + '">' + l + "</button>"; };
    if (window.MCPG) { LIM = window.MCPG.per(); OFF = Math.floor(OFF / LIM) * LIM; }
    return Promise.all([M.rpc("mc2_ac_admin_reports", { p_status: ST, p_limit: LIM, p_offset: OFF }), M.rpc("mc2_ac_admin_reports_count", { p_status: ST }).catch(function () { return null; })]).then(function (rr) {
      var L = rr[0], TOT = typeof rr[1] === "number" ? rr[1] : null;
      var h = nav() + RULE + '<div class="act" style="margin-bottom:8px">' + f("open", "অপেক্ষমান") + f("valid", "বৈধ") + f("rejected", "অবৈধ") + f("all", "সব") + "</div>" + (TOT != null ? '<p class="sm">এই তালিকায় মোট <b>' + bd(TOT) + "</b>টি রিপোর্ট</p>" : "");
      h += L.map(rcard).join("") || '<p class="sm">এই তালিকায় কোনো রিপোর্ট নেই।</p>';
      h += (TOT != null && window.MCPG) ? window.MCPG.html(Math.floor(OFF / LIM), TOT, LIM, 'data-a="mrpg" data-p') : '<div class="act" style="margin-top:8px">' + (OFF ? '<button class="l s" data-a="prev">← আগের</button>' : "") + (L.length >= LIM ? '<button class="l s" data-a="next">পরের ' + bd(LIM) + "টি →</button>" : "") + "</div>";
      V.innerHTML = h;
    });
  }
  function rcard(r) {
    var E = M.esc, gone = r.gone || (!r.snap_body && !r.snap_file), blocked = r.st !== "ok";
    var file = r.snap_file ? '<div><a href="' + E(fileUrl(r.snap_file)) + '" target="_blank" rel="noopener noreferrer">📎 ' + E(r.snap_fname || "ফাইল") + " (" + E(r.snap_kind) + ")</a>" + (r.gone ? ' <span class="sm">— বার্তা সরানো/লুকানো; ফাইল না-ও থাকতে পারে</span>' : "") + "</div>" : "";
    var b = '<div class="act">';
    if (r.status === "open") b += '<button class="s" data-a="rv" data-id="' + r.id + '" data-st="valid">✅ বৈধ</button><button class="l s" data-a="rv" data-id="' + r.id + '" data-st="rejected">❌ অবৈধ</button>';
    else b += '<button class="l s" data-a="rv" data-id="' + r.id + '" data-st="open">↩ আবার খুলুন</button>';
    if (r.message_id && !r.gone) b += '<button class="d s" data-a="rm" data-m="' + r.message_id + '">🗑 বার্তা মুছুন</button>';
    b += '<button class="l s" data-a="wn" data-v="' + E(r.target) + '" data-m="' + (r.message_id || "") + '">⚠️ সতর্ক</button><button class="l s" data-a="rs" data-v="' + E(r.target) + '" data-u="' + E(r.tuid || "") + '" data-n="' + E(r.target_nick || "") + '">⚠️ Restriction</button>' + lift(r.target) + '<button class="d s" data-a="bn" data-v="' + E(r.target) + '">⛔ ব্যান</button>' + lockBtn(r.target, r.tuid, r.target_nick) +
      (blocked ? '<button class="s" data-a="ub" data-v="' + E(r.target) + '">✅ Unban</button>' : "") + '<button class="l s" data-a="hs" data-v="' + E(r.target) + '">📜 ইতিহাস</button></div>';
    return '<div class="it' + (r.status === "rejected" ? " hid" : "") + '"><div><span class="tag">#' + bd(r.id) + '</span><span class="tag">' + E(STL[r.status] || r.status) + "</span><b>" + E(RS[r.reason] || r.reason) + '</b> <span class="sm">' + M.tm(r.created_at) + " · " + E(r.place || "") + "</span></div>" +
      '<div>বার্তার মালিক: <button class="lk" type="button" data-uu="' + E(r.target) + '"><b>' + E(r.target_nick || "বেনামি") + '</b></button> <span class="tag">' + E(r.tuid) + '</span>' + rtag(r.target) + ' <span class="sm">রিপোর্টার: ' + E(r.ruid) + "</span></div>" +
      (r.snap_body ? '<div style="border-left:3px solid var(--bd);padding-left:8px">' + E(r.snap_body) + "</div>" : "") + file + (gone && !file && !r.snap_body ? '<div class="sm">(বার্তার কপি নেই)</div>' : "") +
      (r.note ? '<div class="sm">রিপোর্টারের নোট: ' + E(r.note) + "</div>" : "") + (r.admin_note ? '<div class="sm">অ্যাডমিন নোট: ' + E(r.admin_note) + "</div>" : "") +
      '<div class="sm">এই ইউজারের বৈধ রিপোর্ট: <b>' + bd(r.valid_cnt) + " / ৩</b>" + (r.valid_cnt >= 3 ? ' <span class="tag">🔎 Review</span>' : "") + (blocked ? " · " + (r.st === "banned" ? "⛔ ব্যান চলছে" : "⏳ Restriction চলছে") : "") + "</div>" + b + "</div>";
  }

  function lockRow(k) {
    var E = M.esc, v = ' data-v="' + E(k.voter) + '" data-u="' + E(k.uid || "") + '" data-n="' + E(k.nick || "") + '"';
    return '<div class="it"><div><button class="lk" type="button" data-uu="' + E(k.voter) + '"><b>' + E(k.nick || "বেনামি") + '</b></button> <span class="tag">' + E(k.uid || "—") + '</span><span class="tag" style="background:#1f2937;color:#fff">🔒 লকড · ' + (k.e ? "বাকি " + left(k.e) : "স্থায়ী") + "</span></div>" +
      '<div style="border-left:3px solid #1f2937;padding-left:8px">' + E(k.reason) + '</div><div class="sm">লক: ' + M.tm(k.c) + (k.e ? " · শেষ হবে: " + M.tm(k.e) : "") + (k.by ? " · " + E(k.by) : "") + "</div>" +
      '<div class="act"><button class="s" data-a="ul" data-v="' + E(k.voter) + '">🔓 লক খুলুন</button><button class="l s" data-a="lk"' + v + '>⏱ মেয়াদ/কারণ বদলান</button><button class="l s" data-a="hs" data-v="' + E(k.voter) + '">📜 ইতিহাস</button></div></div>';
  }
  function lockSec() { // লকড ইউজারের তালিকা (loadRS-এ fa_admin_locks থেকে LKM ভরা হয়)
    var K = Object.keys(LKM).map(function (x) { return LKM[x]; }).sort(function (a, b) { return b.c - a.c; });
    return { n: K.length, h: '<h2>🔒 লকড ইউজার (' + bd(K.length) + ')</h2><p class="sm">লক = রিপোর্ট ছাড়াই সরাসরি ব্যান: চ্যাট দেখতে পারে, কিন্তু বার্তা/রিপ্লাই/ফাইল বন্ধ। মেয়াদ স্থায়ী বা কাস্টম (১ মিনিট – ৩৬৫ দিন); মেয়াদ শেষে নিজে থেকে খুলে যায়। নতুন লক দিতে নিচের ইউজারের পাশে (বা সক্রিয় ইউজার / রিপোর্টের পাশে) "🔒 লক" চাপুন।</p>' + (K.map(lockRow).join("") || '<p class="sm">এখন কেউ লকড নেই।</p>') };
  }
  function users(V) {
    return M.rpc("mc2_ac_admin_mods").then(function (L) {
      var LS = lockSec(), E = M.esc, h = nav() + LS.h + "<h2>👥 Review / ব্যান / Restriction</h2>" + RULE + L.map(function (u) {
        var b = '<div class="act"><button class="l s" data-a="hs" data-v="' + E(u.voter) + '">📜 ইতিহাস</button>' + acts(u) + "</div>";
        return '<div class="it"><div><button class="lk" type="button" data-uu="' + E(u.voter) + '"><b>' + E(u.nick) + '</b></button> <span class="tag">' + E(u.uid) + "</span>" + rtag(u.voter) + (u.review ? '<span class="tag">🔎 Review দরকার</span>' : "") + (u.verified ? '<span class="tag">✔ যাচাই হয়েছে</span>' : "") + "</div>" +
          '<div class="sm">' + stl(u.st, u.until) + " · বৈধ রিপোর্ট " + bd(u.valid_cnt) + "/৩ · অপেক্ষমান " + bd(u.open_cnt) + " · সতর্কতা " + bd(u.warns) + (u.reason && u.st !== "ok" ? " · কারণ: " + E(u.reason) : "") + "</div>" + b + "</div>";
      }).join("");
      V.innerHTML = L.length ? h : nav() + LS.h + "<h2>👥 Review / ব্যান / Restriction</h2>" + RULE + '<p class="sm">এখন কেউ Review/Restriction/ব্যান/সতর্কতায় নেই।</p>';
    });
  }
  function acts(u) {
    var E = M.esc, v = ' data-v="' + E(u.voter) + '" data-u="' + E(u.uid || "") + '" data-n="' + E(u.nick || "") + '"';
    return '<button class="l s" data-a="wn"' + v + ">⚠️ সতর্ক</button>" + '<button class="l s" data-a="rs"' + v + ">⚠️ Restriction</button>" + lift(u.voter) + '<button class="d s" data-a="bn"' + v + ">⛔ ব্যান</button>" + lockBtn(u.voter, u.uid, u.nick) +
      (u.st !== "ok" ? '<button class="s" data-a="ub"' + v + ">✅ Unban</button>" : "") + (u.valid_cnt >= 3 && !u.verified ? '<button class="s" data-a="vf"' + v + ">✔ যাচাই (Verify)</button>" : "") + (u.review ? '<button class="l s" data-a="cr"' + v + ">Review শেষ</button>" : "");
  }

  function hist(V) {
    return Promise.all([M.rpc("mc2_ac_admin_history", { p_voter: HV }), M.rpc("fa_admin_restrict_log", { p_voter: HV }).catch(function () { return null; })]).then(function (R) {
      var x = R[0], RL = R[1], E = M.esc, md = x.mod || {}, u = { voter: HV, uid: x.uid, nick: x.nick, st: x.st, valid_cnt: x.valid_cnt, verified: md.verified, review: md.review };
      var h = nav() + '<button class="l s" data-a="back">← ফিরুন</button><h2 style="margin-top:8px">📜 ' + E(x.nick) + ' <span class="tag">' + E(x.uid) + '</span>' + rtag(HV) + ' <button class="lk s" type="button" data-uu="' + E(HV) + '">ইউজার তথ্য</button></h2>' +
        '<div class="it"><div>অবস্থা: <b>' + stl(x.st, md.until) + "</b> " + (md.review ? '<span class="tag">🔎 Review দরকার</span>' : "") + (md.verified ? '<span class="tag">✔ যাচাই হয়েছে</span>' : "") + "</div>" +
        '<div class="sm">বৈধ রিপোর্ট (আলাদা রিপোর্টার): ' + bd(x.valid_cnt) + " / ৩ · সতর্কতা: " + bd(md.warns || 0) + (md.reason && x.st !== "ok" ? "<br>চলমান ব্যবস্থার কারণ: " + E(md.reason) : "") + (md.verified_note ? "<br>যাচাই নোট: " + E(md.verified_note) + " (" + E(md.verified_by || "") + ")" : "") + "</div>" +
        '<div class="act">' + acts(u) + "</div></div>";
      h += "<h2>রিপোর্টসমূহ (" + bd(x.reports.length) + ")</h2>" + (x.reports.map(function (r) {
        return '<div class="it"><div><span class="tag">#' + bd(r.id) + '</span><span class="tag">' + E(STL[r.status] || r.status) + "</span><b>" + E(RS[r.reason] || r.reason) + '</b> <span class="sm">' + M.tm(r.created_at) + " · রিপোর্টার " + E(r.ruid) + "</span></div>" +
          (r.snap_body ? "<div>" + E(r.snap_body) + "</div>" : r.snap_fname ? "<div>📎 " + E(r.snap_fname) + " (" + E(r.snap_kind) + ")</div>" : "") + (r.note ? '<div class="sm">নোট: ' + E(r.note) + "</div>" : "") + (r.admin_note ? '<div class="sm">অ্যাডমিন নোট: ' + E(r.admin_note) + "</div>" : "") + "</div>";
      }).join("") || '<p class="sm">কোনো রিপোর্ট নেই।</p>');
      h += "<h2>অ্যাকশনের ইতিহাস</h2>" + (x.log.map(function (l) {
        return '<div class="it"><div><b>' + E(ACT[l.action] || l.action) + '</b> <span class="sm">' + M.tm(l.created_at) + " · " + E(l.admin || "") + (l.until ? " · মেয়াদ " + M.tm(l.until) + " পর্যন্ত" : "") + "</span></div>" + (l.reason ? '<div class="sm">' + E(l.reason) + "</div>" : "") + "</div>";
      }).join("") || '<p class="sm">এখনো কোনো অ্যাকশন নেই।</p>');
      if (RL) h += "<h2>⚠️ Restriction লগ (অটো/অ্যাডমিন, সময় কমানো-বাড়ানো-বন্ধ)</h2>" + rlogHtml(RL);
      V.innerHTML = h;
    });
  }

  function upload(V) {
    return M.A("mc2_ac_cfg?select=value&key=eq.upload").catch(function () { return null; }).then(function (r) {
      var up = !r || !r.length || r[0].value !== false;
      V.innerHTML = nav() + '<div class="it"><div><b>📎 ফাইল আপলোড (ছবি/ভিডিও/অডিও/অনুমোদিত ফাইল):</b> <span class="tag">' + (up ? "চালু" : "বন্ধ") + '</span></div><div class="act"><button class="' + (up ? "d" : "") + ' s" data-a="up" data-v="' + (up ? 0 : 1) + '">' + (up ? "⛔ আপলোড বন্ধ করুন" : "✅ আপলোড চালু করুন") + "</button></div>" +
        '<div class="sm">বন্ধ করলে চ্যাটে 📎 বোতাম নিষ্ক্রিয় (ধূসর) হয়ে যায় (কয়েক সেকেন্ডের মধ্যে) এবং সার্ভারও সব আপলোড ও ফাইল-বার্তা আটকে দেয়। আবার চালু করলে সাথে সাথে চালু — কোড বদলাতে/আপলোড করতে হয় না। আগে পাঠানো ফাইল দেখা যায়।</div></div>' +
        '<div class="it" id="ftBox"><div class="sm">⏳ ফাইল টাইপের তালিকা লোড হচ্ছে…</div></div>' +
        '<div class="it"><div class="sm">রেট লিমিট: প্রতি ব্যবহারকারী মিনিটে ২০ বার্তা (২ সেকেন্ডে ১টি), মিনিটে ৫টি ও ঘণ্টায় ৩০টি ফাইল; প্রতি আইপি মিনিটে ৬০ বার্তা ও ২০ আপলোড। রিপোর্ট: ঘণ্টায় ৮টি, দিনে ২০টি।</div></div>';
      ftEditor(V.querySelector("#ftBox"));
    });
  }

  // ---------- 📎 অনুমোদিত ফাইল টাইপ (ডাটাবেজে mc2_ac_cfg key 'ftypes'; SQL: supabase-new-20261018j.sql) ----------
  // সারি: ext -> [ধরন, মাইম, সর্বোচ্চ MB, চালু?]। সার্ভার html/svg/js/xml/php বাদ রাখে।
  var FK = { image: "🖼 ছবি", video: "🎬 ভিডিও", audio: "🎵 অডিও", file: "📄 ফাইল" };
  var MIME = { apk: "application/vnd.android.package-archive", exe: "application/vnd.microsoft.portable-executable", zip: "application/zip", mkv: "video/x-matroska", rar: "application/vnd.rar", "7z": "application/x-7z-compressed", avi: "video/x-msvideo", "3gp": "video/3gpp", flv: "video/x-flv", wmv: "video/x-ms-wmv", mpeg: "video/mpeg", mpg: "video/mpeg", flac: "audio/flac", opus: "audio/opus", json: "application/json", rtf: "application/rtf", odt: "application/vnd.oasis.opendocument.text", bmp: "image/bmp", heic: "image/heic", ico: "image/x-icon", tif: "image/tiff", tiff: "image/tiff", msi: "application/x-msi", iso: "application/x-iso9660-image", dmg: "application/x-apple-diskimage", torrent: "application/x-bittorrent" };
  function ftEditor(box) {
    if (!box) return; var E = M.esc, L = {};
    var paint = function (msg, bad) {
      var ks = Object.keys(L).sort();
      box.innerHTML = '<div><b>অনুমোদিত ফাইল টাইপ ও সর্বোচ্চ MB (সার্ভারে জোর করে মানানো হয়):</b></div><div class="sm">প্রতি সারিতে চালু/বন্ধ, ধরন, সর্বোচ্চ MB বদলে নিচে সংরক্ষণ চাপুন। apk/exe/zip/mkv ইত্যাদি যোগ করলে সুইচ চালু থাকলে সবাই পাঠাতে পারবে — ঝুঁকি বুঝে দিন। html/svg/js/xml/php যোগ করা যায় না। এক্সটেনশন সর্বোচ্চ ৫ অক্ষর।</div>' +
        ks.map(function (k) { var r = L[k]; return '<div class="act" style="align-items:center;margin-top:6px" data-k="' + E(k) + '"><label style="min-width:84px"><input type="checkbox" data-f="on"' + (r[3] === false ? "" : " checked") + '> <b>.' + E(k) + '</b></label><select data-f="kind">' + Object.keys(FK).map(function (q) { return '<option value="' + q + '"' + (q === r[0] ? " selected" : "") + ">" + FK[q] + "</option>"; }).join("") + '</select><input data-f="mime" value="' + E(r[1]) + '" style="flex:1;min-width:130px" aria-label="মাইম"><input data-f="mb" type="number" min="1" max="5000" value="' + r[2] + '" style="width:70px" aria-label="MB"> MB<button class="d s" data-del="' + E(k) + '">🗑</button></div>'; }).join("") +
        '<div class="it" style="margin-top:8px"><b>➕ নতুন টাইপ যোগ করো</b><div class="act"><input id="ftNe" placeholder="এক্সটেনশন (কমা দিয়ে একাধিক: apk, exe, zip, mkv)" style="flex:1;min-width:160px"><select id="ftNk">' + Object.keys(FK).map(function (q) { return '<option value="' + q + '">' + FK[q] + "</option>"; }).join("") + '</select><input id="ftNm" type="number" min="1" max="5000" value="50" style="width:70px"> MB<button class="l s" id="ftAdd">➕ যোগ</button></div><div class="sm">ধরন না মিলিলে "ফাইল" রাখুন; ভিডিও এক্সটেনশনে ধরন "ভিডিও" দিলে প্রিভিউ চলে।</div></div>' +
        '<div class="act"><button id="ftSv">💾 সংরক্ষণ</button><button class="l" id="ftRs">↺ ডিফল্ট তালিকা</button></div><p class="sm' + (bad ? " warn" : "") + '">' + (msg ? E(msg) : "") + '</p>' +
        '<div class="sm">⚠️ Supabase-এর প্রজেক্ট-ওয়াইড আপলোড সীমা (ফ্রি প্ল্যানে সাধারণত ৫০ MB) এর বেশি ফাইল এখানে MB বাড়ালেও আটকাবে। বাড়াতে: Supabase Dashboard → Storage → Settings → "Global file size limit" (পেইড প্ল্যানে বাড়ে)।</div>';
    };
    var grab = function () { [].forEach.call(box.querySelectorAll("[data-k]"), function (row) { var k = row.dataset.k, r = L[k]; if (!r) return; r[0] = row.querySelector("[data-f=kind]").value; r[1] = row.querySelector("[data-f=mime]").value.trim().toLowerCase(); r[2] = Math.round(+row.querySelector("[data-f=mb]").value) || 1; r[3] = row.querySelector("[data-f=on]").checked; }); };
    box.onclick = function (e) {
      var t = e.target.closest("button"); if (!t) return;
      if (t.dataset.del) { grab(); delete L[t.dataset.del]; paint(); }
      else if (t.id === "ftAdd") {
        grab(); var mb = Math.round(+box.querySelector("#ftNm").value) || 0, kd = box.querySelector("#ftNk").value, bad = [];
        box.querySelector("#ftNe").value.toLowerCase().split(/[\s,]+/).forEach(function (x) { x = x.replace(/^\./, ""); if (!x) return; if (!/^[a-z0-9]{1,5}$/.test(x)) { bad.push(x); return; } L[x] = [kd, MIME[x] || (kd === "image" ? "image/" + x : kd === "video" ? "video/" + x : kd === "audio" ? "audio/" + x : "application/octet-stream"), mb || 25, true]; });
        paint(bad.length ? "এক্সটেনশন ঠিক নয় (১–৫ অক্ষর, a-z/০-৯): " + bad.join(", ") : "যোগ হয়েছে — সংরক্ষণ চাপুন", !!bad.length);
      } else if (t.id === "ftRs") { if (confirm("তালিকা কোডের ডিফল্টে ফিরবে (সংরক্ষণ চাপলে কার্যকর)। চালু?")) M.rpc("mc2_ac_ftypes_default", {}).then(function (d) { L = JSON.parse(JSON.stringify(d)); paint("ডিফল্ট বসেছে — সংরক্ষণ চাপুন"); }); }
      else if (t.id === "ftSv") { grab(); paint("⏳ সংরক্ষণ হচ্ছে…"); M.rpc("mc2_ac_ftypes_set", { p_list: L }).then(function (x) { paint(x === "ok" ? "✅ সংরক্ষিত — বাকেটের সীমাও আপডেট হয়েছে। চ্যাটে কয়েক সেকেন্ডে নতুন তালিকা আসে।" : "❌ হয়নি: " + x, x !== "ok"); }).catch(function (er) { paint("❌ " + er.message + " — supabase-new-20261018j.sql চালানো হয়েছে কি না দেখুন।", true); }); }
    };
    M.rpc("mc2_ac_ftypes_admin", {}).then(function (d) { L = d || {}; paint(); }).catch(function () { box.innerHTML = '<p class="sm warn">তালিকা লোড হয়নি — supabase-new-20261018j.sql চালান। (না চালানো পর্যন্ত আগের ডিফল্ট তালিকাই চলছে।)</p>'; });
  }

  // ---------- 🟢 সক্রিয় ইউজার: সবার তথ্য + ব্যান/Restriction/সতর্ক বোতাম ----------
  function active(V) {
    return Promise.all([M.rpc("mc2_ac_admin_active", { p_hours: AH, p_dept: AD ? +AD : null }), M.A("mc2_ac_depts?select=id,name&order=sort,name").catch(function () { return []; })]).then(function (r) {
      var L = r[0], Ds = r[1], E = M.esc, F = window.MCA_FMT || {}, on = L.filter(function (u) { return u.onl; }).length;
      var sel = function (k, v, o) { return '<label>' + o[0] + '<select data-af="' + k + '">' + o[1].map(function (x) { return '<option value="' + x[0] + '"' + (String(x[0]) === String(v) ? " selected" : "") + ">" + E(x[1]) + "</option>"; }).join("") + "</select></label>"; };
      var h = nav() + '<p class="sm">চ্যাটে এখন অনলাইন বা সাম্প্রতিক বার্তা পাঠানো সবাই। নামে ক্লিক করলে পুরো ইউজার তথ্য খোলে। ব্যান/Restriction সার্ভারেও যাচাই হয়; স্থায়ী (ফুল) ব্যানে ৩টি বৈধ রিপোর্ট + যাচাই (Verify) আগের মতোই লাগে।</p><div class="row">' +
        sel("h", AH, ["কারা দেখাবে", [[0, "শুধু এখন অনলাইন"], [1, "গত ১ ঘণ্টা"], [24, "গত ২৪ ঘণ্টা"], [168, "গত ৭ দিন"], [720, "গত ৩০ দিন"]]]) +
        sel("d", AD, ["বিভাগ", [["", "সব বিভাগ"]].concat(Ds.map(function (d) { return [d.id, d.name]; }))]) +
        '<label>খুঁজুন<input id="acq" placeholder="নাম, আইডি, আইপি, দেশ…"></label><button type="button" class="l" data-a="rf">🔄 রিফ্রেশ</button></div>' +
        '<p class="sm">মোট <b>' + bd(L.length) + "</b> জন · 🟢 অনলাইন <b>" + bd(on) + "</b>" + (L.length >= 300 ? " (সর্বোচ্চ ৩০০ জন দেখানো হচ্ছে)" : "") + "</p>";
      h += L.map(function (u) {
        var c = F.country ? F.country(u.country) : { flag: "🌐", name: u.country || "দেশ অজানা" }, pm = F.phone ? F.phone(u.ua, { model: u.model }) : (u.model || ""), blocked = u.st !== "ok", nm = u.nick || "বেনামি";
        if (/^পাওয়া যায়নি/.test(pm)) pm = "মডেল অজানা";
        var place = [u.city, u.region].filter(function (x) { return x && x !== "XX"; }).join(", "), vv = ' data-v="' + E(u.voter) + '" data-u="' + E(u.uid || "") + '" data-n="' + E(nm) + '"';
        var srch = [nm, u.uid, u.ip, c.name, u.country, u.dept, u.sess, pm].join(" ").toLowerCase();
        return '<div class="it" data-q="' + E(srch) + '"><div><span class="udot' + (u.onl ? " on" : "") + '"></span><button class="lk" type="button" data-uu="' + E(u.voter) + '"><b>' + E(nm) + '</b></button> <span class="tag">' + E(u.uid) + '</span>' + rtag(u.voter) + '<span class="tag">' + E(u.dept || "—") + " · " + E(u.sess || "—") + "</span>" + (u.verified ? '<span class="tag">✔ যাচাই</span>' : "") + (u.valid_cnt ? '<span class="tag">বৈধ রিপোর্ট ' + bd(u.valid_cnt) + "/৩</span>" : "") + "</div>" +
          '<div class="sm">' + (u.onl ? "🟢 অনলাইন" : "⚪ Last Active: " + (F.ago ? F.ago(u.ls) : "")) + " · " + stl(u.st, u.until) + " · বার্তা " + bd(u.msgs || 0) + " · সতর্কতা " + bd(u.warns || 0) + (u.reason && blocked ? " · কারণ: " + E(u.reason) : "") + "</div>" +
          '<div class="sm">' + c.flag + " " + E(c.name) + (place ? " · " + E(place) : "") + " · 📱 " + E(pm || "মডেল অজানা") + " · 🌐 " + E(F.ua ? F.ua(u.ua) : "") + " · আইপি " + E(u.ip || "—") + "</div>" +
          '<div class="act"><button class="l s" data-a="wn"' + vv + '>⚠️ সতর্ক</button><button class="l s" data-a="rs"' + vv + '>⚠️ Restriction</button>' + lift(u.voter) + '<button class="d s" data-a="cb"' + vv + '>⛔ ব্যান (কাস্টম/ফুল)</button>' + lockBtn(u.voter, u.uid, nm) + (blocked ? '<button class="s" data-a="ub"' + vv + '>✅ Unban</button>' : "") + '<button class="l s" data-a="hs"' + vv + '>📜 ইতিহাস</button></div></div>';
      }).join("") || '<p class="sm">এই তালিকায় কেউ নেই।</p>';
      V.innerHTML = h;
      V.oninput = function (e) { if (e.target.id !== "acq") return; var q = e.target.value.trim().toLowerCase(); V.querySelectorAll(".it[data-q]").forEach(function (n) { n.hidden = q && n.dataset.q.indexOf(q) < 0; }); };
    });
  }

  // ---------- চ্যাট ও ফাইল স্বয়ংক্রিয় মোছা ----------
  var PRE = [["১ ঘণ্টা", 60], ["৬ ঘণ্টা", 360], ["১ দিন (ডিফল্ট)", 1440], ["৩ দিন", 4320], ["৭ দিন", 10080], ["৩০ দিন", 43200], ["কখনো মুছবে না", 0]];
  function fmt(m) { return m === 0 ? "কখনো না" : m % 1440 === 0 ? bd(m / 1440) + " দিন" : m % 60 === 0 ? bd(m / 60) + " ঘণ্টা" : bd(m) + " মিনিট"; }
  function opts(cur, dflt) {
    var f = false, h = dflt ? '<option value=""' + (cur == null ? " selected" : "") + ">ডিফল্ট অনুযায়ী</option>" : "";
    h += PRE.map(function (x) { var on = cur === x[1]; if (on) f = true; return '<option value="' + x[1] + '"' + (on ? " selected" : "") + ">" + x[0] + "</option>"; }).join("");
    if (cur != null && !f) h += '<option value="' + cur + '" selected>' + fmt(cur) + " (কাস্টম)</option>";
    return h + '<option value="custom">✏️ কাস্টম সময়…</option>';
  }
  function ask(q) { // "৩০" বা "30m" = মিনিট, "2h" = ঘণ্টা, "5d" = দিন
    var v = prompt(q, ""); if (v === null) return null;
    var t = String(v).replace(/[০-৯]/g, function (d) { return "০১২৩৪৫৬৭৮৯".indexOf(d); }).trim().toLowerCase(), m = /^(\d+)\s*(m|h|d)?$/.exec(t);
    if (!m) { alert("সংখ্যা লিখুন, যেমন: ৩০ (মিনিট), 2h (ঘণ্টা), 5d (দিন)"); return null; }
    return +m[1] * (m[2] === "d" ? 1440 : m[2] === "h" ? 60 : 1);
  }
  var KR = { depts: [], sessions: [] };
  function toastK(t) { var d = document.createElement("div"); d.textContent = t; d.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#1d6b43;color:#fff;padding:9px 18px;border-radius:999px;font-weight:700;z-index:99"; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2200); }
  function keep(V) {
    return M.rpc("mc2_ac_admin_retention").then(function (r) {
      var E = M.esc, dept = "", h = nav() + '<div class="it"><div><b>🕒 চ্যাট (বার্তা) কতক্ষণ থাকবে — ডিফল্ট সবার জন্য</b></div><div class="act"><select data-k="d" data-o="' + r.default + '" style="max-width:260px">' + opts(r.default, false) + '</select></div>' +
        '<div class="sm">সময় পেরোলে বার্তা ও তার ছবি/ভিডিও/অডিও/ফাইল নিজে থেকে মুছে যায় (চ্যাট ব্যবহারের সময় সর্বোচ্চ ৫ মিনিটের মধ্যে)। বর্তমান ডিফল্ট: <b>' + fmt(r.default) + '</b>। নিচে প্রতিটি চ্যাট-বক্সের জন্য আলাদা সময়ও দেওয়া যায়।</div></div>' +
        '<div class="it"><div><b>📎 চ্যাটের ফাইল/অ্যাটাচমেন্ট কতক্ষণ থাকবে — ডিফল্ট</b></div><div class="act"><select data-k="f" data-o="' + (r.file_default == null ? 1440 : r.file_default) + '" style="max-width:260px">' + opts(r.file_default == null ? 1440 : r.file_default, false) + '</select></div><div class="sm">এই সময় পেরোলে শুধু ছবি/ভিডিও/অডিও/ফাইল মুছে যায়, বার্তা থাকে ("ফাইলের মেয়াদ শেষ" দেখায়)। বর্তমান: <b>' + fmt(r.file_default == null ? 1440 : r.file_default) + '</b>। যেকোনো সময় এখান থেকে কম-বেশি করা যায়।</div></div>' +
        '<div class="it"><label class="chk"><input type="checkbox" id="kreset"> সব বিভাগ ও সব চ্যাটের আলাদা সময় মুছে ফেলে, উপরের দুটো সময়ই সবার ওপর চালাও (এক ক্লিকে সব)</label><div class="act"><button type="button" data-a="ksv" data-id="all" disabled>💾 Save (সবার জন্য)</button></div><div class="sm">ড্রপডাউনে সময় বাছুন (বা ✏️ কাস্টম সময়, ০ = কখনো মুছবে না), তারপর Save চাপুন। টিক না দিলে শুধু ডিফল্ট বদলায়; যেসব বিভাগ/চ্যাটে আলাদা সময় দেওয়া আছে সেগুলো আগের মতোই থাকে।</div></div>' +
        '<div class="act" style="margin:8px 0"><button class="d s" data-a="pn">🗑 সব চ্যাট-বক্সের সব বার্তা এখনই মুছুন</button><button class="l s" data-a="pn" data-ask="1">🗑 সব চ্যাটের পুরোনো বার্তা মুছুন (সময় দিন)</button></div>' + xblock(r);
      KR.depts = r.depts || []; KR.sessions = r.sessions || [];
      r.sessions.forEach(function (x) {
        if (x.dept !== dept) { dept = x.dept; h += "<h2>" + E(dept) + "</h2>"; var dd = (r.depts || []).filter(function (q) { return q.id === x.dept_id; })[0]; if (dd && window.MCA_DK) h += window.MCA_DK.box(dd, { c: r.default, f: r.file_default == null ? 1440 : r.file_default }); }
        h += '<div class="it"><div><b>' + E(x.name) + '</b> <span class="sm">' + bd(x.msgs) + "টি বার্তা · " + bd(x.files) + "টি ফাইল · মোছা: " + (x.keep_min == null ? (x.dkeep != null ? "বিভাগের সময় (" + fmt(x.dkeep) + ")" : "ডিফল্ট (" + fmt(r.default) + ")") : fmt(x.keep_min)) + '</span></div><div class="act"><select data-k="' + x.id + '" data-o="' + (x.keep_min == null ? "" : x.keep_min) + '" style="max-width:230px">' + opts(x.keep_min, true) + '</select><button class="s" type="button" data-a="ksv" data-id="' + x.id + '" disabled>💾 Save</button><button class="d s" data-a="pn" data-id="' + x.id + '">🗑 এখনই মুছুন</button></div></div>';
      });
      XF.d = ""; XF.s = ""; V.innerHTML = h; V.oninput = xin; xsync();
    });
  }
  function chg(e) {
    if (xchg(e)) return;
    var af = e.target.closest("[data-af]"); if (af) { if (af.dataset.af === "h") AH = +af.value; else if (af.dataset.af === "d") AD = af.value; return go(); }
    if (window.MCA_DK && window.MCA_DK.change(e)) return;
    var el = e.target.closest("select[data-k]"); if (!el) return; var k = el.dataset.k, isS = !(k === "d" || k === "f");
    if (el.value === "custom") { var mins = ask("কত সময় পর মুছবে? (৩০ = মিনিট, 2h = ঘণ্টা, 5d = দিন; ০ = কখনো না)"), o = el.dataset.o; el.innerHTML = opts(mins !== null ? mins : (o === "" || o == null ? null : +o), isS); }
    var sv = document.querySelector('[data-a="ksv"][data-id="' + (isS ? k : "all") + '"]'); if (sv) sv.disabled = false; // বদলায় না; Save চাপলে তবেই কার্যকর
  }
  // ---------- এখনই মুছুন: বিভাগ ও সেশনের তালিকা থেকে টিক দিয়ে (বিদ্যমান mc2_ac_admin_purge_now RPC, নতুন SQL লাগে না) ----------
  var OLDP = [["সব বার্তা (বয়স যা-ই হোক)", 0], ["১ ঘণ্টার চেয়ে পুরোনো", 60], ["১ দিনের চেয়ে পুরোনো", 1440], ["৭ দিনের চেয়ে পুরোনো", 10080], ["৩০ দিনের চেয়ে পুরোনো", 43200]];
  function oldOpts(cur) {
    var f = false, h = OLDP.map(function (x) { var on = cur === x[1]; if (on) f = true; return '<option value="' + x[1] + '"' + (on ? " selected" : "") + ">" + x[0] + "</option>"; }).join("");
    if (!f) h += '<option value="' + cur + '" selected>' + fmt(cur) + "-এর চেয়ে পুরোনো (কাস্টম)</option>";
    return h + '<option value="custom">✏️ কাস্টম সময়…</option>';
  }
  function xdepts(r) { // বিভাগের তালিকা না এলেও সেশন থেকে বানিয়ে নেয়, যাতে তালিকা কখনো খালি না দেখায়
    var ds = (r.depts || []).slice(), ss = r.sessions || [], seen = {};
    ds.forEach(function (d) { seen[d.id] = 1; });
    ss.forEach(function (x) { if (!seen[x.dept_id]) { seen[x.dept_id] = 1; ds.push({ id: x.dept_id, name: x.dept }); } });
    return ds;
  }
  var XF = { d: "", s: "" };
  function xdOpts(ds, cur) { return '<option value="">সব বিভাগ</option>' + ds.map(function (d) { return '<option value="' + d.id + '"' + (String(d.id) === String(cur) ? " selected" : "") + ">" + M.esc(d.name) + "</option>"; }).join(""); }
  function xsOpts(ss, dept, cur) { // বিভাগ বাছলে শুধু তার সেশন; একই নামের সেশন একবারই দেখায়
    var seen = {}, h = '<option value="">সব সেশন</option>';
    ss.forEach(function (x) { if (dept && String(x.dept_id) !== String(dept)) return; var n = String(x.name); if (seen[n]) return; seen[n] = 1; h += '<option value="' + M.esc(n) + '"' + (n === cur ? " selected" : "") + ">" + M.esc(n) + "</option>"; });
    return h;
  }
  function xfilter() { // বিভাগ + সেশন + লেখা — তিনটি মিলিয়ে তালিকা ছাঁটে
    var q = ((document.getElementById("xq") || {}).value || "").trim().toLowerCase();
    [].forEach.call(document.querySelectorAll("#xnow .xg"), function (g) {
      var did = g.querySelector("input[data-xd]").dataset.xd, dm = !XF.d || String(XF.d) === did, tm = !q || g.dataset.dn.indexOf(q) >= 0, any = false;
      [].forEach.call(g.querySelectorAll(".xs"), function (s) {
        var hit = dm && (!XF.s || s.dataset.sn === XF.s) && (tm || s.dataset.q.indexOf(q) >= 0);
        s.style.display = hit ? "" : "none"; if (hit) any = true;
      });
      g.style.display = dm && (any || (!XF.s && tm && !g.querySelector(".xs"))) ? "" : "none";
    });
  }
  function xblock(r) {
    var E = M.esc, ds = xdepts(r), ss = r.sessions || [];
    var h = '<div class="it" id="xnow"><div><b>🗑 এখনই মুছুন — বিভাগ ও সেশন বেছে নিয়ে</b></div>' +
      '<div class="sm">নিচের তালিকায় বিভাগ ও তার সেশনগুলো আছে। বিভাগে টিক দিলে তার সব সেশন বাছা হয়; আলাদা সেশনেও টিক দেওয়া যায়। শুধু বার্তা ও ফাইল মুছবে — বিভাগ বা সেশন নিজে থাকবে। <b>আর ফেরানো যাবে না।</b></div>' +
      '<div class="row"><label>📁 বিভাগ<select id="xfd">' + xdOpts(ds, "") + '</select></label><label>🎓 সেশন<select id="xfs">' + xsOpts(ss, "", "") + '</select></label></div>' +
      '<div class="row"><label>🔎 নাম দিয়ে খুঁজুন (ঐচ্ছিক)<input id="xq" placeholder="নাম লিখুন"></label><label>কত পুরোনো বার্তা মুছবে<select id="xo">' + oldOpts(XOLD) + '</select></label></div>' +
      '<div class="act"><button class="l s" type="button" data-a="xall">✅ সব বাছুন</button><button class="l s" type="button" data-a="xnone">⬜ কিছুই না</button><button class="l s" type="button" data-a="xmsg">💬 শুধু যেগুলোয় বার্তা/ফাইল আছে</button></div>' +
      '<div style="max-height:380px;overflow:auto;border:1px solid var(--bd);border-radius:10px;padding:6px 10px">';
    if (!ds.length) h += '<div class="sm">এখনো কোনো বিভাগ/সেশন নেই — আগে "📁 চ্যাট মডিফাই" থেকে যোগ করুন।</div>';
    ds.forEach(function (d) {
      var L = ss.filter(function (x) { return x.dept_id === d.id; }), nm = 0, nf = 0;
      L.forEach(function (x) { nm += +x.msgs || 0; nf += +x.files || 0; });
      h += '<div class="xg" data-dn="' + E(String(d.name).toLowerCase()) + '" style="margin:4px 0 10px"><label class="chk"><input type="checkbox" data-xd="' + d.id + '"' + (L.length ? "" : " disabled") + '><span><b>📁 ' + E(d.name) + '</b> <span class="sm">(' + bd(L.length) + "টি সেশন · " + bd(nm) + "টি বার্তা · " + bd(nf) + "টি ফাইল)</span></span></label>" +
        (L.length ? L.map(function (x) {
          return '<label class="chk xs" data-sn="' + E(String(x.name)) + '" data-q="' + E(String(x.name).toLowerCase()) + '" style="margin:3px 0 0 26px"><input type="checkbox" data-xs="' + x.id + '" data-xdd="' + d.id + '" data-xm="' + (+x.msgs || 0) + '" data-xf="' + (+x.files || 0) + '"><span>' + E(x.name) + ' <span class="sm">(' + bd(x.msgs) + "টি বার্তা · " + bd(x.files) + "টি ফাইল)</span></span></label>";
        }).join("") : '<div class="sm" style="margin-left:26px">এই বিভাগে সেশন নেই</div>') + "</div>";
    });
    return h + '</div><div class="sm" id="xsum" style="font-weight:700">কিছু বাছা হয়নি — ওপরের তালিকা থেকে বিভাগ বা সেশনে টিক দিন।</div><div class="act"><button class="d" type="button" data-a="xs" disabled>🗑 বাছা সেশনগুলোর চ্যাট মুছুন</button></div></div>';
  }
  function xsync() {
    var root = document.getElementById("xnow"); if (!root) return;
    var cs = [].slice.call(root.querySelectorAll("input[data-xs]")), on = cs.filter(function (c) { return c.checked; }), nm = 0, nf = 0;
    on.forEach(function (c) { nm += +c.dataset.xm; nf += +c.dataset.xf; });
    [].forEach.call(root.querySelectorAll("input[data-xd]"), function (d) {
      var L = cs.filter(function (c) { return c.dataset.xdd === d.dataset.xd; }), k = L.filter(function (c) { return c.checked; }).length;
      d.checked = L.length > 0 && k === L.length; d.indeterminate = k > 0 && k < L.length;
    });
    root.querySelector("#xsum").textContent = on.length ? "বাছা: " + bd(on.length) + "টি সেশন · প্রায় " + bd(nm) + "টি বার্তা · " + bd(nf) + "টি ফাইল" : "কিছু বাছা হয়নি — ওপরের তালিকা থেকে বিভাগ বা সেশনে টিক দিন।";
    root.querySelector('[data-a="xs"]').disabled = !on.length;
  }
  function xchg(e) {
    var t = e.target; if (!t || !t.hasAttribute) return false;
    if (t.id === "xfd") { XF.d = t.value; XF.s = ""; var sl = document.getElementById("xfs"); if (sl) sl.innerHTML = xsOpts(KR.sessions, XF.d, ""); xfilter(); return true; }
    if (t.id === "xfs") { XF.s = t.value; xfilter(); return true; }
    if (t.hasAttribute("data-xd")) { [].forEach.call(document.querySelectorAll('#xnow input[data-xs][data-xdd="' + t.dataset.xd + '"]'), function (c) { c.checked = t.checked; }); xsync(); return true; }
    if (t.hasAttribute("data-xs")) { xsync(); return true; }
    if (t.id === "xo") {
      if (t.value === "custom") { var m = ask("কত সময়ের চেয়ে পুরোনো বার্তা মুছবেন? (৩০ = মিনিট, 2h = ঘণ্টা, 5d = দিন)"); if (m !== null && m > 0) XOLD = m; } else XOLD = +t.value;
      t.innerHTML = oldOpts(XOLD); return true;
    }
    return false;
  }
  function xin(e) { if (e.target.id === "xq") xfilter(); }
  function xpick(a) {
    [].forEach.call(document.querySelectorAll("#xnow input[data-xs]"), function (c) {
      var vis = c.closest("label").style.display !== "none" && c.closest(".xg").style.display !== "none", has = +c.dataset.xm > 0 || +c.dataset.xf > 0;
      if (a === "xnone") c.checked = false; else if (vis) c.checked = a === "xall" ? true : has;
    });
    xsync();
  }
  function purgeOne(id, older) { // এক সেশনের বার্তা (RPC) + ফাইল (Storage); alert দেয় না
    return M.rpc("mc2_ac_admin_purge_now", { p_session: id, p_older_min: older || 0 }).then(function (r) {
      var f = r.files || [], ch = [], i; for (i = 0; i < f.length; i += 100) ch.push(f.slice(i, i + 100));
      return Promise.all(ch.map(function (c) { return M.raw(M.base + "/storage/v1/object/mc2-chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: c }) }); })).then(function (rs) {
        return { deleted: +r.deleted || 0, files: f.length, ok: rs.every(function (x) { return x.ok; }) };
      });
    });
  }
  function xnow(b) {
    var ids = [].map.call(document.querySelectorAll("#xnow input[data-xs]:checked"), function (c) { return +c.dataset.xs; });
    var list = KR.sessions.filter(function (x) { return ids.indexOf(+x.id) >= 0; }), older = XOLD;
    if (!list.length) { alert("অন্তত একটি সেশনে টিক দিন।"); return; }
    var nm = 0, nf = 0; list.forEach(function (x) { nm += +x.msgs || 0; nf += +x.files || 0; });
    if (!nm && !nf) { alert("বাছা সেশনগুলোতে মোছার মতো কোনো বার্তা বা ফাইল নেই।"); return; }
    var names = list.slice(0, 12).map(function (x) { return "• " + x.dept + " › " + x.name; }).join("\n") + (list.length > 12 ? "\n… আরও " + bd(list.length - 12) + "টি সেশন" : "");
    if (!confirm("⚠️ " + bd(list.length) + "টি সেশনের " + (older ? fmt(older) + "-এর চেয়ে পুরোনো " : "সব ") + "বার্তা ও ফাইল এখনই মুছে যাবে (মোট প্রায় " + bd(nm) + "টি বার্তা, " + bd(nf) + "টি ফাইল" + (older ? " — পুরোনো ফিল্টারে আসল সংখ্যা কম হবে" : "") + "):\n" + names + "\n\nবিভাগ/সেশন নিজে থাকবে, শুধু বার্তা ও ফাইল মুছবে। আর ফেরানো যাবে না। মুছবেন?")) return;
    b.disabled = true;
    var dm = 0, df = 0, bad = false, done = 0;
    list.reduce(function (pr, x) { return pr.then(function () { return purgeOne(+x.id, older); }).then(function (o) { dm += o.deleted; df += o.files; if (!o.ok) bad = true; done++; }); }, Promise.resolve()).then(function () {
      alert(bd(done) + "টি সেশন থেকে " + bd(dm) + "টি বার্তা মুছেছে" + (df ? "; ফাইল " + bd(df) + "টি" + (bad ? " — কিছু ফাইল Storage থেকে মোছা যায়নি (Supabase > Storage > mc2-chat দেখুন)।" : " Storage থেকেও মুছেছে।") : "।"));
      go();
    }).catch(function (er) { b.disabled = false; alert("থেমে গেছে — " + bd(done) + "টি সেশন শেষ হয়েছে, বাকিগুলো মোছা হয়নি।"); M.fail(er); go(); });
  }
  function purge(id, older) {
    return M.rpc("mc2_ac_admin_purge_now", { p_session: id, p_older_min: older }).then(function (r) {
      var f = r.files || [], ch = [], i; for (i = 0; i < f.length; i += 100) ch.push(f.slice(i, i + 100));
      return Promise.all(ch.map(function (c) { return M.raw(M.base + "/storage/v1/object/mc2-chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: c }) }); })).then(function (rs) {
        alert(bd(r.deleted) + "টি বার্তা মুছেছে" + (f.length ? "; ফাইল " + bd(f.length) + "টি" + (rs.every(function (x) { return x.ok; }) ? " Storage থেকেও মুছেছে।" : " — কিছু ফাইল Storage থেকে মোছা যায়নি (Supabase > Storage > mc2-chat দেখুন)।") : "।"));
      });
    });
  }

  // ---------- বোতামের কাজ ----------
  function click(e) {
    if (window.MCA_DK && window.MCA_DK.click(e, go)) return;
    var s = e.target.closest("[data-s]"); if (s) { SUB = s.dataset.s; OFF = 0; return go(); }
    var rf = e.target.closest("[data-rf]"); if (rf) { RSF = rf.dataset.rf === "1"; return go(); }
    var f = e.target.closest("[data-f]"); if (f) { ST = f.dataset.f; OFF = 0; return go(); }
    var b = e.target.closest("[data-a]"); if (!b) return; var a = b.dataset.a, v = b.dataset.v, id = b.dataset.id, m = b.dataset.m, p;
    if (a === "xs") return xnow(b);
    if (a === "xall" || a === "xnone" || a === "xmsg") return xpick(a);
    if (a === "back") { SUB = "users"; return go(); }
    if (a === "rf") return go();
    if (a === "cb") { var cv = b.dataset.v, cu = b.dataset.n; return dlg("⛔ ব্যান — " + cu, { dur: DUR.concat([["⛔ ফুল ব্যান (স্থায়ী — ৩টি বৈধ রিপোর্ট + যাচাই লাগবে)", 0]]), custom: 1, label: "📝 নোট / কারণ (ইউজারকে দেখানো হতে পারে)" }).then(function (d) { if (d) return M.rpc("mc2_ac_admin_sanction", { p_voter: cv, p_kind: "ban", p_minutes: d.minutes || null, p_reason: d.reason }).then(go); }).catch(M.fail); }
    if (a === "rs" || a === "cr2") return restrictDlg(b).then(function (r) { if (r !== "x") go(); }).catch(function (er) { alert("Restriction দেওয়া যায়নি: " + (er && er.message ? er.message : er) + "\n(supabase-restrict.sql একবার Supabase SQL Editor-এ চালিয়েছেন কি?)"); });
    if (a === "lk") return dlg("🔒 লক — " + (b.dataset.n || "ইউজার"), { dur: [["♾ স্থায়ী (আমি খুলে না দেওয়া পর্যন্ত)", 0]].concat(DUR2), custom: 1, cmin: 1, cmax: 525600, label: "⚠️ ওয়ার্নিং/কারণ (ইউজার দেখবে)" }).then(function (d) { if (!d) return; var mn = d.minutes || null; if (!confirm(mn ? "এই ইউজারকে " + fmt(mn) + " লক করবেন? মেয়াদ শেষে নিজে থেকে খুলে যাবে; এর মধ্যে সে চ্যাট দেখতে পারবে, কিন্তু কিছু পাঠাতে/রিপ্লাই দিতে পারবে না।" : "এই ইউজারকে স্থায়ীভাবে লক করবেন? সে চ্যাট দেখতে পারবে, কিন্তু কিছু পাঠাতে/রিপ্লাই দিতে পারবে না — আপনি খুলে না দেওয়া পর্যন্ত।")) return; return M.rpc("fa_lock", { p_voter: b.dataset.v, p_uid: b.dataset.u || "", p_nick: b.dataset.n || "", p_reason: d.reason, p_minutes: mn }).then(function () { toastK("🔒 লক করা হয়েছে"); go(); }); }).catch(function (er) { alert("লক করা যায়নি: " + (er && er.message ? er.message : er) + "\n(supabase-lock-timed.sql চালিয়েছেন কি?)"); });
    if (a === "ul") { if (!confirm("লক খুলে দেবেন?")) return; return M.rpc("fa_unlock", { p_voter: v }).then(function () { toastK("🔓 লক খোলা হয়েছে"); go(); }).catch(M.fail); }
    if (a === "shot") return M.rpc("fa_set_shot", { p_on: b.dataset.v === "1" }).then(function () { toastK(b.dataset.v === "1" ? "🛡 স্ক্রীনশট সুরক্ষা চালু" : "স্ক্রীনশট সুরক্ষা বন্ধ"); go(); }).catch(function (er) { alert("হয়নি: " + (er && er.message ? er.message : er) + "\n(supabase-restrict.sql আবার চালিয়েছেন কি?)"); });
    if (a === "ra") { if (!confirm("এই ইউজারের সব চলমান Restriction তুলে নেবেন?")) return; return M.rpc("fa_unrestrict", { p_voter: v }).then(function () { toastK("🔓 Restriction তোলা হয়েছে"); go(); }).catch(M.fail); }
    if (a === "rl") {
      if (!confirm("এই Restriction এখনই বন্ধ করবেন?")) return;
      var fg = b.dataset.k === "auto"; // অটো-Restriction আগে বন্ধ করলে দ্বিগুণ-গণনায় ধরা হয় না
      return M.rpc("fa_restriction_adjust", { p_id: +id, p_action: "end", p_forgive: fg }).then(function () { toastK("🔓 Restriction বন্ধ করা হয়েছে"); go(); }).catch(function (er) { alert("হয়নি: " + (er && er.message ? er.message : er) + "\n(supabase-restrict-v2.sql চালিয়েছেন কি?)"); });
    }
    if (a === "rsvis") return M.rpc("fa_set_rs_vis", { p_mode: b.dataset.v }).then(function () { toastK(b.dataset.v === "private" ? "🔒 কারণ শুধু ইউজার ও অ্যাডমিন দেখবে" : "🌐 কারণ সবাই দেখবে"); go(); }).catch(function (er) { alert("হয়নি: " + (er && er.message ? er.message : er) + "\n(supabase-restrict-v3.sql চালিয়েছেন কি?)"); });
    if (a === "rson") { var onv = b.dataset.v === "1"; if (!confirm(onv ? "Restriction সিস্টেম সবার জন্য চালু করবেন?" : "Restriction সিস্টেম সবার জন্য বন্ধ করবেন? (অটো-Restriction থামবে, চ্যাটে কিছু দেখাবে না)")) return; return M.rpc("fa_set_restrict", { p_on: onv }).then(function () { toastK(onv ? "✅ Restriction চালু" : "⛔ Restriction বন্ধ"); go(); }).catch(function (er) { alert("হয়নি: " + (er && er.message ? er.message : er) + "\n(supabase-restrict-v2.sql আবার চালিয়েছেন কি?)"); }); }
    if (a === "rcut" || a === "rext") {
      var ex = a === "rext";
      return dlg((ex ? "⏱ সময় বাড়ান — " : "⏱ সময় কমান — ") + (b.dataset.n || "ইউজার"), { dur: DUR2, custom: 1, cmin: 1, cmax: 525600, label: "📝 লগের জন্য নোট (ঐচ্ছিক)", min: 0 }).then(function (d) {
        if (!d) return;
        return M.rpc("fa_restriction_adjust", { p_id: +id, p_action: ex ? "extend" : "shorten", p_minutes: d.minutes, p_note: d.reason || "" }).then(function (r) { toastK(r && r.ended ? "🔓 সময় শেষ — Restriction বন্ধ হয়েছে" : ex ? "✅ সময় বাড়ানো হয়েছে" : "✅ সময় কমানো হয়েছে"); go(); });
      }).catch(function (er) { alert("হয়নি: " + (er && er.message ? er.message : er) + "\n(supabase-restrict-v2.sql চালিয়েছেন কি?)"); });
    }
    if (a === "mrpg") { if (!b.disabled) { OFF = Math.max(0, +b.dataset.p * LIM); return go(); } return; }
    if (a === "prev" || a === "next") { OFF = Math.max(0, OFF + (a === "next" ? LIM : -LIM)); return go(); }
    if (a === "hs") { HV = v; SUB = "hist"; return go(); }
    if (a === "ksv") {
      b.disabled = true; var num = function (x) { return x === "" ? null : +x; };
      if (id === "all") {
        var dv = +document.querySelector('select[data-k="d"]').value, fv = +document.querySelector('select[data-k="f"]').value, rst = document.getElementById("kreset").checked;
        p = M.rpc("mc2_ac_admin_keep", { p_session: null, p_min: dv }).then(function () { return M.rpc("mc2_ac_admin_file_keep", { p_min: fv }); }).then(function () {
          if (!rst) return; return Promise.all(KR.depts.map(function (d) { return M.rpc("mc2_ac_admin_dept_keep", { p_dept: d.id, p_chat_min: null, p_file_min: null }); }).concat(KR.sessions.map(function (x) { return M.rpc("mc2_ac_admin_keep", { p_session: x.id, p_min: null }); })));
        }).then(function () { toastK("✅ সেভ হয়েছে"); });
      } else p = M.rpc("mc2_ac_admin_keep", { p_session: +id, p_min: num(document.querySelector('select[data-k="' + id + '"]').value) }).then(function () { toastK("✅ সেভ হয়েছে"); });
      return void p.then(go).catch(function (er) { b.disabled = false; M.fail(er); });
    }
    if (a === "pn") {
      var older = 0; if (b.dataset.ask) { older = ask("কত সময়ের চেয়ে পুরোনো বার্তা মুছবেন? (৩০ = মিনিট, 2h = ঘণ্টা, 5d = দিন)"); if (older === null) return; }
      if (!confirm((id ? "এই চ্যাট-বক্সের " : "সব চ্যাট-বক্সের ") + (older ? fmt(older) + "-এর চেয়ে পুরোনো " : "সব ") + "বার্তা ও ফাইল এখনই মুছে যাবে। আর ফেরানো যাবে না। মুছবেন?")) return;
      p = purge(id ? +id : null, older);
    } else if (a === "up") p = M.rpc("mc2_ac_admin_upload", { p_on: b.dataset.v === "1" });
    else if (a === "rv") {
      var st = b.dataset.st, note = null;
      if (st === "rejected") { note = prompt("অবৈধ করছেন — কারণ/নোট (ঐচ্ছিক):", ""); if (note === null) return; }
      p = M.rpc("mc2_ac_admin_review", { p_id: +id, p_status: st, p_note: note || null }).then(function (r) { if (r && r.review_flagged) alert("এই ইউজারের এখন ৩টি বৈধ রিপোর্ট হয়েছে — তাকে Review তালিকায় তোলা হয়েছে। চাইলে সাময়িক Restriction/ব্যান দিতে পারেন; স্থায়ী ব্যানের আগে যাচাই (Verify) করুন।"); });
    } else if (a === "rm") {
      var rs = prompt("বার্তা সবার জন্য মুছে ফেলা হবে। কারণ (ঐচ্ছিক):", ""); if (rs === null) return;
      p = M.rpc("mc2_ac_admin_remove", { p_msg: +m, p_reason: rs || null }).then(function (r) {
        if (r && r.file) return M.raw(M.base + "/storage/v1/object/mc2-chat/" + String(r.file).split("/").map(encodeURIComponent).join("/"), { method: "DELETE" }).then(function (x) { if (!x.ok) alert("বার্তা মুছেছে, কিন্তু ফাইলটি Storage থেকে মোছা যায়নি (Supabase > Storage > mc2-chat থেকে হাতে মুছুন)।"); });
      });
    } else if (a === "wn") p = dlg("⚠️ ইউজারকে সতর্ক করুন", { label: "সতর্কবার্তা (ইউজার দেখবে)" }).then(function (d) { if (d) return M.rpc("mc2_ac_admin_warn", { p_voter: v, p_reason: d.reason, p_msg: m ? +m : null }); else return "x"; });
    else if (a === "bn") p = dlg("⛔ ব্যান", { dur: DUR.concat([["স্থায়ী (৩টি বৈধ রিপোর্ট + যাচাই লাগবে)", 0]]), custom: 1, label: "📝 নোট / কারণ (ইউজারকে দেখানো হতে পারে)" }).then(function (d) { if (d) return M.rpc("mc2_ac_admin_sanction", { p_voter: v, p_kind: "ban", p_minutes: d.minutes || null, p_reason: d.reason }); else return "x"; });
    else if (a === "ub") p = dlg("✅ Unban / Restriction তুলে নিন", { label: "কারণ (ঐচ্ছিক)", min: 0 }).then(function (d) { if (d) return M.rpc("mc2_ac_admin_unban", { p_voter: v, p_reason: d.reason || null }); else return "x"; });
    else if (a === "vf") p = dlg("✔ যাচাই (Verify)", { label: "প্রমাণ দেখে কী পেলেন (অন্তত ১০ অক্ষর; স্থায়ী ব্যানের ভিত্তি)", min: 10 }).then(function (d) { if (d) return M.rpc("mc2_ac_admin_verify", { p_voter: v, p_note: d.reason }); else return "x"; });
    else if (a === "cr") p = dlg("Review শেষ (কোনো শাস্তি ছাড়া)", { label: "নোট (ঐচ্ছিক)", min: 0 }).then(function (d) { if (d) return M.rpc("mc2_ac_admin_clear_review", { p_voter: v, p_note: d.reason || null }); else return "x"; });
    if (p) p.then(go).catch(M.fail);
  }
})();
