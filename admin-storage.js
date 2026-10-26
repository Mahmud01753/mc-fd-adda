// অ্যাডমিন: "🗄 স্টোরেজ" — ফাইলের জায়গা ভরে এলে পুরোনো চ্যাট-ফাইল নিজে মোছা (শুধু ফাইল; চ্যাটের বার্তা কখনো নয়)।
// SQL: sql/RUN-NOW-LIMITS-STORAGE-BADWORDS.sql (fa_stor_get / fa_stor_set / fa_stor_run)। admin.js-এর আগে লোড হয়।
(function () {
  var M = function () { return window.MCA; };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["stg", "🗄 স্টোরেজ"]]);
  var bn = function (n) { return String(n).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  var DEF = { quota_mb: 1024, start_pct: 50, chunk_mb: 50, hard_pct: 90, target_pct: 50 };
  var FIELDS = [
    ["quota_mb", "মোট স্টোরেজ সীমা", "MB", "আপনার Supabase প্ল্যানের স্টোরেজ। ফ্রি প্ল্যানে ১ GB = ১০২৪ MB"],
    ["start_pct", "কত % হলে মোছা শুরু", "%", "এই % ছুঁলে প্রতিবার নিচের পরিমাণ পুরোনো ফাইল মুছবে"],
    ["chunk_mb", "প্রতিবার কত MB মুছবে", "MB", "সবচেয়ে পুরোনো ফাইল থেকে শুরু; প্রায় এই পরিমাণ (একটু বেশি হতে পারে)"],
    ["hard_pct", "জরুরি % (এর বেশি হলে একটানে নামাবে)", "%", "এই % ছুঁলে নিচের “নামিয়ে আনবে” % পর্যন্ত একসাথে মুছবে"],
    ["target_pct", "জরুরিতে কত %-এ নামিয়ে আনবে", "%", "যেমন ৯০% হলে মুছতে মুছতে ৫০%-এ নামাবে"]
  ];
  var mb = function (b) { return bn((Math.round(b * 10) / 10).toString()); };

  function view() {
    var $ = M().$, esc = M().esc, rpc = M().rpc, tm = M().tm;
    return rpc("fa_stor_get").then(function (g) {
      g = g || {}; var c = g.cfg || {}, on = !!c.on, log = g.log || [], pct = +g.pct || 0;
      var inputs = FIELDS.map(function (f) {
        return "<label>" + f[1] + " <span class='sm'>(" + f[2] + ")</span><input type='number' min='1' step='1' inputmode='numeric' id='sg_" + f[0] + "' value='" + esc(c[f[0]] != null ? c[f[0]] : DEF[f[0]]) + "'><span class='sm'>" + f[3] + "</span></label>";
      }).join("");
      var bar = "<div style='height:12px;border-radius:8px;background:var(--bd);overflow:hidden;margin:6px 0'><div style='height:100%;width:" + Math.min(100, pct) + "%;background:" + (pct >= (+c.hard_pct || 90) ? "var(--red)" : pct >= (+c.start_pct || 50) ? "var(--o)" : "var(--g)") + "'></div></div>";
      var ll = log.length ? log.map(function (x) {
        return "<div class='it'><b>" + esc(tm(x.at)) + "</b><div class='sm'>" + bn(x.files) + "টি ফাইল · " + mb(x.freed_mb) + " MB মুছেছে · " + bn(x.pct_before) + "% → " + bn(x.pct_after) + "%" + (x.note ? " · " + esc(x.note) : "") + "</div></div>";
      }).join("") : "<p class='sm'>এখনো কিছু মোছা হয়নি।</p>";

      $("#view").innerHTML =
        "<h2>🗄 স্টোরেজ অটো-ক্লিন</h2>" +
        "<div class='it'><div><b>এখন</b> " + (on ? "<span class='tag'>🧹 চালু</span>" : "<span class='tag'>⏸ বন্ধ</span>") + "</div>" +
        "<div>ব্যবহৃত: <b>" + mb(g.used_mb || 0) + " MB</b> / " + bn(c.quota_mb || DEF.quota_mb) + " MB = <b>" + bn(pct) + "%</b></div>" + bar +
        "<div class='sm'>এর মধ্যে চ্যাটের ফাইল: " + mb(g.chat_mb || 0) + " MB (" + bn(g.chat_files || 0) + "টি)। বাকিটা অন্য ফোল্ডারের ফাইল।</div>" +
        "<div class='act'><button id='sgOn' type='button' class='" + (on ? "d" : "") + "'>" + (on ? "⏸ বন্ধ করুন" : "🧹 চালু করুন") + "</button></div></div>" +
        "<h2 style='margin-top:14px'>নিয়ম</h2><div class='row'>" + inputs + "</div>" +
        "<div class='act' style='margin-top:8px'><button id='sgSave' type='button'>💾 সেভ</button><button id='sgDef' type='button' class='l'>↺ ৫০% / ৫০ MB / ৯০% মান বসান</button></div>" +
        "<div class='sm' style='margin-top:6px'>কীভাবে চলে: শুধু চ্যাটে আপলোড হওয়া ফাইল, সবচেয়ে পুরোনোটা আগে। চ্যাটের লেখা বার্তা এখান থেকে কখনো মোছে না — সেগুলো শুধু আপনার দেওয়া সময় (🛡️ মডারেশন → 🕒 স্বয়ংক্রিয় মোছা) অনুযায়ী মোছে। মোছা ফাইলের বার্তায় “ফাইলের মেয়াদ শেষ” দেখাবে। শেষ ২০ মিনিটের নতুন ফাইল ছোঁয়া হয় না। চ্যাট খোলা থাকলে প্রায় প্রতি মিনিটে চেক হয়।</div>" +
        "<div class='act' style='margin-top:10px'><button id='sgDry' type='button' class='l'>🔍 এখন কী মুছত দেখুন (কিছু মুছবে না)</button><button id='sgRun' type='button' class='d'>🧹 এখনই চালান</button></div>" +
        "<p class='sm' id='sgMsg'></p>" +
        "<h2 style='margin-top:14px'>🕘 শেষ মোছাগুলো</h2>" + ll;

      var val = function (id) { return $("#" + id).value.trim(); };
      var say = function (t) { var e = $("#sgMsg"); if (e) e.textContent = t; };
      var collect = function (en) {
        var o = { on: en }, bad = false;
        FIELDS.forEach(function (f) { var v = val("sg_" + f[0]); if (!/^\d{1,7}$/.test(v) || +v < 1) bad = true; else o[f[0]] = +v; });
        if (!bad && (o.start_pct > 95 || o.target_pct > 95 || o.hard_pct > 99 || o.hard_pct < o.start_pct || o.target_pct >= o.hard_pct)) bad = true;
        return bad ? null : o;
      };
      var save = function (en) {
        var o = collect(en);
        if (!o) { alert("সংখ্যাগুলো ঠিক নয়। নিয়ম: শুরু % ≤ জরুরি % ≤ ৯৯, আর নামিয়ে আনার % জরুরি %-এর চেয়ে ছোট (সর্বোচ্চ ৯৫) হতে হবে।"); return; }
        return rpc("fa_stor_set", { p: o }).then(function () { return view(); }).catch(M().fail);
      };
      var runIt = function (dry) {
        if (!dry && !confirm("এখনই নিয়ম অনুযায়ী পুরোনো চ্যাট-ফাইল মুছবেন? (লেখা বার্তা মুছবে না)")) return;
        say("⏳ চলছে…");
        rpc("fa_stor_run", { p_dry: !!dry }).then(function (r) {
          r = r || {};
          if (r.error) { say("হয়নি: " + r.error); return; }
          if (r.mode === "none") { say("এখন মোছার দরকার নেই — ব্যবহার " + bn(r.pct) + "%।"); return; }
          if (dry) { say("মুছত: " + bn(r.files || 0) + "টি ফাইল, প্রায় " + mb(r.freed_mb || 0) + " MB (এখন " + bn(r.pct) + "%)। কিছু মোছা হয়নি।"); return; }
          return view().then(function () { say("✅ " + bn(r.files || 0) + "টি ফাইল মুছেছে (" + mb(r.freed_mb || 0) + " MB)।"); });
        }).catch(M().fail);
      };
      $("#view").onclick = function (e) {
        var b = e.target.closest ? e.target.closest("button") : null; if (!b) return;
        if (b.id === "sgOn") save(!on);
        else if (b.id === "sgSave") save(on);
        else if (b.id === "sgDef") { FIELDS.forEach(function (f) { $("#sg_" + f[0]).value = DEF[f[0]]; }); say("মান বসানো হয়েছে — সেভ চাপুন।"); }
        else if (b.id === "sgDry") runIt(true);
        else if (b.id === "sgRun") runIt(false);
      };
    }).catch(function (e) {
      var t = e && e.message ? e.message : String(e), esc = M().esc;
      $("#view").innerHTML = "<h2>🗄 স্টোরেজ অটো-ক্লিন</h2><p class='warn'>লোড হয়নি: " + esc(t) + "</p><p class='sm'>" +
        (/fa_stor_|404|PGRST202|42883/.test(t) ? "সার্ভারে ফাংশন নেই। sql/RUN-NOW-LIMITS-STORAGE-BADWORDS.sql একবার Supabase SQL Editor-এ চালান, তারপর রিফ্রেশ করুন।" : "আবার চেষ্টা করুন।") + "</p>";
    });
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { stg: view });
})();
