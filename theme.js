// Friend Adda — থিম সিস্টেম (চ্যাট ও হোম আলাদা)। SQL: sql/SQL-25-CHAT-THEME.sql (একবার)। না চালালে সাইট আজকের চেহারায় চলে।
// ডিফল্ট ক্লাসিক = আজকের চেহারা (কিছু বসানো হয় না)। চ্যাট: #acx-এ রং; হোম: :root ভ্যারিয়েবল। ভাগ ২: কাস্টম থিম (opts.custom) ও র‍্যান্ডম ঘোরা (opts.rnd) — সব সেটিং একই mc2_theme_cfg.opts-এ সেভ হয় (নতুন SQL লাগে না)।
(function () {
  if (window.FATheme) return;
  var C = window.MC_CFG || {}, base = String(C.url || "").replace(/\/$/, "");
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function jp(s, d) { try { var x = JSON.parse(s); return x == null ? d : x; } catch (e) { return d; } }
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var T = [
    { id: "classic", n: "ক্লাসিক নীল", a: "#0a66ff", b: "#0a5cff", cl: 1, ha: "#1d6b43", hb: "#2f9e68" },
    { id: "love", n: "ভালোবাসা", a: "#d6336c", b: "#ff6b9d" },
    { id: "forest", n: "অরণ্য সবুজ", a: "#1d6b43", b: "#2f9e68" },
    { id: "sunset", n: "সূর্যাস্ত", a: "#e8590c", b: "#fd7e14" },
    { id: "ocean", n: "মহাসাগর", a: "#0b7285", b: "#1c9ec4" },
    { id: "violet", n: "বেগুনি স্বপ্ন", a: "#7048e8", b: "#9775fa" },
    { id: "choco", n: "চকলেট", a: "#6f4e37", b: "#9c6b4a" },
    { id: "gold", n: "সোনালি ঈদ", a: "#a8740a", b: "#d19a1c" },
    { id: "pink", n: "গোলাপি", a: "#e64980", b: "#f783ac" },
    { id: "mint", n: "মিন্ট", a: "#0f9d7a", b: "#38c9a4" },
    { id: "midnight", n: "মধ্যরাত", a: "#4c6ef5", b: "#7048e8", dk: 1, bg: "#0b1020" },
    { id: "graphite", n: "গ্রাফাইট", a: "#5c6670", b: "#7b858f", dk: 1, bg: "#18191b" }
  ];
  var DR = null; // অ্যাডমিনের আঁকা-থিমের খসড়া (সেভের আগের প্রিভিউ)
  function hx(v) { return /^#[0-9a-fA-F]{6}$/.test(String(v)) ? String(v) : null; }
  function lumOf(h) { var p = rgb(h); return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255; }
  function ink(a, b) { return lumOf(mix(a, b, .5)) > .62 ? "#10261b" : "#fff"; } // কাস্টম থিমে হালকা রঙের ওপর কালো লেখা
  function cuNorm(x) {
    if (!x || typeof x !== "object") return null; var a = hx(x.a), b = hx(x.b), g = hx(x.bg);
    if (!a || !b || !g || !/^c[a-z0-9]{2,12}$/.test(String(x.id))) return null;
    return { id: x.id, n: String(x.n || "আমার থিম").slice(0, 20), a: a, b: b, bg: g, cu: 1, dk: lumOf(g) < .5 ? 1 : 0 };
  }
  function customs() { var l = S.srv && S.srv.opts && S.srv.opts.custom, o = []; if (!Array.isArray(l)) return o; for (var i = 0; i < l.length && o.length < 24; i++) { var n = cuNorm(l[i]); if (n) o.push(n); } return o; }
  function all() { return T.concat(customs()); }
  function has(id) { var A = all(); for (var i = 0; i < A.length; i++) if (A[i].id === id) return true; return false; }
  function find(id) { if (DR && id === DR.id) return DR; var A = all(); for (var i = 0; i < A.length; i++) if (A[i].id === id) return A[i]; return T[0]; }
  function rgb(h) { h = String(h).replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16) || 0; }); }
  function mix(x, y, t) { var p = rgb(x), q = rgb(y); return "#" + [0, 1, 2].map(function (i) { return ("0" + Math.round(p[i] * (1 - t) + q[i] * t).toString(16)).slice(-2); }).join(""); }
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : { matches: false };
  function isDk(mode) { return mode === "dark" || (mode !== "light" && mq.matches); }

  var S = { srv: jp(ls("mc2_th_c"), {}), pv: null, arpc: null, adm: false };
  S.srv = { chat: S.srv.chat || {}, home: S.srv.home || {}, opts: S.srv.opts || {} };
  function O() { var o = S.srv.opts; return { on: o.on !== false, userPick: o.userPick !== false, homeBtn: o.homeBtn !== false, cm: o.cm || "auto", hm: o.hm || "dark", rnd: o.rnd || {} }; }

  // ---------- রঙ হিসাব ----------
  function adj(c) { return !!(c.a || c.b || c.grad === false || c.rad); }
  function cpal(c, mode, force) { // চ্যাট
    var t = find(c.id), cu = !!t.cu, dk = cu ? !!t.dk : (t.dk || isDk(mode));
    if (!force && t.cl && !adj(c) && mode === "auto") return null;
    var a = c.a || t.a, b = c.b || t.b, g = c.grad !== false;
    return { a: a, b: b, dk: dk, rad: c.rad || 0, hdr: !(t.cl && !c.a && !c.b), cu: cu, ink: cu ? ink(a, b) : "#fff",
      bg: cu ? t.bg : t.dk ? t.bg : dk ? (t.cl ? "#0f1a14" : mix(a, "#000", .9)) : (t.cl ? "#fff" : mix(a, "#fff", .95)),
      ot: cu ? mix(t.bg, a, dk ? .22 : .14) : dk ? (t.cl ? "#26332b" : mix(a, "#141414", .75)) : (t.cl ? "#e9ecef" : mix(a, "#fff", .87)),
      fg: dk ? "#e8f1ea" : "#10261b", me: g ? "linear-gradient(135deg," + a + "," + b + ")" : a };
  }
  function chatCss(p, S_) {
    var m = "background:" + p.me + "!important;color:" + p.ink + "!important";
    return S_ + "{--bg:" + p.bg + "!important;--fg:" + p.fg + "!important;color-scheme:" + (p.dk ? "dark" : "light") + "}" +
      (p.hdr ? S_ + " .ah{background:linear-gradient(135deg," + p.a + "," + p.b + ")!important;color:" + p.ink + "!important;border-bottom:0!important}" + S_ + " .ah b," + S_ + " .ah small," + S_ + " .ah .ab{color:" + p.ink + "!important}" : "") +
      S_ + " .bb{background:" + p.ot + "!important;color:" + p.fg + "!important" + (p.rad ? ";border-radius:" + p.rad + "px!important" : "") + "}" +
      S_ + " .mine .bb:not(.e1):not(.e2):not(.dl){" + m + "}" +
      S_ + " .bb.e1," + S_ + " .mine .bb.e1," + S_ + " .bb.e2," + S_ + " .mine .bb.e2," + S_ + " .bb.dl," + S_ + " .mine .bb.dl{background:none!important;color:inherit!important}" +
      S_ + " #acSd{background:" + p.a + "!important" + (p.cu ? ";color:" + ink(p.a, p.a) + "!important" : "") + "}" + S_ + " .ac input#acI:focus," + S_ + " .ac textarea#acI:focus{border-color:" + p.a + "!important}";
  }
  function hpal(c, mode, force) { // হোম (ভ্যারিয়েবল)
    var t = find(c.id), cu = !!t.cu, dk = cu ? !!t.dk : (t.dk || isDk(mode));
    if (!force && t.cl && !adj(c) && mode === "dark") return null;
    var a = c.a || t.ha || t.a, b = c.b || t.hb || t.b;
    if (cu) return { "--bg": t.bg, "--fg": dk ? "#eaf3ed" : "#10261b", "--card": dk ? mix(t.bg, "#fff", .08) : mix(t.bg, "#fff", .6), "--mut": dk ? "#a9b4ae" : "#5a6b61", "--line": dk ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.14)", "--g1": a, "--g2": b, "color-scheme": dk ? "dark" : "light" };
    return dk ? { "--bg": mix(a, "#000", .9), "--fg": "#eaf3ed", "--card": mix(a, "#000", .8), "--mut": "#a9b4ae", "--line": "rgba(255,255,255,.16)", "--g1": mix(a, "#000", .6), "--g2": a, "color-scheme": "dark" }
      : { "--bg": mix(a, "#fff", .94), "--fg": "#10261b", "--card": "#fff", "--mut": "#5a6b61", "--line": "rgba(0,0,0,.14)", "--g1": a, "--g2": b, "color-scheme": "light" };
  }
  function sty(id, css) { var e = document.getElementById(id); if (!e) { e = document.createElement("style"); e.id = id; document.head.appendChild(e); } if (e.textContent !== css) e.textContent = css; }
  function userPref() { var o = O(), u = o.userPick ? jp(ls("mc2_th_u"), null) : null; return u && u.id && has(u.id) ? u : null; }
  // ---------- র‍্যান্ডম ঘোরা (চ্যাট ও হোম আলাদা; প্রতি ডিভাইসে নিজে নিজে, এলোমেলো ক্রমে, একই থিম পরপর নয়) ----------
  var R = jp(ls("mc2_th_r"), {}), BAG = { chat: [], home: [] };
  R = { chat: R.chat || {}, home: R.home || {} };
  function secOf(s) { s = Math.floor(+s); return s >= 3 ? Math.min(s, 86400) : 10; }
  function rcfg(k) { var r = O().rnd[k]; if (!r || r.on !== true || !Array.isArray(r.ids)) return null; var ids = r.ids.filter(has).filter(function (x, i, a) { return a.indexOf(x) === i; }); return ids.length >= 2 ? { ids: ids, sec: secOf(r.sec) } : null; }
  function shuf(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(bag, ids, cur) { // bag = এই চক্রে বাকি থিম; শেষ হলে নতুন করে এলোমেলো, আগেরটা বাদে
    bag = bag.filter(function (x) { return ids.indexOf(x) >= 0 && x !== cur; });
    if (!bag.length) bag = shuf(ids.filter(function (x) { return x !== cur; }));
    return { id: bag[0], bag: bag.slice(1) };
  }
  function rotStep(k) { // বদলালে true
    var r = rcfg(k), st = R[k], now = Date.now();
    if (!r) { if (st.id) { R[k] = {}; ls("mc2_th_r", JSON.stringify(R)); } return false; }
    var ok = st.id && r.ids.indexOf(st.id) >= 0 && st.t && now >= st.t && now - st.t < r.sec * 1000;
    if (ok) return false;
    var n = pick(BAG[k], r.ids, st.id); BAG[k] = n.bag; R[k] = { id: n.id, t: now }; ls("mc2_th_r", JSON.stringify(R)); return true;
  }
  function rotId(k) { var r = rcfg(k); return r && R[k].id && r.ids.indexOf(R[k].id) >= 0 ? R[k].id : null; }
  function apply() {
    if (window.FATH_NOAPPLY) return;
    var o = O(), cc = null, cm = o.cm, hc = null, hm = o.hm;
    if (o.on) {
      var up = userPref(); cc = S.srv.chat; if (up && up.id) cc = up; else { var rc = rotId("chat"); if (rc) cc = { id: rc }; } if (o.userPick && ls("mc2_th_um")) cm = ls("mc2_th_um");
      hc = S.srv.home; var rh = rotId("home"); if (rh) hc = { id: rh };
    }
    if (S.pv) { if (S.pv.k === "chat") { cc = S.pv.cfg; cm = S.pv.mode; } else { hc = S.pv.cfg; hm = S.pv.mode; } }
    var cp = cc && cpal(cc || {}, cm); sty("mc2-th-c", cp ? chatCss(cp, "#acx") : "");
    var hp = hc && hpal(hc || {}, hm), css = "";
    if (hp) { css = ":root{"; for (var k in hp) css += k + ":" + hp[k] + "!important;"; css += "}"; }
    sty("mc2-th-h", css);
  }
  mq.addEventListener && mq.addEventListener("change", apply);
  function load() {
    if (!base || S.pv) return;
    fetch(base + "/rest/v1/mc2_theme_cfg?id=eq.1&select=chat,home,opts", { headers: { apikey: C.key, Authorization: "Bearer " + C.key } })
      .then(function (r) { return r.ok ? r.json() : []; }).then(function (a) {
        if (a && a[0]) { S.srv = { chat: a[0].chat || {}, home: a[0].home || {}, opts: a[0].opts || {} }; ls("mc2_th_c", JSON.stringify(S.srv)); if (O().on) { rotStep("chat"); rotStep("home"); } apply(); }
      }).catch(function () {});
  }
  setInterval(function () { // প্রতি সেকেন্ডে দেখে: সময় হলে পরের থিম (ট্যাব লুকানো থাকলেও হিসাব সময় ধরে, ফিরলে একবারই বদলায়)
    if (!O().on) return; var a = rotStep("chat"), b = rotStep("home"); if (a || b) apply();
  }, 1000);
  function admTok() { var s = jp(ls("mc2_adm_x"), null); return s && s.access_token; }
  function rpc(n, a) {
    if (S.arpc) return S.arpc(n, a);
    var t = admTok(); if (!t) return Promise.reject(new Error("auth"));
    return fetch(base + "/rest/v1/rpc/" + n, { method: "POST", headers: { apikey: C.key, Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: JSON.stringify(a || {}) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text().then(function (x) { return x ? JSON.parse(x) : null; }); });
  }
  function save(o) { // o = {chat,home,opts} (যেটা বদলেছে শুধু সেটা দিলেও চলে)
    var n = { chat: o.chat || S.srv.chat, home: o.home || S.srv.home, opts: o.opts || S.srv.opts };
    return rpc("mc2_admin_set_theme", { p_chat: n.chat, p_home: n.home, p_opts: n.opts }).then(function () { S.srv = n; ls("mc2_th_c", JSON.stringify(n)); });
  }

  // ---------- প্রিভিউ বক্স ও টাইল ----------
  function mock(k, c, mode, big) {
    var h = big ? 120 : 52, o = '<div style="border-radius:10px;overflow:hidden;border:1px solid rgba(128,128,128,.35);height:' + h + 'px;position:relative;';
    if (k === "chat") {
      var p = cpal(c, mode, 1), hd = p.hdr ? "linear-gradient(135deg," + p.a + "," + p.b + ")" : "rgba(128,128,128,.25)", rd = (p.rad || 18) * (big ? .7 : .45);
      return o + 'background:' + p.bg + '"><div style="height:' + (big ? 24 : 12) + 'px;background:' + hd + '"></div><div style="margin:5px;width:55%;height:' + (big ? 22 : 11) + 'px;border-radius:' + rd + 'px;background:' + p.ot + '"></div><div style="margin:5px 5px 0 auto;width:50%;height:' + (big ? 22 : 11) + 'px;border-radius:' + rd + 'px;background:' + p.me + '"></div>' + (big ? '<div style="position:absolute;right:8px;bottom:6px;width:20px;height:20px;border-radius:50%;background:' + p.a + '"></div>' : "") + "</div>";
    }
    var v = hpal(c, mode, 1);
    return o + 'background:' + v["--bg"] + '"><div style="height:' + (big ? 44 : 22) + 'px;background:linear-gradient(160deg,' + v["--g1"] + "," + v["--g2"] + ');border-radius:0 0 10px 10px"></div><div style="margin:6px;height:' + (big ? 26 : 12) + 'px;border-radius:6px;background:' + v["--card"] + '"></div></div>';
  }

  // ---------- বডি (শিট ও অ্যাডমিন প্যানেল একই কোড) ----------
  // ctx: {k:'chat'|'home', admin:bool, page:bool (true হলে সাইটেই সঙ্গে সঙ্গে বদলায়), host}
  function body(ctx) {
    var k = ctx.k, host = ctx.host, ad = ctx.admin, o = O();
    if (S.rpt) { clearInterval(S.rpt); S.rpt = null; }
    var cur = ad ? (k === "chat" ? S.srv.chat : S.srv.home) : (userPref() || {});
    var r0 = o.rnd[k] || {};
    var P = { k: k, cfg: JSON.parse(JSON.stringify(cur || {})), mode: ad ? (k === "chat" ? o.cm : o.hm) : (ls("mc2_th_um") || "auto"), dirty: 0,
      open: {}, cu: { id: "", n: "", a: "#0a66ff", b: "#7048e8", bg: "#ffffff" }, m1: "", m2: "",
      rn: { on: r0.on === true, ids: Array.isArray(r0.ids) ? r0.ids.filter(has) : [], sec: r0.sec || 10, bag: [], cur: null }, rp: 0 };
    if (!P.cfg.id || !has(P.cfg.id)) P.cfg.id = "classic";
    var MSG = "👁 প্রিভিউ চলছে — এখনো কেউ দেখছে না, “সবার জন্য চালু” চাপলে চালু হবে।";
    function rpStop() { if (S.rpt) { clearInterval(S.rpt); S.rpt = null; } if (P.rp) { P.rp = 0; if (ctx.page && S.pv && S.pv.rot) { S.pv = null; apply(); } } }
    function changed() { rpStop(); P.dirty = 1; if (ctx.page) { S.pv = P; apply(); } paint(); }
    function draft() { var c = P.cu; DR = { id: "cdraft", n: c.n || "খসড়া", a: c.a, b: c.b, bg: c.bg, cu: 1, dk: lumOf(c.bg) < .5 ? 1 : 0 }; }
    function cuPv() { draft(); return '<div class="cpv"><div><small>💬 চ্যাট</small>' + mock("chat", { id: "cdraft" }, "auto", 1) + '</div><div><small>🏠 হোম</small>' + mock("home", { id: "cdraft" }, "auto", 1) + "</div></div>"; }
    function cuHint() { var c = P.cu, w = []; if (Math.abs(lumOf(c.a) - lumOf(c.bg)) < .12) w.push("⚠ মূল রং আর ব্যাকগ্রাউন্ড প্রায় একই — বাবল/বাটন আলাদা করে বোঝা যাবে না।"); if (lumOf(mix(c.a, c.b, .5)) > .62) w.push("ℹ রং হালকা — হেডার ও বাবলের লেখা নিজে থেকে কালো হবে।"); return w.join(" "); }
    function rnStat() { var s = rcfg(k); return s ? "🟢 চালু — " + s.ids.length + "টা থিম, " + s.sec + " সেকেন্ড পরপর" : "⚪ বন্ধ"; }
    function rnCount() { var c = $("#rnCnt", host); if (c) c.textContent = "বাছা হয়েছে: " + P.rn.ids.filter(has).length + "টা" + (P.rn.ids.filter(has).length < 2 ? " (কমপক্ষে ২টা লাগবে)" : ""); }
    function paint() {
      var t = find(P.cfg.id), tiles = "", A = all(), CL = customs();
      if (!ad) tiles += '<button type="button" data-id="" class="th' + (!userPref() ? " on" : "") + '"><i>🔁</i>অ্যাডমিনের থিম (অটো)</button>';
      A.forEach(function (x) { tiles += '<button type="button" data-id="' + x.id + '" class="th' + ((ad || userPref()) && P.cfg.id === x.id ? " on" : "") + '">' + mock(k, { id: x.id }, P.mode) + "<span>" + (x.cu ? "✨ " : "") + esc(x.n) + "</span></button>"; });
      var h = '<div class="mr">' + [["auto", "অটো"], ["light", "লাইট"], ["dark", "ডার্ক"]].map(function (m) { return '<button type="button" data-m="' + m[0] + '" class="' + (P.mode === m[0] ? "on" : "") + '">' + m[1] + "</button>"; }).join("") + "</div>";
      if (ad) h += '<div class="pv">' + mock(k, P.cfg, P.mode, 1) + '</div>';
      h += '<div class="tg">' + tiles + "</div>";
      if (ad) {
        h += '<div class="ad"><label>মূল রং<input type="color" data-c="a" value="' + (P.cfg.a || t.a).slice(0, 7) + '"></label><label>দ্বিতীয় রং<input type="color" data-c="b" value="' + (P.cfg.b || t.b).slice(0, 7) + '"></label><label><input type="checkbox" data-g ' + (P.cfg.grad === false ? "" : "checked") + '> গ্রেডিয়েন্ট</label>' +
          (k === "chat" ? '<label>বাবলের কোণা <b>' + (P.cfg.rad || 22) + 'px</b><input type="range" data-r min="10" max="30" value="' + (P.cfg.rad || 22) + '"></label>' : "") + "</div>";
        h += '<div class="ac2"><button type="button" class="go" data-a="save">✅ সবার জন্য চালু করুন</button><button type="button" data-a="cancel">প্রিভিউ বাতিল</button><button type="button" data-a="reset">↺ ডিফল্টে ফিরুন (আজকের চেহারা)</button></div><div class="ms" id="thMs">' + (P.dirty ? MSG : "") + "</div>";
        // ✨ নিজের থিম বানান
        h += '<div class="sc"><button type="button" class="sh" data-sec="cu">✨ নিজের থিম বানান <b>' + (P.open.cu ? "▴" : "▾") + "</b></button>";
        if (P.open.cu) {
          h += '<div class="cu"><div class="ms">মূল, দ্বিতীয় আর ব্যাকগ্রাউন্ড রং বাছুন। সেভ করলে থিমটা ১২টার পাশে তালিকায় আসবে — চ্যাট ও হোম দুই জায়গায়। (কাস্টম থিমে আপনার বাছা ব্যাকগ্রাউন্ডই থাকে, অটো/লাইট/ডার্ক মোড প্রযোজ্য নয়।)</div>' +
            '<input type="text" data-cn maxlength="20" placeholder="থিমের নাম (যেমন: আমার নীল)" value="' + esc(P.cu.n) + '">' +
            '<div class="ad c3"><label>মূল রং<input type="color" data-cc="a" value="' + P.cu.a + '"></label><label>দ্বিতীয় রং<input type="color" data-cc="b" value="' + P.cu.b + '"></label><label>ব্যাকগ্রাউন্ড<input type="color" data-cc="bg" value="' + P.cu.bg + '"></label></div>' +
            '<div id="cuPv">' + cuPv() + '</div><div class="ms" id="cuHint">' + cuHint() + '</div>' +
            '<div class="ac2"><button type="button" class="go" data-a="cusave">💾 ' + (P.cu.id ? "বদল সেভ করুন" : "থিম সেভ করুন") + '</button><button type="button" data-a="cunew">' + (P.cu.id ? "✕ বদল বাতিল" : "↺ রং রিসেট") + '</button></div><div class="ms" id="cuMs">' + esc(P.m1) + "</div>";
          if (CL.length) h += '<div class="ms" style="margin-top:8px"><b>আমার বানানো থিম (' + CL.length + '/24)</b></div>' + CL.map(function (x) { return '<div class="cr"><span class="sw" style="background:linear-gradient(135deg,' + x.a + "," + x.b + ');box-shadow:0 0 0 3px ' + x.bg + ',0 0 0 4px rgba(128,128,128,.5)"></span><b>' + esc(x.n) + '</b><button type="button" data-a="cuedit" data-cid="' + x.id + '">✎ বদলান</button><button type="button" data-a="cudel" data-cid="' + x.id + '">🗑 মুছুন</button></div>'; }).join("");
          h += "</div>";
        }
        h += "</div>";
        // 🔀 র‍্যান্ডম ঘোরা
        h += '<div class="sc"><button type="button" class="sh" data-sec="rn">🔀 র‍্যান্ডম ঘোরা (' + (k === "chat" ? "চ্যাট" : "হোম") + ') — এখন ' + rnStat() + ' <b>' + (P.open.rn ? "▴" : "▾") + "</b></button>";
        if (P.open.rn) {
          h += '<div class="rn"><div class="ms">সার্ভারে এখন: ' + rnStat() + '. চালু থাকলে ' + (k === "chat" ? "চ্যাটের" : "হোমের") + ' থিম নিজে নিজে এলোমেলো ক্রমে বদলায় (ওপরের একক থিম তখন কাজ করে না; ইউজার নিজে চ্যাট থিম বাছলে তার ফোনে বাছাটাই চলে)। চ্যাট আর হোমের র‍্যান্ডম আলাদা — ওপরের 💬/🏠 ট্যাব থেকে ঠিক করুন।</div>' +
            '<label class="rt big"><input type="checkbox" data-rn="on" ' + (P.rn.on ? "checked" : "") + '> 🔀 র‍্যান্ডম ঘোরা চালু (' + (k === "chat" ? "চ্যাট" : "হোম") + ')</label>' +
            '<div class="ms">যতগুলো ইচ্ছে থিমে টিক দিন (২/৩/৫/৭টা বা সব) — কমপক্ষে ২টা।</div>' +
            '<div class="ac2"><button type="button" data-a="rnall">☑ সব বাছুন (' + A.length + ')</button><button type="button" data-a="rnnone">☐ একটাও না</button></div>' +
            '<div class="rg">' + A.map(function (x) { return '<label class="rt"><input type="checkbox" data-rt="' + x.id + '" ' + (P.rn.ids.indexOf(x.id) >= 0 ? "checked" : "") + '><i style="background:linear-gradient(135deg,' + x.a + "," + x.b + ')"></i><span>' + (x.cu ? "✨ " : "") + esc(x.n) + "</span></label>"; }).join("") + '</div><div class="ms" id="rnCnt"></div>' +
            '<label style="display:block;margin-top:6px">কত সেকেন্ড পরপর বদলাবে (ডিফল্ট ১০, কমপক্ষে ৩)<input type="number" data-rs min="3" max="86400" step="1" inputmode="numeric" value="' + esc(P.rn.sec) + '"></label>' +
            '<div class="ac2" style="margin-top:4px">' + [5, 10, 30, 60].map(function (v) { return '<button type="button" data-a="rnsec" data-v="' + v + '">' + v + " সে.</button>"; }).join("") + '</div>' +
            '<div class="ac2" style="margin-top:8px">' + (P.rp ? '<button type="button" data-a="rnstop">⏹ প্রিভিউ থামান</button><button type="button" data-a="rnnx">⏭ পরেরটা</button>' : '<button type="button" data-a="rnpv">▶ প্রিভিউ চালান</button>') + '<button type="button" class="go" data-a="rnsave">✅ র‍্যান্ডম সেভ (সবার জন্য)</button></div>' +
            '<div class="ms" id="rnMs">' + esc(P.m2) + '</div><div id="rnPv"></div></div>';
        }
        h += "</div>";
      }
      host.innerHTML = h; if (ad && P.open.rn) { rnCount(); if (P.rp && P.rn.cur) rpDom(P.rn.cur); }
    }
    function rpShow(id) { // প্রিভিউয়ে একটা থিম দেখাও
      P.rn.cur = id;
      if (ctx.page) { S.pv = { k: k, cfg: { id: id }, mode: P.mode, rot: 1 }; apply(); }
      rpDom(id);
    }
    function rpDom(id) {
      var x = find(id), pv = $("#rnPv", host); if (pv) pv.innerHTML = '<div class="ms">▶ প্রিভিউ: <b>' + (x.cu ? "✨ " : "") + esc(x.n) + "</b>" + (ctx.page ? " (এই পেজেই দেখুন)" : "") + "</div>" + mock(k, { id: id }, P.mode, 1);
    }
    function rpNext() {
      if (!document.body.contains(host)) { rpStop(); return; }
      var ids = P.rn.ids.filter(has); if (ids.length < 2) { rpStop(); P.m2 = "⚠ প্রিভিউয়ের জন্য কমপক্ষে ২টা থিম টিক দিন।"; paint(); return; }
      var n = pick(P.rn.bag, ids, P.rn.cur); P.rn.bag = n.bag; rpShow(n.id);
    }
    host.onclick = function (e) {
      var b = e.target.closest("button"); if (!b || !host.contains(b)) return;
      if (b.dataset.sec) { P.open[b.dataset.sec] = !P.open[b.dataset.sec]; paint(); return; }
      if (b.dataset.m) { P.mode = b.dataset.m; if (!ad) ls("mc2_th_um", P.mode); if (ad) changed(); else { apply(); paint(); } return; }
      if (b.dataset.id !== undefined) {
        if (!ad) { if (b.dataset.id) ls("mc2_th_u", JSON.stringify({ id: b.dataset.id })); else ls("mc2_th_u", null); P.cfg = { id: b.dataset.id || "classic" }; apply(); paint(); return; }
        P.cfg = { id: b.dataset.id }; changed(); return;
      }
      var a = b.dataset.a; if (!a) return;
      if (a === "cancel") { rpStop(); P.cfg = JSON.parse(JSON.stringify(cur || {})); if (!P.cfg.id || !has(P.cfg.id)) P.cfg.id = "classic"; P.mode = k === "chat" ? o.cm : o.hm; P.dirty = 0; S.pv = null; apply(); paint(); }
      if (a === "reset") { P.cfg = { id: "classic" }; P.mode = k === "chat" ? "auto" : "dark"; changed(); }
      if (a === "save") {
        var ms = $("#thMs", host), no = JSON.parse(JSON.stringify(S.srv.opts)); ms.textContent = "⏳ সেভ হচ্ছে…";
        var cfg = P.cfg; if (cfg.id === "classic" && !adj(cfg)) cfg = {};
        if (k === "chat") no.cm = P.mode; else no.hm = P.mode;
        save(k === "chat" ? { chat: cfg, opts: no } : { home: cfg, opts: no }).then(function () { S.pv = null; P.dirty = 0; cur = cfg; apply(); ms.textContent = "✅ সবার জন্য চালু হয়েছে (ইউজাররা রিফ্রেশ বা ১ মিনিটে পাবে)।" + (rcfg(k) ? " ⚠ তবে র‍্যান্ডম ঘোরা চালু আছে, তাই সেটা বন্ধ না করা পর্যন্ত এই একক থিম দেখা যাবে না।" : ""); })
          .catch(function (er) { ms.textContent = "❌ সেভ হয়নি" + (String(er && er.message).match(/auth|401|403|not admin/) ? " (অ্যাডমিন লগইন লাগবে)" : " — SQL-25 চালানো হয়েছে তো?"); });
      }
      // ---- নিজের থিম ----
      if (a === "cunew") { P.cu = { id: "", n: "", a: "#0a66ff", b: "#7048e8", bg: "#ffffff" }; P.m1 = ""; paint(); }
      if (a === "cuedit") { var x = null; customs().forEach(function (y) { if (y.id === b.dataset.cid) x = y; }); if (x) { P.cu = { id: x.id, n: x.n, a: x.a, b: x.b, bg: x.bg }; P.m1 = "✎ “" + x.n + "” বদলাচ্ছেন — রং বদলে “বদল সেভ করুন” চাপুন।"; paint(); } }
      if (a === "cusave") {
        var c = P.cu, ms1 = $("#cuMs", host), CL = customs().map(function (y) { return { id: y.id, n: y.n, a: y.a, b: y.b, bg: y.bg }; });
        if (!c.id && CL.length >= 24) { ms1.textContent = "⚠ সর্বোচ্চ ২৪টা নিজের থিম রাখা যায় — আগে কোনোটা মুছুন।"; return; }
        var id = c.id || ("c" + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 5)), nm = (c.n || "").trim().slice(0, 20) || ("আমার থিম " + (CL.length + 1)), it = { id: id, n: nm, a: c.a, b: c.b, bg: c.bg }, f = -1;
        CL.forEach(function (y, i) { if (y.id === id) f = i; }); if (f >= 0) CL[f] = it; else CL.push(it);
        var no2 = JSON.parse(JSON.stringify(S.srv.opts)); no2.custom = CL; ms1.textContent = "⏳ সেভ হচ্ছে…";
        save({ opts: no2 }).then(function () { P.cu = { id: "", n: "", a: c.a, b: c.b, bg: c.bg }; P.cfg = { id: id }; P.m1 = "✅ “" + nm + "” সেভ হয়েছে — তালিকায় ✨ চিহ্নসহ এসেছে (চ্যাট ও হোম দুই জায়গায়, ইউজারও বাছতে পারবে)। সবার জন্য চালাতে ওপরের “সবার জন্য চালু করুন” চাপুন।"; changed(); })
          .catch(function (er) { ms1.textContent = "❌ সেভ হয়নি" + (String(er && er.message).match(/auth|401|403|not admin/) ? " (অ্যাডমিন লগইন লাগবে)" : " — SQL-25 চালানো হয়েছে তো?"); });
      }
      if (a === "cudel") {
        var did = b.dataset.cid, dn = ""; customs().forEach(function (y) { if (y.id === did) dn = y.n; });
        if (!window.confirm("“" + dn + "” থিমটা মুছবেন? এটা চালু থাকলে ওই জায়গা ডিফল্টে ফিরবে, র‍্যান্ডমের তালিকা থেকেও বাদ যাবে।")) return;
        var no3 = JSON.parse(JSON.stringify(S.srv.opts)); no3.custom = customs().filter(function (y) { return y.id !== did; }).map(function (y) { return { id: y.id, n: y.n, a: y.a, b: y.b, bg: y.bg }; });
        var rr = no3.rnd || {}; ["chat", "home"].forEach(function (kk) { if (rr[kk] && Array.isArray(rr[kk].ids)) { rr[kk].ids = rr[kk].ids.filter(function (z) { return z !== did; }); if (rr[kk].ids.length < 2) rr[kk].on = false; } });
        var nn = { opts: no3 }; if (S.srv.chat.id === did) nn.chat = {}; if (S.srv.home.id === did) nn.home = {};
        save(nn).then(function () { if (P.cfg.id === did) P.cfg = { id: "classic" }; P.rn.ids = P.rn.ids.filter(function (z) { return z !== did; }); if (P.cu.id === did) P.cu = { id: "", n: "", a: "#0a66ff", b: "#7048e8", bg: "#ffffff" }; R.chat = {}; R.home = {}; apply(); P.m1 = "✅ “" + dn + "” মুছে গেছে।"; paint(); })
          .catch(function () { P.m1 = "❌ মোছা হয়নি — আবার চেষ্টা করুন।"; paint(); });
      }
      // ---- র‍্যান্ডম ----
      if (a === "rnall") { P.rn.ids = all().map(function (x) { return x.id; }); paint(); }
      if (a === "rnnone") { P.rn.ids = []; paint(); }
      if (a === "rnsec") { P.rn.sec = +b.dataset.v; paint(); }
      if (a === "rnstop") { rpStop(); P.m2 = ""; paint(); }
      if (a === "rnpv" || a === "rnnx") {
        var ids = P.rn.ids.filter(has);
        if (ids.length < 2) { P.m2 = "⚠ প্রিভিউয়ের জন্য কমপক্ষে ২টা থিম টিক দিন।"; paint(); return; }
        if (a === "rnpv") { P.rp = 1; P.m2 = ""; var sc = secOf(P.rn.sec); paint(); rpNext(); S.rpt = setInterval(rpNext, sc * 1000); }
        else { rpNext(); if (S.rpt) { clearInterval(S.rpt); S.rpt = setInterval(rpNext, secOf(P.rn.sec) * 1000); } }
      }
      if (a === "rnsave") {
        var ids2 = P.rn.ids.filter(has), ms2 = $("#rnMs", host);
        if (P.rn.on && ids2.length < 2) { ms2.textContent = "⚠ চালু করতে কমপক্ষে ২টা থিম টিক দিন।"; return; }
        rpStop(); var no4 = JSON.parse(JSON.stringify(S.srv.opts)); no4.rnd = no4.rnd || {}; no4.rnd[k] = { on: !!P.rn.on, ids: ids2, sec: secOf(P.rn.sec) }; ms2.textContent = "⏳ সেভ হচ্ছে…";
        save({ opts: no4 }).then(function () { R[k] = {}; BAG[k] = []; if (O().on) rotStep(k); apply(); P.rn.sec = secOf(P.rn.sec); P.m2 = P.rn.on ? "✅ সেভ হয়েছে — র‍্যান্ডম চালু (" + ids2.length + "টা থিম, " + P.rn.sec + " সেকেন্ড পরপর)। সবার ফোনে রিফ্রেশে বা ১ মিনিটের মধ্যে শুরু হবে।" : "✅ সেভ হয়েছে — র‍্যান্ডম বন্ধ; আগের একক থিমই চলবে।"; paint(); })
          .catch(function (er) { ms2.textContent = "❌ সেভ হয়নি" + (String(er && er.message).match(/auth|401|403|not admin/) ? " (অ্যাডমিন লগইন লাগবে)" : " — SQL-25 চালানো হয়েছে তো?"); });
      }
    };
    host.oninput = function (e) {
      var t = e.target; if (!ad) return;
      if (t.hasAttribute("data-cn")) { P.cu.n = t.value; return; }
      if (t.dataset.cc) { P.cu[t.dataset.cc] = t.value; var cp = $("#cuPv", host); if (cp) cp.innerHTML = cuPv(); var ch = $("#cuHint", host); if (ch) ch.textContent = cuHint(); return; }
      if (t.dataset.rn) { P.rn.on = t.checked; return; }
      if (t.dataset.rt) { var i = P.rn.ids.indexOf(t.dataset.rt); if (t.checked && i < 0) P.rn.ids.push(t.dataset.rt); else if (!t.checked && i >= 0) P.rn.ids.splice(i, 1); rnCount(); return; }
      if (t.hasAttribute("data-rs")) { P.rn.sec = t.value; return; }
      if (t.dataset.c) P.cfg[t.dataset.c] = t.value; else if (t.hasAttribute("data-g")) { if (t.checked) delete P.cfg.grad; else P.cfg.grad = false; } else if (t.hasAttribute("data-r")) P.cfg.rad = +t.value; else return;
      rpStop(); P.dirty = 1; if (ctx.page) { S.pv = P; apply(); } var p = $(".pv", host); if (p) p.innerHTML = mock(k, P.cfg, P.mode, 1); var m = $("#thMs", host); if (m) m.textContent = MSG;
    };
    paint(); return P;
  }
  var CSS = ".thsh{position:fixed;left:0;right:0;bottom:0;z-index:200;max-height:64vh;overflow:auto;background:Canvas;color:CanvasText;color-scheme:light dark;border-radius:18px 18px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.35);padding:10px 12px calc(14px + env(safe-area-inset-bottom));font-size:14px;line-height:1.4;font-family:inherit}.thsh.mini .bd .tg,.thsh.mini .bd .ad,.thsh.mini .bd .mr,.thsh.mini .bd .pv,.thsh.mini .bd .sc{display:none}.thsh h4{margin:0 0 6px;display:flex;gap:8px;align-items:center}.thsh h4 b{flex:1}.thsh button,.thp button{font:inherit;border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit;border-radius:10px;padding:6px 10px}" +
    ".mr{display:flex;gap:6px;margin:4px 0}.mr button.on,.th.on{outline:2px solid #0a66ff;background:rgba(10,102,255,.12)}.tg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}.th{padding:4px;text-align:center;font-size:12px}.th span{display:block;margin-top:3px}.th i{display:block;font-style:normal;font-size:22px;padding:14px 0}.pv{margin:6px 0}" +
    ".ad{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.ad label{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.ad input[type=range]{width:100%}.ac2{display:flex;gap:6px;flex-wrap:wrap}.ac2 .go{background:#0a66ff;color:#fff;border-color:#0a66ff}.ms{margin-top:6px;font-size:13px;opacity:.85}.sc{margin-top:8px;border-top:1px solid rgba(128,128,128,.35);padding-top:4px}.sc .sh{width:100%;display:flex;justify-content:space-between;gap:6px;text-align:left;font-weight:700;margin-top:4px}.sc input[type=text],.sc input[type=number]{width:100%;font:inherit;padding:7px 9px;border:1px solid rgba(128,128,128,.45);border-radius:8px;background:transparent;color:inherit;margin:4px 0}.thsh input[type=color],.thp input[type=color]{width:100%;min-width:44px;height:34px;padding:0;border:0;background:none}.ad.c3{grid-template-columns:1fr 1fr 1fr}.cpv{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0}.cpv small{display:block;margin-bottom:2px}.cr{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:6px 0}.cr b{flex:1;min-width:80px}.sw{width:26px;height:26px;border-radius:50%;flex:none;margin:0 4px}.rg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}.rt{display:flex;gap:6px;align-items:center;font-size:13px;padding:5px 6px;border:1px solid rgba(128,128,128,.3);border-radius:8px}.rt.big{font-size:14px;font-weight:700;margin:6px 0}.rt input{width:auto!important;margin:0!important;flex:none}.rt i{width:14px;height:14px;border-radius:50%;flex:none}.rt span{min-width:0;overflow-wrap:anywhere}#rnPv{margin-top:6px}.hbtn{position:fixed;right:10px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:55;width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,.55);color:#fff;font-size:20px}";
  function closeSheet() { if (S.rpt) { clearInterval(S.rpt); S.rpt = null; } var e = $("#thSh"); if (e) e.remove(); if (S.pv) { S.pv = null; apply(); } }
  function sheet(k, ctx) { // চ্যাটের ⋯ মেনু বা হোমের 🎨 থেকে। ctx: {adm, arpc}
    closeSheet(); sty("mc2-th-sh", CSS); if (ctx && ctx.arpc) S.arpc = ctx.arpc;
    var ad = !!(ctx && ctx.adm), z = document.createElement("div"); z.className = "thsh"; z.id = "thSh";
    z.innerHTML = '<h4><b>🎨 ' + (k === "chat" ? "চ্যাট থিম" : "হোমের থিম") + (ad ? " (অ্যাডমিন)" : "") + '</b>' + (ad ? '<button type="button" id="thMi">👁 সম্পূর্ণ দেখুন</button>' : "") + '<button type="button" id="thX">✕</button></h4><div class="bd"></div>';
    document.body.appendChild(z);
    body({ k: k, admin: ad, page: ad, host: $(".bd", z) });
    $("#thX", z).onclick = closeSheet;
    var mi = $("#thMi", z); if (mi) mi.onclick = function () { z.classList.toggle("mini"); mi.textContent = z.classList.contains("mini") ? "⬆ খুলুন" : "👁 সম্পূর্ণ দেখুন"; };
  }
  // অ্যাডমিন প্যানেলের ট্যাব: সুইচ + চ্যাট/হোম সাব-ট্যাব + লাইভ প্রিভিউ (পেজে প্রয়োগ হয় না, শুধু প্রিভিউ বক্সে)
  function panel(host, ctx) {
    sty("mc2-th-sh", CSS); if (ctx && ctx.rpc) S.arpc = ctx.rpc;
    function draw(k) {
      var o = O(), sw = function (key, txt, v) { return '<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" data-o="' + key + '" ' + (v ? "checked" : "") + ' style="width:auto"> ' + txt + "</label>"; };
      host.innerHTML = '<div class="thp">' + sw("on", "থিম ফিচার চালু (বন্ধ করলে হোম ও চ্যাট দুটোই পুরো আজকের মতো; সেভ করা থিম মুছবে না)", o.on) + sw("userPick", "ইউজার চ্যাটের থিম নিজে বাছতে পারবে (⋯ মেনুতে 🎨)", o.userPick) + sw("homeBtn", "হোমে অ্যাডমিনের 🎨 বাটন দেখাবে", o.homeBtn) +
        '<div id="thSv" class="ms"></div><div style="display:flex;gap:6px;margin:10px 0"><button type="button" data-k="chat" class="' + (k === "chat" ? "on" : "") + '">💬 চ্যাটের থিম</button><button type="button" data-k="home" class="' + (k === "home" ? "on" : "") + '">🏠 হোমের থিম</button></div><div id="thB"></div></div>';
      body({ k: k, admin: true, page: false, host: $("#thB", host) });
      host.onchange = function (e) {
        var t = e.target; if (!t.dataset.o) return; var no = JSON.parse(JSON.stringify(S.srv.opts)); no[t.dataset.o] = t.checked; var m = $("#thSv", host); m.textContent = "⏳ সেভ হচ্ছে…";
        save({ opts: no }).then(function () { m.textContent = "✅ সেভ হয়েছে"; }).catch(function () { t.checked = !t.checked; m.textContent = "❌ সেভ হয়নি — SQL-25 চালানো হয়েছে তো?"; });
      };
      host.onclick = function (e) { var b = e.target.closest("button[data-k]"); if (b) draw(b.dataset.k); };
    }
    return fetch(base + "/rest/v1/mc2_theme_cfg?id=eq.1&select=chat,home,opts", { headers: { apikey: C.key, Authorization: "Bearer " + C.key } }).then(function (r) { return r.ok ? r.json() : []; })
      .then(function (a) { if (a && a[0]) S.srv = { chat: a[0].chat || {}, home: a[0].home || {}, opts: a[0].opts || {} }; }).catch(function () {}).then(function () { draw("chat"); });
  }
  // হোমে অ্যাডমিনের 🎨 বাটন (শুধু অ্যাডমিন লগইন থাকলে; সার্ভারে mc2_is_admin দিয়ে যাচাই)
  function homeBtn() {
    if (window.FATH_NOAPPLY || !admTok() || !O().homeBtn || !O().on) return;
    rpc("mc2_is_admin").then(function (ok) {
      if (ok !== true || $("#thHb")) return; sty("mc2-th-sh", CSS);
      var b = document.createElement("button"); b.id = "thHb"; b.className = "hbtn"; b.type = "button"; b.textContent = "🎨"; b.title = "হোমের থিম (অ্যাডমিন)";
      b.onclick = function () { sheet("home", { adm: true }); }; document.body.appendChild(b);
    }).catch(function () {});
  }
  window.FATheme = { sheet: sheet, panel: panel, homeBtn: homeBtn, canPick: function () { var o = O(); return o.on && o.userPick; }, themes: all, apply: apply };
  if (O().on) { rotStep("chat"); rotStep("home"); } // প্রথম রঙ আঁকার আগেই শেষ থিম/সময় হিসাব — ভুল রঙের ঝলক নেই
  apply(); load(); setInterval(load, 60000);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(homeBtn, 800); }); else setTimeout(homeBtn, 800);
})();
