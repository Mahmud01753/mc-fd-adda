// Friend Adda অ্যাডমিন — মূল ফাইল: লগইন, ট্যাব, খারাপ শব্দ। চ্যাট/ইউজার/মডারেশন ট্যাব আগের অ্যাডমিন কাঠামো অনুযায়ী
// (admin-anonchat.js, admin-users.js, admin-moderation.js)। নতুন SQL লাগে না — আগের Supabase-এর SQL-ই চলে।
(function () {
  var C = window.MC_CFG || {}, base = String(C.url || "").replace(/\/$/, ""), $ = function (s) { return document.querySelector(s); };
  var S = null, TAB = (window.MCA_TABS && window.MCA_TABS[0] ? window.MCA_TABS[0][0] : "ac"), ROOMS = [];
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var tm = function (t) { try { return new Date(t).toLocaleString("bn-BD"); } catch (e) { return t; } };
  var short = function (s) { s = String(s || ""); return s.length > 10 ? s.slice(0, 5) + "…" + s.slice(-4) : s; };
  try { S = JSON.parse(sessionStorage.getItem("mc2_adm") || "null"); } catch (e) {}
  // চ্যাট পেইজ (index.html) যেন অ্যাডমিনকে চিনে চ্যাট থেকেই মডারেশন দেখায়, তাই সেশনের একটা কপি localStorage "mc2_adm_x"-এ থাকে। লগআউট/ব্যর্থ হলে মুছে যায়।
  function save(s) { S = s; try { sessionStorage.setItem("mc2_adm", JSON.stringify(s)); } catch (e) {} try { if (s) localStorage.setItem("mc2_adm_x", JSON.stringify(s)); else localStorage.removeItem("mc2_adm_x"); } catch (e) {} }
  function hdr(x) { return Object.assign({ apikey: C.key, Authorization: "Bearer " + (S ? S.access_token : C.key), "Content-Type": "application/json" }, x || {}); }
  function refresh() {
    try { var mx = JSON.parse(localStorage.getItem("mc2_adm_x") || "null"); if (mx && S && mx.access_token && mx.access_token !== S.access_token && mx.expires_at && mx.expires_at * 1000 > Date.now() + 30000) { save(mx); return Promise.resolve(mx); } } catch (e) {} // চ্যাট পেইজ আগেই নবায়ন করে থাকলে সেই নতুন টোকেন নিই (একই refresh টোকেন দুইবার চালালে ব্যর্থ হয়)
    if (!S || !S.refresh_token) return Promise.reject(new Error("auth"));
    return fetch(base + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: C.key, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: S.refresh_token }) })
      .then(function (r) { if (!r.ok) throw new Error("auth"); return r.json(); }).then(save);
  }
  function req(url, opt, retry) {
    return fetch(url, Object.assign({}, opt, { headers: hdr(opt && opt.headers) })).then(function (r) {
      if (r.status === 401 && !retry) return refresh().then(function () { return req(url, opt, true); });
      if (!r.ok) return r.text().then(function (t) { throw new Error(r.status + " " + t.slice(0, 120)); });
      return r.status === 204 ? null : r.json().catch(function () { return null; });
    });
  }
  function rawf(url, opt, retry) { // স্টোরেজ আপলোড/মোছার জন্য (টোকেন মেয়াদ শেষ হলে নিজে নবায়ন করে)
    return fetch(url, Object.assign({}, opt, { headers: Object.assign({ apikey: C.key, Authorization: "Bearer " + (S ? S.access_token : C.key) }, opt && opt.headers) })).then(function (r) {
      if (r.status === 401 && !retry) return refresh().then(function () { return rawf(url, opt, true); });
      return r;
    });
  }
  var A = function (p, o) { return req(base + "/rest/v1/" + p, o); };
  var rpc = function (n, a) { return req(base + "/rest/v1/rpc/" + n, { method: "POST", body: JSON.stringify(a || {}) }); };
  var fail = function (e) { alert("হয়নি: " + (e && e.message ? e.message : e)); };
  window.MCA = { A: A, rpc: rpc, raw: rawf, esc: esc, tm: tm, base: base, C: C, $: $, fail: fail }; // admin-gallery.js এগুলো ব্যবহার করে

  // ---------- লগইন ----------
  function login() {
    if (!base || !C.key) { $("#lm").textContent = "config.js-এ Supabase url ও key বসানো নেই।"; return; }
    $("#lm").textContent = "⏳ যাচাই হচ্ছে…";
    fetch(base + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: C.key, "Content-Type": "application/json" }, body: JSON.stringify({ email: $("#em").value.trim(), password: $("#pw").value }) })
      .then(function (r) { if (!r.ok) throw new Error("ইমেইল বা পাসওয়ার্ড ঠিক নয়"); return r.json(); }).then(save)
      .then(function () { return rpc("mc2_is_admin"); })
      .then(function (ok) { if (ok !== true) { save(null); sessionStorage.removeItem("mc2_adm"); throw new Error("এই ইউজার অ্যাডমিন তালিকায় নেই (mc2_admins)"); } start(); })
      .catch(function (e) { $("#lm").textContent = "⚠️ " + e.message; });
  }
  $("#go").onclick = login; $("#pw").onkeydown = function (e) { if (e.key === "Enter") login(); };
  $("#out").onclick = function () { try { sessionStorage.removeItem("mc2_adm"); } catch (e) {} try { localStorage.removeItem("mc2_adm_x"); } catch (e) {} S = null; location.reload(); };

  var ORDER = ["lock", "lk", "ac", "cu", "nh", "acs", "acm", "usr", "mod", "lim", "stg", "bg", "bw"];
  var TABS = [];
  function buildTabs() {
    var all = (window.MCA_TABS || []).concat([["lock", "🔒 লক ও নোটিশ"], ["bw", "🚫 খারাপ শব্দ"]]), seen = {};
    ORDER.forEach(function (k) { all.forEach(function (t) { if (t[0] === k && !seen[k]) { seen[k] = 1; TABS.push(t); } }); });
    all.forEach(function (t) { if (!seen[t[0]]) { seen[t[0]] = 1; TABS.push(t); } });
  }
  buildTabs();
  // ডিফল্ট চ্যাট-মোছার সময় ডাটাবেসে থাকে (ফাইলে নয়)। নতুন সাইটের জন্য ৭ দিন: প্রথম লগইনে একবার জিজ্ঞেস করে সেট করে — SQL লাগে না।
  // মডারেশন → স্বয়ংক্রিয় মোছা → "সব"-এর সেভ বাটন যে কলগুলো করে এটাও ঠিক সেই কল (mc2_ac_admin_keep, p_session: null)। শুধু চ্যাট, ফাইলের সময় বদলায় না।
  var KP = 0, KEEP7 = 10080;
  function keepOnce() {
    var done = false; try { done = localStorage.getItem("mc2_fa_keep7") === "1"; } catch (e) {}
    if (done) return;
    rpc("mc2_ac_admin_retention").then(function (r) {
      if (!r || r.default !== 1440) { try { localStorage.setItem("mc2_fa_keep7", "1"); } catch (e) {} return; } // আগেই অন্য মান সেট থাকলে ছোঁয় না
      var ok = confirm("চ্যাটের ডিফল্ট মোছার সময় এখন ১ দিন। নতুন সাইটের জন্য ৭ দিন করবেন?\n\n(ফাইলের সময় বদলাবে না।)");
      try { localStorage.setItem("mc2_fa_keep7", "1"); } catch (e) {}
      if (!ok) return;
      rpc("mc2_ac_admin_keep", { p_session: null, p_min: KEEP7 }).then(function () { alert("✅ চ্যাটের ডিফল্ট মোছার সময় এখন ৭ দিন।"); }).catch(fail);
    }).catch(function () {});
  }
  function start() {
    if (!KP) { KP = 1; keepOnce(); }
    $("#login").hidden = true; $("#app").hidden = false;
    if (!TABS.some(function (t) { return t[0] === TAB; })) TAB = TABS[0][0];
    $("#tabs").innerHTML = TABS.map(function (t) { return '<button type="button" data-t="' + t[0] + '" class="' + (t[0] === TAB ? "on" : "") + '">' + t[1] + "</button>"; }).join("");
    $("#tabs").onclick = function (e) { var b = e.target.closest("[data-t]"); if (b) { TAB = b.dataset.t; start(); } };
    $("#view").innerHTML = "⏳ লোড হচ্ছে…"; $("#view").onclick = null;
    (Object.assign({ bw: words, lock: lockView }, window.MCA_VIEWS || {})[TAB])().catch(function (e) { $("#view").innerHTML = '<p class="warn">লোড হয়নি: ' + esc(e.message) + "</p>"; });
  }

  var BN20 = ["খানকি", "মাগি", "মাগী", "বেশ্যা", "হারামি", "হারামজাদা", "হারামজাদী", "চোদা", "চুদি", "চোদনা", "মাদারচোদ", "বোকাচোদা", "গান্ডু", "কুত্তারবাচ্চা", "শুয়োরেরবাচ্চা", "ঢেমনা", "লুচ্চা", "রান্ডি", "বেজন্মা", "জারজ"];
  var EN20 = ["motherfucker", "bullshit", "shithead", "dickhead", "cunt", "dick", "pussy", "whore", "wanker", "prick", "twat", "douchebag", "jackass", "dumbass", "bollocks", "asshat", "cocksucker", "skank", "tosser", "arsehole"]; // ছোট হাতের ইংরেজি ২০টি (আগের ৬টি বাদে)
  var bnd = function (n) { return String(n).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  // সবার জন্য এক পেজ-নম্বর বাটন-সারি: ‹ আগের  ১ ২ ৩ …  নেক্সট ›  (attr = বাটনের data- নাম)। window.MCPG নামে অন্য ফাইলও ব্যবহার করে।
  function perVal() { var v = +window.MCPER; if (!v) { try { v = +sessionStorage.getItem("mcper"); } catch (e) { } } return v === 50 ? 50 : 20; }
  var PERCB = [];
  // ভাগ ২ — কমন পেজিনেশন: মোট ২০টির বেশি হলে ‹ আগের | ১ ২ ৩ … | পরের ›, প্রতি পেজে ২০/৫০ ড্রপডাউন, "মোট N টির মধ্যে x–y"। per = এখনকার প্রতি-পেজ সংখ্যা (MCPG.per() দিয়ে নিন)।
  function pgHtml(pg, total, per, attr) {
    var pages = Math.max(1, Math.ceil(total / per)), st = Math.max(0, Math.min(pg - 2, pages - 5)), en = Math.min(pages, st + 5), h = "", i, B = bnd;
    if (total <= 20) return "";
    var a = pg * per + 1, z = Math.min(total, pg * per + per), cur = perVal();
    h += '<div class="act" style="justify-content:center;flex-wrap:wrap;margin:10px 0"><button class="l s" type="button" ' + attr + '="' + (pg - 1) + '"' + (pg ? "" : " disabled") + '>‹ আগের</button>';
    if (st > 0) h += '<button class="l s" type="button" ' + attr + '="0">' + B(1) + "</button>" + (st > 1 ? '<span class="sm">…</span>' : "");
    for (i = st; i < en; i++) h += '<button class="' + (i === pg ? "" : "l ") + 's" type="button" ' + attr + '="' + i + '"' + (i === pg ? ' aria-current="page"' : "") + ">" + B(i + 1) + "</button>";
    if (en < pages) h += (en < pages - 1 ? '<span class="sm">…</span>' : "") + '<button class="l s" type="button" ' + attr + '="' + (pages - 1) + '">' + B(pages) + "</button>";
    return h + '<button class="l s" type="button" ' + attr + '="' + (pg + 1) + '"' + (pg < pages - 1 ? "" : " disabled") + ">পরের ›</button></div>" +
      '<p class="sm" style="text-align:center">মোট ' + B(total) + " টির মধ্যে " + B(a) + "–" + B(z) + ' · <label style="display:inline">প্রতি পেজে <select data-mcper style="width:auto;display:inline"><option value="20"' + (cur === 20 ? " selected" : "") + ">২০</option><option value=\"50\"" + (cur === 50 ? " selected" : "") + ">৫০</option></select></label></p>";
  }
  // লম্বা তালিকার জন্য নিজস্ব স্ক্রল-বক্স (সর্বোচ্চ উচ্চতা) + ডানে ↑ ↓ বাটন (ধাপে ধাপে ওঠানামা)। id = স্ক্রল হওয়া ভেতরের div-এর id।
  function boxHtml(inner, id) {
    return '<div class="mcbw"><div class="mcbx" id="' + id + '" tabindex="0">' + (inner || "") + '</div><div class="mcud"><button type="button" class="l s" data-mcsc="' + id + '" data-d="-1" aria-label="ওপরে">↑</button><button type="button" class="l s" data-mcsc="' + id + '" data-d="1" aria-label="নিচে">↓</button></div></div>';
  }
  window.MCPG = { html: pgHtml, per: perVal, box: boxHtml, onPer: function (f) { PERCB.push(f); } };
  (function () {
    var st = document.createElement("style");
    st.textContent = ".mcbw{position:relative}.mcbx{max-height:62vh;overflow-y:auto;overflow-x:hidden;padding:0 6px;overscroll-behavior:contain;border:1px solid var(--bd,#ddd);border-radius:10px}.mcud{position:fixed;right:max(8px,env(safe-area-inset-right,0px));top:50%;transform:translateY(-50%);display:none;flex-direction:column;gap:8px;z-index:50}.mcud.on{display:flex}.mcud button{min-width:40px;min-height:40px;padding:0;font-size:18px;background:var(--card,#fff);box-shadow:0 2px 8px rgba(0,0,0,.28);border-radius:50%}@media(max-width:600px){.mcbx{max-height:58vh}}";
    var chk = function () { document.querySelectorAll(".mcbw").forEach(function (w) { var r = w.getBoundingClientRect(), u = w.querySelector(".mcud"), h = window.innerHeight; if (u) u.classList.toggle("on", r.height > 60 && r.top < h * 0.7 && r.bottom > h * 0.3); }); }, tm = 0;
    var qchk = function () { if (!tm) tm = setTimeout(function () { tm = 0; chk(); }, 80); };
    window.addEventListener("scroll", qchk, true); window.addEventListener("resize", qchk); setInterval(chk, 700);
    document.head.appendChild(st);
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-mcsc]"); if (!b) return;
      var el = document.getElementById(b.dataset.mcsc); if (!el) return;
      var d = +b.dataset.d || 1, step = Math.max(120, Math.round(el.clientHeight * 0.8));
      try { el.scrollBy({ top: d * step, behavior: "smooth" }); } catch (x) { el.scrollTop += d * step; }
    });
    document.addEventListener("change", function (e) {
      var t = e.target; if (!t || t.getAttribute("data-mcper") == null) return;
      window.MCPER = +t.value === 50 ? 50 : 20; try { sessionStorage.setItem("mcper", String(window.MCPER)); } catch (x) { }
      PERCB.forEach(function (f) { try { f(); } catch (x) { } });
      var on = document.querySelector("#tabs [data-t].on"); if (on) on.click();
    }, true);
  })();


  // ---------- 🔒 লক ও নোটিশ ----------
  // Political science / Session 2023 রুমের জন্য: পাসওয়ার্ড দিয়ে লক (সার্ভারে যাচাই হয়), আর ঢোকার পেইজে দেখানো নোটিশ।
  // পুরোনো অ্যাডমিনের "চ্যাট মডিফাই"-এর একই RPC: mc2_ac_admin_setpw / _pwon / _pwnote — নতুন SQL লাগে না (নোটিশ: সেই ২০২৬-১০-২০ SQL আগেই চালানো থাকতে হবে)।
  function lockSess() {
    return A("mc2_ac_depts?select=id,name&order=sort,name").then(function (D) {
      var d = D.filter(function (x) { return /রাষ্ট্র|political/i.test(x.name); })[0];
      if (!d) throw new Error("“রাষ্ট্রবিজ্ঞান” বিভাগ পাওয়া যায়নি");
      var q = "mc2_ac_sessions?select=*&dept_id=eq." + d.id + "&order=sort,name";
      return A(q).then(function (S) {
        var x = S.filter(function (z) { return /political/i.test(z.name) && /২০২৩|2023/.test(z.name); })[0] || S.filter(function (z) { return /২০২৩|2023/.test(z.name); })[0];
        if (!x) throw new Error("২০২৩ সেশন পাওয়া যায়নি");
        x._dn = d.name; return x;
      });
    });
  }
  function lockView() {
    return lockSess().then(function (x) {
      var has = !!x.pw_hash, on = has && !!x.pw_on, note = x.pw_note || "";
      var tag = on ? '<span class="tag">🔒 Unlock Code চালু</span>' : has ? '<span class="tag">🙈 Unlock Code লুকানো (সবাই সরাসরি ঢোকে · কোড সেভ আছে)</span>' : '<span class="tag">⚪ কোড নেই (সবাই সরাসরি ঢোকে)</span>';
      $("#view").innerHTML = "<h2>🔒 লক ও নোটিশ</h2><p class='sm'>" + esc((x._dn ? x._dn + ' · ' : '') + x.name) + "</p>" +
        "<div class='it'><div><b>🔒 লক (পাসওয়ার্ড)</b> " + tag + "</div>" + (has && window.MCA_PW ? window.MCA_PW.html(x.id) : "<div class='sm'>🔑 বর্তমান পাসওয়ার্ড: নেই</div>") +
        "<label>নতুন পাসওয়ার্ড (৩–৪০ অক্ষর)<input id='lkpw' type='text' maxlength='40' autocomplete='off' placeholder='নিজের পছন্দের কোড লিখুন' value=''></label>" +
        "<div class='act'><button id='lkset' type='button'>🔒 কোড দিন / বদলান (চালু হবে)</button>" +
        (has ? "<button id='lkto' type='button' class='" + (on ? "d" : "") + "' data-v='" + (on ? 0 : 1) + "'>" + (on ? "🙈 Unlock Code লুকান (সরাসরি ঢুকবে)" : "🔒 Unlock Code দেখান (চালু)") + "</button>" : "") +
        "</div><div class='sm'>বদলালে বা খুললে আগে ঢোকা সবাইকে আবার ঢুকতে হবে। লকের পরে ঢোকার পেইজে পাসওয়ার্ডের ঘর আসে।</div></div>" +
        "<div class='it'><div><b>📢 নোটিশ</b> " + (note ? (x.pw_note_on === false ? '<span class="tag">🙈 সেভ আছে · হোমে লুকানো</span>' : '<span class="tag">👁 হোমে দেখাচ্ছে</span>') : '<span class="tag">নেই</span>') + "</div>" +
        "<label>নোটিশ (সর্বোচ্চ ৫০০ অক্ষর — ঢোকার পেইজে সবাই দেখবে)<textarea id='nt' rows='4' maxlength='500' placeholder='যেমন: আজ রাত ৯টায় আড্ডা। সবাই ভদ্রভাবে কথা বলবেন।'>" + esc(note) + "</textarea></label>" +
        "<div class='act'><button id='ntsv' type='button'>💾 নোটিশ সেভ</button>" + (note ? "<button id='ntvis' type='button' class='" + (x.pw_note_on === false ? "" : "d") + "' data-v='" + (x.pw_note_on === false ? 1 : 0) + "'>" + (x.pw_note_on === false ? "👁 নোটিশ দেখান" : "🙈 নোটিশ লুকান") + "</button><button id='ntrm' type='button' class='l'>✖ নোটিশ সরান</button>" : "") + "</div></div>";
      var run = function (p, msg) { return p.then(function () { alert(msg); start(); }).catch(function (e) { var t = e && e.message ? e.message : String(e); alert(/pw_note_on|PGRST204|42703/.test(t) ? "নোটিশ দেখান/লুকানোর কলাম নেই — sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql একবার চালান।" : /pwnote|PGRST202|42883/.test(t) ? "নোটিশের সার্ভার ফাংশন নেই (SQL: supabase-new-20261020.sql আগে চালাননি) — তাই নোটিশ চলবে না।" : "হয়নি: " + t); }); };
      $("#view").onclick = function (e) {
        if (window.MCA_PW && window.MCA_PW.click(e)) return; var t = e.target, id = t && t.id; if (!id) return;
        if (id === "lkset") { var pw = $("#lkpw").value.trim(); if (pw.length < 3) { alert("পাসওয়ার্ড কমপক্ষে ৩ অক্ষরের দিন।"); return; } if (!confirm("লক করবেন? আগে ঢোকা সবাইকে আবার পাসওয়ার্ড দিয়ে ঢুকতে হবে।")) return; run(rpc("mc2_ac_admin_setpw", { p_session: x.id, p_pw: pw }), "✅ লক চালু হয়েছে।"); }
        else if (id === "lkto") { var on2 = t.dataset.v === "1"; run(rpc("mc2_ac_admin_pwon", { p_session: x.id, p_on: on2 }), on2 ? "✅ আবার লক করা হয়েছে।" : "✅ লক খোলা হয়েছে — এখন সবাই ঢুকতে পারবে।"); }
        else if (id === "lkrm") { if (!confirm("সেভ করা পাসওয়ার্ড মুছে ফেলবেন?")) return; run(rpc("mc2_ac_admin_setpw", { p_session: x.id, p_pw: "" }), "✅ পাসওয়ার্ড মুছে গেছে।"); }
        else if (id === "ntsv") run(rpc("mc2_ac_admin_pwnote", { p_session: x.id, p_note: $("#nt").value }), "✅ নোটিশ সেভ হয়েছে।");
        else if (id === "ntvis") { var vis = t.dataset.v === "1"; run(A("mc2_ac_sessions?id=eq." + x.id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ pw_note_on: vis }) }), vis ? "✅ নোটিশ আবার হোমে দেখাবে।" : "✅ নোটিশ হোম থেকে লুকানো হয়েছে (সেভ আছে)।"); }
        else if (id === "ntrm") { if (!confirm("নোটিশ সরাবেন?")) return; run(rpc("mc2_ac_admin_pwnote", { p_session: x.id, p_note: "" }), "✅ নোটিশ সরেছে।"); }
      };
    });
  }

  // ---------- 🚫 খারাপ শব্দ ----------
  // তালিকা mc2_bad_words টেবিলে। যোগ/মোছা/২০টি করে বাংলা-ইংরেজি শব্দ যোগ।
  function words() {
    return A("mc2_bad_words?select=word&order=word").then(function (W) {
      var have = {}; W.forEach(function (x) { have[x.word] = 1; });
      $("#view").innerHTML = "<h2>🚫 খারাপ শব্দ (" + bnd(W.length) + "টি)</h2>" +
        '<div class="sm" style="padding:9px 11px;border-radius:10px;border:1px solid var(--o);margin-bottom:10px">ℹ️ এই শব্দগুলো কেউ চ্যাটে লিখলে বার্তাটা সবার স্ক্রিনে লুকিয়ে ওয়ার্নিং দেখায় এবং ওই ইউজার অটো-Restriction পায় (১ঘ, ২ঘ, ৪ঘ… দ্বিগুণ)। বার্তা সার্ভারে আটকায় না। বাংলা ২০টি ও ইংরেজি ২০টি শব্দ ডিফল্টে আগেই তালিকায় বসানো থাকে; নিচের ঘরে একটা করে নতুন শব্দ যোগ করা যায়, আর ✕ চাপলে শব্দ মুছে যায়।</div>' +
        "<div class='row'><input id='nw' placeholder='ছোট হাতের, ফাঁকা ছাড়া শব্দ'><button id='aw' type='button'>যোগ করুন</button></div>" +
        "<div class='act' style='margin:6px 0'><button id='bw20' class='l' type='button'>২০টি বাংলা শব্দ যোগ করুন</button><button id='bw20e' class='l' type='button'>২০টি ইংরেজি শব্দ যোগ করুন</button></div><p>" +
        (W.map(function (w) { return '<span class="tag">' + esc(w.word) + ' <a href="#" data-dw="' + esc(w.word) + '">✕</a></span>'; }).join("") || "<span class='sm'>কোনো শব্দ নেই</span>") + "</p>";
      $("#view").onclick = function (e) {
        var t = e.target; if (t.tagName === "A") e.preventDefault();
        var dw = t.closest("[data-dw]");
        if (dw) A("mc2_bad_words?word=eq." + encodeURIComponent(dw.dataset.dw), { method: "DELETE" }).then(start).catch(fail);
        else if (t.id === "aw") { var w = $("#nw").value.trim().toLowerCase().replace(/\s+/g, ""); if (w) A("mc2_bad_words", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ word: w }) }).then(start).catch(fail); }
        else if (t.id === "bw20" || t.id === "bw20e") {
          var LST = t.id === "bw20e" ? EN20 : BN20, add = LST.filter(function (w) { return !have[w]; });
          if (!add.length) { alert("২০টি শব্দই আগে থেকে তালিকায় আছে — নতুন কিছু যোগ হয়নি।"); return; }
          t.disabled = true;
          A("mc2_bad_words?on_conflict=word", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(add.map(function (w) { return { word: w }; })) })
            .then(function () { alert(bnd(add.length) + "টি নতুন " + (t.id === "bw20e" ? "ইংরেজি" : "বাংলা") + " শব্দ যোগ হয়েছে" + (add.length < LST.length ? "; " + bnd(LST.length - add.length) + "টি আগে থেকেই ছিল" : "") + "।"); start(); }).catch(function (er) { t.disabled = false; fail(er); });
        }
      };
    });
  }

  var idleT; function bump() { clearTimeout(idleT); if (S) idleT = setTimeout(function () { try { sessionStorage.removeItem("mc2_adm"); } catch (e) {} location.reload(); }, 30 * 60 * 1000); } // ৩০ মিনিট কিছু না করলে নিজে লগআউট
  ["click", "keydown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, bump, { passive: true }); }); bump();
  if (S && S.access_token) rpc("mc2_is_admin").then(function (ok) { if (ok === true) { save(S); start(); } else { try { sessionStorage.removeItem("mc2_adm"); } catch (e) {} try { localStorage.removeItem("mc2_adm_x"); } catch (e) {} } }).catch(function () {});
})();
