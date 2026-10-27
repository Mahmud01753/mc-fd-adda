// অ্যাডমিন: "🖼 ব্যাকগ্রাউন্ড" ট্যাব — সাইটের হেডারের ব্যাকগ্রাউন্ড চালু/বন্ধ আর ২০টির মধ্যে বাছাই। "00" = ব্যাকগ্রাউন্ড ছাড়া ডিফল্ট।
// SQL: supabase-bg.sql (একবার চালান)। admin.js-এর আগে লোড হয়।
(function () {
  var M = function () { return window.MCA; };
  var NAMES = ["সবুজ উদ্যান", "গোলাপি বাগান", "জোছনা পুকুর", "ফুলের পথ", "জোনাকি রাত", "বর্ষা বাগান", "চেরি পথ", "নির্জন রাস্তা", "লণ্ঠন বাগান", "ফোয়ারা চত্বর", "গোলাপ তোরণ", "শীতল পুকুর", "তারা ভরা", "সোনালি সন্ধ্যা", "ঘন বাগান", "চাঁদের আলো", "গোলাপ পথ", "শান্ত চত্বর", "গভীর রাত", "পূর্ণিমা বাগান"];
  var DP = { x: 50, y: 38, z: 100 }, ST = { on: true, pick: "12", pos: { x: 50, y: 38, z: 100 } }, SEL = { on: true, pick: "12", pos: { x: 50, y: 38, z: 100 } }, SAVED = "", pend = "", NAT = {};
  var cl = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  // ছবির পজিশন/জুম আলাদা কলামে নয় — কাস্টম ছবির লিংকের শেষে "#fa=X,Y,Z" (X,Y = ০–১০০%, Z = জুম ১০০–৩০০%) হিসেবে সেভ হয়; তাই নতুন SQL লাগে না। ডিফল্ট (৫০,৩৮,১০০) হলে কিছু যোগ হয় না।
  function split(p) { p = String(p || "12"); var m = /^custom:/.test(p) ? /#fa=(\d{1,3}),(\d{1,3}),(\d{2,3})$/.exec(p) : null; return m ? { pick: p.slice(0, m.index), pos: { x: cl(+m[1], 0, 100), y: cl(+m[2], 0, 100), z: cl(+m[3], 100, 300) } } : { pick: p, pos: { x: DP.x, y: DP.y, z: DP.z } }; }
  function isDefPos(o) { return o.x === DP.x && o.y === DP.y && o.z === DP.z; }
  function join(pick, pos) { return /^custom:/.test(pick) && !isDefPos(pos) ? pick + "#fa=" + pos.x + "," + pos.y + "," + pos.z : pick; }
  function cp(o) { return { x: o.x, y: o.y, z: o.z }; }
  var num = function (n) { return String(n).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["bg", "🖼 ব্যাকগ্রাউন্ড"]]);
  var stamp = function () { var d = new Date(); try { return d.toLocaleTimeString("bn-BD"); } catch (e) { return d.toTimeString().slice(0, 8); } };
  var dirty = function () { return SEL.on !== ST.on || join(SEL.pick, SEL.pos) !== join(ST.pick, ST.pos); };
  // ভাগ ৩: বাছাই এখন সঙ্গে সঙ্গে সেভ হয় না — বাছুন, প্রিভিউ দেখুন, তারপর 💾 সেভ চাপুন।
  function paint() {
    var M = M_(), $ = M.$, esc = M.esc, isC = /^custom:/.test(SEL.pick), cur = isC ? "custom" : (SEL.pick === "00" ? "00" : "12"), d = dirty();
    var card = function (k, thumb, label) {
      var sel = cur === k;
      return "<button type='button' data-bg='" + k + "' style='padding:6px;text-align:left;border:2px solid " + (sel ? "var(--g)" : "var(--bd)") + ";background:var(--card);color:var(--fg);border-radius:12px;display:grid;gap:5px'>" + thumb +
        "<span style='font-size:13px;font-weight:700'>" + (sel ? "✅ " : "") + esc(label) + "</span></button>";
    };
    var th = "width:100%;height:78px;object-fit:cover;border-radius:8px", ab = function (k, ic, tt) { return "<button type='button' class='l' data-pos='" + k + "' title='" + tt + "' aria-label='" + tt + "' style='width:52px;height:46px;padding:0;font-size:20px'>" + ic + "</button>"; };
    var img = !SEL.on || SEL.pick === "00" ? "" : isC ? SEL.pick.slice(7) : "images/bg/bg-12.png";
    var P = isC ? SEL.pos : DP, hdr = img ? "background:linear-gradient(180deg,rgba(0,0,0,.28),rgba(0,0,0,0) 55%),url(\"" + esc(img) + "\") " + P.x + "% " + P.y + "%/cover no-repeat,#0f2d20;padding-bottom:84px;min-height:215px;text-shadow:0 2px 14px rgba(0,0,0,.6)" : "background:linear-gradient(160deg,#0f2d20,#1d6b43);padding-bottom:30px";
    var PV = function (pid, hid, w) { return "<div id='" + pid + "' style='width:" + (w || 300) + "px;max-width:100%;margin:8px auto 0;border:2px solid var(--bd);border-radius:26px;overflow:hidden;background:var(--bg)'><header id='" + hid + "' style='" + hdr + ";text-align:center;color:#fff;padding-top:30px;padding-left:14px;padding-right:14px;border-radius:0 0 28px 28px'>" +
      "<div style='font:800 22px/1.25 \"Anek Bangla\",\"Hind Siliguri\",\"Noto Sans Bengali\",sans-serif'>M.C COLLEGE MASTER’S<small style='display:block;font-size:.62em;font-weight:700;letter-spacing:1px;margin-top:2px;color:#cfe5d6'>2023-24</small></div>" +
      "<div style='margin-top:8px;font:700 20px/1.2 \"Anek Bangla\",\"Hind Siliguri\",\"Noto Sans Bengali\",sans-serif;color:#ffd08a'>FRIENDS ADDA</div></header>" +
      "<div style='margin:-18px 12px 12px;background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:10px;font-size:12px;color:var(--mut)'>রুম · চ্যাট · নোটিশ …</div></div>"; };
    $("#view").innerHTML = "<h2>🖼 সাইটের ব্যাকগ্রাউন্ড</h2>" +
      "<div class='it'><div><b>অবস্থা</b> " + (SEL.on ? "<span class='tag'>🟢 চালু</span>" : "<span class='tag'>⚪ বন্ধ</span>") + (SEL.on !== ST.on ? " <span class='tag' style='background:var(--o);color:#fff'>● সেভ হয়নি</span>" : "") + "</div>" +
      "<div class='act'><button id='bgT' type='button' class='" + (SEL.on ? "d" : "") + "'>" + (SEL.on ? "⏻ বন্ধ করুন" : "⏻ চালু করুন") + "</button></div>" +
      "<div class='sm'>বন্ধ করলে বা “ব্যাকগ্রাউন্ড ছাড়া” বাছলে আগের সবুজ হেডার দেখাবে। বদলানোর পর ইউজাররা পেজ রিফ্রেশ করলে (বা পরের বার ঢুকলে) নতুনটা পাবে।</div></div>" +
      "<h2 style='margin-top:14px'>📱 হোম পেইজের লাইভ প্রিভিউ</h2><div class='sm'>বাছা ব্যাকগ্রাউন্ড হোমের হেডারে এমন দেখাবে (ফোনের মাপে)। সেভ না করলেও এখানে দেখা যায়। (চওড়া স্ক্রিনে কাটা কিছুটা আলাদা দেখাতে পারে।)</div>" +
       PV("bgPrev", "bgPH", 300) +
      "<div id='bgG' style='display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:10px'>" +
      card("00", "<div style='height:78px;border-radius:8px;background:linear-gradient(160deg,#0f2d20,#1d6b43)'></div>", "ব্যাকগ্রাউন্ড ছাড়া (সবুজ হেডার)") +
      card("12", "<img src='images/bg/th-12.jpg' alt='' style='" + th + "'>", "ডিফল্ট ব্যাকগ্রাউন্ড (১২ নং)") +
      card("custom", isC ? "<img src='" + esc(SEL.pick.slice(7)) + "' alt='' style='" + th + "'>" : "<div style='height:78px;border-radius:8px;border:2px dashed var(--bd);display:grid;place-items:center;font-size:26px'>🖼</div>", "কাস্টম ব্যাকগ্রাউন্ড") +
      "</div>" +
      (isC ? "<div class='it' style='margin-top:12px'><div><b>🎛 ছবি সাজান</b> <span class='tag'>অবস্থান " + num(P.x) + "% · " + num(P.y) + "%</span><span class='tag'>জুম " + num(P.z) + "%</span></div>" +
      "<div class='sm'>বাটন চাপলে নিচের প্রিভিউতে (আর ওপরের প্রিভিউতেও) সঙ্গে সঙ্গে বদলায়। তীর = ছবি যেদিকে সরবে। জুম করলে তবেই দুই দিকেই সরানো যায়। 💾 সেভ না চাপা পর্যন্ত হোমে বদলায় না।</div>" +
      PV("bgPrev2", "bgPH2", 260) +
      "<div style='display:grid;grid-template-columns:repeat(3,52px);gap:6px;justify-content:center;margin:6px 0'><span></span>" + ab("up", "⬆", "ছবি ওপরে সরান") + "<span></span>" + ab("lf", "⬅", "ছবি বামে সরান") + "<span></span>" + ab("rt", "➡", "ছবি ডানে সরান") + "<span></span>" + ab("dn", "⬇", "ছবি নিচে সরান") + "<span></span></div>" +
      "<div class='act' style='justify-content:center'><button type='button' class='l' data-pos='zi'" + (P.z >= 300 ? " disabled" : "") + " title='জুম ইন'>➕ জুম ইন</button><button type='button' class='l' data-pos='zo'" + (P.z <= 100 ? " disabled" : "") + " title='জুম আউট'>➖ জুম আউট</button><button type='button' class='l' data-pos='rs'>↺ রিসেট</button></div></div>" : "") +
      "<div class='it' style='margin-top:12px'><div><b>🖼 কাস্টম ব্যাকগ্রাউন্ড দিন</b></div>" +
      "<div class='sm'>ছবি আপলোড করুন (নিজে ছোট করে নেবে, প্রস্তাবিত ১২০০×৬৩০) অথবা নিচে ছবির লিংক (https://…) দিন, তারপর “কাস্টম বাছুন” চাপুন — সেভ হয় নিচের 💾 সেভ চাপলে।</div>" +
      "<input id='bgF' type='file' accept='image/*' style='margin:6px 0'>" +
      "<input id='bgU' type='text' placeholder='https://… ছবির লিংক' value='" + (isC && /^custom:https:/.test(SEL.pick) ? esc(SEL.pick.slice(7)) : "") + "' style='width:100%;box-sizing:border-box'>" +
      "<div class='act'><button id='bgS' type='button' class='l'>🖼 কাস্টম বাছুন</button>" + (isC || /^custom:/.test(ST.pick) ? "<button id='bgDel' type='button' class='d'>🗑 ডিলিট</button>" : "") + "</div></div>" +
      "<div class='it' style='margin-top:12px;position:sticky;bottom:6px;background:var(--card);z-index:2'><div class='act' style='align-items:center'>" +
      "<button id='bgSave' type='button' style='" + (d ? "background:var(--o);box-shadow:0 0 0 4px rgba(217,130,0,.35);" : "opacity:.65;") + "font-size:16px;padding:10px 18px'>💾 সেভ</button>" +
      (d ? "<button id='bgRst' type='button' class='l'>↺ বাতিল</button><span class='tag' style='background:var(--o);color:#fff'>● সেভ হয়নি</span>" : "") +
      "</div><p class='sm' id='bgM' style='color:var(--g);font-weight:700;margin:6px 0 0'>" + (SAVED ? esc(SAVED) : d ? "বদল হয়েছে — 💾 সেভ চাপুন।" : "") + "</p></div>";
    $("#bgF").onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      fit(f).then(function (u) { pend = u; $("#bgU").value = ""; $("#bgM").textContent = "ছবি তৈরি — “কাস্টম বাছুন” চাপুন।"; }).catch(function (e) { alert(e.message); });
    };
    $("#bgU").oninput = function () { pend = ""; };
    pvSize();
  }
  // জুম > ১০০% হলে প্রিভিউয়ের মাপ হিসাব করে বসায় (হোম পেইজও একই হিসাবে চলে: কভার-মাপ × জুম)
  function nat(u) { var k = u.length + ":" + u.slice(-48); if (NAT[k]) return Promise.resolve(NAT[k]); return new Promise(function (ok, no) { var im = new Image(); im.onload = function () { NAT[k] = { w: im.naturalWidth, h: im.naturalHeight }; ok(NAT[k]); }; im.onerror = no; im.src = u; }); }
  function pvSize() {
    if (!/^custom:/.test(SEL.pick) || SEL.pos.z <= 100 || !SEL.on) return;
    var u = SEL.pick.slice(7), z = SEL.pos.z;
    ["#bgPH", "#bgPH2"].forEach(function (id) { var h = M().$(id); if (!h) return; nat(u).then(function (d) { var s = Math.max(h.clientWidth / d.w, h.clientHeight / d.h) * z / 100; h.style.backgroundSize = "auto, " + Math.round(d.w * s) + "px " + Math.round(d.h * s) + "px, auto"; }).catch(function () {}); });
  }
  function fit(file) {
    return new Promise(function (ok, no) {
      var im = new Image(), u = URL.createObjectURL(file);
      im.onload = function () {
        var w = Math.min(1200, im.naturalWidth), h = Math.round(im.naturalHeight * w / im.naturalWidth), cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(im, 0, 0, w, h); URL.revokeObjectURL(u);
        var q = 0.85, d = cv.toDataURL("image/jpeg", q); while (d.length > 260000 && q > 0.35) { q -= 0.1; d = cv.toDataURL("image/jpeg", q); }
        ok(d);
      };
      im.onerror = function () { no(new Error("ছবিটা পড়া যায়নি।")); }; im.src = u;
    });
  }
  function M_() { return M(); }
  function view() {
    var $ = M().$;
    return M().A("mc2_site_bg?select=enabled,pick&id=eq.1").then(function (d) {
      if (d && d[0]) { ST.on = !!d[0].enabled; var sp = split(d[0].pick); ST.pick = sp.pick; ST.pos = sp.pos; }
      SEL = { on: ST.on, pick: ST.pick, pos: cp(ST.pos) }; pend = "";
      paint();
      if (!view.wired) { view.wired = true; }
      $("#view").onclick = function (e) {
        var pb = e.target.closest("[data-pos]");
        if (pb && /^custom:/.test(SEL.pick)) {
          var k = pb.dataset.pos, q = SEL.pos, ST_ = 6; // তীর = ছবি যেদিকে সরবে (ছবি ডানে গেলে দেখানো অংশ বামে সরে, তাই % কমে)
          if (k === "lf") q.x = cl(q.x + ST_, 0, 100); else if (k === "rt") q.x = cl(q.x - ST_, 0, 100);
          else if (k === "up") q.y = cl(q.y + ST_, 0, 100); else if (k === "dn") q.y = cl(q.y - ST_, 0, 100);
          else if (k === "zi") q.z = cl(q.z + 10, 100, 300); else if (k === "zo") q.z = cl(q.z - 10, 100, 300);
          else if (k === "rs") SEL.pos = cp(DP);
          SAVED = ""; var sy = window.pageYOffset; paint(); window.scrollTo(0, sy); return;
        }
        var b = e.target.closest("[data-bg]");
        if (b) { if (b.dataset.bg === "custom") { if (/^custom:/.test(SEL.pick)) return; $("#bgU").focus(); $("#bgM").textContent = "নিচে ছবি আপলোড করুন বা লিংক দিন, তারপর “কাস্টম বাছুন” চাপুন।"; return; } SEL.pick = b.dataset.bg; SAVED = ""; paint(); return; }
        var id = e.target.id;
        if (id === "bgS") { var v = pend || ($("#bgU").value || "").trim(); if (!v) return alert("ছবি আপলোড করুন বা লিংক দিন।"); if (!pend && !/^https:\/\/[^\s"'\\()]+$/.test(v)) return alert("লিংক https:// দিয়ে শুরু হতে হবে, ফাঁকা বা বন্ধনী ছাড়া।"); var nv = split("custom:" + v); if (nv.pick !== SEL.pick) SEL.pos = cp(nv.pos); SEL.pick = nv.pick; SEL.on = true; SAVED = ""; paint(); return; }
        if (id === "bgT") { SEL.on = !SEL.on; SAVED = ""; paint(); return; }
        if (id === "bgRst") { SEL = { on: ST.on, pick: ST.pick, pos: cp(ST.pos) }; pend = ""; SAVED = ""; paint(); return; }
        if (id === "bgDel") {
          if (!confirm("কাস্টম ব্যাকগ্রাউন্ড ডিলিট করবেন?\n\nছবিটা (ও তার পজিশন/জুম) সার্ভার থেকে মুছে যাবে, সাইট ডিফল্ট ব্যাকগ্রাউন্ডে (১২ নং) ফিরবে। আর ফেরানো যাবে না।")) return;
          var wasSaved = /^custom:/.test(ST.pick), reset = function () { SEL = { on: ST.on, pick: ST.pick, pos: cp(ST.pos) }; pend = ""; };
          if (!wasSaved) { SEL.pick = ST.pick; SEL.pos = cp(ST.pos); pend = ""; SAVED = "✅ ডিলিট হয়েছে (" + stamp() + ") — সেভ না করা কাস্টম ছবিটা বাদ গেছে।"; paint(); return; }
          $("#bgM").textContent = "⏳ ডিলিট হচ্ছে…";
          M().rpc("mc2_admin_set_bg", { p_on: ST.on, p_pick: "12" }).then(function () {
            ST.pick = "12"; ST.pos = cp(DP); reset(); try { localStorage.removeItem("mc_bg"); } catch (e) {}
            SAVED = "✅ ডিলিট হয়েছে (" + stamp() + ") — ডিফল্ট ব্যাকগ্রাউন্ডে (১২ নং) ফিরেছে। ইউজাররা রিফ্রেশ করলে পাবে।"; paint();
          }).catch(function (er) { var x = er && er.message ? er.message : String(er); $("#bgM").textContent = ""; alert(x); });
          return;
        }
        if (id === "bgSave") {
          if (!dirty()) { $("#bgM").textContent = "কোনো বদল নেই — আগেরটাই সেভ করা আছে।"; return; }
          $("#bgM").textContent = "⏳ সেভ হচ্ছে…";
          M().rpc("mc2_admin_set_bg", { p_on: SEL.on, p_pick: join(SEL.pick, SEL.pos) }).then(function () {
            ST.on = SEL.on; ST.pick = SEL.pick; ST.pos = cp(SEL.pos); try { localStorage.removeItem("mc_bg"); } catch (e) {}
            SAVED = "✅ সেভ হয়েছে (" + stamp() + ") — " + (ST.on ? (ST.pick === "00" ? "ব্যাকগ্রাউন্ড ছাড়া (সবুজ হেডার)" : /^custom:/.test(ST.pick) ? "কাস্টম ব্যাকগ্রাউন্ড চালু (অবস্থান " + num(ST.pos.x) + "%/" + num(ST.pos.y) + "%, জুম " + num(ST.pos.z) + "%)" : "ডিফল্ট ব্যাকগ্রাউন্ড চালু") : "ব্যাকগ্রাউন্ড বন্ধ") + "। ইউজাররা রিফ্রেশ করলে পাবে।"; paint();
          }).catch(function (er) { var x = er && er.message ? er.message : String(er); $("#bgM").textContent = ""; alert(/mc2_admin_set_bg|PGRST202|42883|mc2_site_bg|bad pick/.test(x) ? "সার্ভারে ফাংশন নেই বা কাস্টম ছবির অনুমতি নেই। sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql একবার Supabase SQL Editor-এ চালান।\n\n" + x : x); });
        }
      };
    }).catch(function (e) {
      var x = e && e.message ? e.message : String(e);
      $("#view").innerHTML = "<h2>🖼 সাইটের ব্যাকগ্রাউন্ড</h2><p class='warn'>লোড হয়নি: " + M().esc(x) + "</p><p class='sm'>sql/SQL-3b-GLOBAL-NOTICE-SITE-BACKGROUND-NO-RERUN.sql একবার Supabase SQL Editor-এ চালান, তারপর পেজ রিফ্রেশ করুন।</p>";
    });
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { bg: view });
})();
