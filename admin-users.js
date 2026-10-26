// অ্যাডমিন: "👤 User Info" ট্যাব + ড্যাশবোর্ডে অনলাইন বক্স (Online Count, Visitor List, Join/Leave, Last Active)।
// নাম ক্লিক (data-uu="ডিভাইস আইডি") করলে যেকোনো ট্যাব থেকে পুরো User Info খোলে। admin-anonchat.js-এর পরে ও admin.js-এর আগে লোড হয়। SQL: supabase-userinfo.sql
(function () {
  var M = function () { return window.MCA; }, ST = { q: "", on: false, off: 0, st: "0", g: "", d: "", s: "", c: "", dv: "", os: "", br: "", ph: "", sc: "", ac: "", so: "new", f: "", t: "" }, PREV = null, MISS = {}, FEED = [], LAST = null, ERR = "", tick = null;
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var bd = function (s) { return String(s).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  function ago(t) { if (!t) return "জানা নেই"; var s = Math.max(0, Math.round((Date.now() - t) / 1000)); if (s < 60) return "এইমাত্র"; var m = Math.round(s / 60); if (m < 60) return bd(m) + " মিনিট আগে"; var h = Math.round(m / 60); if (h < 24) return bd(h) + " ঘণ্টা আগে"; return bd(Math.round(h / 24)) + " দিন আগে"; }
  function dur(a) { if (!a) return ""; var m = Math.max(1, Math.round((Date.now() - new Date(a).getTime()) / 60000)); return m < 60 ? bd(m) + " মিনিট" : bd(Math.floor(m / 60)) + " ঘণ্টা " + bd(m % 60) + " মিনিট"; }
  function ua(u, i) { // সরল ব্রাউজার/ডিভাইস শনাক্তকরণ (আনুমানিক)
    u = String(u || ""); if (!u) return "পাওয়া যায়নি";
    var b = /FBAN|FBAV|FB_IAB/.test(u) ? "Facebook অ্যাপের ব্রাউজার" : /Messenger/.test(u) ? "Messenger ব্রাউজার" : /Instagram/.test(u) ? "Instagram ব্রাউজার" : /SamsungBrowser\/([\d.]+)/.test(u) ? "Samsung Internet " + RegExp.$1.split(".")[0] : /EdgA?\/([\d.]+)/.test(u) ? "Edge " + RegExp.$1.split(".")[0] : /OPR\/([\d.]+)/.test(u) ? "Opera " + RegExp.$1.split(".")[0] : /Firefox\/([\d.]+)/.test(u) ? "Firefox " + RegExp.$1.split(".")[0] : /Chrome\/([\d.]+)/.test(u) ? "Chrome " + RegExp.$1.split(".")[0] : /Version\/([\d.]+).*Safari/.test(u) ? "Safari " + RegExp.$1.split(".")[0] : "অজানা ব্রাউজার";
    var o = /Android ([\d.]+)/.test(u) ? "Android " + RegExp.$1 : /iPhone OS ([\d_]+)/.test(u) ? "iOS " + RegExp.$1.replace(/_/g, ".") : /iPad/.test(u) ? "iPadOS" : /Windows NT ([\d.]+)/.test(u) ? "Windows" : /Mac OS X/.test(u) ? "macOS" : /Linux/.test(u) ? "Linux" : "";
    var mo = i && i.model ? String(i.model) : /Android [\d.]+; ([^;)]+)/.test(u) ? RegExp.$1.replace(/ Build.*/, "").trim() : /iPhone/.test(u) ? "iPhone" : "";
    var t = /iPad|Tablet/.test(u) ? "ট্যাবলেট" : /Mobi|Android|iPhone/.test(u) ? "মোবাইল" : "কম্পিউটার";
    return [b, o, mo && mo !== "K" ? mo : "", t].filter(Boolean).join(" · ");
  }
  function brand(m) { // মডেল কোড থেকে আনুমানিক ব্র্যান্ড
    var t = String(m || ""); return /^SM-|^GT-|^SC-/i.test(t) ? "Samsung" : /^RMX|realme/i.test(t) ? "Realme" : /^CPH|oppo/i.test(t) ? "OPPO" : /^V\d{4}|vivo/i.test(t) ? "vivo" : /^(Redmi|M\d{4}|2\d{7}|2\d{3}\w{2,})/i.test(t) ? "Xiaomi/Redmi/Poco (আনুমানিক)" : /^itel/i.test(t) ? "itel" : /^TECNO|^T[A-Z]?\d/i.test(t) ? "Tecno (আনুমানিক)" : /^Infinix|^X\d{3,4}/i.test(t) ? "Infinix (আনুমানিক)" : /^Pixel/i.test(t) ? "Google Pixel" : /^(ONEPLUS|[A-Z]{2}\d{4}$)/i.test(t) ? "OnePlus (আনুমানিক)" : /^moto|^XT\d/i.test(t) ? "Motorola" : /^iPhone/i.test(t) ? "Apple" : "";
  }
  function phoneModel(u, i) { // ফোন মডেল: সাইট নিজে ডিভাইস থেকে মডেল পাঠায় (Chrome); না এলে UA থেকে
    u = String(u || ""); var m = i && i.model ? String(i.model) : /Android [\d.]+; ([^;)]+)/.test(u) ? RegExp.$1.replace(/ Build.*/, "").trim() : /iPhone/.test(u) ? "iPhone (মডেল আইফোন লুকিয়ে রাখে)" : /iPad/.test(u) ? "iPad" : "";
    if (!m || m === "K") return /Mobi|Android/.test(u) ? "পাওয়া যায়নি (ইউজার নতুন করে সাইট খুললে আসবে; Firefox/Safari মডেল দেয় না)" : /Windows|Macintosh|Linux/.test(u) ? "কম্পিউটার" : "";
    var b = brand(m); return m + (b ? " · " + b : "");
  }
  function loc(x) { var p = [x.city, x.region, x.country].filter(function (v) { return v && v !== "XX" && v !== "T1"; }); return p.length ? p.join(", ") + " (আনুমানিক)" : "পাওয়া যায়নি"; }
  function nm(x) { return x.gname || x.nick || "অজানা"; }

  var st = document.createElement("style");
  st.textContent = "#view label[hidden]{display:none!important}button.lk{background:none;color:var(--g);padding:0;border:0;text-decoration:underline;font-weight:700;cursor:pointer;font-size:inherit}.udot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#9aa3a0;margin-right:5px}.udot.on{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.25)}" +
    ".unmo{position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;z-index:100;padding:12px}.unb{background:var(--card);color:var(--fg);border-radius:14px;padding:14px;width:min(520px,100%);max-height:92vh;overflow:auto;display:grid;gap:8px}" +
    ".unb dl{display:grid;grid-template-columns:auto 1fr;gap:5px 12px;margin:0;font-size:14px}.unb dt{color:var(--mut);font-weight:600}.unb dd{margin:0;overflow-wrap:anywhere}.unb h3{margin:6px 0 0;font-size:15px}" +
    "#unT{position:fixed;top:10px;right:10px;display:grid;gap:6px;z-index:101;max-width:min(320px,calc(100vw - 20px))}#unT div{background:#10261b;color:#fff;border-radius:10px;padding:8px 12px;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,.3)}#unT div.l{background:#4a4f4c}" +
    ".onb h2 small{font-size:13px;color:var(--mut);font-weight:500;margin-left:6px}.onf{font-size:13px;display:grid;gap:2px;margin-top:6px}";
  document.head.appendChild(st);
  function toastBox() { var t = document.getElementById("unT"); if (!t) { t = document.createElement("div"); t.id = "unT"; document.body.appendChild(t); } return t; }
  function notify(kind, r) { var d = document.createElement("div"); d.className = kind === "leave" ? "l" : ""; d.textContent = (kind === "leave" ? "⚪ চলে গেছে: " : "🟢 জয়েন করেছে: ") + r.n + (r.d ? " (" + r.d + ")" : ""); toastBox().appendChild(d); setTimeout(function () { d.remove(); }, 7000); }

  // ---------- অনলাইন পোলিং (প্রতি ৮ সেকেন্ডে) ----------
  function poll() {
    var app = document.getElementById("app"); if (!M() || !app || app.hidden) return;
    M().rpc("mc2_admin_online").then(function (d) {
      ERR = ""; LAST = d; var cur = {}; d.rows.forEach(function (r) { cur[r.v] = r; });
      if (PREV) {
        d.rows.forEach(function (r) { delete MISS[r.v]; if (!PREV[r.v]) { notify("join", r); FEED.unshift({ k: "join", n: r.n, d: r.d, t: Date.now() }); } });
        Object.keys(PREV).forEach(function (v) { if (cur[v]) return; MISS[v] = (MISS[v] || 0) + 1; if (MISS[v] >= 2) { notify("leave", PREV[v]); FEED.unshift({ k: "leave", n: PREV[v].n, d: PREV[v].d, t: Date.now() }); delete MISS[v]; } else cur[v] = PREV[v]; });
        FEED = FEED.slice(0, 40);
      }
      PREV = cur; paint();
    }).catch(function (e) { ERR = e && e.message ? e.message : "error"; paint(); });
  }
  function paint() {
    var tb = document.querySelector('#tabs [data-t="usr"]'); if (tb && LAST) tb.textContent = "👤 User Info (🟢 " + bd(LAST.online) + ")";
    var b = document.getElementById("onbox"); if (!b) return;
    if (!LAST) { b.innerHTML = ERR ? '<p class="warn">অনলাইন তথ্য লোড হয়নি: ' + esc(ERR) + '</p><p class="sm">supabase-userinfo.sql একবার Supabase SQL Editor-এ চালান।</p>' : "⏳ অনলাইন তথ্য লোড হচ্ছে…"; return; }
    var rows = LAST.rows.map(function (r) { return '<button class="l s" type="button" data-uu="' + esc(r.v) + '"><span class="udot on"></span>' + esc(r.n) + (r.d ? " · " + esc(r.d) : "") + "</button>"; }).join("");
    b.innerHTML = "<h2>🟢 এখন অনলাইন: <b>" + bd(LAST.online) + "</b><small>আজ " + bd(LAST.today) + " জন · মোট " + bd(LAST.total) + ' জন ভিজিটর</small></h2><div class="act">' + (rows || '<span class="sm">এই মুহূর্তে কেউ অনলাইনে নেই।</span>') + '</div><div class="act" style="margin-top:8px"><button class="s" type="button" data-go="usr">👥 Visitor List / User Info</button></div>' +
      '<h3 style="margin:10px 0 0;font-size:15px">Join / Leave</h3><div class="onf">' + (FEED.map(function (f) { return "<div>" + (f.k === "join" ? "🟢 জয়েন" : "⚪ লিভ") + " · <b>" + esc(f.n) + "</b>" + (f.d ? " (" + esc(f.d) + ")" : "") + " · " + ago(f.t) + "</div>"; }).join("") || '<span class="sm">এই পেজ খোলা থাকা অবস্থায় কেউ ঢুকলে বা বের হলে এখানে ও ওপরের কোণে দেখাবে।</span>') + "</div>";
  }

  // ---------- ড্যাশবোর্ডে বক্স বসানো ----------
  var od = (window.MCA_VIEWS || {}).dash;
  if (od) window.MCA_VIEWS.dash = function () { return od.apply(this, arguments).then(function () { var V = document.getElementById("view"); if (V) { V.insertAdjacentHTML("afterbegin", '<div class="c onb" id="onbox" style="margin-bottom:10px"></div>'); paint(); poll(); } }); };

  // ---------- User Info ট্যাব (Visitor List) ----------
  window.MCA_TABS = (window.MCA_TABS || []).concat([["usr", "👤 User Info"]]);
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { usr: users });
  // ইউজারের অবস্থা বাছা (✅ ❔ 🚫 📵): একই window.MCFL (admin-folders.js); না থাকলে তালিকা আগের মতোই। চাবি = "d:"+ডিভাইস (voter), না থাকলে "n:"+নাম (ছোট হাতের)।
  var FLU = {}, FLREG = 0;
  function flagsLoad(append) {
    if (!window.MCFL) return Promise.resolve();
    if (!FLREG) { FLREG = 1; window.MCFL.reg(function () { return FLU; }); }
    return append ? Promise.resolve() : M().rpc("mc2_flag_all").then(function (r) { FLU = r || {}; }).catch(function () {});
  }
  function flagBox(x) {
    if (!window.MCFL) return "";
    var k = x.voter ? "d:" + x.voter : (x.gname || x.nick) ? "n:" + String(x.gname || x.nick).trim().toLowerCase() : ""; if (!k) return "";
    return '<div class="act" style="margin-top:4px">' + window.MCFL.ctl(k, FLU[k] || "") + "</div>";
  }
  // ---------- আরও ফিল্টার (নতুন SQL: supabase-new-20261108.sql; না চালালে আগের মতোই চলে) ----------
  var NEWF = true;
  function fetchUsers(pg) {
    var PP = window.MCPG ? window.MCPG.per() : 50, off = (pg || 0) * PP;
    if (!NEWF) return M().rpc("mc2_admin_users", { p_q: ST.q, p_online: ST.on, p_limit: PP, p_offset: off });
    return M().rpc("mc2_admin_users2", { p_q: ST.q, p_status: ST.st === "1" ? "on" : ST.st === "2" ? "off" : "all", p_gender: ST.g, p_dept: ST.d, p_sess: ST.s, p_country: ST.c, p_dev: ST.dv, p_os: ST.os, p_br: ST.br, p_phone: ST.ph, p_score: ST.sc, p_active: ST.ac, p_sort: ST.so, p_from: ST.ac === "custom" ? ST.f : "", p_to: ST.ac === "custom" ? ST.t : "", p_limit: PP, p_offset: off })
      .catch(function () { NEWF = false; return M().rpc("mc2_admin_users", { p_q: ST.q, p_online: ST.on, p_limit: PP, p_offset: off }); });
  }
  function selx(id, label, cur, list) { return "<label>" + label + '<select id="' + id + '">' + list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(cur) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; }
  function lst(all, arr, cur, fn) { var a = (arr || []).slice(); if (cur && a.indexOf(cur) < 0) a.push(cur); return [["", all]].concat(a.map(function (v) { return [v, fn ? fn(v) : v]; })); }
  function filt2(d) {
    if (!d.depts) return '<p class="sm">আরও ফিল্টার চালু করতে supabase-new-20261108.sql একবার Supabase SQL Editor-এ চালান।</p>';
    var any = ST.g || ST.d || ST.s || ST.c || ST.dv || ST.os || ST.br || ST.ph || ST.sc || ST.ac || ST.so !== "new";
    return "<details" + (any ? " open" : "") + '><summary class="sm"><b>🔧 আরও ফিল্টার' + (any ? " (চালু আছে)" : "") + '</b></summary><div class="row">' +
      selx("unG", "জেন্ডার", ST.g, [["", "সব"], ["m", "👦 ছেলে"], ["f", "👧 মেয়ে"], ["x", "⚪ ভিজিটর/অজানা"]]) +
      selx("unD", "বিভাগ", ST.d, lst("সব বিভাগ", d.depts, ST.d)) + selx("unSs", "সেশন", ST.s, lst("সব সেশন", d.sessions, ST.s)) +
      selx("unC", "দেশ", ST.c, lst("সব দেশ", d.countries, ST.c, function (v) { var c = country(v); return c.flag + " " + c.name; })) +
      selx("unDv", "ডিভাইসের ধরন", ST.dv, [["", "সব ধরন"], ["mob", "📱 মোবাইল"], ["tab", "ট্যাবলেট"], ["pc", "💻 কম্পিউটার"]]) +
      selx("unOs", "অপারেটিং সিস্টেম", ST.os, [["", "সব"], ["and", "Android"], ["ios", "iPhone/iPad (iOS)"], ["win", "Windows"], ["mac", "Mac"], ["lin", "Linux"]]) +
      selx("unBr", "ব্রাউজার", ST.br, [["", "সব"], ["chr", "Chrome"], ["sam", "Samsung Internet"], ["fb", "Facebook অ্যাপের ব্রাউজার"], ["msg", "Messenger ব্রাউজার"], ["ig", "Instagram ব্রাউজার"], ["ff", "Firefox"], ["edg", "Edge"], ["opr", "Opera"], ["saf", "Safari"], ["oth", "অন্যান্য/অজানা"]]) +
      selx("unPh", "ফোন নম্বর", ST.ph, [["", "সব"], ["yes", "📞 নম্বর আছে"], ["no", "নম্বর নেই"]]) +
      selx("unSc", "স্কোর", ST.sc, [["", "সব"], ["yes", "খেলেছে (স্কোর আছে)"], ["no", "এখনো খেলেনি"]]) +
      selx("unAc", "শেষ সক্রিয়", ST.ac, [["", "যেকোনো সময়"], ["today", "আজ"], ["7", "গত ৭ দিন"], ["30", "গত ৩০ দিন"], ["old", "৩০ দিনের বেশি আগে"], ["custom", "📅 নিজের তারিখ"]]) +
      '<label id="unFl"' + (ST.ac === "custom" ? "" : ' hidden') + '>থেকে<input type="date" id="unFr" value="' + esc(ST.f) + '"></label><label id="unTl"' + (ST.ac === "custom" ? "" : ' hidden') + '>পর্যন্ত<input type="date" id="unTo" value="' + esc(ST.t) + '"></label>' +
      selx("unSo", "সাজানো", ST.so, [["new", "নতুন আগে (শেষ সক্রিয়)"], ["old", "পুরোনো আগে"], ["score", "বেশি স্কোর আগে"], ["visits", "বেশি ভিজিট আগে"]]) + "</div></details>";
  }
  // ---------- বাছাই করে ইউজার মোছা (নতুন SQL: supabase-new-20261109.sql) ----------
  var SEL = {}, ALLF = false, TOTAL = 0, PAGEV = [], CUNL = false;
  var WHAT = [["visitor", "👤 ভিজিটর রেকর্ড (এই তালিকা থেকে)"], ["scores", "🏆 স্কোর (লিডারবোর্ড)"], ["cards", "🪪 কার্ড + টপ হিস্টরি"], ["entries", "🎁 কনটেস্ট/লটারি এন্ট্রি"], ["answers", "📝 প্রশ্নের উত্তর"], ["chat", "💬 চ্যাট বার্তা ও রিঅ্যাকশন"], ["mod", "🚫 মডারেশন রেকর্ড (ওয়ার্নিং/ব্যান/রিপোর্ট)"]];
  var WN = { visitor: "ভিজিটর রেকর্ড", scores: "স্কোর", cards: "কার্ড", entries: "এন্ট্রি", answers: "উত্তর", chat: "চ্যাট বার্তা", mod: "মডারেশন রেকর্ড" };
  function selCount() { return ALLF ? TOTAL : Object.keys(SEL).length; }
  function delBar() {
    return '<div class="c" id="unDel" style="margin:8px 0;padding:10px"><div class="act" style="align-items:center;flex-wrap:wrap"><label style="display:inline-flex;gap:6px;align-items:center;font-weight:700"><input type="checkbox" id="unPgAll" style="width:18px;height:18px"> এই পেজের সবাই</label>' +
      '<label style="display:inline-flex;gap:6px;align-items:center;font-weight:700"><input type="checkbox" id="unAllF"' + (ALLF ? " checked" : "") + ' style="width:18px;height:18px"> ফিল্টার/খোঁজা অনুযায়ী সবাই (' + bd(TOTAL) + ' জন, সব পেজ)</label>' +
      '<b id="unSelN" class="sm"></b><button class="d" id="unDelB" type="button" disabled>🗑 বাছাইগুলো মুছুন…</button></div>' +
      '<div id="unDelP" hidden style="margin-top:8px"><p class="sm"><b>কোন কোন ডেটা মুছবেন? যেগুলোতে টিক দেবেন শুধু সেগুলোই যাবে।</b></p>' +
      WHAT.map(function (w) { var lk = w[0] === "cards"; return '<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" class="unWh" value="' + w[0] + '"' + (lk ? " disabled" : "") + ' style="width:18px;height:18px"> ' + w[1] + (lk ? ' <span id="unCk" class="sm">🔒 লক করা</span> <button class="l s" id="unCu" type="button">🔓 আনলক</button>' : "") + "</label>"; }).join("") +
      '<div class="act" style="margin-top:6px"><button class="l s" id="unWhAll" type="button">সব ডেটায় টিক</button><button class="d" id="unGo" type="button">✔ মুছে ফেলুন</button><button class="l" id="unNo" type="button">বাতিল</button></div></div></div>';
  }
  function collectVoters() {
    if (!ALLF) return Promise.resolve(Object.keys(SEL));
    var out = [];
    var step = function (off) {
      return M().rpc("mc2_admin_users2", { p_q: ST.q, p_status: ST.st === "1" ? "on" : ST.st === "2" ? "off" : "all", p_gender: ST.g, p_dept: ST.d, p_sess: ST.s, p_country: ST.c, p_dev: ST.dv, p_os: ST.os, p_br: ST.br, p_phone: ST.ph, p_score: ST.sc, p_active: ST.ac, p_sort: ST.so, p_from: ST.ac === "custom" ? ST.f : "", p_to: ST.ac === "custom" ? ST.t : "", p_limit: 100, p_offset: off })
        .then(function (d) { (d.rows || []).forEach(function (r) { if (r.voter) out.push(r.voter); }); return (d.rows || []).length === 100 && out.length < 20000 ? step(off + 100) : out; });
    };
    return step(0);
  }
  function runDel(what, dry, vs) {
    var tot = {}, i = 0;
    var next = function () {
      if (i >= vs.length) return Promise.resolve(tot);
      var ch = vs.slice(i, i + 200); i += 200;
      return M().rpc("mc2_admin_users_del", { p_voters: ch, p_what: what, p_dry: !!dry, p_unlock_cards: CUNL }).then(function (r) { Object.keys(r || {}).forEach(function (k) { tot[k] = (tot[k] || 0) + (+r[k] || 0); }); return next(); });
    };
    return next();
  }
  function delWire() {
    var upd = function () {
      var n = selCount(), e = document.getElementById("unSelN"), b = document.getElementById("unDelB");
      if (e) e.textContent = n ? "বাছা: " + bd(n) + " জন" : ""; if (b) b.disabled = !n;
      var pa = document.getElementById("unPgAll"); if (pa) pa.checked = PAGEV.length > 0 && PAGEV.every(function (v) { return ALLF || SEL[v]; });
    };
    var L = document.getElementById("unL"); if (!L) return;
    L.addEventListener("change", function (e) { var c = e.target.closest("[data-ck]"); if (!c) return; if (ALLF) { ALLF = false; PAGEV.forEach(function (v) { SEL[v] = true; }); document.getElementById("unAllF").checked = false; } if (c.checked) SEL[c.dataset.ck] = true; else delete SEL[c.dataset.ck]; upd(); });
    document.getElementById("unPgAll").onchange = function () { var on = this.checked; if (ALLF) { ALLF = false; document.getElementById("unAllF").checked = false; } PAGEV.forEach(function (v) { if (on) SEL[v] = true; else delete SEL[v]; }); L.querySelectorAll("[data-ck]").forEach(function (c) { c.checked = on; }); upd(); };
    document.getElementById("unAllF").onchange = function () { ALLF = this.checked; if (ALLF) SEL = {}; L.querySelectorAll("[data-ck]").forEach(function (c) { c.checked = ALLF; }); upd(); };
    document.getElementById("unDelB").onclick = function () { document.getElementById("unDelP").hidden = false; };
    document.getElementById("unNo").onclick = function () { document.getElementById("unDelP").hidden = true; };
    document.getElementById("unWhAll").onclick = function () { document.querySelectorAll(".unWh").forEach(function (c) { if (!c.disabled) c.checked = true; }); };
    document.getElementById("unCu").onclick = function () {
      var c = document.querySelector('.unWh[value="cards"]');
      if (CUNL) { CUNL = false; c.checked = false; c.disabled = true; this.textContent = "🔓 আনলক"; document.getElementById("unCk").textContent = "🔒 লক করা"; return; }
      if (window.prompt("কার্ড মোছা লক করা আছে। আনলক করতে বড় হাতের CARD লিখুন:") !== "CARD") return;
      CUNL = true; c.disabled = false; this.textContent = "🔒 আবার লক করুন"; document.getElementById("unCk").textContent = "🔓 আনলক আছে";
    };
    document.getElementById("unGo").onclick = function () {
      var what = Array.prototype.map.call(document.querySelectorAll(".unWh:checked"), function (c) { return c.value; }).filter(function (k) { return k !== "cards" || CUNL; });
      if (!what.length) return alert("কোন ডেটা মুছবেন তা অন্তত একটায় টিক দিন।");
      var btn = this; btn.disabled = true; var vs;
      collectVoters().then(function (v) { vs = v; if (!vs.length) throw new Error("কাউকে বাছা হয়নি।"); return runDel(what, true, vs); }).then(function (c) {
        var lines = Object.keys(c).filter(function (k) { return WN[k] && (c[k] || what.indexOf(k) >= 0); }).map(function (k) { return "• " + WN[k] + ": " + bd(c[k] || 0) + "টি" + (what.indexOf(k) < 0 ? " (কার্ডের সাথে যাবে)" : ""); }).join("\n");
        if (!window.confirm(bd(vs.length) + " জন ইউজারের এই ডেটা চিরতরে মুছে যাবে (ফেরত আনা যাবে না):\n\n" + lines + "\n\nমুছবেন?")) throw new Error("__cancel");
        if (what.indexOf("cards") >= 0 && window.prompt("⚠ " + bd(vs.length) + " জনের কার্ড মুছতে যাচ্ছেন। নিশ্চিত করতে DELETE CARD লিখুন:") !== "DELETE CARD") throw new Error("__cancel");
        if (vs.length > 20 && window.prompt("নিশ্চিত করতে সংখ্যাটি লিখুন: " + vs.length) !== String(vs.length)) throw new Error("__cancel");
        return runDel(what, false, vs);
      }).then(function (c) {
        SEL = {}; ALLF = false; CUNL = false;
        alert("মোছা হয়েছে:\n" + Object.keys(c).filter(function (k) { return WN[k] && (c[k] || what.indexOf(k) >= 0); }).map(function (k) { return WN[k] + ": " + bd(c[k] || 0); }).join("\n"));
        return users();
      }).catch(function (e) {
        btn.disabled = false;
        if (e && e.message === "__cancel") return;
        var m = String((e && e.message) || e);
        alert(/mc2_admin_users_del|function|schema/i.test(m) ? "মোছার ফাংশন নেই। supabase-new-20261109.sql একবার Supabase SQL Editor-এ চালান।\n\n" + m : m);
      });
    };
    upd();
  }
  // কে কয়টা আলাদা নাম ব্যবহার করেছে (SQL-10-এর fa_admin_name_counts) — কার্ডের "🎭 N টি নাম" ব্যাজের জন্য; না থাকলে ব্যাজ আসে না
  var NCM = {}, NCT = 0;
  function ncLoad() { if (Date.now() - NCT < 60000) return Promise.resolve(); return M().rpc("fa_admin_name_counts").then(function (r) { NCM = {}; (r || []).forEach(function (z) { if (z && z.u) NCM[z.u] = z.c; }); NCT = Date.now(); }).catch(function () { }); }
  function users(pg) {
    return flagsLoad(!!pg).then(function () { return Promise.all([fetchUsers(pg), ncLoad()]); }).then(function (r) { return r[0]; }).then(function (d) {
      var V = M().$("#view"), dupTag = function (x) { var k = String(nm(x)).toLowerCase(), c = d.rows.filter(function (r) { return String(nm(r)).toLowerCase() === k; }).length, nc = NCM[x.uid] || 0, bs = "cursor:pointer;border:0;font:inherit;font-size:12px;font-weight:700"; return (c > 1 ? ' <button type="button" class="tag" data-unnm="' + esc(nm(x)) + '" style="' + bs + ';background:#fde68a;color:#7a4b00">⚠ একই নামে ' + bd(c) + " জন</button>" : "") + (c > 1 || nc > 1 ? ' <button type="button" class="tag" data-unmn="' + esc(x.voter) + '" style="' + bs + ';background:#e9d5ff;color:#4c1d95">🎭 একই ব্যক্তি?</button>' : "") + (nc > 1 ? ' <span class="tag" style="background:#ddd6fe;color:#3b0764;font-weight:700">🎭 ' + bd(nc) + " টি নাম</span>" : ""); }, item = function (x) {
        return '<div class="it"><div><input type="checkbox" class="unCk" data-ck="' + esc(x.voter) + '"' + (SEL[x.voter] || ALLF ? " checked" : "") + ' style="width:18px;height:18px;margin:0 6px 0 0;vertical-align:middle"><span class="udot' + (x.online ? " on" : "") + '"></span><button class="lk" type="button" data-uu="' + esc(x.voter) + '">' + esc(nm(x)) + '</button>' + gtag(x.voter, nm(x), x.gender) + dupTag(x) + ' <span class="tag">' + esc(x.gdept || x.cdept || "—") + '</span><span class="tag">' + esc(x.gbatch || x.csess || "—") + '</span>' + (x.best != null ? '<span class="tag">স্কোর ' + bd(x.best) + "</span>" : "") + '</div><div class="sm">' + esc(x.uid) + " · " + (x.online ? "🟢 অনলাইন" : "Last Active: " + ago(x.ls)) + " · আইপি " + esc(x.ip || "—") + " · " + esc(loc(x)) + " · " + esc(ua(x.ua, x.info)) + (x.phone ? " · 📞 " + esc(x.phone) : "") + (x.info && x.info.sw ? " · " + esc(x.info.sw) : "") + "</div>" + flagBox(x) + "</div>";
      };
      ST.pg = pg || 0; TOTAL = d.total || 0; PAGEV = d.rows.map(function (r) { return r.voter; });
      V.innerHTML = "<h2>👤 User Info — Visitor List (" + bd(d.total) + ')</h2><div class="row"><label>খুঁজুন (নাম, বিভাগ, সেশন, আইপি, জেলা/শহর, আইডি)<input id="unQ" value="' + esc(ST.q) + '"></label><label>দেখান<select id="unF"><option value="0"' + (ST.st === "0" ? " selected" : "") + '>সব ভিজিটর</option><option value="1"' + (ST.st === "1" ? " selected" : "") + '>শুধু অনলাইন</option>' + (d.depts ? '<option value="2"' + (ST.st === "2" ? " selected" : "") + '>শুধু অফলাইন</option>' : "") + '</select></label><button id="unS" type="button">🔎 খুঁজুন</button><button class="l" id="unR" type="button">✖ ফিল্টার মুছুন</button></div>' + filt2(d) + '<div id="unDelBox"></div><p class="sm">নামে ক্লিক করলে পুরো তথ্য খুলবে। একই নামে একাধিক জন থাকলে ⚠ বাটন দেখায় — চাপলে ঐ নামের সবাই খোলে। 🎭 একই ব্যক্তি? চাপলে দেখা যায় শক্ত প্রমাণ (একই ডিভাইস আইডিতে একাধিক নাম) আছে কিনা; শুধু নাম/আইপি মিললে সেটা \"সম্ভাব্য, প্রমাণ দুর্বল\" — একই ব্যক্তি বলা হয় না। এই তালিকা সাইটে Supabase চালু করার পর যারা ঢুকেছে তাদের নিয়ে।</p>' + (window.MCPG ? window.MCPG.box(d.rows.map(item).join("") || '<p class="sm">কোনো ভিজিটর পাওয়া যায়নি।</p>', "unL") : '<div id="unL">' + (d.rows.map(item).join("") || "") + "</div>") + '<div id="unPg">' + (window.MCPG ? window.MCPG.html(ST.pg, d.total, window.MCPG.per(), "data-up") : "") + "</div>";
      document.getElementById("unDelBox").innerHTML = delBar(); delWire();
      var gv = function (id, k) { var e = document.getElementById(id); if (e) ST[k] = e.value; };
      var go = function () { ST.q = document.getElementById("unQ").value.trim(); var f = document.getElementById("unF").value; ST.st = f; ST.on = f === "1"; gv("unG", "g"); gv("unD", "d"); gv("unSs", "s"); gv("unC", "c"); gv("unDv", "dv"); gv("unOs", "os"); gv("unBr", "br"); gv("unPh", "ph"); gv("unSc", "sc"); gv("unAc", "ac"); gv("unFr", "f"); gv("unTo", "t"); gv("unSo", "so"); SEL = {}; ALLF = false; users().catch(M().fail); };
      var ac = document.getElementById("unAc"); if (ac) ac.onchange = function () { var c = ac.value === "custom"; document.getElementById("unFl").hidden = !c; document.getElementById("unTl").hidden = !c; };
      document.getElementById("unR").onclick = function () { ST.q = ""; ST.on = false; ST.st = "0"; ST.g = ST.d = ST.s = ST.c = ST.dv = ST.os = ST.br = ST.ph = ST.sc = ST.ac = ""; ST.f = ST.t = ""; ST.so = "new"; SEL = {}; ALLF = false; users().catch(M().fail); };
      document.getElementById("unS").onclick = go; document.getElementById("unQ").onkeydown = function (e) { if (e.key === "Enter") go(); }; 
      document.getElementById("unPg").onclick = function (e) { var b = e.target.closest("[data-up]"); if (b && !b.disabled) users(+b.dataset.up).catch(M().fail); };
    });
  }

  // ---------- নাম ক্লিক: পুরো User Info ----------
  function show(voter) {
    M().rpc("mc2_admin_user", { p_voter: voter }).then(function (u) {
      u = u || { voter: voter }; // তথ্য না থাকলে খালি (—) দেখায়, এরর নয়
      var i = u.info || {}, nmx = u.gname || u.nick || "অজানা", sum, row = function (k, v) { return "<dt>" + k + "</dt><dd>" + (v == null || v === "" ? "—" : v) + "</dd>"; };
      var dev = [i.sw && "স্ক্রিন " + i.sw, i.lang, i.tz, i.net && "নেট " + i.net, i.cores && i.cores + " কোর", i.mem && i.mem + " GB RAM", i.inapp ? "অ্যাপের ব্রাউজার" : ""].filter(Boolean).join(" · ");
      var phone = u.phone ? esc(u.phone) : "—", he = i.he || {};
      var more = [he.pl && (he.pl + (he.plv ? " " + he.plv : "")), he.arch && (he.arch + (he.bit ? "/" + he.bit + " বিট" : "")), he.br, i.cd && "রঙ " + i.cd + " বিট", i.ori, i.dpr && "DPR " + i.dpr, i.dl && "ডাউনলোড ~" + i.dl + " Mbps", i.rtt && "RTT " + i.rtt + "ms", i.sd ? "ডেটা-সেভার" : "", i.pwa ? "অ্যাপ হিসেবে ইনস্টল" : "", i.dark ? "ডার্ক মোড" : "", i.tzo != null && "UTC" + (i.tzo <= 0 ? "+" : "-") + Math.abs(i.tzo / 60), i.ref && "এসেছে: " + i.ref, i.q && "লিংক: " + i.q].filter(Boolean).join(" · ") || "—";
      sum = ["User ID: " + u.uid, "নাম: " + nmx + (u.nick && u.nick !== nmx ? " (চ্যাট: " + u.nick + ")" : ""), "বিভাগ: " + (u.gdept || "—") + " | চ্যাট বিভাগ: " + (u.cdept || "—"), "সেশন: " + (u.gbatch || "—") + " | চ্যাট সেশন: " + (u.csess || "—"), "সর্বোচ্চ স্কোর: " + (u.best != null ? u.best : "—"), "IP: " + (u.ip || "—"), "লোকেশন: " + loc(u), "জেন্ডার: " + window.MCG.label(u.gender), "ফোন নম্বর: " + (u.phone || "—"), "ফোন মডেল: " + phoneModel(u.ua, i), "ডিভাইস: " + ua(u.ua, i), "স্ট্যাটাস: " + (u.online ? "অনলাইন" : "অফলাইন") + " | Last Active: " + (u.last ? new Date(u.last).toLocaleString("bn-BD") : "—"), "ফোন: " + (u.phone || "—"), "ডিভাইস আইডি: " + u.voter].join("\n");
      var o = document.createElement("div"); o.className = "unmo";
      o.innerHTML = '<div class="unb"><h2 style="margin:0">' + '<span class="udot' + (u.online ? " on" : "") + '"></span>' + esc(nmx) + ' <span class="tag">' + esc(u.uid) + "</span></h2><dl>" +
        row("স্ট্যাটাস", u.online ? "🟢 অনলাইন" + (u.joined ? " (" + dur(u.joined) + " ধরে)" : "") : "⚪ অফলাইন") + row("Last Active", u.last ? esc(new Date(u.last).toLocaleString("bn-BD")) + " · " + ago(new Date(u.last).getTime()) : "রেকর্ড নেই (এখনো উপস্থিতি লগ হয়নি)") +
        row("বর্তমান পেজ", esc(u.page)) + row("প্রথম দেখা / ভিজিট", (u.first ? esc(new Date(u.first).toLocaleString("bn-BD")) : "—") + (u.visits ? " · " + bd(u.visits) + " বার" : "")) +
        row("বিভাগ", esc(u.gdept) + (u.cdept ? ' <span class="sm">· চ্যাট: ' + esc(u.cdept) + "</span>" : "")) + row("সেশন", esc(u.gbatch) + (u.csess ? ' <span class="sm">· চ্যাট: ' + esc(u.csess) + "</span>" : "")) + row("জেন্ডার", esc(window.MCG.label(u.gender))) + row("চ্যাট নাম", esc(u.nick)) +
        row("স্কোর", u.best != null ? "<b>" + bd(u.best) + "</b> / ১০০০ (সেরা, " + bd(u.bestpct) + " শতাংশ) · " + bd(u.plays) + " বার খেলেছে" : "এখনো খেলেনি") +
        row("IP", esc(u.ip)) + row("আনুমানিক IP লোকেশন", esc(loc(u)) + (u.ip ? ' <a href="https://ipinfo.io/' + encodeURIComponent(u.ip) + '" target="_blank" rel="noopener noreferrer">বাইরের সাইটে দেখুন</a>' : "")) +
        row("ফোন মডেল", esc(phoneModel(u.ua, i))) + row("Browser / Device", esc(ua(u.ua, i))) + row("স্ক্রিন ও নেটওয়ার্ক", esc(dev)) + row("বাড়তি ব্রাউজার তথ্য", esc(more)) + row("ফোন নম্বর", phone) + row("চ্যাট বার্তা", bd(u.msgs || 0) + "টি") + "</dl>" +
        (u.scores && u.scores.length ? "<h3>সাম্প্রতিক স্কোর</h3><div class=\"sm\">" + u.scores.map(function (s) { return esc(s.name) + " · " + bd(s.score) + " · " + esc(s.dept) + " · " + esc(new Date(s.created_at).toLocaleDateString("bn-BD")); }).join("<br>") + "</div>" : "") +
        (u.lastmsgs && u.lastmsgs.length ? "<h3>শেষ বার্তা</h3><div class=\"sm\">" + u.lastmsgs.map(function (m) { return esc(m.sess || "") + ": " + esc(m.body); }).join("<br>") + "</div>" : "") +
        '<details><summary class="sm">User-Agent ও ডিভাইস আইডি</summary><div class="sm" style="overflow-wrap:anywhere">' + esc(u.ua) + "<br>" + esc(u.voter) + '</div></details><div class="act"><button class="l" type="button" data-cuu="' + esc(voter) + '" data-cname="' + esc(nmx) + '">🪪 কার্ড দেখুন</button><button id="unCp" type="button">📋 তথ্য কপি</button><button class="l" id="unX" type="button">বন্ধ করুন</button></div></div>';
      document.body.appendChild(o);
      o.onclick = function (e) { if (e.target === o || e.target.id === "unX") o.remove(); };
      o.querySelector("#unCp").onclick = function () { try { navigator.clipboard.writeText(sum); this.textContent = "✅ কপি হয়েছে"; } catch (er) { prompt("কপি করুন:", sum); } };
    }).catch(function (e) { M().fail(e); });
  }
  document.addEventListener("click", function (e) {
    var nb = e.target.closest("[data-unnm],[data-unmn]");
    if (nb) { e.preventDefault(); var P = window.MCA_NAMEPOP; if (!P) return alert("নাম-পপআপ লোড হয়নি; পেজ রিফ্রেশ করুন।"); nb.disabled = true; (nb.dataset.unnm != null ? P.dup(nb.dataset.unnm) : P.mn(nb.dataset.unmn)).then(function () { nb.disabled = false; }, function (er) { nb.disabled = false; M().fail(er); }); return; }
    var u = e.target.closest("[data-uu]"); if (u) { e.preventDefault(); return show(u.dataset.uu); }
    var g = e.target.closest("[data-go]"); if (g) { var b = document.querySelector('#tabs [data-t="' + g.dataset.go + '"]'); if (b) b.click(); }
  });
  tick = setInterval(poll, 8000); setTimeout(poll, 1500);
  window.MCA_USER = show;
  // অন্য অ্যাডমিন ফাইলের জন্য সহায়ক (ভিজিটর ট্যাব, মডারেশনের সক্রিয় ইউজার): ফোন মডেল, ব্রাউজার, দেশ (পতাকা + বাংলা নাম), কতক্ষণ আগে
  var RN = null; try { RN = new Intl.DisplayNames(["bn"], { type: "region" }); } catch (e) {}
  function country(c) {
    c = String(c || "").toUpperCase(); if (!/^[A-Z]{2}$/.test(c) || c === "XX" || c === "T1") return { code: "", flag: "🌐", name: c === "T1" ? "Tor/অজানা" : "দেশ অজানা" };
    var nm = c; try { nm = (RN && RN.of(c)) || c; } catch (e) {}
    return { code: c, flag: String.fromCodePoint(127397 + c.charCodeAt(0), 127397 + c.charCodeAt(1)), name: nm };
  }
  // জেন্ডার চিহ্ন (👦/👧/⚪): সব ট্যাবের জন্য একটাই জায়গা। ডিভাইস আইডি থাকলে ডিভাইস দিয়ে, না থাকলে নাম দিয়ে (নাম মেলানো আনুমানিক: একই নামে দুজন থাকলে ভুল হতে পারে)।
  var GM = null, GT = 0, GW = false;
  function gload() { if (GW) return; GW = true; M().rpc("mc2_admin_genders").then(function (r) { if (r && r.d) { GM = r; GT = Date.now(); } GW = false; }).catch(function () { GW = false; }); }
  setInterval(function () { if (!GM || Date.now() - GT > 300000) gload(); }, 4000); setTimeout(gload, 2000);
  var GL = { m: ["👦", "ছেলে"], f: ["👧", "মেয়ে"], x: ["⚪", "ভিজিটর/অজানা"] };
  function gtag(dev, name, g) {
    if (!g && GM) g = (dev && GM.d[dev]) || GM.n[String(name || "").trim().toLowerCase()];
    var o = GL[g]; return o ? ' <span class="gdr" title="' + o[1] + '">' + o[0] + "</span>" : "";
  }
  window.MCG = { tag: gtag, label: function (g) { return GL[g] ? GL[g][0] + " " + GL[g][1] : "—"; }, reload: gload };
  window.MCA_FMT = { ua: ua, phone: phoneModel, loc: loc, ago: ago, dur: dur, bd: bd, country: country };
})();
