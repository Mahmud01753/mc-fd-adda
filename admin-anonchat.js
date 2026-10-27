// অ্যাডমিন: চ্যাটের ৩টা ট্যাব — "💬 বেনামি চ্যাট" (আপলোড সুইচ + সক্রিয় ইউজার + দুই ফোল্ডারের লিংক), "📁 চ্যাট মডিফাই" (বিভাগ/সেশন যোগ, নাম বদল, চালু-বন্ধ, মোছা, পাসওয়ার্ড: সেশন/বিভাগ/সব একসাথে), "🧹 চ্যাট ডিলেট" (বার্তা লুকানো/মোছা, মোছার সময়)। একসাথে লকের SQL: supabase-new-20261020.sql। admin-gallery.js-এর পরে ও admin.js-এর আগে লোড হয়।
(function () {
  var DEP = "", SES = "", QT = "", ONLYF = false, XOLD = 0, LIMN = 100, PGN = 0, PERN = 50, LASTM = [], SCOPEL = [], SCOPEN = "", SCOPEK = false, SQ = "", SST = "", SPW = "", SNT = "", SPG = 0, SPER = 30;
  if (!document.getElementById("mcChkFix")) { var cf = document.createElement("style"); cf.id = "mcChkFix"; cf.textContent = "[hidden]{display:none!important}label.chk{display:flex;gap:8px;align-items:center;cursor:pointer}label.chk input[type=checkbox],.xg input[type=checkbox]{width:auto;flex:none;margin:0}"; document.head.appendChild(cf); }
  // ---------- বিভাগ-ভিত্তিক "চ্যাট মোছার সময়" ও "অ্যাটাচমেন্ট মোছার সময়" (Change + Save)। মডারেশনের "🕒 স্বয়ংক্রিয় মোছা" ট্যাবও এটা ব্যবহার করে। SQL: SQL-1-CORE-contest-chat-admin-tables-NO-RERUN.sql ----------
  var PRE = [["১ ঘণ্টা", 60], ["৬ ঘণ্টা", 360], ["১ দিন", 1440], ["৩ দিন", 4320], ["৭ দিন", 10080], ["৩০ দিন", 43200], ["কখনো মুছবে না", 0]], MSG = {};
  var bdg = function (s) { return String(s).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  function fmtM(m) { return m === 0 ? "কখনো না" : m % 1440 === 0 ? bdg(m / 1440) + " দিন" : m % 60 === 0 ? bdg(m / 60) + " ঘণ্টা" : bdg(m) + " মিনিট"; }
  function forT(m) { return (m % 1440 === 0 ? bdg(m / 1440) + " দিনের" : m % 60 === 0 ? bdg(m / 60) + " ঘণ্টার" : bdg(m) + " মিনিটের") + " জন্য"; }
  function phrase(label, m, def) { return m == null ? label + " ডিফল্ট (" + fmtM(def) + ") অনুযায়ী" : m === 0 ? label + " কখনো মুছবে না" : label + " " + forT(m); }
  function dkOpts(cur, defLabel) {
    var f = false, h = '<option value=""' + (cur == null ? " selected" : "") + ">" + defLabel + "</option>";
    h += PRE.map(function (x) { var on = cur === x[1]; if (on) f = true; return '<option value="' + x[1] + '"' + (on ? " selected" : "") + ">" + x[0] + "</option>"; }).join("");
    if (cur != null && !f) h += '<option value="' + cur + '" selected>' + fmtM(cur) + " (কাস্টম)</option>";
    return h + '<option value="custom">✏️ কাস্টম সময়…</option>';
  }
  function askM(q) { // "৩০" বা "30m" = মিনিট, "2h" = ঘণ্টা, "5d" = দিন
    var v = prompt(q, ""); if (v === null) return null;
    var t = String(v).replace(/[০-৯]/g, function (d) { return "০১২৩৪৫৬৭৮৯".indexOf(d); }).trim().toLowerCase(), m = /^(\d+)\s*(m|h|d)?$/.exec(t);
    if (!m) { alert("সংখ্যা লিখুন, যেমন: ৩০ (মিনিট), 2h (ঘণ্টা), 5d (দিন)"); return null; }
    var n = +m[1] * (m[2] === "d" ? 1440 : m[2] === "h" ? 60 : 1); if (n > 525600) { alert("সর্বোচ্চ ১ বছর (৫,২৫,৬০০ মিনিট)।"); return null; } return n;
  }
  var DK = {
    // d = { id, name, keep_min, file_keep_min }; def = { c: ডিফল্ট চ্যাট-মিনিট, f: ডিফল্ট ফাইল-মিনিট }
    box: function (d, def) {
      var E = window.MCA.esc, kc = d.keep_min == null ? null : +d.keep_min, kf = d.file_keep_min == null ? null : +d.file_keep_min;
      return '<div class="dk" data-dk="' + d.id + '" data-dc="' + def.c + '" data-df="' + def.f + '" style="margin:6px 0 2px;padding:8px;border:1px dashed var(--bd);border-radius:10px;display:grid;gap:6px">' +
        '<div class="row"><label>🕒 চ্যাট মোছার সময়<select data-dkc data-o="' + (kc == null ? "" : kc) + '">' + dkOpts(kc, "ডিফল্ট (" + fmtM(def.c) + ")") + '</select></label><label>📎 অ্যাটাচমেন্ট মোছার সময়<select data-dkf data-o="' + (kf == null ? "" : kf) + '">' + dkOpts(kf, "ডিফল্ট (" + fmtM(def.f) + ")") + "</select></label></div>" +
        '<div class="act"><button class="s" type="button" data-a="dksv" data-id="' + d.id + '" disabled>💾 Save</button></div>' +
        (MSG[d.id] ? '<div class="sm" style="color:var(--g);font-weight:700">' + E(MSG[d.id]) + "</div>" : "") + '<div class="sm">এই বিভাগের সব সেশনে চলবে (কোনো সেশনের নিজস্ব সময় দেওয়া থাকলে চ্যাটের জন্য সেটাই আগে)। ড্রপডাউনে সময় বাছুন (✏️ কাস্টম, ০ = কখনো মুছবে না), তারপর 💾 Save।</div></div>';
    },
    change: function (e) { // select বদল: "কাস্টম" বাছলে সময় জিজ্ঞেস করে
      var el = e.target.closest ? e.target.closest(".dk select") : null; if (!el) return false;
      var bx = el.closest(".dk"); if (el.value === "custom") {
        var m = askM("কত সময় পর মুছবে? (৩০ = মিনিট, 2h = ঘণ্টা, 5d = দিন; ০ = কখনো না)");
        var isC = el.hasAttribute("data-dkc"), def = +bx.dataset[isC ? "dc" : "df"];
        var o = el.dataset.o; el.innerHTML = dkOpts(m !== null ? m : o === "" || o == null ? null : +o, "ডিফল্ট (" + fmtM(def) + ")");
      }
      var sv = bx.querySelector('[data-a="dksv"]'); if (sv) sv.disabled = false; return true;
    },
    click: function (e, done) {
      var b = e.target.closest ? e.target.closest('[data-a="dkch"],[data-a="dksv"]') : null; if (!b) return false;
      var bx = b.closest(".dk"), sc = bx.querySelector("[data-dkc]"), sf = bx.querySelector("[data-dkf]"), id = +b.dataset.id;
      if (b.dataset.a === "dkch") { sc.disabled = false; sf.disabled = false; var sv = bx.querySelector('[data-a="dksv"]'); if (sv) sv.disabled = false; sc.focus(); return true; }
      var c = sc.value === "" ? null : +sc.value, f = sf.value === "" ? null : +sf.value, dc = +bx.dataset.dc, df = +bx.dataset.df; b.disabled = true;
      window.MCA.rpc("mc2_ac_admin_dept_keep", { p_dept: id, p_chat_min: c, p_file_min: f }).then(function () {
        MSG[id] = "✅ " + phrase("চ্যাট", c, dc) + " ও " + phrase("অ্যাটাচমেন্ট", f, df) + " হয়েছে।"; done();
      }).catch(function (er) {
        b.disabled = false; var t = er && er.message ? er.message : String(er);
        alert(/mc2_ac_admin_dept_keep|PGRST202|42883/.test(t) ? "নতুন SQL (SQL-1-CORE-contest-chat-admin-tables-NO-RERUN.sql) এখনো চালানো হয়নি — আগে সেটা Supabase-এ একবার Run করুন।" : "হয়নি: " + t);
      }); return true;
    }
  };
  window.MCA_DK = DK;
  // ---- ভাগ ৩: লকের বর্তমান পাসওয়ার্ড দেখান/লুকান/কপি (SQL-11; শুধু অ্যাডমিন সার্ভার-ফাংশন থেকে আসে) ----
  var PW = {
    DOTS: "••••••",
    html: function (id) {
      return '<div class="pwb sm" data-pwb="' + id + '" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:4px 0">🔑 বর্তমান পাসওয়ার্ড: <b class="pwt" style="font-family:monospace;font-size:15px;overflow-wrap:anywhere">' + PW.DOTS + '</b>' +
        '<button class="l s" type="button" data-a="pwsh" data-id="' + id + '">👁 দেখান</button><button class="l s" type="button" data-a="pwcp" data-id="' + id + '" hidden>📋 কপি</button></div>';
    },
    bulkHtml: function () {
      return '<div class="pwb sm" data-pwbulk="1" style="display:grid;gap:4px;margin-top:8px;padding:8px;border:1px dashed var(--bd);border-radius:10px"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">🔑 বর্তমান পাসওয়ার্ড (উপরে বাছা পরিসরের): <b class="pwt" style="font-family:monospace;font-size:15px;overflow-wrap:anywhere">' + PW.DOTS + '</b>' +
        '<button class="l s" type="button" data-a="bpwsh">👁 দেখান</button></div><div class="pwx"></div></div>';
    },
    copy: function (v, b) {
      var o = b.textContent, done = function () { b.textContent = "✅ কপি হয়েছে"; setTimeout(function () { b.textContent = o; }, 1500); };
      var fb = function () { var ta = document.createElement("textarea"); ta.value = v; ta.style.cssText = "position:fixed;opacity:0;top:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (x) {} ta.remove(); done(); };
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(v).then(done, fb); return; } } catch (x) {}
      fb();
    },
    err: function (er) { var x = er && er.message ? er.message : String(er); return /fa_admin_pw_|PGRST202|42883/.test(x) ? "⚠ SQL-11 এখনো চালানো হয়নি — sql/SQL-11-LOCK-PASSWORD-SHOW-IN-ADMIN.sql একবার Supabase-এ Run করুন।" : "হয়নি: " + x; },
    click: function (e) {
      var b = e.target.closest ? e.target.closest('[data-a="pwsh"],[data-a="pwcp"],[data-a="bpwsh"]') : null; if (!b) return false;
      var M = window.MCA, bx = b.closest(".pwb"), t = bx.querySelector(".pwt"), a = b.dataset.a;
      if (a === "pwcp") { PW.copy(bx.dataset.val || "", b); return true; }
      var cp = bx.querySelector('[data-a="pwcp"]'), hide = function () { t.textContent = PW.DOTS; t.style.fontFamily = "monospace"; b.textContent = "👁 দেখান"; bx.dataset.shown = ""; if (cp) cp.hidden = true; var x = bx.querySelector(".pwx"); if (x) x.innerHTML = ""; };
      if (bx.dataset.shown === "1") { hide(); return true; }
      var show = function (v) { bx.dataset.val = v; bx.dataset.shown = "1"; t.textContent = v; b.textContent = "🙈 লুকান"; if (cp) cp.hidden = false; };
      var note = function (m) { t.textContent = m; t.style.fontFamily = "inherit"; };
      if (a === "pwsh") {
        if (bx.dataset.val) { show(bx.dataset.val); return true; }
        b.disabled = true;
        M.rpc("fa_admin_pw_get", { p_session: +b.dataset.id }).then(function (v) { b.disabled = false; if (v) show(String(v)); else note("পুরোনো পাসওয়ার্ড দেখা যায় না, নতুন দিন"); }).catch(function (er) { b.disabled = false; note(PW.err(er)); });
        return true;
      }
      var sc = M.$("#acbs"), all = !sc || sc.value === "all"; b.disabled = true;
      M.rpc("fa_admin_pw_scope", { p_scope: all ? "all" : "dept", p_dept: all ? null : +sc.value }).then(function (r) {
        b.disabled = false; var L = (r && r.list) || [], x = bx.querySelector(".pwx"), E = M.esc;
        bx.dataset.shown = "1"; b.textContent = "🙈 লুকান"; t.textContent = L.length === 1 ? L[0].pw : L.length ? "একেক সেশনে একেক পাসওয়ার্ড" : "দেখানোর মতো পাসওয়ার্ড নেই"; if (L.length === 1) t.style.fontFamily = "monospace"; else t.style.fontFamily = "inherit";
        x.innerHTML = (L.length > 1 ? L.map(function (z) { return "<div><b style=\"font-family:monospace\">" + E(z.pw) + "</b> — " + bdg(z.n) + "টি সেশনে</div>"; }).join("") : "") +
          (r && +r.old ? "<div>" + bdg(r.old) + "টি সেশনে পাসওয়ার্ড আছে কিন্তু পুরোনো — দেখা যায় না, নতুন দিন।</div>" : "") + (r && +r.none ? "<div>" + bdg(r.none) + "টি সেশনে পাসওয়ার্ড নেই।</div>" : "");
      }).catch(function (er) { b.disabled = false; note(PW.err(er)); });
      return true;
    }
  };
  window.MCA_PW = PW;
  // ---- ভাগ ৩: প্রতি সেশনের আলাদা চ্যাট-মোছার সময় (mc2_ac_admin_keep; সেশনের মান বিভাগের আগে চলে) ----
  var SK = {
    box: function (s, dEffC, dEffF, n) {
      var kc = s.keep_min == null ? null : +s.keep_min;
      return '<div class="sk" data-sk="' + s.id + '" data-dc="' + dEffC + '" style="margin:6px 0 2px;padding:8px;border:1px dashed var(--bd);border-radius:10px;display:grid;gap:6px">' +
        '<div><b>' + window.MCA.esc(s.name) + '</b> ' + (n != null ? '<span class="tag">💬 ' + bdg(n) + 'টি বার্তা</span>' : "") + (kc == null ? '<span class="tag">বিভাগের মান চলছে (' + fmtM(dEffC) + ')</span>' : '<span class="tag" style="background:var(--g);color:#fff">এই সেশনের নিজস্ব মান চলছে (' + fmtM(kc) + ') — বিভাগের আগে</span>') + '</div>' +
        '<div class="row"><label>🕒 চ্যাট মোছার সময়<select data-skc data-o="' + (kc == null ? "" : kc) + '">' + dkOpts(kc, "বিভাগের মান অনুযায়ী (" + fmtM(dEffC) + ")") + '</select></label>' +
        '<label>📎 ফাইল মোছার সময়<input disabled value="' + fmtM(dEffF) + ' (বিভাগের মান)" style="opacity:.75"></label></div>' +
        '<div class="act"><button class="s" type="button" data-a="sksv" data-id="' + s.id + '" disabled>💾 Save</button></div>' +
        (MSG["s" + s.id] ? '<div class="sm" style="color:var(--g);font-weight:700">' + window.MCA.esc(MSG["s" + s.id]) + "</div>" : "") + '</div>';
    },
    change: function (e) {
      var el = e.target.closest ? e.target.closest(".sk select") : null; if (!el) return false;
      var bx = el.closest(".sk");
      if (el.value === "custom") { var m = askM("কত সময় পর মুছবে? (৩০ = মিনিট, 2h = ঘণ্টা, 5d = দিন; ০ = কখনো না)"), o = el.dataset.o; el.innerHTML = dkOpts(m !== null ? m : o === "" || o == null ? null : +o, "বিভাগের মান অনুযায়ী (" + fmtM(+bx.dataset.dc) + ")"); }
      var sv = bx.querySelector('[data-a="sksv"]'); if (sv) sv.disabled = false; return true;
    },
    click: function (e, done) {
      var b = e.target.closest ? e.target.closest('[data-a="sksv"]') : null; if (!b) return false;
      var bx = b.closest(".sk"), sel = bx.querySelector("[data-skc]"), id = +b.dataset.id, c = sel.value === "" ? null : +sel.value, dc = +bx.dataset.dc; b.disabled = true;
      window.MCA.rpc("mc2_ac_admin_keep", { p_session: id, p_min: c }).then(function () {
        MSG["s" + id] = c == null ? "✅ এই সেশনের নিজস্ব সময় সরেছে — এখন বিভাগের মান (" + fmtM(dc) + ") চলবে।" : c === 0 ? "✅ এই সেশনের চ্যাট কখনো মুছবে না (বিভাগের মান উপেক্ষা করে)।" : "✅ এই সেশনের চ্যাট " + forT(c) + " রাখা হবে — বিভাগের মানের আগে এটাই চলবে।"; done();
      }).catch(function (er) { b.disabled = false; alert("হয়নি: " + (er && er.message ? er.message : er)); }); return true;
    }
  };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["ac", "💬 বেনামি চ্যাট"], ["acs", "📁 চ্যাট মডিফাই"], ["acm", "🧹 চ্যাট ডিলেট"]]);
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { ac: mk("home"), acs: mk("struct"), acm: mk("msgs") });
  var RM = { method: "PATCH", headers: { Prefer: "return=minimal" } }, MODE = "home", BMSG = "", NMSG = "";
  // নির্দেশনা লেখার পপআপ (ব্রাউজারের prompt() অনেক ফোনে আসে না, তাই নিজস্ব টেক্সট-বক্স)
  function noteBox(title, cur, cb) {
    var o = document.createElement("div"); o.setAttribute("role", "dialog"); o.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:14px";
    o.innerHTML = '<div style="background:var(--card,#fff);color:var(--fg,#111);padding:14px;border-radius:14px;width:min(100%,440px);display:grid;gap:8px"><b id="nbT"></b><div style="font-size:12px;opacity:.8">ইউজার চ্যাটে এই লেখাটা দেখবে (যেমন শর্ত, পেইড কি না; সর্বোচ্চ ৫০০ অক্ষর)। খালি রেখে সেভ করলে নির্দেশনা সরে যাবে।</div><textarea id="nbX" rows="5" maxlength="500" style="width:100%;box-sizing:border-box"></textarea><div style="display:flex;gap:8px"><button type="button" class="s" id="nbOk" style="flex:1">💾 সেভ করুন</button><button type="button" class="l s" id="nbNo" style="flex:1">বাতিল</button></div></div>';
    document.body.appendChild(o); o.querySelector("#nbT").textContent = title; var ta = o.querySelector("#nbX"); ta.value = cur || ""; setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
    var close = function () { o.remove(); }; o.querySelector("#nbNo").onclick = close; o.onclick = function (e) { if (e.target === o) close(); };
    o.querySelector("#nbOk").onclick = function () { var v = ta.value; close(); cb(v); };
  }
  function mk(m) { return function () { MODE = m; return view(); }; }
  function tabGo(t) { var b = document.querySelector('#tabs [data-t="' + t + '"]'); if (b) b.click(); }

  // ---------- চ্যাট ডিলেট: বিভাগ/সেশন ফিল্টার + একসাথে মোছা + কাস্টম সময়ের ব্যান (নতুন SQL লাগে না) ----------
  var OLDP = [["সব বার্তা (বয়স যা-ই হোক)", 0], ["১ ঘণ্টার চেয়ে পুরোনো", 60], ["১ দিনের চেয়ে পুরোনো", 1440], ["৭ দিনের চেয়ে পুরোনো", 10080], ["৩০ দিনের চেয়ে পুরোনো", 43200]];
  function oldOpts(cur) {
    var f = false, h = OLDP.map(function (x) { var on = cur === x[1]; if (on) f = true; return '<option value="' + x[1] + '"' + (on ? " selected" : "") + ">" + x[0] + "</option>"; }).join("");
    if (!f) h += '<option value="' + cur + '" selected>' + fmtM(cur) + "-এর চেয়ে পুরোনো (কাস্টম)</option>";
    return h + '<option value="custom">✏️ কাস্টম সময়…</option>';
  }
  function msgUrl(cnt) {
    var u = cnt ? "mc2_ac_messages?select=id&limit=1" : "mc2_ac_messages?select=*&order=id.desc&limit=" + PERN + "&offset=" + (PGN * PERN);
    if (SES) u += "&session_id=eq." + encodeURIComponent(SES); else if (DEP) u += "&dept_id=eq." + encodeURIComponent(DEP);
    var q = QT.replace(/[,()*%\\:"]/g, " ").trim();
    if (q) u += "&or=" + encodeURIComponent("(body.ilike.*" + q + "*,nick.ilike.*" + q + "*)");
    if (ONLYF) u += "&file_path=not.is.null";
    return u;
  }
  function leftT(t) { var s = Math.max(0, Math.round((new Date(t).getTime() - Date.now()) / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.ceil(s % 3600 / 60); return d ? bdg(d) + " দিন " + bdg(h) + " ঘণ্টা" : h ? bdg(h) + " ঘণ্টা " + bdg(m % 60) + " মিনিট" : bdg(Math.max(1, m)) + " মিনিট"; }
  function delFiles(files) {
    var M = window.MCA, ch = [], i; for (i = 0; i < files.length; i += 100) ch.push(files.slice(i, i + 100));
    return Promise.all(ch.map(function (c) { return M.raw(M.base + "/storage/v1/object/mc2-chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: c }) }); })).then(function (rs) { return rs.every(function (x) { return x.ok; }); });
  }
  function purgeS(id, older) { // এক সেশনের বার্তা (RPC) + ফাইল (Storage)
    var M = window.MCA;
    return M.rpc("mc2_ac_admin_purge_now", { p_session: id, p_older_min: older || 0 }).then(function (r) {
      var f = r.files || [];
      return delFiles(f).then(function (ok) { return { deleted: +r.deleted || 0, files: f.length, ok: ok }; });
    });
  }
  function selSync() {
    var n = document.querySelectorAll("#view input[data-mid]:checked").length, b = document.querySelector('#view [data-a="delsel"]');
    if (b) { b.disabled = !n; b.textContent = "🗑 বাছা বার্তা মুছুন (" + bdg(n) + ")"; }
  }
  function delSel(b) {
    var M = window.MCA, ids = [].map.call(document.querySelectorAll("#view input[data-mid]:checked"), function (c) { return +c.dataset.mid; });
    if (!ids.length) { alert("আগে তালিকায় বার্তায় টিক দিন।"); return; }
    var files = []; LASTM.forEach(function (m) { if (ids.indexOf(m.id) >= 0 && m.file_path) files.push(m.file_path); });
    if (!confirm("⚠️ " + bdg(ids.length) + "টি বার্তা" + (files.length ? " ও " + bdg(files.length) + "টি ফাইল" : "") + " এখনই মুছে যাবে। আর ফেরানো যাবে না। মুছবেন?")) return;
    b.disabled = true;
    var ch = [], i; for (i = 0; i < ids.length; i += 100) ch.push(ids.slice(i, i + 100));
    ch.reduce(function (pr, c) { return pr.then(function () { return M.A("mc2_ac_messages?id=in.(" + c.join(",") + ")", { method: "DELETE" }); }); }, Promise.resolve())
      .then(function () { return files.length ? delFiles(files) : true; })
      .then(function (ok) { alert(bdg(ids.length) + "টি বার্তা মুছেছে" + (files.length ? (ok ? "; ফাইল Storage থেকেও মুছেছে।" : " — কিছু ফাইল Storage থেকে মোছা যায়নি (Supabase > Storage > mc2-chat দেখুন)।") : "।")); go(); })
      .catch(function (er) { b.disabled = false; M.fail(er); go(); });
  }
  // নাম/লেখা বা "শুধু ফাইল" ফিল্টার চালু থাকলে: শুধু মিল-থাকা বার্তাই মোছে (নতুন SQL লাগে না — তালিকার "মুছুন" যে পথে চলে সেই একই পথে)
  function filtOn() { return !!(QT.replace(/[,()*%\\:"]/g, " ").trim() || ONLYF); }
  function filtUrl(after) {
    var u = "mc2_ac_messages?select=id,file_path&order=id.desc&limit=1000";
    if (SES) u += "&session_id=eq." + encodeURIComponent(SES); else if (DEP) u += "&dept_id=eq." + encodeURIComponent(DEP);
    var q = QT.replace(/[,()*%\\:"]/g, " ").trim();
    if (q) u += "&or=" + encodeURIComponent("(body.ilike.*" + q + "*,nick.ilike.*" + q + "*)");
    if (ONLYF) u += "&file_path=not.is.null";
    if (XOLD) u += "&created_at=lt." + encodeURIComponent(new Date(Date.now() - XOLD * 60000).toISOString());
    if (after != null) u += "&id=lt." + after;
    return u;
  }
  function fetchAllMatch() { // সব মিল-থাকা বার্তা পাতা ধরে ধরে আনে (১০০০টা করে)
    var A = window.MCA.A, all = [];
    function step(after) {
      return A(filtUrl(after)).then(function (rows) {
        all = all.concat(rows || []);
        if (rows && rows.length >= 1000 && all.length < 200000) return step(rows[rows.length - 1].id);
        return all;
      });
    }
    return step(null);
  }
  function delFiltered(b) {
    var M = window.MCA, A = M.A, q = QT.replace(/[,()*%\\:"]/g, " ").trim();
    b.disabled = true;
    fetchAllMatch().then(function (rows) {
      b.disabled = false;
      if (!rows.length) { alert("এই ফিল্টারে মোছার মতো কোনো বার্তা নেই।"); return; }
      var ids = rows.map(function (x) { return x.id; }), files = rows.filter(function (x) { return x.file_path; }).map(function (x) { return x.file_path; });
      var fl = [q ? "নাম/লেখা: \u201C" + q + "\u201D" : "", ONLYF ? "শুধু ফাইলসহ বার্তা" : "", XOLD ? fmtM(XOLD) + "-এর চেয়ে পুরোনো" : ""].filter(Boolean).join(" · ");
      if (!confirm("⚠️ " + SCOPEN + "\nফিল্টার: " + fl + "\n\nশুধু এই ফিল্টারে মিলে যাওয়া " + bdg(ids.length) + "টি বার্তা" + (files.length ? " ও " + bdg(files.length) + "টি ফাইল" : "") + " এখনই মুছে যাবে। বাকি বার্তা থাকবে। আর ফেরানো যাবে না। মুছবেন?")) return;
      if (!DEP && !SES && !confirm("আপনি সব বিভাগের সব সেশন থেকে ফিল্টারে মেলা বার্তা মুছতে যাচ্ছেন। আবার নিশ্চিত করুন — সত্যিই মুছবেন?")) return;
      b.disabled = true;
      var ch = [], i; for (i = 0; i < ids.length; i += 100) ch.push(ids.slice(i, i + 100));
      return ch.reduce(function (pr, c) { return pr.then(function () { return A("mc2_ac_messages?id=in.(" + c.join(",") + ")", { method: "DELETE" }); }); }, Promise.resolve())
        .then(function () { return files.length ? delFiles(files) : true; })
        .then(function (ok) { alert(bdg(ids.length) + "টি বার্তা মুছেছে" + (files.length ? (ok ? "; ফাইল Storage থেকেও মুছেছে।" : " — কিছু ফাইল Storage থেকে মোছা যায়নি (Supabase > Storage > mc2-chat দেখুন)।") : "।")); go(); });
    }).catch(function (er) { b.disabled = false; M.fail(er); go(); });
  }
  // ---------- দুটো আলাদা অপশন: "📎 শুধু ফাইল মুছুন" (বার্তা থাকে) / "💬 শুধু চ্যাট মুছুন" (ফাইলসহ বার্তা থাকে) — বাছা বিভাগ/সেশনে; নতুন SQL লাগে না ----------
  function kindUrl(mode, after, ids) {
    var u = "mc2_ac_messages?select=id,file_path&order=id.desc&limit=1000";
    if (SES) u += "&session_id=eq." + encodeURIComponent(SES); else if (DEP) u += "&dept_id=eq." + encodeURIComponent(DEP);
    var q = QT.replace(/[,()*%\\:"]/g, " ").trim();
    if (q) u += "&or=" + encodeURIComponent("(body.ilike.*" + q + "*,nick.ilike.*" + q + "*)");
    u += mode === "files" ? "&file_path=not.is.null" : "&file_path=is.null&file_expired=eq.false";
    if (XOLD) u += "&created_at=lt." + encodeURIComponent(new Date(Date.now() - XOLD * 60000).toISOString());
    if (after != null) u += "&id=lt." + after;
    return u;
  }
  function kindAll(mode) {
    var A = window.MCA.A, all = [];
    function step(after) { return A(kindUrl(mode, after)).then(function (rows) { all = all.concat(rows || []); return rows && rows.length >= 1000 && all.length < 200000 ? step(rows[rows.length - 1].id) : all; }); }
    return step(null);
  }
  function delKind(b, mode) {
    var M = window.MCA, A = M.A, q = QT.replace(/[,()*%\\:"]/g, " ").trim(), isF = mode === "files", qi = M.$("#acmq"); if (qi) { QT = qi.value.trim(); q = QT.replace(/[,()*%\\:"]/g, " ").trim(); }
    b.disabled = true;
    kindAll(mode).then(function (rows) {
      b.disabled = false;
      if (!rows.length) { alert(isF ? "এই বাছাইয়ে মোছার মতো কোনো ফাইল নেই।" : "এই বাছাইয়ে মোছার মতো কোনো লেখার বার্তা নেই।"); return; }
      var ids = rows.map(function (x) { return x.id; }), files = rows.map(function (x) { return x.file_path; }).filter(Boolean);
      var fl = [q ? "নাম/লেখা: \u201C" + q + "\u201D" : "", XOLD ? fmtM(XOLD) + "-এর চেয়ে পুরোনো" : ""].filter(Boolean).join(" · ") || "কোনো বাড়তি ফিল্টার নেই";
      if (!confirm("⚠️ " + SCOPEN + "\nফিল্টার: " + fl + "\n\n" + (isF ? "শুধু ফাইল মুছবে: " + bdg(ids.length) + "টি ফাইল Storage থেকে মুছে যাবে। বার্তার লেখা থাকবে, সেখানে \"ফাইলের মেয়াদ শেষ\" দেখাবে।" : "শুধু চ্যাট মুছবে: ফাইল ছাড়া " + bdg(ids.length) + "টি লেখার বার্তা মুছে যাবে। ফাইলসহ বার্তা ও ফাইল থাকবে।") + "\n\nআর ফেরানো যাবে না। মুছবেন?")) return;
      if (!DEP && !SES && !confirm("আপনি সব বিভাগের সব সেশনে এটা চালাতে যাচ্ছেন। আবার নিশ্চিত করুন — সত্যিই মুছবেন?")) return;
      b.disabled = true;
      var ch = [], i; for (i = 0; i < ids.length; i += 100) ch.push(ids.slice(i, i + 100));
      return ch.reduce(function (pr, c) {
        return pr.then(function () { var f = "mc2_ac_messages?id=in.(" + c.join(",") + ")"; return isF ? A(f, Object.assign({ body: JSON.stringify({ file_path: null, file_expired: true }) }, RM)) : A(f, { method: "DELETE" }); });
      }, Promise.resolve())
        .then(function () { return files.length ? delFiles(files) : true; })
        .then(function (ok) { alert(isF ? bdg(ids.length) + "টি ফাইল মুছেছে (বার্তা আছে)" + (ok ? "; Storage থেকেও মুছেছে।" : " — কিছু ফাইল Storage থেকে মোছা যায়নি (Supabase > Storage > mc2-chat দেখুন)।") : bdg(ids.length) + "টি লেখার বার্তা মুছেছে।"); go(); });
    }).catch(function (er) { b.disabled = false; M.fail(er); go(); });
  }
  function delScope(b) {
    if (filtOn()) return delFiltered(b);
    var M = window.MCA, list = SCOPEL, older = XOLD;
    if (!list.length) { alert("এই বাছাইয়ে কোনো সেশন নেই।"); return; }
    var nm = 0, nf = 0; list.forEach(function (x) { nm += +x.msgs || 0; nf += +x.files || 0; });
    if (SCOPEK && !nm && !nf) { alert("এই বাছাইয়ে মোছার মতো কোনো বার্তা বা ফাইল নেই।"); return; }
    var names = list.slice(0, 12).map(function (x) { return "• " + x.dept + " › " + x.name; }).join("\n") + (list.length > 12 ? "\n… আরও " + bdg(list.length - 12) + "টি সেশন" : "");
    if (!confirm("⚠️ " + SCOPEN + "\n" + (older ? fmtM(older) + "-এর চেয়ে পুরোনো " : "সব ") + "বার্তা ও ফাইল এখনই মুছে যাবে (" + bdg(list.length) + "টি সেশন" + (SCOPEK ? ", মোট প্রায় " + bdg(nm) + "টি বার্তা, " + bdg(nf) + "টি ফাইল" : "") + "):\n" + names + "\n\nবিভাগ/সেশন নিজে থাকবে, শুধু বার্তা ও ফাইল মুছবে। আর ফেরানো যাবে না। মুছবেন?")) return;
    if (!DEP && !SES && !confirm("আপনি সব বিভাগের সব সেশনের চ্যাট মুছতে যাচ্ছেন। আবার নিশ্চিত করুন — সত্যিই সব মুছবেন?")) return;
    b.disabled = true;
    var dm = 0, df = 0, bad = false, done = 0;
    list.reduce(function (pr, x) { return pr.then(function () { return purgeS(+x.id, older); }).then(function (o) { dm += o.deleted; df += o.files; if (!o.ok) bad = true; done++; }); }, Promise.resolve()).then(function () {
      alert(bdg(done) + "টি সেশন থেকে " + bdg(dm) + "টি বার্তা মুছেছে" + (df ? "; ফাইল " + bdg(df) + "টি" + (bad ? " — কিছু ফাইল Storage থেকে মোছা যায়নি (Supabase > Storage > mc2-chat দেখুন)।" : " Storage থেকেও মুছেছে।") : "।")); go();
    }).catch(function (er) { b.disabled = false; alert("থেমে গেছে — " + bdg(done) + "টি সেশন শেষ হয়েছে, বাকিগুলো মোছা হয়নি।"); window.MCA.fail(er); go(); });
  }
  // ব্যান/Restriction ডায়ালগ: সময় (প্রিসেট বা কাস্টম) + নোট
  var BDUR = [["১ ঘণ্টা", 60], ["৬ ঘণ্টা", 360], ["২৪ ঘণ্টা", 1440], ["৩ দিন", 4320], ["৭ দিন", 10080], ["৩০ দিন", 43200]];
  function banDlg(title) {
    return new Promise(function (ok) {
      var E = window.MCA.esc, Z = document.createElement("div");
      Z.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:50;display:flex;align-items:center;justify-content:center;padding:12px";
      Z.innerHTML = '<div class="c" style="width:100%;max-width:420px;display:grid;gap:8px"><h2>' + E(title) + "</h2>" +
        '<label>সময়কাল<select id="bdD">' + BDUR.map(function (d) { return '<option value="' + d[1] + '"' + (d[1] === 1440 ? " selected" : "") + ">" + d[0] + "</option>"; }).join("") + '<option value="custom">✏️ কাস্টম সময়…</option></select></label>' +
        '<div class="row" id="bdCW" hidden><label>কত<input id="bdCN" type="number" min="1" inputmode="numeric" placeholder="যেমন ৪৫"></label><label>একক<select id="bdCU"><option value="1">মিনিট</option><option value="60">ঘণ্টা</option><option value="1440">দিন</option></select></label></div>' +
        '<label>📝 নোট / কারণ (অন্তত ৩ অক্ষর; ইউজারকে দেখানো হতে পারে)<textarea id="bdR" rows="3" maxlength="300"></textarea></label><div class="sm" id="bdE" style="color:var(--red)"></div>' +
        '<div class="sm">সময় ৫ মিনিট থেকে ৩০ দিন। স্থায়ী ব্যান লাগলে 🛡️ মডারেশনে করুন (৩টি বৈধ রিপোর্ট + যাচাই লাগে)।</div>' +
        '<div class="act"><button id="bdOk" type="button">নিশ্চিত করুন</button><button class="l" id="bdNo" type="button">বাতিল</button></div></div>';
      document.body.appendChild(Z);
      var q = function (x) { return Z.querySelector(x); }, done = function (v) { Z.remove(); ok(v); };
      q("#bdNo").onclick = function () { done(null); };
      q("#bdD").onchange = function () { q("#bdCW").hidden = this.value !== "custom"; };
      q("#bdOk").onclick = function () {
        var r = q("#bdR").value.trim(), mn = q("#bdD").value;
        if (r.length < 3) { q("#bdE").textContent = "নোট/কারণ অন্তত ৩ অক্ষরে লিখুন।"; return; }
        if (mn === "custom") { var cn = Math.floor(+q("#bdCN").value * +q("#bdCU").value); if (!(cn >= 5 && cn <= 43200)) { q("#bdE").textContent = "কাস্টম সময় ৫ মিনিট থেকে ৩০ দিনের মধ্যে দিন।"; return; } mn = cn; }
        done({ minutes: +mn, reason: r });
      };
    });
  }
  function sanc(a, b) {
    var M = window.MCA, ban = a === "mban";
    banDlg((ban ? "⛔ সাময়িক ব্যান — " : "⏳ Restriction (শুধু পড়তে পারবে) — ") + (b.dataset.n || "ইউজার")).then(function (d) {
      if (!d) return;
      return M.rpc("mc2_ac_admin_sanction", { p_voter: b.dataset.v, p_kind: ban ? "ban" : "restrict", p_minutes: d.minutes, p_reason: d.reason }).then(go);
    }).catch(M.fail);
  }
  function unb(b) {
    var M = window.MCA, n = prompt("Unban / Restriction তুলে নিচ্ছেন — " + (b.dataset.n || "") + "\nনোট (ঐচ্ছিক):", ""); if (n === null) return;
    M.rpc("mc2_ac_admin_unban", { p_voter: b.dataset.v, p_reason: n.trim() || null }).then(go).catch(M.fail);
  }
  function view() {
    if (window.MCPG) { PERN = SPER = window.MCPG.per(); }
    var M = window.MCA, A = M.A, esc = M.esc, mode = MODE;
    return Promise.all([A("mc2_ac_depts?select=*&order=sort,name"), A("mc2_ac_sessions?select=*&order=sort,name"), mode === "msgs" ? A(msgUrl()) : Promise.resolve([]), A("mc2_ac_cfg?select=value&key=eq.upload").catch(function () { return null; }), A("mc2_ac_cfg?select=key,value&key=in.(keep_min,file_keep_min)").catch(function () { return []; }), mode === "msgs" ? M.rpc("mc2_ac_admin_retention").catch(function () { return null; }) : Promise.resolve(null), mode === "msgs" ? M.rpc("mc2_ac_admin_mods").catch(function () { return null; }) : Promise.resolve(null), mode === "msgs" ? M.raw(M.base + "/rest/v1/" + msgUrl(true), { headers: { Prefer: "count=exact" } }).then(function (x) { var m = /\/(\d+)/.exec(x.headers.get("content-range") || ""); return m ? +m[1] : null; }).catch(function () { return null; }) : Promise.resolve(null)]).then(function (r) {
      var D = r[0], S = r[1], Ms = r[2], MT = r[7] == null ? PGN * PERN + Ms.length : r[7], dn = {}, sn = {}, DEF = { c: 1440, f: 1440 };
      (r[4] || []).forEach(function (x) { if (x.key === "keep_min") DEF.c = +x.value; if (x.key === "file_keep_min") DEF.f = +x.value; });
      D.forEach(function (d) { dn[d.id] = d.name; }); S.forEach(function (s) { sn[s.id] = s.name; });
      var row = function (k, x, extra) {
        var h = '<div class="it' + (x.active ? "" : " hid") + '"><div><b>' + esc(x.name) + "</b> " + (x.active ? "" : '<span class="tag">বন্ধ</span>');
        if (k === "s" && x.pw_hash) h += x.pw_on ? ' <span class="tag">🔒 পাসওয়ার্ড চালু</span>' : ' <span class="tag">🔓 পাসওয়ার্ড বন্ধ (সেভ আছে)</span>';
        if (k === "s" && x.pw_note) h += ' <span class="tag">📝 নোটিশ আছে</span> ' + (x.pw_note_on === false ? '<span class="tag">🙈 হোমে লুকানো</span>' : '<span class="tag">👁 হোমে দেখাচ্ছে</span>');
        if (k === "s") h += x.home_on ? ' <span class="tag">🏠 হোমে চালু</span>' : ' <span class="tag">🏠 হোমে বন্ধ</span>';
        if (k === "d") { var hs = S.filter(function (z) { return String(z.dept_id) === String(x.id); }), hn = hs.filter(function (z) { return z.home_on; }).length; h += ' <span class="tag">🏠 হোমে ' + bdg(hn) + "/" + bdg(hs.length) + " সেশন চালু</span>"; }
        h += "</div>" + (k === "s" ? (x.pw_hash ? PW.html(x.id) : '<div class="sm">🔑 বর্তমান পাসওয়ার্ড: নেই</div>') : "") + '<div class="act">';
        if (k === "s") h += '<button class="' + (x.home_on ? "d" : "") + ' s" data-a="hms" data-id="' + x.id + '" data-v="' + (x.home_on ? 0 : 1) + '">' + (x.home_on ? "🏠 হোম থেকে লুকান" : "🏠 হোমে দেখান") + "</button>";
        if (k === "d") h += '<button class="s" data-a="hmd" data-id="' + x.id + '" data-v="1">🏠 সব সেশন হোমে দেখান</button><button class="d s" data-a="hmd" data-id="' + x.id + '" data-v="0">🏠 সব লুকান</button>';
        if (k === "s") {
          h += '<button class="l s" data-a="pws" data-id="' + x.id + '">🔑 ' + (x.pw_hash ? "পাসওয়ার্ড বদলান/সরান" : "পাসওয়ার্ড দিন") + "</button>";
          if (x.pw_note) h += '<button class="' + (x.pw_note_on === false ? "" : "d") + ' s" data-a="nvs" data-id="' + x.id + '" data-v="' + (x.pw_note_on === false ? 1 : 0) + '">' + (x.pw_note_on === false ? "👁 নোটিশ দেখান" : "🙈 নোটিশ লুকান") + "</button>";
          if (x.pw_hash) h += '<button class="' + (x.pw_on ? "d" : "") + ' s" data-a="pwt" data-id="' + x.id + '" data-v="' + (x.pw_on ? 0 : 1) + '">' + (x.pw_on ? "🔓 পাসওয়ার্ড বন্ধ করুন" : "🔒 পাসওয়ার্ড চালু করুন") + "</button>";
          h += '<button class="l s" data-a="pwn" data-id="' + x.id + '" data-sn="' + esc(x.name) + '" data-note="' + esc(x.pw_note || "") + '">📝 নির্দেশনা' + (x.pw_note ? " ✓" : "") + "</button>";
        }
        h += '<button class="l s" data-a="tg' + k + '" data-id="' + x.id + '" data-v="' + (x.active ? 0 : 1) + '">' + (x.active ? "বন্ধ করুন" : "চালু করুন") + '</button><button class="l s" data-a="rn' + k + '" data-id="' + x.id + '" data-n="' + esc(x.name) + '">নাম বদল</button><button class="d s" data-a="dl' + k + '" data-id="' + x.id + '">মুছুন</button></div>' + (extra || "") + "</div>";
        return h;
      };
      var lockSum = function (d) { var L = S.filter(function (s) { return String(s.dept_id) === String(d.id); }), on = L.filter(function (s) { return s.pw_hash && s.pw_on; }).length; return '<div class="sm">🔒 ' + bdg(on) + "/" + bdg(L.length) + " সেশনে পাসওয়ার্ড চালু</div>"; };
      var lk = function (t, s, txt) { return '<button class="l s" type="button" data-a="' + (s ? "gomod" : "gotab") + '" data-t="' + t + '">' + txt + "</button>"; };
      var h = "";
      if (mode === "home") {
        var up = !r[3] || !r[3].length || r[3][0].value !== false;
        h = '<div class="it"><div><b>📎 ফাইল আপলোড (ছবি/ভিডিও/অডিও/ফাইল):</b> <span class="tag">' + (up ? "চালু" : "বন্ধ") + '</span></div><div class="act"><button class="' + (up ? "d" : "") + ' s" data-a="up" data-v="' + (up ? 0 : 1) + '">' + (up ? "⛔ আপলোড বন্ধ করুন" : "✅ আপলোড চালু করুন") + '</button></div><div class="sm">বন্ধ করলে সবার জন্য আপলোড পুরোপুরি বন্ধ হয় (সার্ভারেও); আগের ফাইল দেখা যায়।</div></div>' +
          '<div class="act" style="margin:8px 0"><button class="s" type="button" data-a="actgo">🟢 সক্রিয় ইউজার ও ব্যান (সব তথ্য)</button></div>' +
          '<div class="it"><div><b>📁 চ্যাট মডিফাই</b></div><div class="sm">বিভাগ ও সেশন যোগ, নাম বদল, চালু-বন্ধ, মোছা, পাসওয়ার্ড (একটা সেশনে / একটা বিভাগের সব সেশনে / সব সেশনে একসাথে)।</div><div class="act">' + lk("acs", 0, "📁 খুলুন") + '</div></div>' +
          '<div class="it"><div><b>🧹 চ্যাট ডিলেট</b></div><div class="sm">বার্তা লুকানো/মোছা, বিভাগ-ভিত্তিক মোছার সময়, এখনই মুছুন, ফাইল মোছা।</div><div class="act">' + lk("acm", 0, "🧹 খুলুন") + "</div></div>";
      } else if (mode === "struct") {
        var ED = DEP || ((S.filter(function (s) { return String(s.id) === String(SES); })[0] || {}).dept_id) || "", sqL = SQ.toLowerCase();
        var okS = function (s) {
          if (DEP && String(s.dept_id) !== String(DEP)) return false;
          if (SES && String(s.id) !== String(SES)) return false;
          if (sqL && String(s.name).toLowerCase().indexOf(sqL) < 0) return false;
          if (SST === "on" && !s.active) return false;
          if (SST === "off" && s.active) return false;
          var hp = !!s.pw_hash, po = hp && !!s.pw_on, hn = !!(s.pw_note && String(s.pw_note).trim());
          if (SPW === "on" && !po) return false;
          if (SPW === "saved" && !(hp && !po)) return false;
          if (SPW === "none" && hp) return false;
          if (SNT === "has" && !hn) return false;
          if (SNT === "no" && hn) return false;
          return true;
        };
        var SL = S.filter(okS), SPGMAX = Math.max(0, Math.ceil(SL.length / SPER) - 1);
        if (SPG > SPGMAX) SPG = SPGMAX;
        var PS = SL.slice(SPG * SPER, SPG * SPER + SPER), dcnt = {};
        S.forEach(function (s) { dcnt[s.dept_id] = (dcnt[s.dept_id] || 0) + 1; });
        var selO = function (cur, arr) { return arr.map(function (x) { return '<option value="' + x[0] + '"' + (cur === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join(""); };
        var DOPT = D.map(function (d) { return '<option value="' + d.id + '"' + (String(d.id) === String(DEP) ? " selected" : "") + ">" + esc(d.name) + (d.active ? "" : " (বন্ধ)") + " (" + bdg(dcnt[d.id] || 0) + "টি সেশন)</option>"; }).join("");
        var SOPT = S.filter(function (s) { return !DEP || String(s.dept_id) === String(DEP); }).map(function (s) { return '<option value="' + s.id + '"' + (String(s.id) === String(SES) ? " selected" : "") + ">" + (DEP ? "" : esc(dn[s.dept_id] || "") + " › ") + esc(s.name) + (s.active ? "" : " (বন্ধ)") + "</option>"; }).join("");
        var EDD = D.filter(function (d) { return String(d.id) === String(ED); })[0];
        h = '<h2>🔎 ফিল্টার</h2><div class="it"><div class="row"><label>📁 বিভাগ<select id="acdsel"><option value="">সব বিভাগ</option>' + DOPT + '</select></label><label>সেশন<select id="acssel"><option value="">সব সেশন</option>' + SOPT + '</select></label></div>' +
          '<div class="row"><label>অবস্থা<select id="acst">' + selO(SST, [["", "সব"], ["on", "চালু"], ["off", "বন্ধ"]]) + '</select></label><label>🔒 পাসওয়ার্ড<select id="acpw">' + selO(SPW, [["", "সব"], ["on", "🔒 চালু"], ["saved", "🔓 বন্ধ (সেভ আছে)"], ["none", "পাসওয়ার্ড নেই"]]) + '</select></label><label>📝 নির্দেশনা<select id="acnt">' + selO(SNT, [["", "সব"], ["has", "আছে"], ["no", "নেই"]]) + '</select></label></div>' +
          '<div class="row"><label>🔎 সেশনের নাম দিয়ে খুঁজুন<input id="acsq" value="' + esc(SQ) + '" placeholder="যেমন ২০২৬"></label></div>' +
          '<div class="act" style="margin-top:6px"><button class="s" type="button" data-a="sqs">🔎 খুঁজুন</button><button class="l s" type="button" data-a="sqc">✖ ফিল্টার মুছুন</button></div>' +
          '<div class="sm" style="margin-top:6px">দেখানো হচ্ছে: ' + bdg(SL.length) + "টি সেশন (মোট " + bdg(S.length) + "টির মধ্যে) · মোট " + bdg(D.length) + "টি বিভাগ</div></div>" +
          '<p class="sm" style="margin-top:8px">বিভাগ/সেশনের কাঠামো ও পাসওয়ার্ড। বার্তা ও ফাইল মোছা, মোছার সময় → ' + lk("acm", 0, "🧹 চ্যাট ডিলেট ফোল্ডারে গেছে") + "</p>" +
          "<h2>বিভাগ</h2>" + (EDD ? row("d", EDD, lockSum(EDD)) : '<p class="sm">উপরের "বিভাগ" ড্রপডাউন থেকে একটা বিভাগ বাছলে এখানে তার নাম বদল / চালু-বন্ধ / মোছা বোতাম আসবে।</p>') +
          '<div class="row" style="margin-top:8px"><label>নতুন বিভাগ (কমা দিয়ে একাধিক)<input id="acnd" maxlength="200"></label><button data-a="add-d" type="button">যোগ করুন</button></div>' +
          '<h2 style="margin-top:16px">সেশন</h2>' + (PS.map(function (s) { return row("s", s, ED ? "" : '<div class="sm">📁 ' + esc(dn[s.dept_id] || "") + "</div>"); }).join("") || '<p class="sm">এই ফিল্টারে কোনো সেশন নেই।</p>') +
          (window.MCPG ? window.MCPG.html(SPG, SL.length, SPER, 'data-a="spg" data-p') : "") +
          '<div class="row" style="margin-top:8px">' + (DEP ? "" : '<label>কোন বিভাগে<select id="acnsd"><option value="">— বিভাগ বাছুন —</option>' + D.map(function (d) { return '<option value="' + d.id + '"' + (String(d.id) === String(ED) ? " selected" : "") + ">" + esc(d.name) + "</option>"; }).join("") + "</select></label>") + '<label>নতুন সেশন (কমা দিয়ে একাধিক, যেমন ২০২৬-২৭, ২০২৭-২৮)<input id="acns" maxlength="200"></label><button data-a="add-s" type="button">যোগ করুন</button></div>';
        if (ED || SES) { var LD = PS; if (LD.length) h += '<h2 style="margin-top:16px">📝 প্রতি সেশনে আলাদা নির্দেশনা</h2><div class="sm">প্রতিটি সেশনের জন্য আলাদা লেখা দিন; যেটা বদলাবেন শুধু সেটাই সেভ হবে। খালি রাখলে ওই সেশনে নির্দেশনা থাকবে না। ইউজার সেশন বাছলেই এটা দেখবে।</div>' + LD.map(function (s) { return '<div class="it"><div><b>' + esc(s.name) + '</b></div><textarea data-nid="' + s.id + '" data-orig="' + esc(s.pw_note || "") + '" rows="2" maxlength="500" style="width:100%;box-sizing:border-box" placeholder="এই সেশনের আলাদা নির্দেশনা…">' + esc(s.pw_note || "") + '</textarea></div>'; }).join("") + '<div class="act"><button class="s" type="button" data-a="nsave">💾 বদলানোগুলো সেভ করুন</button></div>' + (NMSG ? '<div class="sm" style="color:var(--g);font-weight:700">' + esc(NMSG) + "</div>" : ""); }
        h += '<h2 style="margin-top:16px">🔒 একসাথে পাসওয়ার্ড লক</h2><div class="it"><div class="row"><label>কোথায় লাগবে<select id="acbs"><option value="all">সব বিভাগের সব সেশনে</option>' + D.map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + " বিভাগের সব সেশনে</option>"; }).join("") + '</select></label></div><div class="act"><button class="s" type="button" data-a="bpw">🔑 একই পাসওয়ার্ড বসান</button><button class="s" type="button" data-a="bon">🔒 সব চালু করুন</button><button class="l s" type="button" data-a="boff">🔓 সব বন্ধ করুন</button><button class="d s" type="button" data-a="brm">সব পাসওয়ার্ড সরান</button></div>' + PW.bulkHtml() + '<label style="margin-top:6px">📝 সবার জন্য একই নির্দেশনা (ঐচ্ছিক — ডিফল্টে খালি; লিখে বসালে ইউজার সেশন বাছলেই দেখবে। প্রতি সেশনে আলাদা লেখা নিচের "সেশন" অংশে)<textarea id="acbn" rows="3" maxlength="500" placeholder="যেমন: শুধু পেইড সদস্যরা ঢুকতে পারবে; পাসওয়ার্ড পেতে অমুকের সাথে যোগাযোগ করুন"></textarea></label><label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="acbk" checked> যাদের আলাদা নির্দেশনা আছে তাদের বদলাবো না <span class="sm">(শুধু "বসান"-এ; ফাঁকা সেশনেই বসবে)</span></label><div class="act"><button class="s" type="button" data-a="bnote">📝 নির্দেশনা বসান</button><button class="l s" type="button" data-a="bnrm">নির্দেশনা সরান</button></div>' + (BMSG ? '<div class="sm" style="color:var(--g);font-weight:700">' + esc(BMSG) + "</div>" : "") +
          '<div class="sm">প্রতিটি সেশনে হ্যাশ আলাদা হয়ে সেভ হয়। বসালে/সরালে/চালু-বন্ধ করলে ওই সেশনগুলোর আগের সবাইকে আবার পাসওয়ার্ড দিতে হবে। এক সেশনে ঢুকলে অন্য সেশন খোলে না, প্রতিটিতে আলাদা করে দিতে হয়। পরে যোগ করা নতুন সেশন নিজে থেকে লক হয় না। নিচের তালিকা থেকে এক সেশনে আলাদা পাসওয়ার্ডও দেওয়া যায়। (SQL: supabase-new-20261020.sql)</div></div>';
        h += '<p class="sm">বিভাগ/সেশন মুছলে সেটা বিনে যায় না, সরাসরি মুছে যায় (ফেরানোর ব্যবস্থা এখনো নেই)।</p>';
      } else {
        var RET = r[5], MODS = r[6] || [], mm = {}, cnt = {};
        MODS.forEach(function (u) { mm[u.voter] = u; });
        ((RET && RET.sessions) || []).forEach(function (x) { cnt[x.id] = x; });
        LASTM = Ms;
        var Sd = S.filter(function (x) { return !DEP || String(x.dept_id) === String(DEP); });
        var inScope = SES ? Sd.filter(function (x) { return String(x.id) === String(SES); }) : Sd;
        SCOPEK = !!RET; SCOPEL = inScope.map(function (x) { var c = cnt[x.id] || {}; return { id: x.id, name: x.name, dept: dn[x.dept_id] || "", msgs: c.msgs, files: c.files }; });
        var sm = 0, sf = 0; SCOPEL.forEach(function (x) { sm += +x.msgs || 0; sf += +x.files || 0; });
        SCOPEN = SES ? "সেশন: " + (dn[(inScope[0] || {}).dept_id] || "") + " › " + ((inScope[0] || {}).name || "") : DEP ? "বিভাগ: " + (dn[DEP] || "") + " (এর সব সেশন)" : "সব বিভাগ ও সব সেশন";
        h = '<p class="sm">বিভাগ/সেশন/পাসওয়ার্ড → ' + lk("acs", 0, "📁 চ্যাট মডিফাইয়ে গেছে") + '</p><div class="act" style="margin:8px 0">' + lk("mod", 1, "🕒 স্বয়ংক্রিয় মোছা (মডারেশনে)").replace('data-t="mod"', 'data-t="keep"') + lk("mod", 1, "📎 ফাইল আপলোড সেটিংস").replace('data-t="mod"', 'data-t="upload"') + "</div>" +
          "<h2>🕒 বিভাগ-ভিত্তিক মোছার সময়</h2>" + (D.map(function (d) {
            var dc = d.keep_min == null ? DEF.c : +d.keep_min, df = d.file_keep_min == null ? DEF.f : +d.file_keep_min, ss = S.filter(function (s) { return String(s.dept_id) === String(d.id); });
            return '<div class="it"><div><b>' + esc(d.name) + "</b></div>" + DK.box(d, DEF) +
              (ss.length ? '<div class="sm" style="margin-top:6px"><b>📌 প্রতি সেশনের আলাদা সময়</b> — কোনো সেশনে নিজস্ব সময় দিলে চ্যাটের জন্য সেটাই বিভাগের মানের আগে চলে; ফাঁকা (ডিফল্ট) রাখলে বিভাগের মান। ফাইল/অ্যাটাচমেন্টের সময় বিভাগের মানেই চলে (সেশন-ভিত্তিক ফাইল-সময় সার্ভারে নেই)।</div>' + ss.map(function (s) { var c = cnt[s.id], kp = c && c.keep_min !== undefined ? c.keep_min : s.keep_min; return SK.box({ id: s.id, name: s.name, keep_min: kp }, dc, df, c ? c.msgs : null); }).join("") : '<div class="sm">এই বিভাগে এখনো সেশন নেই।</div>') + "</div>";
          }).join("") || '<p class="sm">এখনো বিভাগ নেই।</p>') +
          '<h2 style="margin-top:16px">🔎 বিভাগ ও সেশন দিয়ে ফিল্টার</h2><div class="it"><div class="row"><label>বিভাগ<select id="acdsel"><option value="">সব বিভাগ</option>' + D.map(function (d) { return '<option value="' + d.id + '"' + (String(d.id) === String(DEP) ? " selected" : "") + ">" + esc(d.name) + "</option>"; }).join("") + '</select></label>' +
          '<label>সেশন<select id="acssel"><option value="">সব সেশন</option>' + Sd.map(function (x) { var c = cnt[x.id]; return '<option value="' + x.id + '"' + (String(x.id) === String(SES) ? " selected" : "") + ">" + (DEP ? "" : esc(dn[x.dept_id] || "") + " › ") + esc(x.name) + (c ? " (" + bdg(c.msgs) + "টি)" : "") + "</option>"; }).join("") + '</select></label>' +
          '<label>🔎 নাম/লেখা দিয়ে খুঁজুন<input id="acmq" value="' + esc(QT) + '" placeholder="নিকনেম বা বার্তার লেখা"></label></div>' +
          '<div class="act" style="margin-top:6px"><label class="chk"><input type="checkbox" id="acmf"' + (ONLYF ? " checked" : "") + '><span>শুধু ফাইলসহ বার্তা</span></label><button class="s" type="button" data-a="qs">🔎 খুঁজুন</button><button class="l s" type="button" data-a="qc">✖ ফিল্টার মুছুন</button></div></div>' +
          '<div class="it" id="acbulk"><div><b>🗑 ফিল্টার করে মুছুন</b></div><div class="sm">দুই ভাবে মোছা যায়: (১) নিচের তালিকায় টিক দিয়ে বাছা বার্তা; (২) বাছা বিভাগ/সেশনের সব বার্তা একবারে (তালিকার বাইরেরগুলোও) — নাম/লেখা বা \"শুধু ফাইল\" ফিল্টার দিলে শুধু মিল-থাকাগুলো মুছবে। <b>আর ফেরানো যাবে না।</b></div>' +
          '<div class="act"><label class="chk"><input type="checkbox" id="acall"><span>তালিকার সব বার্তা বাছুন</span></label><button class="d s" type="button" data-a="delsel" disabled>🗑 বাছা বার্তা মুছুন (০)</button></div>' +
          '<div class="row" style="margin-top:6px"><label>কত পুরোনো বার্তা (নিচের "সব বার্তা মুছুন" বোতামের জন্য)<select id="acold">' + oldOpts(XOLD) + "</select></label></div>" +
          '<div class="sm" style="margin-top:6px;font-weight:700">🎯 এখন বাছা: ' + esc(SCOPEN) + '</div><div class="act"><button class="d s" type="button" data-a="delfilesonly">📎 শুধু ফাইল মুছুন (বার্তা থাকবে)</button><button class="d s" type="button" data-a="delchatonly">💬 শুধু চ্যাট মুছুন (ফাইলসহ বার্তা থাকবে)</button></div><div class="sm" style="margin:4px 0">উপরের দুটো বোতাম বাছা বিভাগ/সেশন, "কত পুরোনো" ও নাম/লেখা ফিল্টার মানে। নিচেরটা বার্তা ও ফাইল দুটোই একসাথে মোছে।</div><div class="act"><button class="d s" type="button" data-a="delscope">🗑 ' + esc(SCOPEN) + (filtOn() ? " — শুধু ফিল্টারে মেলা বার্তা মুছুন" : " — চ্যাট মুছুন" + (RET ? " (প্রায় " + bdg(sm) + "টি বার্তা, " + bdg(sf) + "টি ফাইল)" : "")) + "</button></div></div>" +
          '<h2 style="margin-top:16px">সাম্প্রতিক বার্তা (মোট ' + bdg(MT) + "টি" + (SES ? " — এই সেশনের" : DEP ? " — এই বিভাগের" : "") + ")</h2>" +
          (window.MCPG ? window.MCPG.box : function (x) { return x; })(Ms.map(function (m) {
            var u = mm[m.voter], blk = u && u.st && u.st !== "ok", nick = esc(m.nick), vv = ' data-v="' + esc(m.voter) + '" data-n="' + nick + '"';
            return '<div class="it' + (m.hidden ? " hid" : "") + '"><div><label class="chk" style="display:inline-flex"><input type="checkbox" data-mid="' + m.id + '"></label> <button class="lk" type="button" data-uu="' + esc(m.voter) + '"><b>' + nick + '</b></button> <span class="tag">' + esc(dn[m.dept_id] || "") + " · " + esc(sn[m.session_id] || "") + '</span> <span class="sm">' + M.tm(m.created_at) + " · " + esc(String(m.voter).slice(0, 8)) + "</span>" +
              (blk ? ' <span class="tag warn">' + (u.st === "banned" ? (u.until ? "⛔ সাময়িক ব্যান (বাকি " + leftT(u.until) + ")" : "⛔ স্থায়ী ব্যান") : "⏳ Restriction (বাকি " + (u.until ? leftT(u.until) : "—") + ")") + "</span>" : "") + "</div><div>" + esc(m.body) + "</div>" +
              (blk && u.reason ? '<div class="sm">ব্যানের নোট: ' + esc(u.reason) + "</div>" : "") +
              (m.kind && m.kind !== "text" ? '<div><a href="' + esc(M.base + "/storage/v1/object/public/mc2-chat/" + m.file_path) + '" target="_blank" rel="noopener">📎 ' + esc(m.file_name || "ফাইল") + "</a></div>" : "") + (m.deleted ? '<div class="sm">(পাঠকারী সবার জন্য মুছেছে)</div>' : "") +
              '<div class="act"><button class="l s" data-a="hm" data-id="' + m.id + '" data-v="' + (m.hidden ? 0 : 1) + '">' + (m.hidden ? "দেখান" : "লুকান") + '</button><button class="d s" data-a="dm" data-id="' + m.id + '">মুছুন</button>' +
              '<button class="d s" type="button" data-a="mban"' + vv + '>⛔ ব্যান (সময়+নোট)</button><button class="l s" type="button" data-a="mrs"' + vv + '>⏳ Restriction</button>' + (blk ? '<button class="s" type="button" data-a="mub"' + vv + ">✅ Unban</button>" : "") + "</div></div>";
          }).join("") || '<p class="sm">এই ফিল্টারে কোনো বার্তা নেই।</p>', "acml") +
          (window.MCPG ? window.MCPG.html(PGN, MT, PERN, 'data-a="mpg" data-p') : "");
      }
      var V = M.$("#view"); V.innerHTML = h;
      V.onchange = function (e) {
        if (DK.change(e) || SK.change(e)) return; var t = e.target, qi0 = M.$("#acsq"); if (qi0) SQ = qi0.value.trim();
        if (t.id === "acdsel") { DEP = t.value; SES = ""; PGN = 0; SPG = 0; NMSG = ""; go(); return; }
        if (t.id === "acst") { SST = t.value; SPG = 0; go(); return; }
        if (t.id === "acpw") { SPW = t.value; SPG = 0; go(); return; }
        if (t.id === "acnt") { SNT = t.value; SPG = 0; go(); return; }
        if (t.id === "acssel") { SES = t.value; PGN = 0; SPG = 0; go(); return; }
        if (t.id === "acmf") { ONLYF = t.checked; PGN = 0; go(); return; }
        if (t.id === "acold") { if (t.value === "custom") { var mm2 = askM("কত সময়ের চেয়ে পুরোনো বার্তা মুছবেন? (৩০ = মিনিট, 2h = ঘণ্টা, 5d = দিন)"); if (mm2 !== null && mm2 > 0) XOLD = mm2; } else XOLD = +t.value; t.innerHTML = oldOpts(XOLD); return; }
        if (t.id === "acall") { [].forEach.call(V.querySelectorAll("input[data-mid]"), function (c) { c.checked = t.checked; }); selSync(); return; }
        if (t.hasAttribute && t.hasAttribute("data-mid")) selSync();
      };
      V.onkeydown = function (e) { if (e.key === "Enter" && e.target.id === "acmq") { QT = e.target.value.trim(); PGN = 0; go(); } if (e.key === "Enter" && e.target.id === "acsq") { SQ = e.target.value.trim(); SPG = 0; go(); } };
      V.onclick = function (e) {
        if (DK.click(e, go) || SK.click(e, go) || PW.click(e)) return;
        var b = e.target.closest("[data-a]"); if (!b) return; if (b.dataset.a === "actgo") { if (window.MCA_MODGO) window.MCA_MODGO("active"); return; }
        var noteErr = function (er) { var x = er && er.message ? er.message : String(er); if (/pwnote|PGRST202|42883/.test(x)) { alert("নতুন SQL (supabase-new-20261020.sql) এখনো চালানো হয়নি — আগে সেটা Supabase-এ একবার Run করুন।"); return; } throw er; };
        var a = b.dataset.a, id = b.dataset.id, T = { d: "mc2_ac_depts", s: "mc2_ac_sessions" }, t = T[a.slice(-1)], p;
        if (a === "gotab") { tabGo(b.dataset.t); return; }
        if (a === "sqs") { SQ = M.$("#acsq").value.trim(); SPG = 0; go(); return; }
        if (a === "sqc") { DEP = ""; SES = ""; SQ = ""; SST = ""; SPW = ""; SNT = ""; SPG = 0; NMSG = ""; go(); return; }
        if (a === "spg") { if (!b.disabled) { SPG = +b.dataset.p; go(); } return; }
        if (a === "qs") { QT = M.$("#acmq").value.trim(); PGN = 0; go(); return; }
        if (a === "qc") { DEP = ""; SES = ""; QT = ""; ONLYF = false; PGN = 0; go(); return; }
        if (a === "mpg") { if (!b.disabled) { PGN = +b.dataset.p; go(); } return; }
        if (a === "delsel") { delSel(b); return; }
        if (a === "delfilesonly") { delKind(b, "files"); return; }
        if (a === "delchatonly") { delKind(b, "chat"); return; }
        if (a === "delscope") { var qi = M.$("#acmq"); if (qi) QT = qi.value.trim(); delScope(b); return; }
        if (a === "mban" || a === "mrs") { sanc(a, b); return; }
        if (a === "mub") { unb(b); return; }
        if (a === "gomod") { if (window.MCA_MODGO) window.MCA_MODGO(b.dataset.t); return; }
        if (a === "add-d" || a === "add-s") { var s = a === "add-d", names = M.$(s ? "#acnd" : "#acns").value.split(/[,،]/).map(function (x) { return x.trim(); }).filter(Boolean); if (!names.length) return;
          var dpid = s ? "" : (M.$("#acnsd") ? M.$("#acnsd").value : DEP); if (!s && !dpid) { alert("আগে বিভাগ বাছুন।"); return; }
          p = A(s ? T.d : T.s, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(names.map(function (n, i) { return s ? { name: n, sort: 100 + i } : { name: n, dept_id: +dpid, sort: 100 + i }; })) }); }
        else if (a === "nvs") p = A("mc2_ac_sessions?id=eq." + id, Object.assign({ body: JSON.stringify({ pw_note_on: b.dataset.v === "1" }) }, RM)).catch(function (er) { alert("কলাম নেই। sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql একবার চালান।"); });
        else if (a === "hms" || a === "hmd") p = A("mc2_ac_sessions?" + (a === "hms" ? "id" : "dept_id") + "=eq." + id, Object.assign({ body: JSON.stringify({ home_on: b.dataset.v === "1" }) }, RM)).catch(function (er) { var x = er && er.message ? er.message : String(er); if (/home_on|PGRST204|42703|400/.test(x)) { alert("home_on কলাম নেই। আগে sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql একবার Supabase SQL Editor-এ চালান।"); return; } throw er; });
        else if (a === "tgd" || a === "tgs") p = A(t + "?id=eq." + id, Object.assign({ body: JSON.stringify({ active: b.dataset.v === "1" }) }, RM));
        else if (a === "rnd" || a === "rns") { var n = prompt("নতুন নাম:", b.dataset.n); if (!n || !n.trim()) return; p = A(t + "?id=eq." + id, Object.assign({ body: JSON.stringify({ name: n.trim() }) }, RM)); }
        else if (a === "dld" || a === "dls") { if (!confirm("মুছলে এর সব সেশন ও বার্তাও মুছে যাবে। মুছবেন?")) return; p = A(t + "?id=eq." + id, { method: "DELETE" }); }
        else if (a === "pws") { var pw = prompt("এই সেশনের চ্যাটে ঢোকার পাসওয়ার্ড লিখুন (৩-৪০ অক্ষর)।\n" + (b.textContent.indexOf("সরান") >= 0 ? "খালি রেখে OK দিলে পাসওয়ার্ড সরে যাবে।\n" : "") + "বদলালে/সরালে আগের সবাইকে আবার পাসওয়ার্ড দিতে হবে।", ""); if (pw === null) return; p = M.rpc("mc2_ac_admin_setpw", { p_session: +id, p_pw: pw }); }
        else if (a === "pwn") { noteBox("📝 নির্দেশনা — " + (b.dataset.sn || ""), b.dataset.note || "", function (v) { M.rpc("mc2_ac_admin_pwnote", { p_session: +id, p_note: v }).then(go).catch(function (er) { try { noteErr(er); } catch (e2) { M.fail(e2); } }); }); return; }
        else if (a === "nsave") { var tas = [].filter.call(V.querySelectorAll("textarea[data-nid]"), function (q) { return q.value.trim() !== String(q.dataset.orig || "").trim(); }); if (!tas.length) { alert("কোনো বদল নেই।"); return; } p = Promise.all(tas.map(function (q) { return M.rpc("mc2_ac_admin_pwnote", { p_session: +q.dataset.nid, p_note: q.value }); })).then(function () { NMSG = "✅ " + bdg(tas.length) + "টি সেশনের আলাদা নির্দেশনা সেভ হয়েছে।"; }).catch(noteErr); }
        else if (a === "bnote" || a === "bnrm") {
          var sc2 = M.$("#acbs").value, all2 = sc2 === "all", wh2 = all2 ? "সব বিভাগের সব সেশনে" : "এই বিভাগের সব সেশনে", tx2 = M.$("#acbn").value;
          if (a === "bnote" && !tx2.trim()) { alert("আগে নির্দেশনা লিখুন। সরাতে \"নির্দেশনা সরান\" চাপুন।"); return; }
          if (a === "bnrm" && !confirm(wh2 + " নির্দেশনা সরাবেন?")) return;
          var ck = M.$("#acbk");
          if (a === "bnote" && ck && ck.checked) { var tg = S.filter(function (s) { return (all2 || String(s.dept_id) === String(sc2)) && !(s.pw_note && String(s.pw_note).trim()); }); p = Promise.all(tg.map(function (s) { return M.rpc("mc2_ac_admin_pwnote", { p_session: +s.id, p_note: tx2 }); })).then(function () { BMSG = "✅ " + wh2 + " নির্দেশনা বসেছে, যাদের আলাদা নির্দেশনা আছে তাদের বাদ দিয়ে (" + bdg(tg.length) + "টি সেশন)।"; }).catch(noteErr); }
          else p = M.rpc("mc2_ac_admin_pwnote_bulk", { p_scope: all2 ? "all" : "dept", p_dept: all2 ? null : +sc2, p_note: a === "bnrm" ? "" : tx2 }).then(function (c) { BMSG = "✅ " + wh2 + (a === "bnrm" ? " নির্দেশনা সরেছে" : " নির্দেশনা বসেছে") + " (" + bdg(c == null ? "" : c) + "টি সেশন)।"; }).catch(noteErr);
        }
        else if (a === "pwt") p = M.rpc("mc2_ac_admin_pwon", { p_session: +id, p_on: b.dataset.v === "1" });
        else if (a === "bpw" || a === "bon" || a === "boff" || a === "brm") {
          var sc = M.$("#acbs").value, all = sc === "all", where = all ? "সব বিভাগের সব সেশনে" : "এই বিভাগের সব সেশনে", args = { p_scope: all ? "all" : "dept", p_dept: all ? null : +sc }, msg;
          if (a === "bpw") { var bp = prompt(where + " একই পাসওয়ার্ড বসবে (৩-৪০ অক্ষর)।\nআগের সবাইকে আবার পাসওয়ার্ড দিতে হবে।", ""); if (bp === null) return; if (!bp.trim()) { alert("পাসওয়ার্ড খালি রাখা যাবে না। সরাতে \"সব পাসওয়ার্ড সরান\" চাপুন।"); return; } args.p_pw = bp; msg = "পাসওয়ার্ড বসেছে"; p = M.rpc("mc2_ac_admin_setpw_bulk", args); }
          else if (a === "brm") { if (!confirm(where + " পাসওয়ার্ড সরাবেন? সেভ করা পাসওয়ার্ডও মুছে যাবে।")) return; args.p_pw = ""; msg = "পাসওয়ার্ড সরেছে"; p = M.rpc("mc2_ac_admin_setpw_bulk", args); }
          else { var on = a === "bon"; if (!confirm(where + (on ? " পাসওয়ার্ড চালু করবেন? (শুধু যেগুলোতে পাসওয়ার্ড সেভ আছে)" : " পাসওয়ার্ড বন্ধ করবেন? (সেভ করা পাসওয়ার্ড থাকবে)"))) return; args.p_on = on; msg = on ? "চালু হয়েছে" : "বন্ধ হয়েছে"; p = M.rpc("mc2_ac_admin_pwon_bulk", args); }
          p = p.then(function (c) { BMSG = "✅ " + where + " " + msg + " (" + bdg(c == null ? "" : c) + "টি সেশন)।"; }).catch(function (er) { var x = er && er.message ? er.message : String(er); if (/_bulk|PGRST202|42883/.test(x)) { alert("নতুন SQL (supabase-new-20261020.sql) এখনো চালানো হয়নি — আগে সেটা Supabase-এ একবার Run করুন।"); return; } throw er; });
        }
        else if (a === "up") p = A("mc2_ac_cfg?key=eq.upload", Object.assign({ body: JSON.stringify({ value: b.dataset.v === "1" }) }, RM));
        else if (a === "hm") p = A("mc2_ac_messages?id=eq." + id, Object.assign({ body: JSON.stringify({ hidden: b.dataset.v === "1" }) }, RM));
        else if (a === "dm") { if (!confirm("বার্তা মুছবেন?")) return; p = A("mc2_ac_messages?id=eq." + id, { method: "DELETE" }); }
        if (p) p.then(go).catch(M.fail);
      };
    });
  }
  if (window.MCPG) window.MCPG.onPer(function () { PGN = 0; SPG = 0; });
  function go() { view().catch(function (e) { window.MCA.fail(e); }); }
})();

// ---------- ভাগ ৩: "🔒 পাসওয়ার্ড লক" — এক জায়গা থেকে সব সেটিং ----------
// বিভাগ ড্রপডাউন বাছলে ঠিক নিচে সেই বিভাগের সব সেশন: প্রতি সেশনে লক চালু/বন্ধ, বর্তমান পাসওয়ার্ড (দেখান/লুকান/কপি — SQL-11),
// নতুন পাসওয়ার্ড + সেভ। ওপরে "এই বিভাগের সব সেশনে একসাথে"। নতুন SQL লাগে না (আগের mc2_ac_admin_setpw/_bulk, mc2_ac_admin_pwon/_bulk)।
(function () {
  var LKD = "", LKMSG = "", bdg = function (s) { return String(s).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  var stamp = function () { var d = new Date(); try { return d.toLocaleTimeString("bn-BD"); } catch (e) { return d.toTimeString().slice(0, 8); } };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["lk", "🔒 পাসওয়ার্ড লক"]]);
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { lk: view });
  function go() { view().catch(function (e) { window.MCA.fail(e); }); }
  function view() {
    var M = window.MCA, A = M.A, esc = M.esc, V = M.$("#view");
    return Promise.all([A("mc2_ac_depts?select=*&order=sort,name"), A("mc2_ac_sessions?select=*&order=sort,name")]).then(function (r) {
      var D = r[0] || [], S = r[1] || [], dep = null, L = [];
      D.forEach(function (d) { if (String(d.id) === String(LKD)) dep = d; });
      if (!dep) LKD = "";
      if (dep) L = S.filter(function (s) { return String(s.dept_id) === String(dep.id); });
      var on = L.filter(function (s) { return s.pw_hash && s.pw_on; }).length;
      var h = "<h2>🔒 পাসওয়ার্ড লক</h2>" +
        '<div class="it" style="background:rgba(217,130,0,.10);border:1px solid var(--o);border-radius:10px;padding:8px 10px"><div class="sm" style="color:var(--fg)">ℹ️ <b>নিয়ম: সেশনের মান বিভাগের মানের আগে চলে।</b> ' +
        "লক আসলে প্রতিটি সেশনের নিজের সেটিং। \"সব সেশনে একসাথে\" বসালে ওই বিভাগের প্রতিটি সেশনে একই পাসওয়ার্ড (আলাদা কপি) বসে যায়। এরপর কোনো একটি সেশনে আলাদা পাসওয়ার্ড দিলে সেই সেশনে সেটাই চলে — বিভাগের একসাথে-বসানো মান আর চলে না। " +
        "আবার \"একসাথে\" চাপলে (নিচের বাদ-দেওয়ার টিক না দিলে) সব সেশনের পাসওয়ার্ড আবার এক হয়ে যায়। বসালে/সরালে/চালু-বন্ধ করলে ওই সেশনের আগের সবাইকে আবার পাসওয়ার্ড দিতে হবে। পরে যোগ করা নতুন সেশন নিজে থেকে লক হয় না।</div></div>" +
        '<label style="margin-top:8px">বিভাগ বাছুন<select id="lkd"><option value="">— বিভাগ বাছুন —</option>' + D.map(function (d) { return '<option value="' + d.id + '"' + (String(d.id) === String(LKD) ? " selected" : "") + ">" + esc(d.name) + "</option>"; }).join("") + "</select></label>";
      if (!dep) h += '<p class="sm">উপরের ড্রপডাউন থেকে একটা বিভাগ বাছলে ঠিক নিচে তার সব সেশন ও লকের সেটিং আসবে।</p>';
      else {
        h += '<div class="sm" style="margin-top:6px">📁 ' + esc(dep.name) + " · মোট " + bdg(L.length) + "টি সেশন · 🔒 " + bdg(on) + "টিতে লক চালু</div>" +
          (LKMSG ? '<div class="sm" style="color:var(--g);font-weight:700;margin-top:4px">' + esc(LKMSG) + "</div>" : "");
        h += '<div class="it" style="margin-top:8px;padding:10px;border:1px dashed var(--bd);border-radius:10px"><div><b>📦 এই বিভাগের সব সেশনে একসাথে</b> <span class="sm">(' + bdg(L.length) + "টি সেশন)</span></div>" +
          '<label>একই পাসওয়ার্ড (৩–৪০ অক্ষর)<input id="lkbp" type="text" maxlength="40" autocomplete="off" placeholder="সব সেশনের জন্য একই কোড"></label>' +
          '<label class="chk" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="lkskip" style="width:auto"> যেসব সেশনে আগে থেকে আলাদা পাসওয়ার্ড আছে সেগুলো বাদ দিন <span class="sm">(শুধু "বসান"-এ)</span></label>' +
          '<div class="act"><button class="s" type="button" data-a="lkbpw"' + (L.length ? "" : " disabled") + '>🔑 সব সেশনে বসান</button><button class="s" type="button" data-a="lkbon"' + (L.length ? "" : " disabled") + '>🔒 সব চালু করুন</button><button class="l s" type="button" data-a="lkboff"' + (L.length ? "" : " disabled") + ">🔓 সব বন্ধ করুন</button></div></div>";
        h += '<h2 style="margin-top:14px">🗂 সেশন ধরে আলাদা সেটিং</h2>';
        if (!L.length) h += '<p class="sm">এই বিভাগে কোনো সেশন নেই।</p>';
        L.forEach(function (s) {
          var has = !!s.pw_hash, lk = has && !!s.pw_on;
          h += '<div class="it' + (s.active ? "" : " hid") + '" data-sid="' + s.id + '"><div><b>' + esc(s.name) + "</b> " + (s.active ? "" : '<span class="tag">বন্ধ সেশন</span>') +
            (!has ? '<span class="tag">🔓 পাসওয়ার্ড নেই</span>' : lk ? '<span class="tag" style="background:var(--g);color:#fff">🔒 লক চালু</span>' : '<span class="tag">🔓 লক বন্ধ (পাসওয়ার্ড সেভ আছে)</span>') + "</div>" +
            (has ? window.MCA_PW.html(s.id) : '<div class="sm">🔑 বর্তমান পাসওয়ার্ড: নেই</div>') +
            '<div class="act">' + (has ? '<button class="' + (lk ? "d" : "") + ' s" type="button" data-a="lkt" data-id="' + s.id + '" data-v="' + (lk ? 0 : 1) + '">' + (lk ? "🔓 লক বন্ধ করুন" : "🔒 লক চালু করুন") + "</button>" : '<span class="sm">আগে পাসওয়ার্ড দিন, তারপর লক চালু-বন্ধ করা যাবে।</span>') + "</div>" +
            '<div class="row"><label>নতুন পাসওয়ার্ড (৩–৪০ অক্ষর)<input type="text" maxlength="40" autocomplete="off" data-np="' + s.id + '" placeholder="' + (has ? "বদলাতে নতুন কোড লিখুন" : "পাসওয়ার্ড লিখুন") + '"></label></div>' +
            '<div class="act"><button class="s" type="button" data-a="lks" data-id="' + s.id + '">💾 সেভ</button>' + (has ? '<button class="d s" type="button" data-a="lkr" data-id="' + s.id + '">🗑 পাসওয়ার্ড সরান</button>' : "") + "</div></div>";
        });
      }
      V.innerHTML = h;
      V.onchange = function (e) { if (e.target.id === "lkd") { LKD = e.target.value; LKMSG = ""; go(); } };
      V.onkeydown = function (e) { if (e.key === "Enter" && e.target.dataset && e.target.dataset.np) { var bt = V.querySelector('[data-a="lks"][data-id="' + e.target.dataset.np + '"]'); if (bt) bt.click(); } };
      var run = function (p, msg) { return p.then(function () { LKMSG = "✅ " + msg + " (" + stamp() + ")"; go(); }).catch(function (er) { var x = er && er.message ? er.message : String(er); if (/_bulk|PGRST202|42883/.test(x)) alert("সার্ভারে ফাংশন নেই — sql/SQL-3-RESTRICT-LOCK-BADGES-GENDER-VISITORS-NO-RERUN.sql ও SQL-11 চালানো আছে কিনা দেখুন।\n\n" + x); else M.fail(er); }); };
      V.onclick = function (e) {
        if (window.MCA_PW.click(e)) return;
        var b = e.target.closest ? e.target.closest("[data-a]") : null; if (!b || !dep) return;
        var a = b.dataset.a, id = +b.dataset.id, pwOf = function (sid) { var i = V.querySelector('[data-np="' + sid + '"]'); return i ? i.value.trim() : ""; };
        var sname = function (sid) { var n = ""; L.forEach(function (s) { if (s.id === sid) n = s.name; }); return n; };
        if (a === "lks") {
          var pw = pwOf(id); if (pw.length < 3 || pw.length > 40) { alert("পাসওয়ার্ড ৩–৪০ অক্ষরের দিন।"); return; }
          if (!confirm(sname(id) + " সেশনে এই পাসওয়ার্ড বসবে। আগের সবাইকে আবার পাসওয়ার্ড দিয়ে ঢুকতে হবে। নিশ্চিত?")) return;
          b.disabled = true; run(M.rpc("mc2_ac_admin_setpw", { p_session: id, p_pw: pw }), sname(id) + " — পাসওয়ার্ড সেভ হয়েছে");
        } else if (a === "lkr") {
          if (!confirm(sname(id) + " সেশনের পাসওয়ার্ড সরাবেন? সেভ করা পাসওয়ার্ডও মুছে যাবে, লক থাকবে না।")) return;
          b.disabled = true; run(M.rpc("mc2_ac_admin_setpw", { p_session: id, p_pw: "" }), sname(id) + " — পাসওয়ার্ড সরেছে");
        } else if (a === "lkt") {
          var on2 = b.dataset.v === "1"; b.disabled = true;
          run(M.rpc("mc2_ac_admin_pwon", { p_session: id, p_on: on2 }), sname(id) + (on2 ? " — লক চালু হয়েছে" : " — লক বন্ধ হয়েছে"));
        } else if (a === "lkbpw") {
          var bp = (M.$("#lkbp").value || "").trim(), skip = M.$("#lkskip").checked; if (bp.length < 3 || bp.length > 40) { alert("পাসওয়ার্ড ৩–৪০ অক্ষরের দিন।"); return; }
          var tg = skip ? L.filter(function (s) { return !s.pw_hash; }) : L;
          if (!tg.length) { alert("বাদ দেওয়ার পর কোনো সেশন বাকি নেই (সবকটিতে আগে থেকে পাসওয়ার্ড আছে)।"); return; }
          if (!confirm(dep.name + " বিভাগের " + bdg(tg.length) + "টি সেশনে একই পাসওয়ার্ড বসবে" + (skip ? " (আলাদা পাসওয়ার্ড থাকা সেশন বাদে)" : " — আলাদা পাসওয়ার্ড থাকলেও বদলে যাবে") + "। আগের সবাইকে আবার পাসওয়ার্ড দিতে হবে। নিশ্চিত?")) return;
          b.disabled = true;
          run(skip ? Promise.all(tg.map(function (s) { return M.rpc("mc2_ac_admin_setpw", { p_session: s.id, p_pw: bp }); })) : M.rpc("mc2_ac_admin_setpw_bulk", { p_scope: "dept", p_dept: +dep.id, p_pw: bp }), dep.name + " — " + bdg(tg.length) + "টি সেশনে পাসওয়ার্ড বসেছে");
        } else if (a === "lkbon" || a === "lkboff") {
          var on3 = a === "lkbon";
          if (!confirm(dep.name + " বিভাগের সব সেশনে লক " + (on3 ? "চালু করবেন? (শুধু যেগুলোতে পাসওয়ার্ড সেভ আছে)" : "বন্ধ করবেন? (সেভ করা পাসওয়ার্ড থাকবে)"))) return;
          b.disabled = true; run(M.rpc("mc2_ac_admin_pwon_bulk", { p_scope: "dept", p_dept: +dep.id, p_on: on3 }), dep.name + " — সব সেশনে লক " + (on3 ? "চালু হয়েছে" : "বন্ধ হয়েছে"));
        }
      };
    });
  }
})();
