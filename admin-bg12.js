// অ্যাডমিন: "🎞 এনিমেশন ও দরজা" ট্যাব — হোম হেডারের এনিমেশন (১৪ ডিজাইন, বাবলের লেখা, সাইজ, গতি…) আর চ্যাটের দরজার সব লেখা/রং এডিট ও লাইভ প্রিভিউ।
// part55+: ডিজাইন কার্ডে চালু/বন্ধ (door.doff), বাছাই মোড (door.dmode: ০ সিঙ্গেল · ১ র‍্যান্ডম=ডিফল্ট · ২ সব ক্রমে), চ্যাট শব্দের জোর (cvol), তালা/সাইন টানা/বাম সিল/সিলের হেলা/ফুল-স্ক্রিন গেইট/চ্যাট উইন্ডোর নাম — সবই আগের door কলামে, নতুন SQL লাগে না।
// SQL: sql/SQL-17-ANIMATION-DOOR-SETTINGS.sql (একবার)। 💭 চ্যাটের নাম (door.names), 💬 প্রশ্ন–উত্তর (door.qa), 🚶 ঘোরা (door.wnd/wmin/wmax) ওই door কলামেই সেভ হয়; অনেক কাস্টম জোড়া হলে sql/SQL-18-DOOR-SETTINGS-RAISE-SIZE-LIMIT.sql (সীমা ৪০০০→৩০০০০) লাগে। bg12-anim.js ও door.js এর আগে লোড হয় (BG12_MANUAL=true দিয়ে)।
(function () {
  var M = function () { return window.MCA; }, BN = "০১২৩৪৫৬৭৮৯", bn = function (n) { return String(n).replace(/\d/g, function (d) { return BN[d]; }); };
  var KEYS = ["design", "size", "bsz", "bsize", "tsize", "speed", "fish", "birds", "cars", "hue", "bubbles", "text", "fx", "dir", "words", "t2a", "t2b"];
  // সাইজের সীমা আগের ৪ গুণ (২.২ → ৮.৮)
  var SL = [["🐟🐦🚗 সব আকার একসাথে", "size", .2, 8.8, .1], ["🐦 পাখির সাইজ", "bsz", .3, 8.8, .1], ["💭 বাবল ছোট–বড়", "bsize", .3, 8.8, .1], ["🔤 বাবলের লেখা ছোট–বড়", "tsize", .3, 8.8, .1], ["⏩ গতি", "speed", .1, 4, .1], ["🐟 মাছ কয়টা", "fish", 0, 6, 1], ["🐦 পাখি কয়টা", "birds", 0, 10, 1], ["🚗🚚🏍 গাড়ি/ট্রাক/বাইক একসাথে কয়টা", "cars", 0, 5, 1], ["🎨 রং বদলান (হিউ)", "hue", -180, 180, 5]];
  var TX = [["words", "🔤 মাছ ও পাখির বাবলের লেখা (কমা দিয়ে আলাদা, একটার পর একটা আসবে)", 60], ["t2a", "🚗 গাড়ির পিছনের বাবল — বড় লেখা", 24], ["t2b", "🚗 গাড়ির পিছনের বাবল — ছোট লেখা", 24]];
  var DT = [["college", "🏫 গেইট/দরজায় কলেজের নাম", 40], ["group", "👥 গ্রুপের নাম", 40], ["session", "📅 সেশন", 20], ["lt1", "💬 পেছনের চ্যাট উইন্ডো ১-এর নাম", 20], ["lt2", "📚 পেছনের চ্যাট উইন্ডো ২-এর নাম", 20], ["sign", "👋 সাইনে স্বাগত লাইন ({নাম} = ইউজারের নাম)", 60], ["welcome", "💬 দরজা খোলার পর ভেতরের লেখা ({নাম} = ইউজারের নাম)", 160], ["blk", "⛔ যাদের দরজা দেখানো হবে না — নাম কমা দিয়ে (ঐ নামে ঢুকলে সরাসরি চ্যাট খুলবে)", 1500]];
  var DSW = [["on", "🚪 গেইট/দরজা চালু (বন্ধ করলে সবার সরাসরি চ্যাট খুলবে)"], ["sound", "🔊 দরজার শব্দ"], ["csnd", "💬 পেছনের চ্যাটের টুংটাং শব্দ"], ["txt", "📝 ভেতরের স্বাগত লেখা"], ["click", "👆 ক্লিক করলে দরজা খুলবে"], ["lim", "🔁 বারবার ঢুকলে সীমা (নিচের সর্বোচ্চ বার/মিনিট)"], ["sbtn", "🔊 গেইটে শব্দ অন/অফ বাটন দেখাবে (ইউজার নিজে বন্ধ/চালু করে; ডিফল্ট চালু)"], ["pl", "🏷 স্বাগতম লেখায় নামের (হে …) আলাদা প্লেট"], ["seal", "🔖 চ্যাট বার্তার ফ্রেমে সিল (নামটা দ্বিতীয়বার)"], ["sl2", "🔖 চ্যাট বার্তায় বাম-ওপরেও সিল (একই বক্তার নাম)"], ["lock", "🔒 গেইট/দরজার ডান-ওপরে তালা বাটন (ট্যাপে আনলক → একই জায়গায় ✕ বন্ধ বাটন)"], ["sgdrag", "✋ আনলক করলে সাইন-বোর্ড হাতে টেনে ওপর-নিচ করা যাবে"], ["gfull", "🖼 ছবির গেইট পুরো স্ক্রিন জুড়ে"]];
  var DN = { wait1: "⏳ গেইট বন্ধ থাকবে — নিজে খুলবে (সেকেন্ড)", msg1: "📝 স্বাগতম লেখা থাকবে (সেকেন্ড)", shr: "🔽 স্বাগতম লেখা বড় থেকে ছোট হয়ে মিলাতে বাড়তি সময় (সেকেন্ড)", chat: "💬 লেখা মিলানোর পর পেছনের চ্যাট চলবে (সেকেন্ড)", fa: "🎬 বাবল এনিমেশন (০ = ১৬টা এলোমেলো, ১–১৬ = একটাই)", fl: "⏱ প্রতিটা বাবল কতক্ষণ থাকবে (সেকেন্ড)", cd1: "👆 কত সেকেন্ড পর থেকে ক্লিকে খুলবে", nth: "🔢 কততম বার থেকে ছোট সময়", wait3: "⏳ গেইট বন্ধ থাকবে — নিজে খুলবে (সেকেন্ড)", msg3: "📝 স্বাগতম লেখা থাকবে (সেকেন্ড)", cd3: "👆 কত সেকেন্ড পর থেকে ক্লিকে খুলবে", bri: "🔆 পেছনের চ্যাট উইন্ডোর ব্রাইটনেস (%; কম = অন্ধকার)", wx: "↔ উইন্ডো ডানে-বামে (+ = দুই পাশে আরও বাইরে, − = ভেতরে)", wy: "↕ উইন্ডো ওপর-নিচে (+ = নিচে, − = ওপরে)", sgs: "🔠 সাইনের লেখা সাইজ (%; ১০০ = স্বাভাবিক)", sgb: "🅱 সাইনের লেখা মোটা-ভাব (৪০০–৯০০)", sgh: "↕ সাইনের উচ্চতা (%)", sgw: "↔ সাইনের চওড়া (%)", sgy: "⇅ সাইন ওপর-নিচ (%; − = ওপরে)", cspd: "⚡ (পুরোনো, আর কাজ করে না)", gap: "✍ কাস্টম ফাঁক — দুই মেসেজের মাঝে (মিলিসেকেন্ড; ০ = ওপরে বাছা গতি চলবে; কম = দ্রুত)", vol: "🔊 দরজার সব শব্দের মূল জোর (%; ৫০০ = ফুল; ডিফল্ট ২০০)", vk: "🥁 ঠকঠক (বন্ধ দরজায় নক) — আলাদা জোর (%; ১০০ = স্বাভাবিক, ০ = বন্ধ)", vc: "🚪 ক্যাঁচ / সুশ (দরজা খোলার আওয়াজ) — আলাদা জোর (%; ১০০ = স্বাভাবিক, ০ = বন্ধ)", vt: "💥 ঠাস (খোলার শেষে ধাক্কা) — আলাদা জোর (%; ১০০ = স্বাভাবিক, ০ = বন্ধ)", cvol: "💬 পেছনের চ্যাট শব্দের জোর — পপ/ডিং (%; ৮০০ = ফুল, ডিফল্ট)", sla: "🔖 সিল/নামের হেলা (ডিগ্রি; − = বামে হেলা, ডিফল্ট −৮)", max: "🔁 সর্বোচ্চ কতবার দেখাবে", win: "🕒 কত মিনিটের মধ্যে" };
  var door = {}, saved = "", savedC = {}, savedD = {}, pv = "রাকিব", RS = false, DEFS = { design: 1, size: 1, bsz: 1.7, bsize: 2, tsize: 1, speed: 1, fish: 5, birds: 6, cars: 2, hue: 0, bubbles: true, text: true, fx: true, dir: "toward", words: "M.C, ADDA, MASTER’S", t2a: "M.C", t2b: "Master’s ADDA" };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["b12", "🎞 এনিমেশন ও দরজা"]]);
  function snap() { var o = {}; KEYS.forEach(function (k) { o[k] = window.BG12.cfg[k]; }); return o; }
  function js() { return JSON.stringify([snap(), door]); }
  function view() {
    var m = M(), $ = m.$, esc = m.esc, B = window.BG12;
    return m.A("mc2_bg12_cfg?select=cfg,door&id=eq.1").then(function (d) {
      var r = d && d[0] || {}; door = {}; var q, D = window.FADoor.defaults;
      for (q in D) door[q] = r.door && r.door.hasOwnProperty(q) && typeof r.door[q] === typeof D[q] ? r.door[q] : D[q]; if (r.door && r.door.vol === 250 && !r.door.hasOwnProperty("cvol")) door.vol = D.vol; if (r.door && r.door.vol === 500) door.vol = D.vol; if (r.door && r.door.vol === 333 && !r.door.hasOwnProperty("vk")) door.vol = D.vol; door.names = Array.isArray(door.names) ? door.names.slice() : D.names.slice(); door.qa = Array.isArray(r.door && r.door.qa) ? window.FADoor.cleanQA(r.door.qa) : window.FADoor.cleanQA(null);
      var o = {}; if (r.cfg) KEYS.forEach(function (k) { if (r.cfg.hasOwnProperty(k) && typeof r.cfg[k] === typeof B.cfg[k]) o[k] = r.cfg[k]; });
      door.snd = (r.door && r.door.snd && typeof r.door.snd === "object") ? JSON.parse(JSON.stringify(r.door.snd)) : { fo: true, bo: true, fid: "", bid: "", lib: [] }; if (!Array.isArray(door.snd.lib)) door.snd.lib = [];
      B.set(o); saved = js(); savedC = JSON.parse(JSON.stringify(snap())); savedD = JSON.parse(JSON.stringify(door)); if (RS) { B.set(DEFS); RS = false; }
      var h = "<h2>🎞 হোম এনিমেশন ও চ্যাটের দরজা</h2><div class='sm'>যা বদলাবেন নিচের লাইভ প্রিভিউতে সঙ্গে সঙ্গে দেখা যাবে। 💾 সেভ না চাপা পর্যন্ত সাইটে বদলায় না।</div>" +
        "<div id='b12hd' style='position:relative;width:100%;max-width:640px;margin:8px auto;aspect-ratio:1200/630;border-radius:0 0 26px 26px;overflow:hidden;background:#0f2d20 url(images/bg/bg-12.png) center/cover;color:#fff;text-align:center;padding-top:5%;text-shadow:0 2px 14px rgba(0,0,0,.65)'><b style='display:block;font:800 clamp(16px,4.6vw,28px)/1.25 \"Anek Bangla\",sans-serif'>M.C COLLEGE MASTER’S<small style='display:block;font-size:.6em;color:#cfe5d6'>2023-24</small></b><i style='font:700 clamp(14px,4vw,22px) \"Anek Bangla\",sans-serif;font-style:normal;color:#ffd08a'>FRIENDS ADDA</i></div>" +
        "<div class='sm'>ডিজাইন (🆕 ১১–১৪ = রিয়েল পাখি ও মাছ)</div><div id='b12ch' style='display:flex;gap:6px;flex-wrap:wrap;margin:6px 0'></div>" +
        "<div id='b12sl' style='display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px 14px;margin-top:10px'></div><div id='b12ck' style='display:flex;gap:14px;flex-wrap:wrap;margin:10px 0'></div>" +
        "<div id='b12tx' style='display:grid;gap:8px'></div><h3 style='margin:16px 0 4px'>🔊 মাছ ও পাখির শব্দ</h3><div id='b12sn'></div><div class='act' style='margin-top:8px'><button id='b12rs' type='button' class='l'>↺ ডিফল্ট এনিমেশন সেটিং</button></div>" +
        "<h2 style='margin-top:18px'>🚪 চ্যাটের দরজা</h2><div class='sm'>চ্যাটে ঢোকার সময় গেইট/দরজা আসবে (শব্দ সহ)। সময়গুলো সেভ করলে সব ইউজার রিফ্রেশের পর পাবে। প্রত্যেক ইউজারের নিজের ফোনে ‘কততম বার’ গোনা হয়; নিজে চাইলে চ্যাটের ⋯ মেনু থেকে ‘আমার দরজা’ বন্ধ করতে পারে।</div><div id='b12dt' style='display:grid;gap:8px;margin-top:8px'></div>" +
        "<h3 style='margin:14px 0 4px'>👁 প্রিভিউ — কে কী দেখবে</h3><div class='sm'>নিচের বাটনে চাপলে সেই ধরনের ইউজার চ্যাটে ঢুকলে (এই মুহূর্তের, সেভ-না-করা সেটিং অনুযায়ী) কী হবে তা ছোট বক্সে দেখা যাবে। সময়/ডিজাইন/উইন্ডো বদলে আবার চাপুন।</div>" +
        "<div id='b12scn' style='display:flex;gap:6px;flex-wrap:wrap;margin:6px 0'></div>" +
        "<div id='b12res' style='font-weight:700;margin:4px 0;min-height:22px'></div>" +
        "<div id='b12dm' style='position:relative;width:100%;max-width:320px;height:340px;margin:8px auto;border-radius:16px;background:#111;display:grid;place-items:center;color:#aaa;font-size:13px;text-align:center;padding:10px'>এখানে ছোট প্রিভিউ চলবে</div>" +
        "<div class='act' style='align-items:center'><label>প্রিভিউয়ের নাম<input id='b12pn' type='text' maxlength='20' value='" + esc(pv) + "'></label></div>" +
        "<div class='it' style='margin-top:12px;position:sticky;bottom:6px;background:var(--card);z-index:2'><div class='act' style='align-items:center'><button id='b12sv' type='button' style='font-size:16px;padding:10px 18px'>💾 সেভ</button><span id='b12m' class='sm' style='font-weight:700'></span></div></div>";
      $("#view").innerHTML = h;
      var hd = $("#b12hd"); B.mount(hd, { force: true });
      var ch = $("#b12ch"), mark = function () { [].forEach.call(ch.children, function (b, i) { b.style.borderColor = B.cfg.design === i + 1 ? "var(--g)" : "var(--bd)"; b.style.background = B.cfg.design === i + 1 ? "var(--g)" : "var(--card)"; b.style.color = B.cfg.design === i + 1 ? "#fff" : "var(--fg)"; }); };
      B.designs.forEach(function (x) { var b = document.createElement("button"); b.type = "button"; b.className = "l"; b.style.cssText = "border:2px solid var(--bd);padding:5px 9px;font-size:13px"; b.textContent = (x.id > 10 ? "🆕 " : "") + bn(x.id) + " · " + x.t; b.onclick = function () { B.set({ design: x.id }); mark(); dirty(); }; ch.appendChild(b); });
      mark();
      var sh = ""; SL.forEach(function (r) { sh += "<label style='display:grid;gap:2px;font-size:13px;font-weight:600'>" + r[0] + " <span id='b12v_" + r[1] + "' class='sm'></span><input type='range' data-k='" + r[1] + "' min='" + r[2] + "' max='" + r[3] + "' step='" + r[4] + "' value='" + B.cfg[r[1]] + "'></label>"; });
      $("#b12sl").innerHTML = sh;
      [].forEach.call($("#b12sl").querySelectorAll("input"), function (i) { var u = function () { $("#b12v_" + i.dataset.k).textContent = bn(i.value); }; u(); i.oninput = function () { var p = {}; p[i.dataset.k] = +i.value; B.set(p); u(); dirty(); }; });
      var ck = ""; [["bubbles", "💭 বাবল"], ["text", "🔤 বাবলের লেখা"], ["fx", "✨ ইফেক্ট (পাপড়ি/তুষার…)"]].forEach(function (r) { ck += "<label style='display:flex;gap:5px;align-items:center;font-weight:600'><input type='checkbox' data-k='" + r[0] + "'" + (B.cfg[r[0]] ? " checked" : "") + " style='width:auto'>" + r[1] + "</label>"; });
      ck += "<label style='display:flex;gap:6px;align-items:center;font-weight:600'>গাড়ির দিক <select id='b12dir' style='width:auto'><option value='toward'>সামনে আসছে</option><option value='away'>দূরে যাচ্ছে</option></select></label>";
      $("#b12ck").innerHTML = ck; $("#b12dir").value = B.cfg.dir; $("#b12dir").onchange = function () { B.set({ dir: this.value }); dirty(); };
      [].forEach.call($("#b12ck").querySelectorAll("input"), function (i) { i.onchange = function () { var p = {}; p[i.dataset.k] = i.checked; B.set(p); dirty(); }; });
      var th = ""; TX.forEach(function (r) { th += "<label style='font-size:13px;font-weight:600'>" + r[1] + "<input type='text' data-k='" + r[0] + "' maxlength='" + r[2] + "' value='" + esc(B.cfg[r[0]]) + "'></label>"; });
      $("#b12tx").innerHTML = th;
      [].forEach.call($("#b12tx").querySelectorAll("input"), function (i) { var t; i.oninput = function () { clearTimeout(t); t = setTimeout(function () { var p = {}; p[i.dataset.k] = i.value; B.set(p); dirty(); }, 250); }; });

      // ---- part67: 🔊 মাছ ও পাখির শব্দ — অন/অফ, লিংক/পথ বসান, শুরু–শেষ সেকেন্ডে কাটুন, শুনুন, সেভ-তালিকা ----
      (function () {
        var S = door.snd, box = $("#b12sn"), cur = null, ed = "", PDEL = [], PUB = m.base + "/storage/v1/object/public/mc2-sounds/", say2 = function (t, bad) { var e = $("#b12sm"); if (e) { e.textContent = t; e.style.color = bad ? "#c0392b" : "var(--g)"; } };
        function stop() { if (cur) { try { cur.pause(); } catch (e) {} clearTimeout(cur._t); cur = null; } }
        function newId() { return "s" + Date.now().toString(36).slice(-6) + Math.floor(Math.random() * 99); }
        function opts(sel) { var h = "<option value=''>🤖 ডিফল্ট (কৃত্রিম শব্দ)</option>"; S.lib.forEach(function (x) { h += "<option value='" + esc(x.id) + "'" + (sel === x.id ? " selected" : "") + ">" + esc(x.n || x.u) + " (" + bn(x.s) + "–" + bn(x.e) + " সে.)</option>"; }); return h; }
        function draw() {
          var h = "<div class='sm'>শব্দ শুধু মাছ/পাখিতে ক্লিক বা ট্যাপ করলে বাজে। নিজের শব্দ না বাছলে ডিফল্ট কৃত্রিম শব্দ বাজবে। সুইচ বন্ধ করলে ওই শব্দ একদমই বাজবে না।</div>" +
            "<div style='display:flex;gap:16px;flex-wrap:wrap;margin:8px 0'><label><input type='checkbox' id='b12fo'" + (S.fo !== false ? " checked" : "") + "> 🐟 মাছের শব্দ চালু</label><label><input type='checkbox' id='b12bo'" + (S.bo !== false ? " checked" : "") + "> 🐦 পাখির শব্দ চালু</label></div>" +
            "<div style='border:1px solid var(--bd);border-radius:12px;padding:10px;margin:8px 0'><label><input type='checkbox' id='b12ho'" + (S.ho !== false ? " checked" : "") + "> 🌅 হোমে ঢুকলে প্রতিবার সকালের পাখির ডাক (নিজে বন্ধ হবে)</label><div class='row' style='margin-top:6px'><label>যেটা বাজবে<select id='b12hs'>" + opts(S.hid) + "</select></label></div><div class='row' style='margin-top:6px'><label>⏱ ডিফল্ট ডাক কত সেকেন্ড বাজবে (১–৫; ৫ সেকেন্ডের বেশি নয়)<input id='b12hn' type='number' min='1' max='5' step='0.5' value='" + (+S.hs || 3) + "'></label></div><div class='sm'>ডিফল্টে ব্রাউজারে বানানো কিচিরমিচির, উপরের ঘরের সেকেন্ড ধরে। নিজের mp3 বাছলে তার কাটা অংশ (শুরু–শেষ সেকেন্ডে যত লম্বা কেটে রেখেছেন, সীমা নেই) বাজবে। ফোন/ব্রাউজার ট্যাপ ছাড়া শব্দ আটকালে ইউজারের প্রথম ট্যাপেই বাজবে।</div><div class='act' style='margin-top:6px'><button type='button' id='b12hd' class='l'>▶ ডিফল্ট ডাক শুনুন</button><button type='button' id='b12hx' class='l'>⏹ থামান</button></div></div>" +
            "<div class='row'><label>🐟 মাছে ক্লিকে যেটা বাজবে<select id='b12fs'>" + opts(S.fid) + "</select></label><label>🐦 পাখিতে ক্লিকে যেটা বাজবে<select id='b12bs'>" + opts(S.bid) + "</select></label></div>" +
            "<div style='border:1px solid var(--bd);border-radius:12px;padding:10px;margin:10px 0'><b>" + (ed ? "✏ তালিকার শব্দ বদলাচ্ছেন" : "➕ নতুন শব্দ") + "</b><div class='sm'>নিজের mp3 আপলোড করুন (বাছলেই আপলোড হবে, লিংক নিজে বসবে) অথবা mp3-এর সরাসরি https লিংক/সাইটের ভেতরের পথ বসান। তারপর শুরু–শেষ সেকেন্ড দিয়ে কাটুন, ▶ চেপে শুনুন, পছন্দ হলে নাম দিয়ে তালিকায় রাখুন।</div>" +
            "<div class='act' style='margin:6px 0'><label class='sm' style='display:inline-block'>📁 নিজের কম্পিউটার/ফোন থেকে mp3 বাছুন (সর্বোচ্চ ১ MB)<br><input id='b12sf' type='file' accept='audio/*,.mp3,.ogg,.wav,.m4a,.aac'></label></div><div class='sm'>অথবা নিচে লিংক বসান:</div><input id='b12su' type='text' placeholder='https://…mp3 অথবা sounds/fish.mp3' style='width:100%;box-sizing:border-box;margin:6px 0'><div id='b12sd' class='sm'></div>" +
            "<div class='row'><label>শুরু (সেকেন্ড)<input id='b12ss' type='number' min='0' step='0.1' value='0'></label><label>শেষ (সেকেন্ড)<input id='b12se' type='number' min='0.1' step='0.1' value='2'></label><label>নাম<input id='b12sna' type='text' maxlength='30' placeholder='যেমন: ছোট বিপ'></label></div>" +
            "<div class='act' style='margin-top:8px'><button id='b12sp' type='button'>▶ শুনুন</button><button id='b12sx' type='button' class='l'>⏹ থামান</button><button id='b12sa' type='button'>" + (ed ? "💾 বদল রাখুন" : "💾 তালিকায় রাখুন") + "</button>" + (ed ? "<button id='b12sc' type='button' class='l'>✕ বাতিল</button>" : "") + "</div><div id='b12sm' class='sm' style='margin-top:6px'></div></div>";
          h += "<b>📚 রাখা শব্দ (" + bn(S.lib.length) + ")</b>" + (S.lib.length ? "" : "<div class='sm'>এখনো কিছু রাখা হয়নি।</div>");
          S.lib.forEach(function (x, i) { h += "<div style='display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid var(--bd);border-radius:10px;padding:6px 8px;margin:5px 0'><div style='flex:1;min-width:160px'><b>" + esc(x.n || "(নামহীন)") + "</b>" + (S.fid === x.id ? " 🐟" : "") + (S.bid === x.id ? " 🐦" : "") + (S.hid === x.id ? " 🌅" : "") + "<div class='sm' style='overflow-wrap:anywhere'>" + esc(x.u) + " · " + bn(x.s) + "–" + bn(x.e) + " সে.</div></div><button type='button' class='l' data-a='p' data-i='" + i + "'>▶</button><button type='button' class='l' data-a='e' data-i='" + i + "'>✏</button><button type='button' class='l' data-a='d' data-i='" + i + "' style='color:#c0392b'>🗑</button></div>"; });
          box.innerHTML = h;
          var g = function (id) { return box.querySelector("#" + id); };
          if (ed) { var x0 = S.lib.filter(function (q) { return q.id === ed; })[0]; if (x0) { g("b12su").value = x0.u; g("b12ss").value = x0.s; g("b12se").value = x0.e; g("b12sna").value = x0.n; } }
          g("b12ho").onchange = function () { S.ho = this.checked; dirty(); }; g("b12hs").onchange = function () { S.hid = this.value; draw(); dirty(); };
          g("b12hn").onchange = function () { S.hs = Math.max(1, Math.min(5, +this.value || 3)); this.value = S.hs; dirty(); };
          g("b12hx").onclick = function () { window.BG12.stopEntry(); stop(); };
          g("b12hd").onclick = function () { S.hs = Math.max(1, Math.min(5, +g("b12hn").value || 3)); if (!window.BG12.demoEntry(S.hs)) alert("ব্রাউজার শব্দ আটকাচ্ছে — পেজে একবার ক্লিক করে আবার চাপুন।"); };
          g("b12sf").onchange = function () {
            var f = this.files && this.files[0]; this.value = ""; if (!f) return;
            var mt = /\.(mp3|ogg|wav|m4a|aac|webm)$/i.exec(f.name); if (!mt) { say2("শুধু mp3, ogg, wav, m4a, aac ফাইল চলবে।", 1); return; }
            if (f.size > 1048576) { say2("ফাইল " + bn(Math.round(f.size / 1024)) + " KB — সর্বোচ্চ ১ MB। ছোট করে (কাটা/কম কোয়ালিটি) আবার বাছুন।", 1); return; }
            var ext = mt[1].toLowerCase(), nm = "s" + Date.now().toString(36) + "-" + (f.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "").slice(0, 20) || "sound") + "." + ext, ct = f.type || ({ mp3: "audio/mpeg", ogg: "audio/ogg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", webm: "audio/webm" })[ext];
            say2("⏳ আপলোড হচ্ছে…");
            m.raw(m.base + "/storage/v1/object/mc2-sounds/" + nm, { method: "POST", headers: { "Content-Type": ct, "x-upsert": "false" }, body: f }).then(function (rs) {
              if (!rs.ok) return rs.text().then(function (tx) { say2(/not found|bucket/i.test(tx) ? "❌ সার্ভারে শব্দের ফোল্ডার নেই — sql/SQL-19-SOUND-UPLOAD-BUCKET.sql একবার Supabase SQL Editor-এ চালান।" : /mime|type/i.test(tx) ? "❌ এই ধরনের ফাইল নেওয়া যাচ্ছে না — mp3 দিন।" : /exceed|size|large/i.test(tx) ? "❌ ফাইল বড় — সর্বোচ্চ ১ MB।" : "❌ আপলোড হয়নি: " + tx.slice(0, 120), 1); });
              var url = m.base + "/storage/v1/object/public/mc2-sounds/" + nm; g("b12su").value = url; g("b12ss").value = 0; g("b12se").value = 2; if (!g("b12sna").value) g("b12sna").value = f.name.replace(/\.[^.]+$/, "").slice(0, 30);
              var tmp = new Audio(url); tmp.preload = "metadata"; tmp.onloadedmetadata = function () { var d = tmp.duration; if (d && isFinite(d)) { g("b12sd").textContent = "ফাইলের মোট সময়: " + bn(Math.round(d * 10) / 10) + " সেকেন্ড"; g("b12se").value = Math.round(Math.min(d, 3) * 10) / 10; } };
              say2("✅ আপলোড হয়েছে। এবার শুরু–শেষ ঠিক করে ▶ শুনুন, পছন্দ হলে 💾 তালিকায় রাখুন।");
            }).catch(function (er) { say2("❌ আপলোড হয়নি: " + (er && er.message ? er.message : er), 1); });
          };
          g("b12fo").onchange = function () { S.fo = this.checked; dirty(); }; g("b12bo").onchange = function () { S.bo = this.checked; dirty(); };
          g("b12fs").onchange = function () { S.fid = this.value; draw(); dirty(); }; g("b12bs").onchange = function () { S.bid = this.value; draw(); dirty(); };
          function read(chk) { var u = g("b12su").value.trim(), a = +g("b12ss").value, b = +g("b12se").value; if (!window.BG12.okSrc(u)) { say2("লিংক ঠিক নয়: https://…mp3 অথবা sounds/নাম.mp3 লিখুন (সরাসরি অডিও ফাইলের লিংক)।", 1); return null; } if (!(a >= 0) || !(b > a)) { say2("শেষ সেকেন্ড শুরুর চেয়ে বড় হতে হবে।", 1); return null; } if (b > 7200) { say2("শেষ সময় খুব বেশি।", 1); return null; } return { u: u, s: Math.round(a * 100) / 100, e: Math.round(b * 100) / 100 }; }
          g("b12sp").onclick = function () { var it = read(); if (!it) return; stop(); say2("⏳ লোড হচ্ছে…"); var ok = true; cur = window.BG12.playClip(it, function () { ok = false; say2("❌ এই লিংক থেকে বাজানো গেল না — সরাসরি অডিও ফাইলের লিংক কি না দেখুন (ইউটিউব/ড্রাইভ লিংক চলে না)।", 1); }, true); cur._end = function () { say2("✅ শোনা শেষ (" + bn(it.s) + "–" + bn(it.e) + " সে.)। পছন্দ হলে 💾 তালিকায় রাখুন।"); }; cur.addEventListener("playing", function () { say2("▶ বাজছে…"); }); cur.addEventListener("loadedmetadata", function () { if (cur && cur.duration && it.s >= cur.duration) say2("⚠ ফাইলটা মাত্র " + bn(Math.round(cur.duration * 10) / 10) + " সেকেন্ডের — শুরু সময় কমান।", 1); }); };
          g("b12sx").onclick = function () { stop(); say2("থামানো হয়েছে।"); };
          g("b12sa").onclick = function () { var it = read(); if (!it) return; if (ed) { S.lib.forEach(function (q) { if (q.id === ed) { q.u = it.u; q.s = it.s; q.e = it.e; q.n = g("b12sna").value.trim().slice(0, 30); } }); ed = ""; } else { if (S.lib.length >= 30) { say2("সর্বোচ্চ ৩০টা রাখা যায় — কিছু ডিলিট করুন।", 1); return; } S.lib.push({ id: newId(), n: g("b12sna").value.trim().slice(0, 30) || "শব্দ " + bn(S.lib.length + 1), u: it.u, s: it.s, e: it.e }); } stop(); draw(); dirty(); say2("✅ তালিকায় রাখা হয়েছে। এবার উপরে মাছ/পাখির ঘর থেকে বাছুন, তারপর নিচের 💾 সেভ চাপুন।"); };
          if (g("b12sc")) g("b12sc").onclick = function () { ed = ""; stop(); draw(); };
          [].forEach.call(box.querySelectorAll("button[data-a]"), function (b) { b.onclick = function () { var i = +b.dataset.i, x = S.lib[i]; if (!x) return; if (b.dataset.a === "p") { stop(); cur = window.BG12.playClip(x, function () { alert("এই লিংক থেকে বাজানো গেল না।"); }, true); } else if (b.dataset.a === "e") { ed = x.id; stop(); draw(); box.scrollIntoView({ block: "start", behavior: "smooth" }); } else if (confirm("“" + (x.n || x.u) + "” ডিলিট করবেন?")) { if (S.fid === x.id) S.fid = ""; if (S.bid === x.id) S.bid = ""; if (S.hid === x.id) S.hid = ""; PDEL.push(x.u); if (ed === x.id) ed = ""; S.lib.splice(i, 1); draw(); dirty(); } }; });
        }
        draw(); window.__b12sndDraw = draw;
        window.__b12snd = function () { // সেভ সফল হলে: ডিলিট করা আপলোড-ফাইলগুলো স্টোরেজ থেকেও মোছা (অন্য কোনো আইটেম ব্যবহার না করলে)
          var used = {}; S.lib.forEach(function (x) { used[x.u] = 1; });
          PDEL.splice(0).forEach(function (u) { if (u.indexOf(PUB) === 0 && !used[u]) m.raw(m.base + "/storage/v1/object/mc2-sounds/" + u.slice(PUB.length), { method: "DELETE" }).catch(function () {}); });
        };
      })();
      $("#b12rs").onclick = function () { RS = true; view().then(function () { $("#b12m").textContent = "● ডিফল্ট বসেছে — 💾 সেভ চাপুন।"; }); };
      // গেইট/দরজা
      var F = window.FADoor, LM = F.limits, lab = "style='font-size:13px;font-weight:600;display:grid;gap:2px'", box = "style='border:1px solid var(--bd);border-radius:12px;padding:10px;display:grid;gap:8px'";
      var numf = function (k) { return "<label " + lab + ">" + DN[k] + "<input type='number' inputmode='decimal' data-d='" + k + "' min='" + LM[k][0] + "' max='" + LM[k][1] + "' step='" + (/^(cd|wait|msg|shr|chat|fl)/.test(k) ? ".5" : "1") + "' value='" + door[k] + "'></label>"; };
      var rngf = function (k, st) { return "<label " + lab + ">" + DN[k] + " <b id='b12r_" + k + "'>" + door[k] + "</b><input type='range' data-d='" + k + "' min='" + LM[k][0] + "' max='" + LM[k][1] + "' step='" + st + "' value='" + door[k] + "'></label>"; };
      var clr = function (k, t) { return "<label " + lab + ">" + t + " <b id='b12c_" + k + "'>" + (door[k] || "অটো") + "</b><span style='display:flex;gap:6px'><input type='color' data-d='" + k + "' value='" + esc(door[k] || "#888888") + "' style='height:40px;padding:2px;flex:1'><button type='button' class='l' data-auto='" + k + "'>অটো</button></span></label>"; };
      var dh = "<div style='display:grid;gap:8px'>";
      DSW.forEach(function (r) { dh += "<label style='display:flex;gap:6px;align-items:center;font-weight:600'><input type='checkbox' data-d='" + r[0] + "'" + (door[r[0]] ? " checked" : "") + " style='width:auto'>" + r[1] + "</label>"; });
      dh += "<label style='font-weight:600;display:grid;gap:2px'>👥 কাদের দেখাবে<select data-d='aud'><option value='all'>সবাই (নামি + বেনামি)</option><option value='named'>শুধু নামি (নাম দিয়ে ঢোকা)</option><option value='anon'>শুধু বেনামি</option></select></label>";
      dh += "</div><div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px'>" +
        "<div " + box + "><b>🥇 প্রথম বার (এবং ছোট-সময়ের আগের বারগুলো)</b>" + numf("wait1") + numf("msg1") + numf("shr") + numf("chat") + numf("cd1") + "<span class='sm'>মোট প্রায় <b id='b12t1'></b> সেকেন্ড</span></div>" +
        "<div " + box + "><b>⚡ নির্দিষ্ট বার থেকে (প্রত্যেক ইউজারের)</b>" + numf("nth") + numf("wait3") + numf("msg3") + numf("cd3") + "<span class='sm'>মোট প্রায় <b id='b12t3'></b> সেকেন্ড</span></div></div>" +
        "<div " + box + "><b>🪧 দরজা খোলার আগের সাইন লেখা (ছবি-গেইটে; ছবির \"বিভাগ\" লেখা কখনো ঢাকবে না)</b>" + rngf("sgs", 5) + rngf("sgb", 100) + rngf("sgh", 1) + rngf("sgw", 1) + rngf("sgy", 1) + "<div class='act'><button type='button' class='l' id='b12sgb'>👁 সাইন দেখুন (দরজা বন্ধ রেখে)</button></div><span class='sm'>লেখা বেশি হলে অটো ছোট হয়ে জায়গায় ফিট করে।</span></div>" +
        "<div " + box + "><b>⚡ পেছনের চ্যাটের গতি (মেসেজ আসার)</b><div class='act' id='b12sp'></div><span class='sm'>🐢 বেশি ধীর ১.৫ সেকেন্ড · 🚶 কম ধীর ১ সেকেন্ড · 🏃 স্পিড ০.৬ সেকেন্ড · 🚀 ফুল স্পিড ০.২৫ সেকেন্ড (এতে নাম ফুরোলে আবার ঘুরে আসে)। বাছা গতি থেকে নিজের মতো করতে নিচে \"কাস্টম ফাঁক\" দিন। ধীর গতিতে প্রতিটা নাম এক ভিজিটে একবার; বাদ পড়াররা পরের ভিজিটে আগে আসে।</span></div>" +
        "<div " + box + " data-g='snd'><b>🚪 দরজার শব্দ — ৩টা শব্দের আলাদা জোর</b><span class='sm'>স্লাইডার টেনে নিচের বাটনে চেপে সঙ্গে সঙ্গে শুনুন (সেভ না করেও)। মূল জোর সবার ওপর, তারপর প্রতিটার আলাদা জোর।</span>" + rngf("vol", 10) + rngf("vk", 5) + rngf("vc", 5) + rngf("vt", 5) + "<div class='act'><button type='button' class='l' data-snd='knock'>🥁 ঠকঠক শুনুন</button><button type='button' class='l' data-snd='creak'>🚪 ক্যাঁচ শুনুন</button><button type='button' class='l' data-snd='swoosh'>🌬 সুশ (স্লাইডিং) শুনুন</button><button type='button' class='l' data-snd='bang'>💥 ঠাস শুনুন</button><button type='button' data-snd='all'>▶ খোলার পুরো আওয়াজ</button></div>" + rngf("cvol", 10) + "</div>" +
        "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px'>" + numf("gap") + rngf("sla", 1) + numf("fa") + numf("fl") + numf("bri") + numf("wx") + numf("wy") + numf("max") + numf("win") + "</div><div class='act' data-g='snd'><button type='button' class='l' id='b12vf'>🔊 শব্দ ফুল করুন (দরজা ৫০০% + চ্যাট ৮০০%)</button></div><span class='sm' data-g='snd'>ফোনের মিডিয়া ভলিউমও বাড়ানো থাকতে হবে। ফুল করে 👁 প্রিভিউতে শুনে দেখুন, তারপর 💾 সেভ।</span>";
      DT.forEach(function (r) { dh += "<label " + lab + ">" + r[1] + "<input type='text' data-d='" + r[0] + "' maxlength='" + r[2] + "' value='" + esc(door[r[0]]) + "'></label>"; });
      dh += "<label " + lab + ">✨ দরজা খোলার পর ভেতরের লেখা কীভাবে আসবে<select data-d='wan'><option value='old'>আগেরটা — শব্দে শব্দে এসে মিলায়</option><option value='five'>নতুন — ৫ টুকরা: মাঝেরটা ভাসে, ৪টা চার কোণা থেকে আলাদা আলাদা ঢঙে নেচে এসে বসে</option></select></label>"; // part114
      dh += "<div " + box + "><b>🚧 গেইট/দরজার ডিজাইন কার্ড</b><div class='sm'>প্রতিটা কার্ডের নিচের ✔ দিয়ে ওই ডিজাইন চালু/বন্ধ করুন। ১ম ৭টা গেইট, পরের ১১টা দরজা। কার্ডে ট্যাপ = সিঙ্গেল মোডের ডিজাইন বাছা।</div><b>কোন ডিজাইন আসবে?</b><div class='act' id='b12dmd'></div><div id='b12dgs' class='sm' style='font-weight:700'></div><div class='act'><button type='button' class='l' id='b12don'>✅ সব কার্ড চালু</button></div></div><div id='b12dg' style='display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px'></div>" +
        "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px'><label " + lab + ">🟫 কাঠের রং ১ (শুধু ক্লাসিক কাঠ দরজায়)<input type='color' data-d='w1' value='" + esc(door.w1) + "' style='height:40px;padding:2px'></label><label " + lab + ">🟫 কাঠের রং ২<input type='color' data-d='w2' value='" + esc(door.w2) + "' style='height:40px;padding:2px'></label></div>" +
        "<div class='act'><button type='button' class='l' data-wood='#6b3f1d,#5a3216'>ওক</button><button type='button' class='l' data-wood='#2b2018,#1f1710'>আবলুস</button><button type='button' class='l' data-wood='#1f4d36,#173d2a'>সবুজ</button><button type='button' class='l' data-wood='#7a2a2a,#611f1f'>মেরুন</button></div>" +
        "<div " + box + "><b>🎨 স্বাগতম লেখার রং (\"অটো\" = প্রতিটা দরজার ডিজাইনের সাথে মেলানো রং)</b>" + clr("plbg", "🏷 নামের প্লেটের ব্যাকগ্রাউন্ড") + clr("plc", "🏷 নামের লেখার রং") + clr("wtc", "📝 বাকি লেখার রং") + "</div>";
      $("#b12dt").innerHTML = dh;
      // 💭 চ্যাটের নাম (দরজার পেছনের বাবল)
      (function () {
        var nb = document.createElement("div"); nb.style.cssText = "border:1px solid var(--bd);border-radius:12px;padding:10px;display:grid;gap:8px;margin-top:6px";
        nb.innerHTML = "<b>💭 চ্যাটের নাম (দরজা খুললে পেছনে এই নামগুলো বাবল হয়ে আসবে)</b><div class='sm'>সব নাম কমপক্ষে ৩ বার আসবে; সবসময় ৪টা বড় থাকবে (নাম বেশি হলে আরও), বাকিরা ছোট হয়ে ফাঁকে ফাঁকে; নাম বেশি হলে লেখাসহ অটো ছোট হবে।</div>" +
          "<div class='act' style='align-items:center'><input id='b12nn' type='text' maxlength='20' placeholder='নাম লিখুন (একসাথে অনেক হলে কমা দিয়ে)' style='flex:1;min-width:150px'><button type='button' class='l' id='b12na'>➕ যোগ</button></div>" +
          "<div class='act'><button type='button' class='l' id='b12nd'>↺ ডিফল্ট নাম</button><button type='button' class='l' id='b12nx' style='color:#c0392b'>🗑 সব নাম মুছুন</button></div>" +
          "<div id='b12nc' class='sm'></div><div id='b12nl' style='display:flex;flex-wrap:wrap;gap:6px'></div>";
        $("#b12dt").appendChild(nb);
        var list = $("#b12nl"), cnt = $("#b12nc");
        var draw = function () {
          list.innerHTML = ""; cnt.textContent = door.names.length ? "মোট " + bn(door.names.length) + "টা নাম (সর্বোচ্চ ৬০)" : "⚠ কোনো নাম নেই — দরজার পেছনে বাবল আসবে না।";
          door.names.forEach(function (n, i) { var c = document.createElement("span"); c.style.cssText = "display:inline-flex;gap:5px;align-items:center;border:1px solid var(--bd);border-radius:99px;padding:3px 6px 3px 10px;font-weight:600;background:var(--card)"; c.appendChild(document.createTextNode(n)); var x = document.createElement("button"); x.type = "button"; x.textContent = "❌"; x.setAttribute("aria-label", n + " মুছুন"); x.style.cssText = "border:0;background:none;cursor:pointer;padding:0 2px"; x.onclick = function () { door.names.splice(i, 1); draw(); dirty(); }; c.appendChild(x); list.appendChild(c); });
        };
        var add = function () {
          var inp = $("#b12nn"), parts = inp.value.split(/[,\n،;]+/).map(function (t) { return t.replace(/\s+/g, " ").trim().slice(0, 20); }).filter(Boolean), add = 0;
          parts.forEach(function (t) { if (door.names.length < 60 && door.names.indexOf(t) < 0) { door.names.push(t); add++; } });
          inp.value = ""; if (parts.length && !add) alert("নামগুলো আগে থেকেই আছে বা ৬০টার সীমা পূর্ণ।"); draw(); if (add) dirty();
        };
        $("#b12na").onclick = add; $("#b12nn").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } };
        $("#b12nx").onclick = function () { if (!door.names.length) return; if (confirm("সব নাম মুছবেন? (সেভ না চাপা পর্যন্ত সাইটে বদলাবে না)")) { door.names = []; draw(); dirty(); } };
        $("#b12nd").onclick = function () { door.names = window.FADoor.defaults.names.slice(); draw(); dirty(); };
        draw();
      })();
      // 💬 প্রশ্ন–উত্তর জোড়া + 🚶 বাবলের ঘোরাঘুরি (door.qa, door.wnd, door.wmin, door.wmax — আগের door কলামেই সেভ)
      (function () {
        var F = window.FADoor, DQ = JSON.stringify(F.defaults.qa), box = document.createElement("div");
        box.style.cssText = "border:1px solid var(--bd);border-radius:12px;padding:10px;display:grid;gap:8px;margin-top:6px";
        box.innerHTML = "<b>💬 প্রশ্ন–উত্তর জোড়া (দরজার পেছনে একজন প্রশ্ন করে, আরেকজন উত্তর দেয়)</b>" +
          "<div class='sm'>এক লাইনে <b>প্রশ্ন | উত্তর</b> লিখুন; একসাথে অনেক লাইন পেস্ট করলে সব যোগ হবে। <b>{নাম}</b> = দর্শকের নাম, <b>@{নাম}</b> = হাইলাইট করা নাম। প্রতিটা লেখা সর্বোচ্চ ৮০ অক্ষর, মোট সর্বোচ্চ ৬০ জোড়া। একটাও জোড়া না থাকলে শুধু নামের বাবল আসবে।</div>" +
          "<textarea id='b12qi' rows='3' placeholder='প্রশ্ন | উত্তর' style='resize:vertical'></textarea><div class='sm'>Enter = যোগ, Shift+Enter = নতুন লাইন (পেস্টে সব লাইন একসাথে যোগ হয়)</div>" +
          "<div class='act'><button type='button' class='l' id='b12qa'>➕ যোগ</button><button type='button' class='l' id='b12qd'>↺ ডিফল্ট জোড়ায় ফেরা</button><button type='button' class='l' id='b12qx' style='color:#c0392b'>🗑 সব জোড়া মুছুন</button></div>" +
          "<div id='b12qm' class='sm' style='font-weight:700;min-height:18px'></div><div id='b12qc' class='sm'></div><div id='b12ql' style='display:grid;gap:6px;max-height:360px;overflow:auto'></div>" +
          "<div style='border-top:1px dashed var(--bd);padding-top:8px;display:grid;gap:8px'><b>🚶 বাবলের ঘোরাঘুরি</b>" +
          "<label style='display:flex;gap:6px;align-items:center;font-weight:600'><input type='checkbox' data-d='wnd' style='width:auto'>বাবল ভেসে ডানে-বামে ঘুরবে (বন্ধ করলে এক জায়গায় এসে মিলিয়ে যাবে)</label>" +
          "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px'><label " + lab + ">⏱ বাবল ঘোরার সময় — সর্বনিম্ন (সেকেন্ড)<input type='number' inputmode='decimal' data-d='wmin' min='" + LM.wmin[0] + "' max='" + LM.wmin[1] + "' step='.5'></label>" +
          "<label " + lab + ">⏱ বাবল ঘোরার সময় — সর্বোচ্চ (সেকেন্ড)<input type='number' inputmode='decimal' data-d='wmax' min='" + LM.wmax[0] + "' max='" + LM.wmax[1] + "' step='.5'></label></div>" +
          "<div class='sm'>ডিফল্ট ১–২ সেকেন্ড; প্রতিটা বাবল এর মধ্যে এলোমেলো সময় ধরে ঘোরে। সর্বোচ্চ সর্বনিম্নের চেয়ে কম হলে মিলিয়ে দেওয়া হয়। ফোনে ‘অ্যানিমেশন কমান’ চালু থাকলে ঘোরা এমনিই বন্ধ থাকে।</div></div>" +
          "<div class='act'><button type='button' id='b12bv' style='background:var(--o)'>👁 বাবল দেখুন (দরজা না খুলে)</button></div>" +
          "<div class='sm'>সেভ না করা বর্তমান নাম, প্রশ্ন–উত্তর ও ঘোরার সেটিং দিয়েই প্রিভিউ চলে — নিচের ছোট বক্সে।</div>";
        $("#b12dt").appendChild(box);
        box.querySelector("[data-d=wnd]").checked = !!door.wnd; box.querySelector("[data-d=wmin]").value = door.wmin; box.querySelector("[data-d=wmax]").value = door.wmax;
        var list = $("#b12ql"), cnt = $("#b12qc"), msg = $("#b12qm"), ta = $("#b12qi");
        var say = function (t, bad) { msg.style.color = bad ? "#c0392b" : "var(--g)"; msg.textContent = t; };
        var draw = function () {
          list.innerHTML = ""; var isDef = JSON.stringify(door.qa) === DQ;
          cnt.textContent = door.qa.length ? "মোট " + bn(door.qa.length) + " জোড়া (সর্বোচ্চ ৬০) · " + (isDef ? "ডিফল্ট জোড়া" : "কাস্টম জোড়া") : "⚠ কোনো জোড়া নেই — দরজার পেছনে শুধু নামের বাবল আসবে।";
          door.qa.forEach(function (p, i) {
            var r = document.createElement("div"), t = document.createElement("div"), x = document.createElement("button");
            r.style.cssText = "display:flex;gap:8px;align-items:flex-start;border:1px solid var(--bd);border-radius:10px;padding:6px 8px;background:var(--card)";
            t.style.cssText = "flex:1;min-width:0;overflow-wrap:anywhere"; var q = document.createElement("b"), a = document.createElement("span"); q.textContent = p.q; a.textContent = p.a; a.style.color = "var(--mut)";
            t.appendChild(q); t.appendChild(document.createTextNode("  ➜  ")); t.appendChild(a);
            x.type = "button"; x.textContent = "❌"; x.setAttribute("aria-label", "এই জোড়া মুছুন"); x.style.cssText = "border:0;background:none;cursor:pointer;padding:0 2px;flex:none";
            x.onclick = function () { door.qa.splice(i, 1); draw(); dirty(); say("১টা জোড়া মোছা হয়েছে।"); };
            r.appendChild(t); r.appendChild(x); list.appendChild(r);
          });
        };
        var add = function () {
          var lines = ta.value.split(/\r?\n/), ok = 0, dup = 0, full = 0, cut = 0, keep = [];
          lines.forEach(function (ln) {
            if (!ln.trim()) return;
            var p = F.cleanQA([ln])[0], k = ln.search(/[|｜]/);
            if (!p) { keep.push(ln); return; }
            if (ln.slice(0, k).replace(/\s+/g, " ").trim().length > 80 || ln.slice(k + 1).replace(/\s+/g, " ").trim().length > 80) cut++;
            if (door.qa.length >= 60) { full++; return; }
            if (door.qa.some(function (x) { return x.q === p.q && x.a === p.a; })) { dup++; return; }
            door.qa.push(p); ok++;
          });
          ta.value = keep.join("\n"); draw(); if (ok) dirty();
          var m = []; if (ok) m.push(bn(ok) + "টা জোড়া যোগ হয়েছে"); if (dup) m.push(bn(dup) + "টা আগে থেকেই আছে"); if (full) m.push(bn(full) + "টা বাদ — ৬০ জোড়ার সীমা পূর্ণ"); if (cut) m.push(bn(cut) + "টা জোড়ার লেখা ৮০ অক্ষরে কাটা হয়েছে");
          if (keep.length) m.push(bn(keep.length) + "টা লাইনে ‘|’ নেই বা একদিক ফাঁকা (ঘরে রাখা হয়েছে, ঠিক করে আবার যোগ করুন)");
          if (!m.length) m.push("কিছু লেখা নেই — ‘প্রশ্ন | উত্তর’ লিখুন।");
          say((ok ? "✅ " : "⚠ ") + m.join(" · "), !ok);
        };
        $("#b12qa").onclick = add;
        ta.onkeydown = function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); add(); } };
        $("#b12qx").onclick = function () { if (!door.qa.length) return; if (confirm("সব প্রশ্ন–উত্তর জোড়া মুছবেন? (সেভ না চাপা পর্যন্ত সাইটে বদলাবে না; জোড়া না থাকলে শুধু নামের বাবল আসবে)")) { door.qa = []; draw(); dirty(); say("🗑 সব জোড়া মোছা হয়েছে — 💾 সেভ চাপুন।"); } };
        $("#b12qd").onclick = function () { if (JSON.stringify(door.qa) !== DQ && door.qa.length && !confirm("আপনার জোড়াগুলো বাদ দিয়ে ডিফল্ট " + bn(JSON.parse(DQ).length) + "টা জোড়া ফিরবে। ঠিক আছে?")) return; door.qa = F.cleanQA(null); draw(); dirty(); say("↺ ডিফল্ট জোড়া ফিরেছে — 💾 সেভ চাপুন।"); };
        $("#b12bv").onclick = function () {
          var dm = $("#b12dm"), rs = $("#b12res"); F.stop(); dm.scrollIntoView({ block: "center", behavior: "smooth" });
          if (!door.names.length) { dm.textContent = "—"; rs.style.color = "#c0392b"; rs.textContent = "⚠ কোনো নাম নেই — আগে 💭 চ্যাটের নাম যোগ করুন।"; return; }
          rs.style.color = "var(--g)"; rs.textContent = "💭 বাবল প্রিভিউ চলছে (দরজা বন্ধ থাকবে) — " + (door.qa.length ? bn(door.qa.length) + " জোড়া" : "জোড়া নেই, শুধু নাম") + ", ঘোরা " + (door.wnd ? "চালু (" + bn(door.wmin) + "–" + bn(door.wmax) + " সেকেন্ড)" : "বন্ধ");
          F.bubbles($("#b12pn").value.trim() || "রাকিব", { host: dm, cfg: door, dur: 7 });
        };
        draw();
      })();
 $("#b12dt").querySelector("[data-d=aud]").value = door.aud; $("#b12dt").querySelector("[data-d=wan]").value = door.wan;
      var tot = function () { $("#b12t1").textContent = bn((door.wait1 + .5 + door.msg1 * .45 + door.shr + door.chat).toFixed(1).replace(/\.0$/, "")); $("#b12t3").textContent = bn((door.wait3 + door.msg3).toFixed(1).replace(/\.0$/, "")); }; tot();
      var dg = $("#b12dg"), dgs = $("#b12dgs"), NDG = F.designs.length, pvi = -1;
      var offs = function () { return String(door.doff || "").split(",").filter(Boolean).map(Number); };
      var setOff = function (a) { door.doff = a.sort(function (x, y) { return x - y; }).join(","); };
      var MODES = [[0, "🎯 সিঙ্গেল", "শুধু বাছা একটা ডিজাইনই আসবে"], [2, "🔁 সব (ক্রমে)", "চালু ডিজাইনগুলো একটার পর একটা ঘুরে ঘুরে আসবে"], [1, "🎲 র‍্যান্ডম", "চালু ডিজাইনগুলো থেকে প্রতিবার আলাদা একটা — এক এক সময় এক এক জনের কাছে এক এক দরজা (ডিফল্ট)"]];
      var dmark = function () {
        var off = offs(), m = Math.round(door.dmode), en = NDG - off.length;
        [].forEach.call(dg.children, function (w, i) {
          var b = w.firstChild, sel = door.design === i && m === 0, ds = off.indexOf(i) >= 0;
          b.style.borderColor = sel ? "var(--g)" : "var(--bd)"; b.style.boxShadow = sel ? "0 0 0 2px var(--g)" : "none"; b.style.opacity = ds && !sel ? ".38" : "1";
          w.querySelector("input").checked = !ds;
        });
        [].forEach.call($("#b12dmd").children, function (b, i) { var on = Math.round(MODES[i][0]) === m; b.style.borderColor = on ? "var(--g)" : "var(--bd)"; b.style.boxShadow = on ? "0 0 0 2px var(--g)" : "none"; b.style.fontWeight = on ? "800" : "600"; });
        var mm = MODES.filter(function (x) { return x[0] === m; })[0];
        dgs.textContent = mm[1] + " — " + mm[2] + (m === 0 ? " · বাছা ডিজাইন: " + bn(door.design + 1) : " · চালু " + bn(en) + "টা, বন্ধ " + bn(off.length) + "টা");
      };
      MODES.forEach(function (x) { var b = document.createElement("button"); b.type = "button"; b.className = "l"; b.style.cssText = "border:2px solid var(--bd)"; b.textContent = x[1]; b.onclick = function () { door.dmode = x[0]; if (x[0] === 0) { var o = offs(), k = o.indexOf(door.design); if (k >= 0) { o.splice(k, 1); setOff(o); } } dmark(); dirty(); }; $("#b12dmd").appendChild(b); });
      F.designs.forEach(function (d) {
        var w = document.createElement("div"); w.style.cssText = "display:grid;gap:4px";
        var b = document.createElement("button"); b.type = "button"; b.className = "l"; b.style.cssText = "border:2px solid var(--bd);padding:5px;font-size:12px;display:grid;gap:4px;text-align:center"; b.appendChild(F.thumb(d.i));
        var sp = document.createElement("span"); sp.textContent = (d.gate ? "🆕 " : "") + bn(d.i + 1) + " · " + d.n + (d.slide ? " ↔" : ""); b.appendChild(sp);
        b.onclick = function () { door.design = d.i; var o = offs(), k = o.indexOf(d.i); if (k >= 0) { o.splice(k, 1); setOff(o); } if (Math.round(door.dmode) !== 0 && !confirm("এখন মোড সিঙ্গেল নয় — ডিজাইন " + bn(d.i + 1) + " শুধু সিঙ্গেল মোডের জন্য মনে রাখা হলো। এখনই মোড সিঙ্গেল করবেন?")) { dmark(); dirty(); return; } if (Math.round(door.dmode) !== 0) door.dmode = 0; dmark(); dirty(); };
        var lb = document.createElement("label"); lb.style.cssText = "display:flex;gap:4px;align-items:center;justify-content:center;font-size:12px;font-weight:700"; var cb = document.createElement("input"); cb.type = "checkbox"; cb.style.width = "auto"; cb.checked = true; lb.appendChild(cb); lb.appendChild(document.createTextNode("চালু"));
        cb.onchange = function () {
          var o = offs(), k = o.indexOf(d.i);
          if (!cb.checked) { if (NDG - o.length <= 1) { alert("কমপক্ষে ১টা ডিজাইন চালু থাকতে হবে।"); cb.checked = true; return; } if (Math.round(door.dmode) === 0 && door.design === d.i) { alert("সিঙ্গেল মোডে বাছা ডিজাইন বন্ধ করা যাবে না — আগে অন্য ডিজাইন বাছুন বা মোড বদলান।"); cb.checked = true; return; } if (k < 0) o.push(d.i); } else if (k >= 0) o.splice(k, 1);
          setOff(o); dmark(); dirty();
        };
        w.appendChild(b); w.appendChild(lb); dg.appendChild(w);
      });
      $("#b12don").onclick = function () { door.doff = ""; dmark(); dirty(); };
      var pvCfg = function () { var c = {}, q; for (q in door) c[q] = door[q]; var off = offs(), en = [], i, m = Math.round(door.dmode); for (i = 0; i < NDG; i++) if (off.indexOf(i) < 0) en.push(i); if (m === 1 && en.length) c.design = en[Math.floor(Math.random() * en.length)]; else if (m === 2 && en.length) { pvi = (pvi + 1) % en.length; c.design = en[pvi]; } return c; };
      $("#b12vf").onclick = function () { door.vol = LM.vol[1]; door.cvol = LM.cvol[1]; ["vol", "cvol"].forEach(function (k) { var inp = $("#b12dt").querySelector("[data-d=" + k + "]"); if (inp) inp.value = door[k]; var rl = document.getElementById("b12r_" + k); if (rl) rl.textContent = door[k]; }); dirty(); };
      dmark();
      var setD = function (i) { var k = i.dataset.d; if (i.type === "checkbox") door[k] = i.checked; else if (i.type === "number" || i.type === "range") { var v = parseFloat(i.value); if (isNaN(v)) return; door[k] = Math.max(LM[k][0], Math.min(LM[k][1], v)); var rl = document.getElementById("b12r_" + k); if (rl) rl.textContent = door[k]; var cp = k === "wmin" && door.wmin > door.wmax ? "wmax" : k === "wmax" && door.wmax < door.wmin ? "wmin" : ""; if (cp) { door[cp] = door[k]; var ci = $("#b12dt").querySelector("[data-d=" + cp + "]"); if (ci) ci.value = door[k]; } } else { door[k] = i.value; var cl = document.getElementById("b12c_" + k); if (cl) cl.textContent = i.value || "অটো"; } tot(); dirty(); };
      [].forEach.call($("#b12dt").querySelectorAll("[data-d]"), function (i) { i.oninput = i.onchange = function () { setD(i); }; });
      [].forEach.call($("#b12dt").querySelectorAll("[data-wood]"), function (b) { b.onclick = function () { var w = b.dataset.wood.split(","); door.w1 = w[0]; door.w2 = w[1]; $("#b12dt").querySelector("[data-d=w1]").value = w[0]; $("#b12dt").querySelector("[data-d=w2]").value = w[1]; dirty(); }; });
      var SPN = ["🐢 বেশি ধীর", "🚶 কম ধীর", "🏃 স্পিড", "🚀 ফুল স্পিড"], spm = function () { [].forEach.call($("#b12sp").children, function (b, i) { var on = Math.round(door.spd) === i; b.style.borderColor = on ? "var(--g)" : "var(--bd)"; b.style.boxShadow = on ? "0 0 0 2px var(--g)" : "none"; }); };
      SPN.forEach(function (t, i) { var b = document.createElement("button"); b.type = "button"; b.className = "l"; b.style.cssText = "border:2px solid var(--bd)"; b.textContent = t; b.onclick = function () { door.spd = i; spm(); dirty(); }; $("#b12sp").appendChild(b); }); spm();
      [].forEach.call($("#b12dt").querySelectorAll("[data-auto]"), function (b) { b.onclick = function () { var k = b.dataset.auto; door[k] = ""; var cl = document.getElementById("b12c_" + k); if (cl) cl.textContent = "অটো"; dirty(); }; });
      // প্রিভিউ-সিনারিও: কোন ইউজার কী দেখবে
      var SC = [["👤 নামি · প্রথম বার", { n: "named", m: "first" }], ["👤 নামি · নির্দিষ্ট বার থেকে", { n: "named", m: "third" }], ["🕶 বেনামি · প্রথম বার", { n: "anon", m: "first" }], ["🕶 বেনামি · নির্দিষ্ট বার থেকে", { n: "anon", m: "third" }], ["🔑 লগইন / সাইন-আপ", { x: "লগইন/সাইন-আপ/হোম পেজে দরজা আসে না — শুধু চ্যাটে ঢোকার সময় আসে।" }], ["🔄 সাইট খুলতেই অটো-ঢোকা", { x: "আগে থেকে লগইন-করা ইউজার সাইট খুলে সরাসরি চ্যাটে ঢুকলে দরজা আসে না।" }], ["⛔ বন্ধ-তালিকার নাম", { n: "named", m: "first", s: "blk" }], ["🔕 নিজে দরজা বন্ধ করেছে", { n: "named", m: "first", s: "self" }], ["🔁 বারবার ঢুকেছে (সীমা পার)", { n: "named", m: "first", s: "lim" }]];
      var sc = $("#b12scn"), rs = $("#b12res"), dm = $("#b12dm");
      $("#b12sgb").onclick = function () { F.stop(); dm.scrollIntoView({ block: "center", behavior: "smooth" }); var c = pvCfg(); c.wait1 = 120; c.wait3 = 120; F.play($("#b12pn").value.trim() || "রাকিব", { host: dm, cfg: c, mode: "first" }); };
      SC.forEach(function (x) {
        var b = document.createElement("button"); b.type = "button"; b.className = "l"; b.style.cssText = "padding:6px 9px;font-size:13px"; b.textContent = x[0];
        b.onclick = function () {
          var o = x[1]; F.stop(); dm.scrollIntoView({ block: "center", behavior: "smooth" });
          if (o.x) { dm.textContent = "🚫 দরজা নেই"; rs.style.color = "var(--fg)"; rs.textContent = "ℹ " + o.x; return; }
          var an = o.n === "anon", nm = an ? "বেনামি-৪৮২৭" : ($("#b12pn").value.trim() || "রাকিব"), sim = {};
          if (o.s === "blk") { var l = String(door.blk || "").split(/[,\n،;]+/).map(function (t) { return t.trim(); }).filter(Boolean); nm = l[0] || nm; sim.blk = !!l[0]; if (!l[0]) { dm.textContent = "—"; rs.textContent = "⚠ বন্ধ-তালিকায় এখনো কোনো নাম নেই — আগে নাম যোগ করুন।"; return; } }
          if (o.s === "self") sim.self = true; else sim.self = false;
          if (o.s === "lim") sim.lim = true; else sim.lim = false;
          if (o.s !== "blk") sim.blk = false;
          var why = F.check(nm, { cfg: door, anon: an, sim: sim });
          if (why) { dm.textContent = "🚫 দরজা আসবে না"; rs.style.color = "#c0392b"; rs.textContent = "⛔ " + nm + " — " + why + " (সরাসরি চ্যাট খুলবে)"; return; }
          rs.style.color = "var(--g)"; rs.textContent = "✅ " + nm + " — দরজা আসবে (" + (o.m === "first" ? "প্রথম বারের সময়" : "নির্দিষ্ট বার থেকের সময়") + ")";
          var pc = pvCfg(); rs.textContent += " · ডিজাইন " + bn(pc.design + 1); F.play(nm, { host: dm, cfg: pc, mode: o.m });
        };
        sc.appendChild(b);
      });
      [].forEach.call($("#b12dt").querySelectorAll("[data-snd]"), function (b) { b.onclick = function () { if (!F.testSnd(b.dataset.snd, door)) alert("ব্রাউজার শব্দ আটকাচ্ছে — পেজে একবার ক্লিক করে আবার চাপুন।"); }; });
      // ---- part111: ট্যাবে গোছানো + ওপরে আটকানো সেভ/প্রিভিউ বার + নিচের প্রিভিউ-ডক ----
      (function () {
        var view = $("#view"), TB = [["home", "🏠 হোম"], ["snd", "🔊 শব্দ"], ["door", "🚪 দরজা"], ["dsg", "🎨 ডিজাইন"], ["chat", "💭 নাম ও চ্যাট"]], cur = "home", dt = $("#b12dt");
        if (!document.getElementById("b12cs")) { var sy = document.createElement("style"); sy.id = "b12cs"; sy.textContent = ".b12x{display:none!important}#b12bar{position:sticky;top:0;z-index:30;background:var(--card);border-bottom:1px solid var(--bd);padding:6px 0 8px;margin:-4px 0 8px;display:grid;gap:6px}#b12bar .tb{display:flex;gap:6px;flex-wrap:wrap}#b12bar .tb button{padding:6px 10px;font-size:14px}#b12dock{position:fixed;left:0;right:0;bottom:0;z-index:40;max-height:52vh;overflow:auto;background:var(--card);border-top:2px solid var(--g);padding:8px 12px 12px;box-shadow:0 -6px 20px rgba(0,0,0,.25)}"; document.head.appendChild(sy); }
        var tag = function (el, t) { if (el) el.setAttribute("data-tb", t); };
        // ওপরের স্তর
        var kids = [].slice.call(view.children), tb = "home", sndNodes = [], prevNodes = [], saveBox = null;
        kids.forEach(function (el) {
          if (el === dt) return;
          if (el.querySelector && el.querySelector("#b12sv")) { saveBox = el; return; }
          if (el.tagName === "H3" && /মাছ ও পাখির শব্দ/.test(el.textContent)) tb = "snd";
          else if (el.tagName === "H2" && /^🚪/.test(el.textContent.trim())) tb = "door";
          else if (el.tagName === "H3" && /প্রিভিউ/.test(el.textContent)) tb = "prev";
          if (el.querySelector && el.querySelector("#b12rs")) tb = "home";
          if (tb === "prev") { prevNodes.push(el); return; }
          if (tb === "snd") sndNodes.push(el);
          tag(el, tb);
          if (el.querySelector && el.querySelector("#b12rs")) tb = "door"; // রিসেটের পরের অংশ দরজা
        });
        // #b12dt-র ভেতরের অংশ
        var DK = { snd: ["vol", "vk", "vc", "vt", "cvol"], door: ["on", "wait1", "wait3", "gap", "blk", "aud"], dsg: ["college", "group", "session", "lt1", "lt2", "sign", "welcome", "sgs", "w1", "plbg", "design"] }, last = "door";
        [].forEach.call(dt.children, function (el) {
          var t = el.getAttribute("data-g") === "snd" ? "snd" : null, q = function (k) { return el.querySelector("[data-d='" + k + "']") || (el.getAttribute && el.getAttribute("data-d") === k); };
          if (!t) {
            if (el.querySelector("#b12nn") || el.querySelector("#b12qi")) t = "chat";
            else if (el.querySelector("#b12dmd") || el.querySelector("#b12dg") || el.id === "b12dg" || q("w1") || el.querySelector("[data-wood]") || q("plbg") || q("sgs") || el.querySelector("#b12sgb")) t = "dsg";
            else if (el.matches("label") && el.querySelector("[data-d]")) { var k = el.querySelector("[data-d]").dataset.d; t = k === "blk" ? "door" : "dsg"; }
            else if (q("on") || q("wait1") || q("gap") || el.querySelector("#b12sp") || q("sla")) t = "door";
            else t = last;
          }
          last = t; tag(el, t);
        });
        // শব্দ ট্যাবে দরজার শব্দ আগে, তারপর মাছ-পাখি
        sndNodes.forEach(function (n) { view.insertBefore(n, saveBox); });
        // ওপরের বার: সেভ + প্রিভিউ + ট্যাব
        var bar = document.createElement("div"); bar.id = "b12bar";
        var top = document.createElement("div"); top.className = "act"; top.style.alignItems = "center";
        var pvb = document.createElement("button"); pvb.type = "button"; pvb.className = "l"; pvb.textContent = "👁 প্রিভিউ"; pvb.id = "b12pv";
        var sv = $("#b12sv"), msg = $("#b12m"); top.appendChild(sv); top.appendChild(pvb); top.appendChild(msg); bar.appendChild(top);
        var tbar = document.createElement("div"); tbar.className = "tb";
        TB.forEach(function (x) { var b = document.createElement("button"); b.type = "button"; b.className = "l"; b.textContent = x[1]; b.dataset.t = x[0]; b.onclick = function () { show(x[0]); }; tbar.appendChild(b); });
        bar.appendChild(tbar); view.insertBefore(bar, view.firstChild);
        TB.forEach(function (x) { var d = document.createElement("div"); d.className = "act"; d.style.cssText = "align-items:center;margin-top:12px;border-top:1px dashed var(--bd);padding-top:10px"; d.setAttribute("data-tb", x[0]); d.innerHTML = "<button type='button' class='b12ts' data-tab='" + x[0] + "' style='font-size:15px;padding:8px 14px'>💾 এই ট্যাব সেভ (" + x[1] + ")</button><button type='button' class='l b12td' data-tab='" + x[0] + "' style='font-size:14px;padding:7px 10px'>↺ এই ট্যাবের সব ডিফল্ট</button><span class='sm b12tm' data-tab='" + x[0] + "' style='font-weight:700'></span>"; view.appendChild(d); }); if (saveBox && saveBox.parentNode) saveBox.parentNode.removeChild(saveBox);
        function show(t) {
          cur = t; window.__b12cur = t; if (window.__b12dirty) window.__b12dirty();
          [].forEach.call(tbar.children, function (b) { var on = b.dataset.t === t; b.style.background = on ? "var(--g)" : "none"; b.style.color = on ? "#fff" : "var(--fg)"; });
          [].forEach.call(view.querySelectorAll("[data-tb]"), function (el) { el.classList.toggle("b12x", el.getAttribute("data-tb") !== t); });
          if (dt) { dt.classList.remove("b12x"); [].forEach.call(dt.children, function (el) { var g = el.getAttribute("data-tb"); el.classList.toggle("b12x", g !== t); }); var any = [].some.call(dt.children, function (el) { return !el.classList.contains("b12x"); }); dt.classList.toggle("b12x", !any); }
          try { window.scrollTo({ top: Math.max(0, bar.getBoundingClientRect().top + window.pageYOffset - 2), behavior: "auto" }); } catch (e) {}
        }
        // প্রিভিউ-ডক: নিচে আটকানো; খুললেই হোম হেডার + দরজা প্রিভিউ (সেভ-না-করা সেটিং অনুযায়ী) দেখা যায়, ওপরে সেটিং বদলানো চলে
        var dock = null, hdSlot = null, hdEl = view.querySelector("div#b12hd"); // (শব্দ-বাটনেরও id b12hd — তাই div দিয়ে ধরা)
        function openDock() {
          if (dock) return; dock = document.createElement("div"); dock.id = "b12dock";
          var hd = hdEl; hdSlot = document.createElement("div"); hdSlot.style.cssText = "height:" + hd.offsetHeight + "px"; hd.parentNode.insertBefore(hdSlot, hd);
          var h = document.createElement("div"); h.className = "act"; h.style.cssText = "align-items:center;justify-content:space-between;margin-bottom:6px";
          h.innerHTML = "<b>👁 প্রিভিউ — হোম + দরজা (সেভ-না-করা সেটিং)</b>"; var x = document.createElement("button"); x.type = "button"; x.className = "l"; x.textContent = "✕ বন্ধ"; x.onclick = closeDock; h.appendChild(x); dock.appendChild(h);
          var hw = document.createElement("div"); hw.style.cssText = "max-width:340px;margin:0 auto"; hw.appendChild(hd); hd.style.margin = "0 auto"; dock.appendChild(hw);
          var run = document.createElement("div"); run.className = "act"; run.style.margin = "6px 0";
          var go = document.createElement("button"); go.type = "button"; go.textContent = "▶ দরজা চালান (শব্দসহ)"; go.onclick = function () { var c0 = $("#b12scn").children[0]; if (c0) c0.click(); }; run.appendChild(go);
          [["knock", "🥁"], ["creak", "🚪"], ["bang", "💥"]].forEach(function (z) { var b = document.createElement("button"); b.type = "button"; b.className = "l"; b.textContent = z[1]; b.setAttribute("aria-label", "শব্দ শুনুন"); b.onclick = function () { F.testSnd(z[0], door); }; run.appendChild(b); });
          var tsb = document.createElement("button"); tsb.type = "button"; tsb.className = "b12ts"; tsb.dataset.tab = "cur"; tsb.textContent = "💾 এই ট্যাব সেভ"; run.appendChild(tsb); tsb.onclick = function () { window.__b12save(window.__b12cur || "home"); }; var tmm = document.createElement("span"); tmm.className = "sm b12tm"; tmm.dataset.tab = "cur"; tmm.style.fontWeight = "700"; run.appendChild(tmm); dock.appendChild(run); if (window.__b12dirty) window.__b12dirty();
          prevNodes.forEach(function (n) { if (n.tagName !== "H3" && !(n.classList && n.classList.contains("sm") && /নিচের বাটনে/.test(n.textContent))) n.classList.remove("b12x"); n.removeAttribute("data-tb"); dock.appendChild(n); });
          hd.classList.remove("b12x"); hd.removeAttribute("data-tb"); document.body.appendChild(dock); view.style.paddingBottom = "52vh"; pvb.style.background = "var(--g)"; pvb.style.color = "#fff";
        }
        function closeDock() {
          if (!dock) return; F.stop(); var hd = hdEl; if (hdSlot && hdSlot.parentNode) { hdSlot.parentNode.insertBefore(hd, hdSlot); hdSlot.parentNode.removeChild(hdSlot); } hd.style.margin = ""; hd.setAttribute("data-tb", "home");
          prevNodes.forEach(function (n) { if (n.parentNode === dock) view.insertBefore(n, null); n.classList.add("b12x"); n.setAttribute("data-tb", "prev"); });
          dock.parentNode.removeChild(dock); dock = null; hdSlot = null; view.style.paddingBottom = ""; pvb.style.background = ""; pvb.style.color = ""; show(cur);
        }
        pvb.onclick = function () { if (dock) closeDock(); else openDock(); };
        prevNodes.forEach(function (n) { n.classList.add("b12x"); n.setAttribute("data-tb", "prev"); });
        window.__b12cl = closeDock; show("home");
      })();
      // ---- part112: ট্যাব-ভিত্তিক সেভ — প্রতিটা ট্যাবের নিজের সেভ (শুধু ওই ট্যাবের ঘর সার্ভারে যায়) + ওপরের "সব সেভ" ----
      var TK = (function () { // কোন ট্যাবে কোন door-কী: ঘরের data-d থেকে নিজে নিজে + বিশেষ কী
        var T = { home: [], snd: ["snd"], door: ["spd"], dsg: ["design", "dmode", "doff"], chat: ["names", "qa"] };
        [].forEach.call($("#b12dt").children, function (el) { var t = el.getAttribute("data-tb"); if (!t || !T[t]) return; var l = el.matches("[data-d]") ? [el] : [].slice.call(el.querySelectorAll("[data-d]")); l.forEach(function (i) { if (T[t].indexOf(i.dataset.d) < 0) T[t].push(i.dataset.d); }); });
        var used = {}; Object.keys(T).forEach(function (t) { T[t].forEach(function (k) { used[k] = t; }); });
        Object.keys(window.FADoor.defaults).forEach(function (k) { if (!used[k]) T.door.push(k); }); // কোনো ট্যাবে ঘর নেই এমন কী → দরজা ট্যাবে
        return T;
      })();
      var TN = { home: "🏠 হোম", snd: "🔊 শব্দ", door: "🚪 দরজা", dsg: "🎨 ডিজাইন", chat: "💭 নাম ও চ্যাট" };
      function nS(o) { o = o || {}; return { fo: o.fo !== false, bo: o.bo !== false, ho: o.ho !== false, hs: +o.hs || 3, fid: o.fid || "", bid: o.bid || "", hid: o.hid || "", lib: o.lib || [] }; } // শব্দের সেটিং: না-থাকা কী = ডিফল্ট (তুলনায় সমান ধরা)
      function tabDirty(t) { if (t === "home") return JSON.stringify(snap()) !== JSON.stringify(savedC); return TK[t].some(function (k) { return k === "snd" ? JSON.stringify(nS(door.snd)) !== JSON.stringify(nS(savedD.snd)) : JSON.stringify(door[k]) !== JSON.stringify(savedD[k]); }); }
      var okT = {};
      function say(t) { var e = document.getElementById("b12m"); if (e) { e.textContent = t; e.style.color = "var(--g)"; } }
      function dirty() {
        var ds = Object.keys(TK).filter(tabDirty), any = ds.length > 0, cur = window.__b12cur || "home";
        ds.forEach(function (t) { okT[t] = false; });
        [].forEach.call(document.querySelectorAll("#b12sv,.b12ts"), function (b) {
          var all = b.id === "b12sv", d = all ? any : ds.indexOf(b.dataset.tab === "cur" ? cur : b.dataset.tab) >= 0;
          b.style.cssText = (all ? "font-size:16px;padding:10px 18px;" : "font-size:15px;padding:8px 14px;") + (d ? "background:var(--o);box-shadow:0 0 0 4px rgba(217,130,0,.35)" : "opacity:.65");
        });
        [].forEach.call(document.querySelectorAll("#b12bar .tb button"), function (b) { var d = ds.indexOf(b.dataset.t) >= 0; b.innerHTML = TN[b.dataset.t] + (d ? " <span style='color:#e53935'>●</span>" : ""); });
        var top = document.getElementById("b12m");
        if (top) { if (any) { top.style.color = "#e53935"; top.textContent = "● সেভ হয়নি — " + ds.map(function (t) { return TN[t]; }).join(", "); } else if (Object.keys(okT).some(function (t) { return okT[t]; })) { top.style.color = "var(--g)"; top.textContent = "✅ সেভ হয়েছে — ইউজাররা রিফ্রেশ করলে পাবে।"; } else if (/^●|^✅/.test(top.textContent)) top.textContent = ""; }
        [].forEach.call(document.querySelectorAll(".b12tm"), function (e) { var t = e.dataset.tab === "cur" ? cur : e.dataset.tab, d = ds.indexOf(t) >= 0; if (d) { e.style.color = "#e53935"; e.textContent = "● সেভ হয়নি"; } else if (okT[t]) { e.style.color = "var(--g)"; e.textContent = "✅ সেভ হয়েছে"; } else if (/^●|^✅/.test(e.textContent)) e.textContent = ""; });
      }
      window.__b12dirty = dirty;
      function save(tab) { // tab না দিলে সব; দিলে শুধু ওই ট্যাব
        var tabs = tab ? [tab] : Object.keys(TK);
        if (!tabs.some(tabDirty)) { say(tab ? "এই ট্যাবে কোনো বদল নেই।" : "কোনো বদল নেই।"); return; }
        var cfg = tab && tab !== "home" ? JSON.parse(JSON.stringify(savedC)) : snap(), pay = JSON.parse(JSON.stringify(savedD)), nd = JSON.parse(JSON.stringify(savedD));
        tabs.forEach(function (t) { TK[t].forEach(function (k) { if (door[k] !== undefined) { pay[k] = JSON.parse(JSON.stringify(door[k])); nd[k] = JSON.parse(JSON.stringify(door[k])); } }); });
        if (JSON.stringify(pay.qa) === JSON.stringify(window.FADoor.defaults.qa)) delete pay.qa; // ডিফল্ট জোড়া সার্ভারে লাগে না (ছোট থাকে; SQL-18 ছাড়াও সেভ চলে)
        if (JSON.stringify(pay).length > 22000) { alert("সেটিং খুব বড় হয়ে গেছে (সীমা ২২০০০ অক্ষর)। কিছু প্রশ্ন–উত্তর জোড়া, নাম বা ⛔ বন্ধ-তালিকা কমান।"); return; }
        say("⏳ সেভ হচ্ছে…");
        m.rpc("mc2_admin_set_bg12", { p_cfg: cfg, p_door: pay }).then(function () {
          savedC = JSON.parse(JSON.stringify(cfg)); savedD = nd; saved = js();
          if (!tab || tab === "snd") { if (window.__b12snd) window.__b12snd(); }
          try { localStorage.removeItem("bg12cfg"); localStorage.removeItem("fa_door"); } catch (e) {}
          tabs.forEach(function (t) { okT[t] = true; }); dirty();
        }).catch(function (er) { var x = er && er.message ? er.message : String(er); say(""); alert(/cfg too long/.test(x) ? "সেটিং ৪০০০ অক্ষরের পুরোনো সীমা পার করেছে (কাস্টম প্রশ্ন–উত্তর/নাম বেশি)। sql/SQL-18-DOOR-SETTINGS-RAISE-SIZE-LIMIT.sql একবার Supabase SQL Editor-এ চালান, তারপর আবার সেভ করুন।\n\n" + x : /mc2_admin_set_bg12|PGRST202|42883|mc2_bg12_cfg/.test(x) ? "সার্ভারে সেটিং টেবিল নেই। sql/SQL-17-ANIMATION-DOOR-SETTINGS.sql একবার Supabase SQL Editor-এ চালান।\n\n" + x : x); });
      }

      // ---- part113: প্রতিটা সেটিংয়ের পাশে "↺ ডিফল্ট: …" + প্রতি ট্যাবের "↺ সব ডিফল্ট" (সেভ না করা পর্যন্ত সাইটে বদলায় না) ----
      (function () {
        var DD = window.FADoor.defaults, fire = function (i, ev) { i.dispatchEvent(new Event(ev, { bubbles: true })); };
        var show1 = function (v, i) { if (typeof v === "boolean") return v ? "চালু" : "বন্ধ"; if (v === "" || v == null) return "অটো/ফাঁকা"; if (i && i.tagName === "SELECT") { var o = [].filter.call(i.options, function (x) { return x.value === String(v); })[0]; return o ? o.textContent.slice(0, 18) : String(v); } return bn(String(v).length > 16 ? String(v).slice(0, 16) + "…" : v); };
        var mk = function (txt, fn) { var b = document.createElement("button"); b.type = "button"; b.className = "l b12df"; b.style.cssText = "justify-self:start;padding:1px 8px;font-size:12px;font-weight:600;margin-left:6px"; b.textContent = "↺ ডিফল্ট: " + txt; b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); fn(); }; return b; };
        var setDoor = function (i) { var k = i.dataset.d, d = DD[k]; if (i.type === "checkbox") { i.checked = !!d; fire(i, "change"); } else { i.value = d; fire(i, "input"); fire(i, "change"); } };
        var setAnim = function (i) { var k = i.dataset.k, d = DEFS[k]; if (i.type === "checkbox") { i.checked = !!d; fire(i, "change"); } else { i.value = d; fire(i, "input"); fire(i, "change"); } };
        var addTo = function (i, d, fn) { var lb = i.closest("label"); if (!lb || lb.querySelector(".b12df")) return; lb.appendChild(mk(show1(d, i), fn)); };
        [].forEach.call($("#b12dt").querySelectorAll("[data-d]"), function (i) { var k = i.dataset.d; if (!DD.hasOwnProperty(k) || i.tagName === "BUTTON" || (i.type === "color" && DD[k] === "")) return; addTo(i, DD[k], function () { setDoor(i); }); });
        [].forEach.call(document.querySelectorAll("#b12sl [data-k],#b12ck [data-k],#b12tx [data-k]"), function (i) { var k = i.dataset.k; if (!DEFS.hasOwnProperty(k)) return; addTo(i, DEFS[k], function () { setAnim(i); }); });
        var dr = $("#b12dir"); if (dr) addTo(dr, DEFS.dir, function () { dr.value = DEFS.dir; fire(dr, "change"); });
        var ch = $("#b12ch"); if (ch) { var cb = mk("ডিজাইন " + bn(DEFS.design), function () { var c = ch.children[DEFS.design - 1]; if (c) c.click(); }); cb.style.margin = "4px 0 0"; ch.parentNode.insertBefore(cb, ch.nextSibling); }
        var cf = function (msg) { return confirm(msg + "\n(সেভ না চাপা পর্যন্ত সাইটে বদলাবে না)"); };
        var forceYes = function (fn) { var oc = window.confirm; window.confirm = function () { return true; }; try { fn(); } finally { window.confirm = oc; } };
        var TD = {
          home: function () { [].forEach.call(document.querySelectorAll("#b12sl [data-k],#b12ck [data-k],#b12tx [data-k]"), function (i) { if (DEFS.hasOwnProperty(i.dataset.k)) setAnim(i); }); if (dr) { dr.value = DEFS.dir; fire(dr, "change"); } var c = ch && ch.children[DEFS.design - 1]; if (c) c.click(); },
          snd: function () { ["vol", "vk", "vc", "vt", "cvol"].forEach(function (k) { var i = $("#b12dt").querySelector("[data-d=" + k + "]"); if (i) setDoor(i); }); var S = door.snd; S.fo = true; S.bo = true; S.ho = true; S.hs = 3; S.fid = ""; S.bid = ""; S.hid = ""; if (window.__b12sndDraw) window.__b12sndDraw(); },
          door: function () { [].forEach.call($("#b12dt").children, function (el) { if (el.getAttribute("data-tb") !== "door") return; [].forEach.call(el.matches("[data-d]") ? [el] : el.querySelectorAll("[data-d]"), function (i) { var k = i.dataset.d; if (DD.hasOwnProperty(k) && !(i.type === "color" && DD[k] === "")) setDoor(i); }); }); door.spd = DD.spd; var sp = $("#b12sp"); if (sp && sp.children[DD.spd]) sp.children[DD.spd].click(); },
          dsg: function () { [].forEach.call($("#b12dt").children, function (el) { if (el.getAttribute("data-tb") !== "dsg") return; [].forEach.call(el.matches("[data-d]") ? [el] : el.querySelectorAll("[data-d]"), function (i) { var k = i.dataset.d; if (!DD.hasOwnProperty(k)) return; if (i.type === "color" && DD[k] === "") { var ab = el.querySelector("[data-auto=" + k + "]"); if (ab) ab.click(); } else setDoor(i); }); }); door.doff = ""; door.dmode = DD.dmode; door.design = DD.design; dmark(); dirty(); },
          chat: function () { forceYes(function () { var a = $("#b12nd"), q = $("#b12qd"); if (a) a.click(); if (q) q.click(); }); [].forEach.call($("#b12dt").querySelectorAll("[data-d=wnd],[data-d=wmin],[data-d=wmax]"), function (i) { setDoor(i); }); }
        };
        [].forEach.call(document.querySelectorAll(".b12td"), function (b) { b.onclick = function () { var t = b.dataset.tab; if (!cf("“" + TN[t] + "” ট্যাবের সব সেটিং ডিফল্টে ফিরবে" + (t === "snd" ? " (রাখা শব্দের তালিকা থাকবে, শুধু বাছাই/সুইচ ডিফল্ট)" : "") + "। ঠিক আছে?")) return; TD[t](); dirty(); }; });
        window.__b12td = TD;
      })();
      window.__b12save = save;
      $("#b12sv").textContent = "💾 সব সেভ"; $("#b12sv").onclick = function () { save(); };
      [].forEach.call(document.querySelectorAll(".b12ts"), function (b) { b.onclick = function () { save(b.dataset.tab === "cur" ? (window.__b12cur || "home") : b.dataset.tab); }; });
      dirty();
    }).catch(function (e) {
      var x = e && e.message ? e.message : String(e);
      m.$("#view").innerHTML = "<h2>🎞 এনিমেশন ও দরজা</h2><p class='warn'>লোড হয়নি: " + m.esc(x) + "</p><p class='sm'>sql/SQL-17-ANIMATION-DOOR-SETTINGS.sql একবার Supabase SQL Editor-এ চালান, তারপর রিফ্রেশ করুন।</p>";
    });
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { b12: view });
})();
