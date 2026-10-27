// অ্যাডমিন: "💬 চ্যাট ইউজার" ট্যাব — যারা চ্যাটে ঢুকেছে/চ্যাট করে তাদের সবার তালিকা: সার্চ বক্স + ফিল্টার + সব তথ্য।
// নতুন SQL লাগে না: User Info ট্যাবের একই RPC (mc2_admin_users2 / mc2_admin_users) ব্যবহার করে, তারপর শুধু চ্যাটের ইউজারদের ব্রাউজারেই ছেঁকে নেয়।
// ইনফো/একই-নাম/একাধিক-নাম — তিনটাই একটা মডাল (পপআপ) কম্পোনেন্টে। User Info ট্যাবও একই মডাল ডাকে (window.MCA_NAMEPOP)।
// 🎭 "একই ব্যক্তি" মেলানোর নিয়ম (শুধু শক্ত প্রমাণ): একই ডিভাইস আইডি (voter) নামের ইতিহাসে (fa_name_history) একাধিক নামে। শুধু নাম/আইপি/শহর/ফোন/ব্রাউজার মিললে "একই ব্যক্তি" বলা হয় না — আলাদা ধূসর "সম্ভাব্য, প্রমাণ দুর্বল" লেবেল; কোনো রেকর্ড এক (merge) করা হয় না। নতুন SQL-10 (sql/SQL-10-NAME-RECORD-ON-CHAT-ENTER.sql) না চালালেও ট্যাব চলে।
// নাম ক্লিক করলে পুরো User Info খোলে (admin-users.js-এর data-uu)। admin-users.js-এর পরে ও admin.js-এর আগে লোড হয়।
(function () {
  var M = function () { return window.MCA; }, PER = 30, PAGE = 50, MAXP = 80;
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var bd = function (s) { return String(s).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  var FM = function () { return window.MCA_FMT || {}; };
  var D = null, T = 0, BUSY = false, SRCOK = false, REFOK = false, NC = {};
  var ST = { q: "", st: "", g: "", d: "", s: "", c: "", dv: "", os: "", br: "", ph: "", ac: "", dup: "", mn: "", ap: "", mod: "", ms: "", ip: "", ipq: "", nq: "", so: "new", pg: 0 };

  var css = document.createElement("style");
  css.textContent = ".cuD{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:13px;margin:8px 0 2px}.cuD dt{color:var(--mut);font-weight:600}.cuD dd{margin:0;overflow-wrap:anywhere}" +
    ".cuS{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.cuS .tag{font-size:13px}.cuSum{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}.cuSum button.tag{background:var(--bd);color:var(--fg);font-weight:500;font-size:13px;padding:3px 10px;border:1px solid transparent;margin:0}.cuSum button.tag.msgc{background:#dbeafe;color:#1e3a8a;font-weight:700}.cuSum button.tag.on{background:var(--g);color:#fff;border-color:var(--g);font-weight:700}" +
    ".cuB{cursor:pointer;border:0;font:inherit;font-size:12px;font-weight:700}.cuH{margin:14px 0 2px;font-size:14px;border-bottom:1px solid var(--bd);padding-bottom:3px}.cuH:first-child{margin-top:4px}" +
    ".cuMo{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px}" +
    ".cuMb{background:var(--card);color:var(--fg);border:1px solid var(--bd);border-radius:16px;width:min(660px,100%);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.35)}" +
    ".cuMh{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--bd)}.cuMt{flex:1;min-width:0;font-weight:800;font-size:16px;overflow-wrap:anywhere}" +
    ".cuMc{padding:4px 14px 14px;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}.cuTl{border-left:3px solid var(--g);padding:2px 0 2px 10px;margin:8px 0}" +
    ".cuV{border:1px solid var(--bd);border-radius:10px;padding:8px 10px;margin:6px 0;font-size:14px}.cuVs{border-color:#7c3aed;background:rgba(124,58,237,.13)}.cuWk{background:#e5e7eb;color:#374151;font-weight:700}.cuW{border-left:3px solid #9ca3af;padding:2px 0 2px 10px;margin:8px 0;opacity:.95}" +
    "@media(max-width:600px){.cuMo{padding:6px}.cuMb{width:100%;max-height:94vh}.cuD{grid-template-columns:1fr}.cuD dt{margin-top:4px}}";
  document.head.appendChild(css);

  function tms(v) { if (v == null || v === "") return 0; if (typeof v === "number") return v < 1e12 ? v * 1000 : v; var t = Date.parse(v); return isNaN(t) ? 0 : t; }
  function nm(x) { return x.gname || x.nick || "অজানা"; }
  function isChat(x) { return !!(x.cdept || x.csess || x.nick); }
  function devType(u) { u = String(u || ""); return /iPad|Tablet/i.test(u) ? "tab" : /Mobi|Android|iPhone/i.test(u) ? "mob" : u ? "pc" : ""; }
  function osOf(u) { u = String(u || ""); return /Android/.test(u) ? "and" : /iPhone|iPad|iPod/.test(u) ? "ios" : /Windows/.test(u) ? "win" : /Mac OS X|Macintosh/.test(u) ? "mac" : /Linux/.test(u) ? "lin" : ""; }
  function brOf(u) { u = String(u || ""); if (!u) return ""; return /Messenger|Orca-|FB_IAB\/MESSENGER/i.test(u) ? "msg" : /FBAN|FBAV|FB_IAB/.test(u) ? "fb" : /Instagram/.test(u) ? "ig" : /SamsungBrowser/.test(u) ? "sam" : /EdgA?\//.test(u) ? "edg" : /OPR\//.test(u) ? "opr" : /Firefox\//.test(u) ? "ff" : /Chrome\//.test(u) ? "chr" : /Version\/[\d.]+.*Safari/.test(u) ? "saf" : "oth"; }
  function cc(x) { var f = FM().country; return f ? f(x.country) : { flag: "🌐", name: x.country || "দেশ অজানা", code: x.country || "" }; }
  function lastMs(x) { return tms(x.ls != null ? x.ls : x.last); }

  // কে কয়টা আলাদা নাম ব্যবহার করেছে: SQL-10-এর fa_admin_name_counts; না থাকলে SQL-7-এর তালিকা (সর্বশেষ ৩০০) থেকে হিসাব
  function loadNC0() {
    return M().rpc("fa_admin_name_counts").then(function (r) { var m = {}; (r || []).forEach(function (z) { if (z && z.u) m[z.u] = z.c; }); return m; }).catch(function () {
      return M().rpc("fa_admin_name_history_all", { p_q: null, p_limit: 300 }).then(function (L) {
        var g = {}, m = {}; (L || []).forEach(function (h) { var k = h.u; if (!k) return; g[k] = g[k] || {}; if (h.o) g[k][String(h.o).toLowerCase()] = 1; if (h.n) g[k][String(h.n).toLowerCase()] = 1; });
        Object.keys(g).forEach(function (k) { var c = Object.keys(g[k]).length; if (c > 1) m[k] = c; }); return m;
      }).catch(function () { return {}; });
    });
  }
  // বার্তা থেকে নাম গোনা (আগের বদলও ধরে — নামের ইতিহাস রাখা শুরুর আগের বার্তাও): একই ডিভাইস আইডি (voter) + বার্তায় ২+ আলাদা নাম = শক্ত প্রমাণ (সর্বশেষ ১০০০০ বার্তা)
  var MVM = {};
  function mvLoad() {
    var A = M().A; if (!A) return Promise.resolve();
    return A("mc2_ac_messages?select=voter,nick&deleted=eq.false&order=id.desc&limit=10000").then(function (R) {
      var g = {}; (R || []).forEach(function (r) { if (!r.voter || !r.nick) return; (g[r.voter] = g[r.voter] || {})[String(r.nick).toLowerCase()] = 1; });
      MVM = {}; Object.keys(g).forEach(function (v) { var c = Object.keys(g[v]).length; if (c > 1) MVM[v] = c; });
    }).catch(function () { });
  }
  function loadNC() { return loadNC0().then(function (m) { return mvLoad().then(function () { return m; }); }); }

  // ---------- একই ব্যক্তি: শুধু শক্ত প্রমাণ ----------
  // শক্ত প্রমাণ = একই ডিভাইস আইডি (voter) নামের ইতিহাসে ২ বা বেশি আলাদা নামে (fa_admin_name_counts)। ইউজার আইডি = ডিভাইস আইডির হ্যাশ, তাই এক আইডি = এক ডিভাইস আইডি।
  // আইপি / আইপি-শহর / ফোন নম্বর / ফোন মডেল / শুধু নাম — এগুলো দুর্বল সংকেত: কখনো "একই ব্যক্তি" গোনা হয় না, ব্যাজ/ফিল্টারেও আসে না; শুধু পপআপে ধূসর "সম্ভাব্য, প্রমাণ দুর্বল" হিসেবে দেখায়।
  // কোনো রেকর্ড কখনো একত্র (merge) করা হয় না — x.pm সবসময় শুধু নিজের একটা আইডি।
  function model(u) { var m = /Android [\d.]+; ([^;)]+)/.exec(String(u || "")); return m && m[1].length > 2 && !/^K$/.test(m[1]) ? m[1] : ""; }
  function linkPeople(out) {
    out.forEach(function (x) { x.pm = [x]; x.pn = x.nc || 0; x.pw = x.pn > 1 ? ["একই ডিভাইস আইডিতে " + bd(x.pn) + " টি নাম (নামের ইতিহাস)"] : []; x.pcand = null; });
  }
  function multi(x) { return !!(x.pn > 1); }
  function sameIdent(a, b) { return a.voter === b.voter; }
  // দুর্বল সংকেত: a-র সাথে pool-এর অন্য আইডিগুলোর কোথায় কোথায় মিল (প্রতিটার সাথে সুস্পষ্ট "দুর্বল" কারণ)। শুধু শহর মিললে প্রার্থী ধরা হয় না।
  function weakCands(x, pool) {
    var key = String(nm(x)).toLowerCase(), ip = x.ip || "", ph = String(x.phone || "").replace(/\D/g, "").slice(-10), md = model(x.ua), out = [];
    var ipc = {}; (pool || []).forEach(function (y) { if (y.ip) ipc[y.ip] = (ipc[y.ip] || 0) + 1; });
    (pool || []).forEach(function (y) {
      if (!y || sameIdent(x, y)) return;
      var why = [];
      if (String(nm(y)).toLowerCase() === key) why.push("শুধু নাম মিলেছে");
      if (ip && y.ip === ip) why.push("একই আইপি" + (ipc[ip] > 6 ? " (অনেকে ব্যবহার করে)" : ""));
      var py = String(y.phone || "").replace(/\D/g, "").slice(-10); if (ph.length >= 10 && py === ph) why.push("একই ফোন নম্বর (ইউজারের নিজে দেওয়া, যাচাই করা নয়)");
      var my = model(y.ua); if (md && my && md === my) why.push("একই ফোন মডেল (" + md + ")");
      if (!why.length) return;
      if (x.city && y.city && String(x.city).toLowerCase() === String(y.city).toLowerCase()) why.push("আইপি-শহর একই (" + x.city + ")");
      out.push({ x: y, why: why.join(" · "), n: why.length });
    });
    out.sort(function (p, q) { return q.n - p.n; });
    return out;
  }

  // ---------- ডাটা আনা: সব পেজ ----------
  function fetchPage(off) {
    var R = M().rpc;
    return R("mc2_admin_users2", { p_q: "", p_status: "all", p_gender: "", p_dept: "", p_sess: "", p_country: "", p_dev: "", p_os: "", p_br: "", p_phone: "", p_score: "", p_active: "", p_sort: "new", p_from: "", p_to: "", p_limit: PAGE, p_offset: off })
      .catch(function () { return R("mc2_admin_users", { p_q: "", p_online: false, p_limit: PAGE, p_offset: off }); });
  }
  function prog(t) { var e = document.getElementById("cuProg"); if (e) e.textContent = t; }
  function load() {
    if (BUSY) return Promise.resolve(D);
    BUSY = true; prog("⏳ তালিকা আনা হচ্ছে…");
    return fetchPage(0).then(function (d0) {
      var rows = (d0 && d0.rows) || [], total = (d0 && d0.total) || rows.length, pages = Math.min(MAXP, Math.ceil(total / PAGE)), i = 1;
      function batch() {
        if (i >= pages) return Promise.resolve();
        var ps = [], n = 0;
        while (i < pages && n < 4) { ps.push(fetchPage(i * PAGE)); i++; n++; }
        return Promise.all(ps).then(function (rs) { rs.forEach(function (r) { rows = rows.concat((r && r.rows) || []); }); prog("⏳ আনা হচ্ছে… " + bd(Math.min(rows.length, total)) + " / " + bd(total)); return batch(); });
      }
      return batch().then(function () {
        prog("⏳ বার্তা, সতর্কতা ও অ্যাপের তথ্য আনা হচ্ছে…");
        return Promise.all([M().rpc("mc2_ac_admin_active", { p_hours: 87600, p_dept: null }).catch(function () { return []; }), M().rpc("mc2_fa_src_list").then(function (r) { SRCOK = true; return r || []; }).catch(function () { SRCOK = false; return []; }), M().rpc("mc2_fa_ref_list").then(function (r) { REFOK = true; return r || []; }).catch(function () { REFOK = false; return []; }), loadNC()]).then(function (ex) {
          var act = ex[0] || [], srcs = ex[1] || [], am = {}, sm = {}, seen = {}, out = [], rm = {};
          (ex[2] || []).forEach(function (z) { (rm[z.voter] = rm[z.voter] || []).push(z); });
          act.forEach(function (a) { am[a.voter] = a; }); srcs.forEach(function (z) { sm[z.voter] = z; });
          rows.forEach(function (r) { var k = r.voter || r.uid; if (!k || seen[k]) return; seen[k] = 1; if (isChat(r) || am[r.voter]) out.push(r); });
          act.forEach(function (a) { if (seen[a.voter]) return; seen[a.voter] = 1; out.push({ voter: a.voter, uid: a.uid, nick: a.nick, cdept: a.dept, csess: a.sess, ip: a.ip, country: a.country, city: a.city, region: a.region, ua: a.ua, online: a.onl, ls: a.ls, info: { model: a.model } }); });
          out.forEach(function (x) {
            var a = am[x.voter], z = sm[x.voter];
            if (a) { x.hasAct = true; x.msgs = a.msgs || 0; x.warns = a.warns || 0; x.mst = a.st || "ok"; x.until = a.until; x.reason = a.reason; x.valid_cnt = a.valid_cnt || 0; x.verified = a.verified; if (a.onl) x.online = true; if (a.model && !(x.info && x.info.model)) x.info = Object.assign({}, x.info, { model: a.model }); }
            if (z) x.src = z;
            x.refs = rm[x.voter] || [];
          });
          NC = ex[3] || {}; out.forEach(function (x) { x.nc = Math.max(NC[x.uid] || 0, MVM[x.voter] || 0); }); linkPeople(out);
          D = out; T = Date.now(); BUSY = false; return D;
        });
      });
    }).catch(function (e) { BUSY = false; throw e; });
  }

  // ---------- ফিল্টার ----------
  function dupMap() { var m = {}; (D || []).forEach(function (x) { var k = String(nm(x)).toLowerCase(); m[k] = (m[k] || 0) + 1; }); return m; }
  function hay(x) {
    var c = cc(x), i = x.info || {}, f = FM();
    return [nm(x), x.nick, x.gname, x.uid, x.voter, x.gdept, x.gbatch, x.cdept, x.csess, x.ip, x.city, x.region, x.country, c.name, x.phone, x.ua, f.ua ? f.ua(x.ua, i) : "", f.phone ? f.phone(x.ua, i) : "", i.sw, i.lang, i.tz, x.page, x.src && x.src.app, x.src && x.src.first_app, x.src && x.src.ref, x.src && x.src.landing, (x.refs || []).map(function (r) { return r.ref; }).join(" ")].join(" ").toLowerCase();
  }
  function pass(x, dm) {
    var q = ST.q.toLowerCase(), now = Date.now(), ls = lastMs(x), day = 86400000;
    if (q && hay(x).indexOf(q) < 0) return false;
    if (ST.ip && String(x.ip || "") !== ST.ip) return false; // ড্রপডাউন: এই আইপি-তে থাকা সবাই
    if (ST.ipq && String(x.ip || "").toLowerCase().indexOf(ST.ipq.toLowerCase()) < 0) return false; // টাইপ করা আইপি (পুরো বা অংশ)
    if (ST.nq) { // নামের একাধিক অংশ — যেকোনো একটা অংশ নামে মিললেই দেখাবে
      var parts = ST.nq.toLowerCase().split(/[\s,;|،、।]+/).filter(Boolean), nmh = [nm(x), x.nick, x.gname].join(" ").toLowerCase();
      if (parts.length && !parts.some(function (t) { return nmh.indexOf(t) >= 0; })) return false;
    }
    if (ST.st === "on" && !x.online) return false;
    if (ST.st === "off" && x.online) return false;
    if (ST.g && (x.gender || "x") !== ST.g) return false;
    if (ST.d && (x.cdept || x.gdept) !== ST.d) return false;
    if (ST.s && (x.csess || x.gbatch) !== ST.s) return false;
    if (ST.c && String(x.country || "").toUpperCase() !== ST.c) return false;
    if (ST.dv && devType(x.ua) !== ST.dv) return false;
    if (ST.os && osOf(x.ua) !== ST.os) return false;
    if (ST.br === "none") { if (x.ua) return false; } else if (ST.br && brOf(x.ua) !== ST.br) return false;
    if (ST.ph === "yes" && !x.phone) return false;
    if (ST.ph === "no" && x.phone) return false;
    if (ST.dup === "1" && !(dm[String(nm(x)).toLowerCase()] > 1)) return false;
    if (ST.mn === "1" && !multi(x)) return false;
    if (ST.ap) { var ap = x.src ? x.src.app : ""; if (ST.ap === "none" ? !!ap : ap !== ST.ap) return false; }
    if (ST.mod === "ok" && x.mst && x.mst !== "ok") return false;
    if (ST.mod === "blocked" && !(x.mst && x.mst !== "ok")) return false;
    if (ST.mod === "warn" && !(x.warns > 0)) return false;
    if (ST.mod === "rep" && !(x.valid_cnt > 0)) return false;
    if (ST.ms === "yes" && !(x.msgs > 0)) return false;
    if (ST.ms === "no" && x.msgs > 0) return false;
    if (ST.ac) {
      if (ST.ac === "today") { var t0 = new Date(); t0.setHours(0, 0, 0, 0); if (ls < t0.getTime()) return false; }
      else if (ST.ac === "7") { if (!ls || now - ls > 7 * day) return false; }
      else if (ST.ac === "30") { if (!ls || now - ls > 30 * day) return false; }
      else if (ST.ac === "old") { if (ls && now - ls <= 30 * day) return false; }
    }
    return true;
  }
  function sorted(a) {
    var s = a.slice();
    if (ST.so === "old") s.sort(function (x, y) { return lastMs(x) - lastMs(y); });
    else if (ST.so === "name") s.sort(function (x, y) { return String(nm(x)).localeCompare(String(nm(y)), "bn"); });
    else if (ST.so === "msgs") s.sort(function (x, y) { return (y.msgs || 0) - (x.msgs || 0); });
    else if (ST.so === "visits") s.sort(function (x, y) { return (y.visits || 0) - (x.visits || 0); });
    else s.sort(function (x, y) { return (y.online ? 1 : 0) - (x.online ? 1 : 0) || lastMs(y) - lastMs(x); });
    return s;
  }

  // ---------- এক জনের কার্ড ----------
  function row(k, v) { return "<dt>" + k + "</dt><dd>" + (v == null || v === "" ? "—" : v) + "</dd>"; }
  function dt(v) { var t = tms(v); return t ? esc(new Date(t).toLocaleString("bn-BD")) : ""; }
  function safeUrl(u) { u = String(u || ""); return /^https?:\/\//i.test(u) ? u : ""; }
  function link(u, t) { var h = safeUrl(u); return h ? '<a href="' + esc(h) + '" target="_blank" rel="noopener noreferrer">' + esc(t || u) + "</a>" : esc(u || ""); }
  var APPI = { Messenger: "💬", Facebook: "📘", Instagram: "📸", WhatsApp: "🟢", Telegram: "✈️", TikTok: "🎵", YouTube: "▶️", "X/Twitter": "✖️", Google: "🔎", Direct: "🔗", Other: "🌐" };
  function stlab(x) { return x.mst === "banned" ? "⛔ ব্যান" : x.mst && x.mst !== "ok" ? "⏳ Restriction" : "✅ ঠিক আছে"; }
  function item(x, dm) {
    var f = FM(), i = x.info || {}, c = cc(x), l = lastMs(x), g = window.MCG && window.MCG.tag ? window.MCG.tag(x.voter, nm(x), x.gender) : "";
    var dc = dm[String(nm(x)).toLowerCase()], dup = dc > 1 ? ' <button type="button" class="tag cuB" data-cudup="' + esc(String(nm(x)).toLowerCase()) + '" style="background:#fde68a;color:#7a4b00">⚠ একই নামে ' + bd(dc) + " জন</button>" : "",
      who = dc > 1 || multi(x) ? ' <button type="button" class="tag cuB" data-cumn="' + esc(x.voter) + '" style="background:#e9d5ff;color:#4c1d95">🎭 একই ব্যক্তি?</button>' : "",
      mn = multi(x) ? ' <span class="tag" style="background:#ddd6fe;color:#3b0764;font-weight:700">🎭 ' + bd(x.pn) + " টি নাম</span>" : "";
    var loc = f.loc ? f.loc(x) : [x.city, x.region, x.country].filter(Boolean).join(", ");
    var dev = f.ua ? f.ua(x.ua, i) : esc(x.ua || "");
    var more = [i.sw && "স্ক্রিন " + i.sw, i.lang, i.tz, i.net && "নেট " + i.net, i.cores && i.cores + " কোর", i.mem && i.mem + " GB RAM"].filter(Boolean).join(" · ");
    var head = '<div><span class="udot' + (x.online ? " on" : "") + '"></span><button class="lk" type="button" data-uu="' + esc(x.voter) + '">' + esc(nm(x)) + "</button>" + g + dup + who + mn +
      ' <span class="tag">' + esc(x.cdept || x.gdept || "—") + '</span><span class="tag">' + esc(x.csess || x.gbatch || "—") + "</span>" + (x.best != null ? '<span class="tag">স্কোর ' + bd(x.best) + "</span>" : "") + (x.src && x.src.app ? '<span class="tag">' + (APPI[x.src.app] || "🌐") + " " + esc(x.src.app) + "</span>" : "") + (x.mst && x.mst !== "ok" ? '<span class="tag" style="background:#fecaca;color:#7f1d1d">' + stlab(x) + "</span>" : "") + "</div>";
    var line = '<div class="sm">' + esc(x.uid || "") + " · " + (x.online ? "🟢 অনলাইন" : "Last Active: " + (f.ago ? f.ago(l) : dt(l) || "জানা নেই")) + " · আইপি " + esc(x.ip || "—") + " · " + c.flag + " " + esc(c.name) + (x.city ? ", " + esc(x.city) : "") + " · " + esc(dev) + (x.phone ? " · 📞 " + esc(x.phone) : "") + "</div>" + (x.hasAct ? '<div class="sm">💬 বার্তা ' + bd(x.msgs) + " · ⚠️ সতর্কতা " + bd(x.warns) + " · " + stlab(x) + (x.valid_cnt ? " · বৈধ রিপোর্ট " + bd(x.valid_cnt) + "/৩" : "") + (x.reason && x.mst && x.mst !== "ok" ? " · কারণ: " + esc(x.reason) : "") + "</div>" : "");
    return '<div class="it">' + head + line + '<div class="act"><button class="l s" type="button" data-cuinfo="' + esc(x.voter) + '">ℹ️ ইনফো</button></div></div>';
  }

  // ---------- মডাল (পপআপ): ইনফো / একই নাম / একাধিক নাম — একটাই কম্পোনেন্ট ----------
  var MS = [], MO = null;
  function mTop() { return MS[MS.length - 1]; }
  function mRender() {
    var v = mTop(); if (!v) return;
    if (!MO) {
      MO = document.createElement("div"); MO.className = "cuMo";
      MO.innerHTML = '<div class="cuMb" role="dialog" aria-modal="true"><div class="cuMh"><button class="l s" type="button" data-mback title="পেছনে">←</button><div class="cuMt"></div><button class="l s" type="button" data-mx aria-label="বন্ধ">✕</button></div><div class="cuMc"></div></div>';
      MO.onclick = function (e) {
        if (e.target === MO || e.target.closest("[data-mx]")) return mClose();
        if (e.target.closest("[data-mback]")) { MS.pop(); return mRender(); }
        var pn = e.target.closest("[data-cunp]"); if (pn) { if (pn.disabled) return; var tv = mTop(); if (tv && tv.args) { tv.pg = +pn.dataset.cunp; tv.body = mnHTML(tv.args[0], tv.args[1], tv.args[2], tv.args[3], tv.args[4], tv.pg); mRender(); var h = MO.querySelector("#cuNm"); if (h) h.scrollIntoView({ block: "start" }); } return; }
        var b = e.target.closest("[data-cuinfo],[data-cumn],[data-cudup]"); if (b) act(b);
      };
      document.body.appendChild(MO); document.body.style.overflow = "hidden";
    }
    MO.querySelector("[data-mback]").style.display = MS.length > 1 ? "" : "none";
    MO.querySelector(".cuMt").innerHTML = v.title;
    MO.querySelector(".cuMc").innerHTML = v.body;
  }
  function mPush(v) { MS.push(v); mRender(); MO.querySelector(".cuMc").scrollTop = 0; }
  function mClose() { MS = []; if (MO) { MO.remove(); MO = null; document.body.style.overflow = ""; } }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && MO) mClose(); });
  var REG = {}, EXT = [];
  function reg(L) { (L || []).forEach(function (x) { if (x && x.voter) REG[x.voter] = x; }); return L; }
  function byVoter(v) { return REG[v] || (D || []).filter(function (x) { return x.voter === v; })[0]; }
  function poolAll() { var s = {}, o = []; (D || []).concat(EXT).forEach(function (x) { if (x && x.voter && !s[x.voter]) { s[x.voter] = 1; o.push(x); } }); return o; }
  function act(b) {
    var d = b.dataset;
    if (d.cuinfo) { var x = byVoter(d.cuinfo); if (x) mPush({ title: titleOf(x), body: infoHTML(x) }); }
    else if (d.cumn) { var y = byVoter(d.cumn); if (y) mnOpen(y); }
    else if (d.cudup != null) dupOpen(d.cudup);
  }
  function titleOf(x) { return '<span class="udot' + (x.online ? " on" : "") + '"></span>' + esc(nm(x)) + ' <span class="sm">' + (x.online ? "🟢 অনলাইন" : "⚪ অফলাইন") + "</span>"; }
  function sec(t, rows) { return '<h4 class="cuH">' + t + '</h4><dl class="cuD">' + rows + "</dl>"; }

  // ℹ️ ইনফো: ভাগ ভাগ করা সব তথ্য
  function infoHTML(x) {
    var f = FM(), i = x.info || {}, c = cc(x), l = lastMs(x);
    var loc = f.loc ? f.loc(x) : [x.city, x.region, x.country].filter(Boolean).join(", ");
    var dev = f.ua ? f.ua(x.ua, i) : esc(x.ua || "");
    var more = [i.sw && "স্ক্রিন " + i.sw, i.lang, i.tz, i.net && "নেট " + i.net, i.cores && i.cores + " কোর", i.mem && i.mem + " GB RAM"].filter(Boolean).join(" · ");
    var z = x.src, srcRows = z ? row("এখন যে অ্যাপ থেকে", (APPI[z.app] || "🌐") + " " + esc(z.app || "—")) + row("প্রথমবার যে অ্যাপ থেকে", (APPI[z.first_app] || "🌐") + " " + esc(z.first_app || "—")) + row("রেফারার লিংক (কোথা থেকে ক্লিক)", link(z.ref) || "—") + row("ল্যান্ডিং লিংক", link(z.landing) || "—") + row("প্রথম রেফারার", link(z.first_ref) || "—") + row("Facebook ক্লিক আইডি (fbclid)", z.fbclid ? esc(z.fbclid) + ' <span class="sm">(প্রোফাইল আইডি নয়)</span>' : "") + row("সাইটে ঢুকেছে", z.visits ? bd(z.visits) + " বার" : "") : row("কোন অ্যাপ থেকে", SRCOK ? "রেকর্ড নেই (সাইটে নতুন করে ঢুকলে আসবে)" : "supabase-chat-users.sql চালালে আসবে");
    var RL = x.refs || [], refRows = row("🔗 আগের লিংক (যেখান থেকে ঢুকেছে) — একই লিংক একবারই", RL.length ? RL.map(function (r) { return '<div style="margin-bottom:4px;overflow-wrap:anywhere">' + link(r.ref) + ' <span class="sm">· ' + bd(r.hits) + " বার · প্রথম " + dt(r.first_seen) + " · শেষ " + dt(r.last_seen) + "</span></div>"; }).join("") : (REFOK ? "রেকর্ড নেই (কোনো লিংক থেকে ক্লিক করে না ঢুকলে বা ব্রাউজার রেফারার না পাঠালে ফাঁকা থাকে)" : "supabase-ref-log.sql চালালে আসবে"));
    var names = multi(x) ? row("একাধিক নাম", '<button type="button" class="tag cuB" data-cumn="' + esc(x.voter) + '" style="background:#e9d5ff;color:#4c1d95">🎭 ' + bd(x.pn) + " টি নাম — সব দেখুন</button>") : "";
    var gl = window.MCG && window.MCG.label ? esc(window.MCG.label(x.gender)) : esc(x.gender);
    return sec("🪪 পরিচয়", row("User ID", esc(x.uid)) + row("ডিভাইস আইডি", esc(x.voter)) + row("চ্যাট নাম", esc(x.nick)) + row("নাম (গ্রুপ)", esc(x.gname)) + names +
        row("চ্যাট বিভাগ / সেশন", esc(x.cdept || "—") + " / " + esc(x.csess || "—")) + row("গেম বিভাগ / সেশন", esc(x.gdept || "—") + " / " + esc(x.gbatch || "—")) + row("জেন্ডার", gl) + row("ফোন নম্বর", esc(x.phone))) +
      sec("📍 লোকেশন ও ডিভাইস", row("IP", esc(x.ip)) + row("লোকেশন (আনুমানিক)", c.flag + " " + esc(c.name) + (loc ? " — " + esc(loc) : "")) + row("ফোন মডেল", f.phone ? esc(f.phone(x.ua, i)) : "") + row("ডিভাইস / ব্রাউজার", esc(dev)) + row("স্ক্রিন, ভাষা, নেট", esc(more))) +
      sec("📊 কার্যকলাপ", row("স্ট্যাটাস", x.online ? "🟢 অনলাইন" + (x.joined && f.dur ? " (" + f.dur(x.joined) + " ধরে)" : "") : "⚪ অফলাইন") +
        row("Last Active", l ? dt(l) + (f.ago ? " · " + f.ago(l) : "") : "") + row("প্রথম দেখা", dt(x.first)) + row("ভিজিট", x.visits ? bd(x.visits) + " বার" : "") +
        row("বর্তমান পেজ", esc(x.page)) + row("সর্বোচ্চ স্কোর", x.best != null ? bd(x.best) : "") + (x.hasAct ? row("বার্তা", bd(x.msgs)) : "")) +
      sec("🛡 মডারেশন", x.hasAct ? row("সতর্কতা", bd(x.warns)) + row("মডারেশন অবস্থা", stlab(x)) + row("মেয়াদ শেষ", x.mst && x.mst !== "ok" ? dt(x.until) : "") + row("কারণ", x.mst && x.mst !== "ok" ? esc(x.reason) : "") + row("বৈধ রিপোর্ট", bd(x.valid_cnt) + " / ৩") + row("যাচাই (Verify)", x.verified ? "✔ হয়েছে" : "") : row("মডারেশন", "চ্যাটে কোনো রেকর্ড নেই")) +
      sec("🔗 কোন লিংক থেকে এসেছে", srcRows + refRows);
  }

  // ⚠ একই নামে N জন: ঐ নামের সবাই (প্রত্যেকের ইউজার আইডি + ডিভাইস আইডি (voter), অনলাইন/Last Active, বার্তা, সতর্কতা/ব্যান, বিভাগ-সেশন)
  function whoBtn(x) { return '<button type="button" class="l s" data-cumn="' + esc(x.voter) + '">🎭 একই ব্যক্তি?</button>'; }
  function dupOpen(key, rows) {
    var L = reg((rows || D || []).filter(function (x) { return String(nm(x)).toLowerCase() === key; })), f = FM();
    var body = '<p class="sm">এরা সবাই একই নামে, কিন্তু প্রত্যেকের ডিভাইস আইডি (voter) আলাদা। শুধু নাম এক হলে একই ব্যক্তি বলা যায় না — যাচাই করতে "🎭 একই ব্যক্তি?" চাপুন।</p>' + L.map(function (x) {
      var l = lastMs(x), c = cc(x), blocked = x.mst && x.mst !== "ok";
      return '<div class="it"><div><span class="udot' + (x.online ? " on" : "") + '"></span><b>' + esc(nm(x)) + '</b> <span class="tag">' + esc(x.uid || "—") + "</span>" + (multi(x) ? ' <span class="tag" style="background:#ddd6fe;color:#3b0764;font-weight:700">🎭 ' + bd(x.pn) + " টি নাম</span>" : "") + (blocked ? ' <span class="tag" style="background:#fecaca;color:#7f1d1d">' + stlab(x) + "</span>" : "") + "</div>" +
        '<div class="sm">ডিভাইস আইডি (voter): <span style="overflow-wrap:anywhere">' + esc(x.voter || "—") + "</span></div>" +
        '<div class="sm">' + (x.online ? "🟢 অনলাইন" : "Last Active: " + (f.ago ? f.ago(l) : dt(l) || "জানা নেই")) + " · 💬 বার্তা " + (x.msgs != null ? bd(x.msgs) : "—") + " · ⚠️ সতর্কতা " + (x.warns != null ? bd(x.warns) : "—") + " · " + stlab(x) + (blocked && x.reason ? " · কারণ: " + esc(x.reason) : "") + "</div>" +
        '<div class="sm">' + esc(x.cdept || x.gdept || "—") + " · " + esc(x.csess || x.gbatch || "—") + " · আইপি " + esc(x.ip || "—") + " · " + c.flag + " " + esc(x.city || c.name || "—") + "</div>" +
        '<div class="act"><button class="l s" type="button" data-cuinfo="' + esc(x.voter) + '">ℹ️ ইনফো</button>' + whoBtn(x) + "</div></div>";
    }).join("");
    mPush({ title: "⚠ একই নামে " + bd(L.length) + " জন — <b>" + esc(L.length ? nm(L[0]) : key) + "</b>", body: body || '<p class="sm">কেউ পাওয়া যায়নি।</p>' });
  }

  // 🎭 একই ব্যক্তি?: শুধু শক্ত প্রমাণে (একই ডিভাইস আইডি, নামের ইতিহাসে একাধিক নাম) "একই ব্যক্তি"; বাকি সব ধূসর "সম্ভাব্য, প্রমাণ দুর্বল" — কিছু এক করা হয় না
  function dday(t) { try { return new Date(t).toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" }); } catch (e) { return ""; } }
  function mnOpen(x) {
    var v = { title: "🎭 একই ব্যক্তি? — " + esc(nm(x)), body: '<p class="sm">⏳ লোড হচ্ছে…</p>' };
    mPush(v);
    var A = M().A, vq = A ? A("mc2_visits?select=device,created_at&device=eq." + encodeURIComponent(x.voter) + "&order=created_at.desc&limit=1000").catch(function () { return null; }) : Promise.resolve(null);
    Promise.all([vq, M().rpc("fa_admin_name_history", { p_uid: x.uid }).catch(function () { return null; }), M().rpc("fa_admin_name_stats", { p_uid: x.uid }).catch(function () { return null; }), mdLoad(x)]).then(function (r) {
      if (mTop() !== v) return; v.args = [x, r[0], r[1], r[2], r[3]]; v.body = mnHTML(x, r[0], r[1], r[2], r[3], 0); mRender();
    }).catch(function (e) { if (mTop() !== v) return; v.body = '<p class="warn">লোড হয়নি: ' + esc(e && e.message ? e.message : e) + "</p>"; mRender(); });
  }

  // 🟡 মাঝারি প্রমাণ (সম্ভাব্য): শুধু চ্যাট-বার্তার সারি থেকে (সবার কাছেই থাকে): নাম, ডিভাইস আইডি, আইপি, সেশন, সময়।
  // নিয়ম: একই আইপি + একই সেশন + আলাদা ডিভাইস আইডি; সময়ে সম্পূর্ণ ওভারল্যাপ করলে (দুজন ৫ মিনিটের মধ্যে ঘুরে ঘুরে লিখলে) স্কোর কমে। কখনো "একই ব্যক্তি" বলা বা merge করা হয় না।
  function mdLoad(x) {
    var A = M().A; if (!A || !x.ip) return Promise.resolve(null);
    return A("mc2_ac_messages?select=voter,nick,session_id,created_at,ip&ip=eq." + encodeURIComponent(x.ip) + "&order=created_at.desc&limit=600").catch(function () { return null; });
  }
  function mdScore(x, R) {
    var by = {}; (R || []).forEach(function (r) { if (!r.voter) return; var o = by[r.voter] = by[r.voter] || { voter: r.voter, nicks: {}, ss: {}, t: [] }; o.nicks[r.nick] = 1; o.ss[r.session_id] = 1; var tt = new Date(r.created_at).getTime(); o.t.push(tt); (o.st = o.st || {})[r.session_id] = (o.st[r.session_id] || []).concat(tt); });
    var me = by[x.voter]; if (!me) return [];
    var out = [];
    Object.keys(by).forEach(function (v) {
      if (v === x.voter) return; var o = by[v], pts = 0, why = ["একই আইপি (" + x.ip + ")"];
      var sh = Object.keys(o.ss).filter(function (k) { return me.ss[k]; });
      if (!sh.length) return;               // একই সেশনে না থাকলে প্রার্থী নয় — শুধু আইপি একা কিছু নয়
      pts += 1; why.push("একই সেশনে " + sh.length + "টিতে লিখেছে");
      var mt = [], ot = []; sh.forEach(function (k) { mt = mt.concat(me.st[k] || []); ot = ot.concat(o.st[k] || []); });
      var all = mt.map(function (t) { return [t, 0]; }).concat(ot.map(function (t) { return [t, 1]; })).sort(function (a, b) { return a[0] - b[0]; }), sw = 0, near = 0;
      for (var i = 1; i < all.length; i++) if (all[i][1] !== all[i - 1][1]) { sw++; if (all[i][0] - all[i - 1][0] <= 5 * 60000) near++; }
      var me1 = Math.min.apply(null, mt), me2 = Math.max.apply(null, mt), o1 = Math.min.apply(null, ot), o2 = Math.max.apply(null, ot);
      var ov = Math.min(me2, o2) - Math.max(me1, o1);
      if (ov <= 0) { pts += 2; why.push("একজন থামার পর অন্যজন শুরু (সময় ওভারল্যাপ নেই)"); }
      else if (sw >= 6) { pts -= 1; why.push("⚠ দুজন পালাক্রমে লিখেছে (" + sw + " বার) — আলাদা মানুষ হওয়ার সম্ভাবনা বেশি"); }
      else if (near) { pts += 1; why.push("একজনের কাছাকাছি সময়ে অন্যজন (" + near + " বার)"); }
      out.push({ voter: v, nick: Object.keys(o.nicks).join(", "), n: o.t.length, pts: pts, why: why.join(" · "), lvl: pts >= 3 ? "মাঝারি" : "দুর্বল" });
    });
    out.sort(function (a, b) { return b.pts - a.pts; }); return out;
  }
  function mnHTML(x, V, H, S, MR, pg) {
    var days = {}; (V || []).forEach(function (r) { var d = dday(r.created_at); days[d] = (days[d] || 0) + 1; });
    var hist = (H || []).slice().sort(function (a, b) { return a.t - b.t; }), hn = {};
    hist.forEach(function (e) { if (e.o) hn[String(e.o).toLowerCase()] = 1; if (e.n) hn[String(e.n).toLowerCase()] = 1; });
    var sn = {}; (S || []).forEach(function (z) { if (z.n && (z.m || 0) > 0) sn[String(z.n).toLowerCase()] = 1; }); var N = Math.max(Object.keys(hn).length, Object.keys(sn).length, x.pn || 0), strong = N > 1;
    var sm = {}; (S || []).forEach(function (z) { var n = String(z.n).toLowerCase(); sm[n] = sm[n] || { m: 0, r: 0, f: 0, l: 0 }; sm[n].m += z.m || 0; sm[n].r += z.r || 0; if (z.f && (!sm[n].f || z.f < sm[n].f)) sm[n].f = z.f; if (z.l && z.l > sm[n].l) sm[n].l = z.l; });
    var tot = (S || []).reduce(function (a, z) { return a + (z.m || 0); }, 0) || x.msgs || 0;
    var out = strong
      ? '<div class="cuV cuVs">🎭 <b>শক্ত প্রমাণ:</b> এই একই ডিভাইস আইডি (voter) নামের ইতিহাস অনুযায়ী <b>' + bd(N) + " টি আলাদা নামে</b> ব্যবহার হয়েছে।" + (hist.length ? "" : " (সময়রেখা লোড হয়নি)") + '</div><div class="sm">তবে একই ফোন/ব্রাউজার অন্য কেউ ব্যবহার করলেও এক ডিভাইস আইডিতে একাধিক নাম পড়তে পারে — তাই নিচে প্রতিটা নামের সময় ও বার্তা মিলিয়ে দেখুন।</div>'
      : '<div class="cuV">শক্ত প্রমাণ পাওয়া যায়নি — নামের ইতিহাসে এই ডিভাইস আইডি-তে একটাই নাম। অন্য কোনো আইডির সাথে "একই ব্যক্তি" বলার মতো প্রমাণ নেই।</div>';
    out += '<div class="cuSum"><span class="tag">🪪 ১ ডিভাইস আইডি</span><span class="tag">📝 ' + bd(N || 1) + ' টি নাম</span><span class="tag">💬 মোট বার্তা ' + bd(tot) + '</span><span class="tag">প্রথম দেখা ' + (dt(x.first) || "—") + '</span><span class="tag">শেষ সক্রিয় ' + (lastMs(x) ? dt(lastMs(x)) : "—") + "</span></div>";
    // আইডি / ডিভাইস
    var ds = Object.keys(days), c = cc(x);
    out += '<h4 class="cuH">🪪 আইডি / ডিভাইস</h4><div class="it"><div><span class="udot' + (x.online ? " on" : "") + '"></span><b>' + esc(nm(x)) + '</b> <span class="tag">' + esc(x.uid || "—") + "</span>" + (x.mst && x.mst !== "ok" ? ' <span class="tag" style="background:#fecaca;color:#7f1d1d">' + stlab(x) + "</span>" : "") + "</div>" +
      '<div class="sm">ডিভাইস আইডি (voter): ' + esc(x.voter || "—") + "</div>" +
      '<div class="sm">' + (x.online ? "🟢 অনলাইন" : "Last Active: " + (FM().ago ? FM().ago(lastMs(x)) : dt(lastMs(x)) || "জানা নেই")) + " · ভিজিট " + bd(x.visits || 0) + " · 💬 " + (x.msgs != null ? bd(x.msgs) : "—") + " · ⚠️ " + (x.warns != null ? bd(x.warns) : "—") + "</div>" +
      '<div class="sm">আইপি ' + esc(x.ip || "—") + " · " + c.flag + " " + esc(x.city || c.name || "—") + " · " + esc(x.cdept || x.gdept || "—") + " · " + esc(x.csess || x.gbatch || "—") + "</div>" +
      '<div class="sm">📅 যে তারিখগুলোয় এসেছে: ' + (ds.length ? ds.map(function (d) { return esc(d) + (days[d] > 1 ? " (" + bd(days[d]) + ")" : ""); }).join(", ") : "রেকর্ড নেই") + "</div></div>";
    // নামের সময়রেখা
    var T = [];
    if (hist.length && hist[0].o) T.push({ n: hist[0].o, from: null, to: hist[0].t });
    hist.forEach(function (e, i) { T.push({ n: e.n, from: e.t, to: hist[i + 1] ? hist[i + 1].t : null }); });
    if (!hist.length && (S || []).length > 1) (S || []).filter(function (z) { return z.n && (z.m || 0) > 0; }).sort(function (a, b) { return (a.f || 0) - (b.f || 0); }).forEach(function (z) { T.push({ n: z.n, from: z.f, to: z.l, msgonly: 1 }); });
    else if (!hist.length) [x.nick, x.gname].forEach(function (n, i) { if (n && !(i && n === x.nick)) T.push({ n: n, from: null, to: null, nohist: 1 }); });
    var NPER = 5, NP = Math.max(1, Math.ceil(T.length / NPER)); pg = Math.min(Math.max(pg || 0, 0), NP - 1);
    var pgr = "";
    if (T.length > NPER) {
      var pb = function (i, t, dis, cur) { return '<button type="button" class="l s' + (cur ? ' on' : '') + '" data-cunp="' + i + '"' + (dis ? " disabled" : "") + (cur ? ' style="font-weight:800;text-decoration:underline"' : "") + ">" + t + "</button> "; }, nums = "", last = -1;
      for (var q = 0; q < NP; q++) { if (q === 0 || q === NP - 1 || Math.abs(q - pg) <= 1) { if (last >= 0 && q - last > 1) nums += "… "; nums += pb(q, bd(q + 1), false, q === pg); last = q; } }
      pgr = '<div class="sm" style="margin:6px 0">মোট ' + bd(T.length) + " টি নামের মধ্যে " + bd(pg * NPER + 1) + "–" + bd(Math.min(T.length, pg * NPER + NPER)) + '</div><div class="act" style="flex-wrap:wrap">' + pb(pg - 1, "‹ আগের", pg === 0) + nums + pb(pg + 1, "পরের ›", pg === NP - 1) + "</div>";
    }
    out += '<h4 class="cuH" id="cuNm">📝 ব্যবহৃত নাম (সময় ধরে)</h4>' + (T.slice(pg * NPER, pg * NPER + NPER).map(function (p) {
      var z = sm[String(p.n).toLowerCase()];
      return '<div class="cuTl"><div><b>' + esc(p.n) + "</b></div>" + (p.msgonly ? '<div class="sm">🕒 বার্তার সময় থেকে: ' + dt(p.from) + " → " + dt(p.to) + '</div>' : p.nohist ? '<div class="sm">নাম-বদলের রেকর্ড নেই (এই নামে ঢুকেছে/বার্তা দিয়েছে)</div>' : '<div class="sm">🕒 ' + (p.from ? dt(p.from) : "আগে থেকে (শুরুর সময় অজানা)") + " → " + (p.to ? dt(p.to) : "এখন/শেষ রেকর্ড") + "</div>") +
        (z ? '<div class="sm">💬 এই নামে বার্তা ' + bd(z.m) + (z.f ? " · প্রথম " + dt(z.f) + " · শেষ " + dt(z.l) : "") + " · ⛔ রেস্ট্রিকশন " + bd(z.r) + "</div>" : "") + "</div>";
    }).join("") || '<p class="sm">কোনো নাম পাওয়া যায়নি।</p>') + pgr;
    // 🟡 সম্ভাব্য — মাঝারি প্রমাণ (চ্যাট-বার্তার আইপি + সেশন + সময়)। একই ব্যক্তি বলা হয় না, merge হয় না।
    var md = mdScore(x, MR).filter(function (z) { return z.pts >= 2; }).slice(0, 10);
    out += '<h4 class="cuH">🟡 <span class="tag" style="background:#fde68a;color:#7a4b00;font-weight:700">সম্ভাব্য — মাঝারি প্রমাণ</span></h4><p class="sm">এরা আলাদা ডিভাইস আইডি, কিন্তু একই আইপি ও একই সেশনে লিখেছে এবং সময়ের ধরন মিলছে। নিশ্চিত নয় — এক স্কুল/ওয়াইফাইয়ে দুজন হলেও এমন হয়। এক করা হয়নি, ব্যাজ/ফিল্টারেও গোনা হয় না।</p>' +
      (md.length ? md.map(function (z) { return '<div class="cuW" style="border-left-color:#d97706"><div><b>' + esc(z.nick) + '</b> <span class="tag" style="background:#fde68a;color:#7a4b00">সম্ভাব্য · ' + z.lvl + ' প্রমাণ</span></div><div class="sm">' + esc(z.why) + '</div><div class="sm">বার্তা ' + bd(z.n) + ' (এই আইপি থেকে) · ডিভাইস আইডি: ' + esc(z.voter) + '</div></div>'; }).join("") : '<p class="sm">' + (MR ? "মাঝারি প্রমাণের মতো কেউ পাওয়া যায়নি।" : "বার্তার ডেটা লোড হয়নি বা আইপি নেই।") + "</p>");
    // সম্ভাব্য (দুর্বল) — একই ব্যক্তি বলা হয় না, এক করা হয় না
    var cd = weakCands(x, poolAll()), SHOW = 15;
    out += '<h4 class="cuH">❓ <span class="tag cuWk">সম্ভাব্য, প্রমাণ দুর্বল</span></h4><p class="sm">নিচের আইডিগুলো আলাদা ডিভাইস আইডি। শুধু নাম/আইপি/ফোন/মডেল মেলায় এদের "একই ব্যক্তি" বলা যাচ্ছে না, এক করাও হয়নি।</p>' +
      (cd.length ? cd.slice(0, SHOW).map(function (c) {
        return '<div class="cuW"><div><b>' + esc(nm(c.x)) + '</b> <span class="tag cuWk">সম্ভাব্য, প্রমাণ দুর্বল</span> <span class="tag">' + esc(c.x.uid || "—") + '</span></div><div class="sm">' + esc(c.why) + '</div><div class="sm">ডিভাইস আইডি (voter): ' + esc(c.x.voter || "—") + '</div><div class="act"><button class="l s" type="button" data-cuinfo="' + esc(c.x.voter) + '">ℹ️ ইনফো</button></div></div>';
      }).join("") + (cd.length > SHOW ? '<p class="sm">আরও ' + bd(cd.length - SHOW) + " জন আছে (সব দেখানো হয়নি)।</p>" : "") : '<p class="sm">অন্য কোনো আইডির সাথে মিল পাওয়া যায়নি।</p>');
    return out + '<p class="sm">মিলানোর নিয়ম: শুধু শক্ত প্রমাণ = একই ডিভাইস আইডি নামের ইতিহাসে একাধিক নামে। নাম, আইপি, আইপি-শহর, ফোন নম্বর বা ফোন মডেল মিললে সেটা দুর্বল সংকেত — "একই ব্যক্তি" বলা হয় না, কোনো রেকর্ড একত্র (merge) করা হয় না। তারিখ আসে ভিজিট-লগ থেকে (সর্বশেষ ১০০০টা)। নামের ইতিহাস রাখা শুরুর আগের বদল ধরা নেই; ইতিহাস ও সংখ্যা SQL-10 চালানো থাকলে আসে।</p>';
  }

  // ---------- পেইজ আঁকা ----------
  function opt(cur, list) { return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(cur) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join(""); }
  function uniq(fn) { var s = {}, a = []; (D || []).forEach(function (x) { var v = fn(x); if (v && !s[v]) { s[v] = 1; a.push(v); } }); return a.sort(function (p, q) { return String(p).localeCompare(String(q), "bn"); }); }
  function sel(id, label, cur, list) { return "<label>" + label + '<select id="' + id + '">' + opt(cur, list) + "</select></label>"; }

  function shell() {
    var depts = uniq(function (x) { return x.cdept || x.gdept; }), sess = uniq(function (x) { return x.csess || x.gbatch; }), ctr = uniq(function (x) { return String(x.country || "").toUpperCase().replace(/^(XX|T1)$/, ""); });
    var apps = uniq(function (x) { return x.src && x.src.app; }), V = M().$("#view");
    var ipU = {}; (D || []).forEach(function (x) { if (!x.ip) return; (ipU[x.ip] = ipU[x.ip] || {})[x.voter || x.uid || nm(x)] = 1; });
    var ipL = Object.keys(ipU).map(function (k) { return [k, Object.keys(ipU[k]).length]; }).filter(function (a) { return a[1] > 1; }).sort(function (a, b) { return b[1] - a[1]; });
    V.innerHTML = '<h2>💬 চ্যাট ইউজার <small id="cuN"></small></h2><div class="row"><label>খুঁজুন (নাম, আইডি, বিভাগ, আইপি, শহর, ফোন, ডিভাইস, অ্যাপ, লিংক)<input id="cuQ" value="' + esc(ST.q) + '" placeholder="যা খুশি লিখুন…"></label><button class="l" id="cuR" type="button">✖ ফিল্টার মুছুন</button><button class="l" id="cuRf" type="button">🔄 রিফ্রেশ</button></div>' +
      '<details open><summary class="sm"><b>🔧 ফিল্টার</b></summary><div class="row">' +
      sel("cuSt", "স্ট্যাটাস", ST.st, [["", "সব"], ["on", "🟢 অনলাইন"], ["off", "⚪ অফলাইন"]]) +
      sel("cuG", "জেন্ডার", ST.g, [["", "সব"], ["m", "👦 ছেলে"], ["f", "👧 মেয়ে"], ["x", "⚪ অজানা"]]) +
      sel("cuD", "বিভাগ", ST.d, [["", "সব বিভাগ"]].concat(depts.map(function (v) { return [v, v]; }))) +
      sel("cuSs", "সেশন", ST.s, [["", "সব সেশন"]].concat(sess.map(function (v) { return [v, v]; }))) +
      sel("cuC", "দেশ", ST.c, [["", "সব দেশ"]].concat(ctr.map(function (v) { var c = FM().country ? FM().country(v) : { flag: "", name: v }; return [v, c.flag + " " + c.name]; }))) +
      sel("cuDv", "ডিভাইসের ধরন", ST.dv, [["", "সব"], ["mob", "📱 মোবাইল"], ["tab", "ট্যাবলেট"], ["pc", "💻 কম্পিউটার"]]) +
      sel("cuOs", "অপারেটিং সিস্টেম", ST.os, [["", "সব"], ["and", "Android"], ["ios", "iOS"], ["win", "Windows"], ["mac", "Mac"], ["lin", "Linux"]]) +
      sel("cuBr", "ব্রাউজার", ST.br, [["", "সব"], ["chr", "Chrome"], ["sam", "Samsung Internet"], ["fb", "Facebook অ্যাপ"], ["msg", "Messenger"], ["ig", "Instagram"], ["ff", "Firefox"], ["edg", "Edge"], ["opr", "Opera"], ["saf", "Safari"], ["oth", "অন্যান্য"], ["none", "❔ তথ্য নেই"]]) +
      sel("cuPh", "ফোন নম্বর", ST.ph, [["", "সব"], ["yes", "📞 আছে"], ["no", "নেই"]]) +
      sel("cuAc", "শেষ সক্রিয়", ST.ac, [["", "যেকোনো সময়"], ["today", "আজ"], ["7", "গত ৭ দিন"], ["30", "গত ৩০ দিন"], ["old", "৩০ দিনের বেশি আগে"]]) +
      sel("cuDp", "একই নাম", ST.dup, [["", "সব"], ["1", "⚠ একই নামে একাধিক"]]) +
      sel("cuMn", "নামের ব্যবহার", ST.mn, [["", "সব"], ["1", "🎭 একাধিক নাম ব্যবহারকারী"]]) +
      sel("cuAp", "কোন অ্যাপ থেকে ঢুকেছে", ST.ap, [["", "সব"]].concat(apps.map(function (v) { return [v, (APPI[v] || "🌐") + " " + v]; })).concat([["none", "রেকর্ড নেই"]])) +
      sel("cuMod", "মডারেশন", ST.mod, [["", "সব"], ["ok", "✅ ঠিক আছে"], ["blocked", "⛔ ব্যান / Restriction"], ["warn", "⚠️ সতর্কতা পেয়েছে"], ["rep", "🚩 বৈধ রিপোর্ট আছে"]]) +
      sel("cuIp", "একই আইপি-তে একাধিক ইউজার (ড্রপডাউন)", ST.ip, [["", "সব"]].concat(ipL.map(function (a) { return [a[0], a[0] + " — " + bd(a[1]) + " জন"]; }))) +
      '<label>আইপি টাইপ করে খুঁজুন<input id="cuIpq" value="' + esc(ST.ipq) + '" placeholder="যেমন 103.12.5 বা পুরো আইপি" inputmode="text" autocomplete="off"></label>' +
      '<label>নামের অংশ (একাধিক হলে কমা/স্পেস — যেকোনো একটা মিললেই)<input id="cuNq" value="' + esc(ST.nq) + '" placeholder="যেমন: রহিম, করিম, সুমন" autocomplete="off"></label>' +
      sel("cuMs", "বার্তা", ST.ms, [["", "সব"], ["yes", "বার্তা পাঠিয়েছে"], ["no", "এখনো পাঠায়নি"]]) +
      sel("cuSo", "সাজানো", ST.so, [["new", "অনলাইন ও নতুন আগে"], ["old", "পুরোনো আগে"], ["name", "নাম অনুযায়ী"], ["msgs", "বেশি বার্তা আগে"], ["visits", "বেশি ভিজিট আগে"]]) +
      '</div></details><p class="sm">👇 নিচের যেকোনো চিপে ক্লিক করলে সেই ধরনের ইউজার ফিল্টার হয়ে দেখাবে; আবার ক্লিক করলে ফিল্টার বন্ধ।</p><div class="cuSum" id="cuSum"></div><p class="sm" id="cuProg"></p>' + (window.MCPG ? window.MCPG.box("", "cuL") : '<div id="cuL"></div>') + '<div id="cuPg"></div>' +
      '<div class="row" style="margin-top:12px;border-top:1px solid var(--bd);padding-top:10px"><label>🔎 ম্যানুয়াল সার্চ — বাটন চাপলে বা Enter দিলে তবেই ফিল্টার বদলায়<input id="cuQ2" value="' + esc(ST.q) + '" placeholder="নাম, আইডি, আইপি, শহর…"></label><button id="cuQ2b" type="button">🔍 খুঁজুন</button></div>';
    var up = function () { ST.pg = 0; paint(); };
    var bind = function (id, k) { var e = document.getElementById(id); if (e) e.onchange = function () { ST[k] = e.value; up(); }; };
    bind("cuSt", "st"); bind("cuG", "g"); bind("cuD", "d"); bind("cuSs", "s"); bind("cuC", "c"); bind("cuDv", "dv"); bind("cuOs", "os"); bind("cuBr", "br"); bind("cuPh", "ph"); bind("cuAc", "ac"); bind("cuDp", "dup"); bind("cuMn", "mn"); bind("cuAp", "ap"); bind("cuMod", "mod"); bind("cuMs", "ms"); bind("cuSo", "so"); bind("cuIp", "ip");
    var ipq = document.getElementById("cuIpq"), nq = document.getElementById("cuNq");
    if (ipq) ipq.oninput = function () { ST.ipq = ipq.value.trim(); up(); };
    if (nq) nq.oninput = function () { ST.nq = nq.value.trim(); up(); };
    var q = document.getElementById("cuQ"), q2 = document.getElementById("cuQ2"); q.oninput = function () { ST.q = q.value.trim(); q2.value = q.value; up(); };
    var go2 = function () { ST.q = q2.value.trim(); q.value = q2.value.trim(); up(); };
    document.getElementById("cuQ2b").onclick = go2; q2.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); go2(); } };
    var SELID = { st: "cuSt", g: "cuG", dv: "cuDv", os: "cuOs", br: "cuBr", ph: "cuPh", ac: "cuAc", dup: "cuDp", mn: "cuMn", mod: "cuMod", ms: "cuMs", so: "cuSo" };
    document.getElementById("cuSum").onclick = function (e) {
      var b = e.target.closest("[data-cuchip]"); if (!b) return;
      if (b.dataset.cuchip === "all") { ST = { q: "", st: "", g: "", d: "", s: "", c: "", dv: "", os: "", br: "", ph: "", ac: "", dup: "", mn: "", ap: "", mod: "", ms: "", ip: "", ipq: "", nq: "", so: "new", pg: 0 }; shell(); paint(); return; }
      var fl = b.dataset.f, v = b.dataset.v;
      ST[fl] = ST[fl] === v ? (fl === "so" ? "new" : "") : v;
      var el = document.getElementById(SELID[fl]); if (el) el.value = ST[fl];
      ST.pg = 0; paint();
    };
    document.getElementById("cuL").onclick = function (e) { var b = e.target.closest("[data-cuinfo],[data-cumn],[data-cudup]"); if (b) act(b); };
    document.getElementById("cuR").onclick = function () { ST = { q: "", st: "", g: "", d: "", s: "", c: "", dv: "", os: "", br: "", ph: "", ac: "", dup: "", mn: "", ap: "", mod: "", ms: "", ip: "", ipq: "", nq: "", so: "new", pg: 0 }; shell(); paint(); };
    document.getElementById("cuRf").onclick = function () { D = null; cuView().catch(M().fail); };
    document.getElementById("cuPg").onclick = function (e) { var b = e.target.closest("[data-cup]"); if (b && !b.disabled) { ST.pg = +b.dataset.cup; paint(); } };
  }
  if (window.MCPG) window.MCPG.onPer(function () { ST.pg = 0; });
  function paint() {
    var L = document.getElementById("cuL"); if (!L || !D) return;
    if (window.MCPG) PER = window.MCPG.per();
    var dm = dupMap(), all = D, list = sorted(all.filter(function (x) { return pass(x, dm); })), total = list.length, pages = Math.max(1, Math.ceil(total / PER));
    if (ST.pg >= pages) ST.pg = pages - 1; if (ST.pg < 0) ST.pg = 0;
    var on = all.filter(function (x) { return x.online; }).length, t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var today = all.filter(function (x) { return lastMs(x) >= t0.getTime(); }).length, ph = all.filter(function (x) { return x.phone; }).length;
    document.getElementById("cuN").textContent = "— দেখাচ্ছে " + bd(total) + " / মোট " + bd(all.length) + " জন";
    var cnt = function (fn) { return all.filter(fn).length; }, uaK = all.filter(function (x) { return x.ua; }), nMsg = uaK.filter(function (x) { return brOf(x.ua) === "msg"; }).length, nFb = uaK.filter(function (x) { return brOf(x.ua) === "fb"; }).length;
    var chips = [
      ["all", "👥 মোট", "", "", all.length],
      ["on", "🟢 অনলাইন", "st", "on", on],
      ["off", "⚪ অফলাইন", "st", "off", all.length - on],
      ["today", "আজ সক্রিয়", "ac", "today", today],
      ["w7", "গত ৭ দিনে সক্রিয়", "ac", "7", cnt(function (x) { var l = lastMs(x); return l && Date.now() - l <= 7 * 86400000; })],
      ["ph", "📞 নম্বর আছে", "ph", "yes", ph],
      ["msum", "💬 মোট বার্তা (বেশি আগে)", "so", "msgs", all.reduce(function (a, x) { return a + (x.msgs || 0); }, 0)],
      ["msy", "✉️ বার্তা পাঠিয়েছে", "ms", "yes", cnt(function (x) { return x.msgs > 0; })],
      ["msn", "🤐 বার্তা পাঠায়নি", "ms", "no", cnt(function (x) { return !(x.msgs > 0); })],
      ["blk", "⛔ ব্যান/Restriction", "mod", "blocked", cnt(function (x) { return x.mst && x.mst !== "ok"; })],
      ["wrn", "⚠️ সতর্কতা পেয়েছে", "mod", "warn", cnt(function (x) { return x.warns > 0; })],
      ["rep", "🚩 বৈধ রিপোর্ট", "mod", "rep", cnt(function (x) { return x.valid_cnt > 0; })],
      ["dup", "⚠ একই নামে একাধিক", "dup", "1", cnt(function (x) { return dm[String(nm(x)).toLowerCase()] > 1; })],
      ["mn", "🎭 একাধিক নাম ব্যবহারকারী", "mn", "1", cnt(multi)],
      ["gm", "👦 ছেলে", "g", "m", cnt(function (x) { return x.gender === "m"; })],
      ["gf", "👧 মেয়ে", "g", "f", cnt(function (x) { return x.gender === "f"; })],
      ["gx", "⚪ জেন্ডার অজানা", "g", "x", cnt(function (x) { return !x.gender || x.gender === "x"; })],
      ["mob", "📱 মোবাইল", "dv", "mob", cnt(function (x) { return devType(x.ua) === "mob"; })],
      ["pc", "💻 কম্পিউটার", "dv", "pc", cnt(function (x) { return devType(x.ua) === "pc"; })],
      ["and", "Android", "os", "and", cnt(function (x) { return osOf(x.ua) === "and"; })],
      ["ios", "iOS", "os", "ios", cnt(function (x) { return osOf(x.ua) === "ios"; })],
      ["msg", "💬 Messenger", "br", "msg", nMsg, uaK.length ? " (" + bd(Math.round(nMsg * 100 / uaK.length)) + "%)" : "", " msgc"],
      ["fb", "Facebook অ্যাপ", "br", "fb", nFb],
      ["chr", "Chrome", "br", "chr", cnt(function (x) { return brOf(x.ua) === "chr"; })],
      ["sam", "Samsung Internet", "br", "sam", cnt(function (x) { return brOf(x.ua) === "sam"; })],
      ["nob", "❔ ব্রাউজার তথ্য নেই", "br", "none", all.length - uaK.length]
    ];
    document.getElementById("cuSum").innerHTML = chips.map(function (c) {
      var on1 = c[2] && ST[c[2]] === c[3];
      return '<button type="button" class="tag' + (c[6] || "") + (on1 ? " on" : "") + '" data-cuchip="' + c[0] + '" data-f="' + c[2] + '" data-v="' + c[3] + '"' + (c[0] === "nob" ? ' title="চ্যাটে ঢুকেছে কিন্তু ব্রাউজারের তথ্য (UA) লগ হয়নি — এদের Messenger কিনা জানা যায় না"' : "") + ">" + c[1] + " " + bd(c[4]) + (c[5] || "") + "</button>";
    }).join("");
    L.innerHTML = list.slice(ST.pg * PER, ST.pg * PER + PER).map(function (x) { return item(x, dm); }).join("") || '<p class="sm">কোনো ইউজার পাওয়া যায়নি। (এই তালিকায় শুধু তারাই, যারা চ্যাটে ঢুকেছে।)</p>';
    document.getElementById("cuPg").innerHTML = window.MCPG ? window.MCPG.html(ST.pg, total, PER, "data-cup") : "";
    prog("");
  }
  function cuView() {
    EXT = []; shell();
    if (D && Date.now() - T < 60000) { paint(); return Promise.resolve(); }
    return load().then(function () { shell(); paint(); });
  }


  // ---------- User Info ট্যাবের জন্য: একই মডাল ডাকা (window.MCA_NAMEPOP) ----------
  // ওখানকার তালিকা চ্যাট-ইউজার তালিকার মতো আগে থেকে লোড করা নয়, তাই নাম/আইপি ধরে সার্ভার থেকে শুধু দরকারি সারিগুলো আনে।
  function extRows(q) {
    var R = M().rpc, a = { p_q: q, p_status: "all", p_gender: "", p_dept: "", p_sess: "", p_country: "", p_dev: "", p_os: "", p_br: "", p_phone: "", p_score: "", p_active: "", p_sort: "new", p_from: "", p_to: "", p_limit: 50, p_offset: 0 };
    return R("mc2_admin_users2", a).catch(function () { return R("mc2_admin_users", { p_q: q, p_online: false, p_limit: 50, p_offset: 0 }); }).then(function (d) { return (d && d.rows) || []; }).catch(function () { return []; });
  }
  function decorate(list) {
    return Promise.all([M().rpc("mc2_ac_admin_active", { p_hours: 87600, p_dept: null }).catch(function () { return []; }), loadNC()]).then(function (ex) {
      var am = {}; (ex[0] || []).forEach(function (a) { am[a.voter] = a; });
      list.forEach(function (x) {
        var a = am[x.voter]; if (a) { x.hasAct = true; x.msgs = a.msgs || 0; x.warns = a.warns || 0; x.mst = a.st || "ok"; x.until = a.until; x.reason = a.reason; x.valid_cnt = a.valid_cnt || 0; x.verified = a.verified; if (a.onl) x.online = true; }
        x.nc = Math.max((ex[1] || {})[x.uid] || 0, MVM[x.voter] || 0);
      });
      linkPeople(list); EXT = poolMerge(EXT, list); reg(list); return list;
    });
  }
  function poolMerge(A, B) { var s = {}, o = []; (A || []).concat(B || []).forEach(function (x) { if (x && x.voter && !s[x.voter]) { s[x.voter] = 1; o.push(x); } }); return o; }
  window.MCA_NAMEPOP = {
    // ⚠ একই নামে N জন (name = নামের মান)
    dup: function (name) {
      var key = String(name || "").toLowerCase();
      return extRows(String(name || "")).then(decorate).then(function (L) { dupOpen(key, L); });
    },
    // 🎭 একই ব্যক্তি? (ইউজার আইডি দিয়ে — নামের ইতিহাস ট্যাব থেকে)
    mnUid: function (uid) {
      return extRows(String(uid || "")).then(function (L) { var r = (L || []).filter(function (x) { return x.uid === uid; })[0]; if (!r) throw new Error("এই ইউজার আইডির তথ্য পাওয়া যায়নি"); return window.MCA_NAMEPOP.mn(r.voter); });
    },
    // 🎭 একই ব্যক্তি? (voter = ডিভাইস আইডি)
    mn: function (voter) {
      return M().rpc("mc2_admin_user", { p_voter: voter }).then(function (u) {
        if (!u) return; u.voter = u.voter || voter; u.uid = u.uid || "";
        var qs = [nm(u)]; if (u.ip) qs.push(u.ip);
        return Promise.all(qs.map(extRows)).then(function (r) { return decorate(poolMerge([u], [].concat.apply([], r))); }).then(function () { mnOpen(REG[voter] || u); });
      });
    }
  };

  window.MCA_TABS = (window.MCA_TABS || []).concat([["cu", "💬 চ্যাট ইউজার"]]);
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { cu: cuView });
  window.MCA_CU_TEST = { pass: pass, sorted: sorted, set: function (o) { Object.assign(ST, o); }, data: function (a) { D = a; T = Date.now(); }, get: function () { return D; }, link: linkPeople, paint: paint };
})();
