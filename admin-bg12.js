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
  var DN = { wait1: "⏳ গেইট বন্ধ থাকবে — নিজে খুলবে (সেকেন্ড)", msg1: "📝 স্বাগতম লেখা থাকবে (সেকেন্ড)", shr: "🔽 স্বাগতম লেখা বড় থেকে ছোট হয়ে মিলাতে বাড়তি সময় (সেকেন্ড)", chat: "💬 লেখা মিলানোর পর পেছনের চ্যাট চলবে (সেকেন্ড)", fa: "🎬 বাবল এনিমেশন (০ = ১৬টা এলোমেলো, ১–১৬ = একটাই)", fl: "⏱ প্রতিটা বাবল কতক্ষণ থাকবে (সেকেন্ড)", cd1: "👆 কত সেকেন্ড পর থেকে ক্লিকে খুলবে", nth: "🔢 কততম বার থেকে ছোট সময়", wait3: "⏳ গেইট বন্ধ থাকবে — নিজে খুলবে (সেকেন্ড)", msg3: "📝 স্বাগতম লেখা থাকবে (সেকেন্ড)", cd3: "👆 কত সেকেন্ড পর থেকে ক্লিকে খুলবে", bri: "🔆 পেছনের চ্যাট উইন্ডোর ব্রাইটনেস (%; কম = অন্ধকার)", wx: "↔ উইন্ডো ডানে-বামে (+ = দুই পাশে আরও বাইরে, − = ভেতরে)", wy: "↕ উইন্ডো ওপর-নিচে (+ = নিচে, − = ওপরে)", sgs: "🔠 সাইনের লেখা সাইজ (%; ১০০ = স্বাভাবিক)", sgb: "🅱 সাইনের লেখা মোটা-ভাব (৪০০–৯০০)", sgh: "↕ সাইনের উচ্চতা (%)", sgw: "↔ সাইনের চওড়া (%)", sgy: "⇅ সাইন ওপর-নিচ (%; − = ওপরে)", cspd: "⚡ (পুরোনো, আর কাজ করে না)", gap: "✍ কাস্টম ফাঁক — দুই মেসেজের মাঝে (মিলিসেকেন্ড; ০ = ওপরে বাছা গতি চলবে; কম = দ্রুত)", vol: "🔊 দরজার শব্দের জোর — নক/ক্যাঁচ/ঢাক (%; ৫০০ = ফুল; ডিফল্ট ৩৩৩)", cvol: "💬 পেছনের চ্যাট শব্দের জোর — পপ/ডিং (%; ৮০০ = ফুল, ডিফল্ট)", sla: "🔖 সিল/নামের হেলা (ডিগ্রি; − = বামে হেলা, ডিফল্ট −৮)", max: "🔁 সর্বোচ্চ কতবার দেখাবে", win: "🕒 কত মিনিটের মধ্যে" };
  var door = {}, saved = "", pv = "রাকিব", RS = false, DEFS = { design: 1, size: 1, bsz: 1.7, bsize: 2, tsize: 1, speed: 1, fish: 5, birds: 6, cars: 2, hue: 0, bubbles: true, text: true, fx: true, dir: "toward", words: "M.C, ADDA, MASTER’S", t2a: "M.C", t2b: "Master’s ADDA" };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["b12", "🎞 এনিমেশন ও দরজা"]]);
  function snap() { var o = {}; KEYS.forEach(function (k) { o[k] = window.BG12.cfg[k]; }); return o; }
  function js() { return JSON.stringify([snap(), door]); }
  function view() {
    var m = M(), $ = m.$, esc = m.esc, B = window.BG12;
    return m.A("mc2_bg12_cfg?select=cfg,door&id=eq.1").then(function (d) {
      var r = d && d[0] || {}; door = {}; var q, D = window.FADoor.defaults;
      for (q in D) door[q] = r.door && r.door.hasOwnProperty(q) && typeof r.door[q] === typeof D[q] ? r.door[q] : D[q]; if (r.door && r.door.vol === 250 && !r.door.hasOwnProperty("cvol")) door.vol = D.vol; if (r.door && r.door.vol === 500) door.vol = D.vol; door.names = Array.isArray(door.names) ? door.names.slice() : D.names.slice(); door.qa = Array.isArray(r.door && r.door.qa) ? window.FADoor.cleanQA(r.door.qa) : window.FADoor.cleanQA(null);
      var o = {}; if (r.cfg) KEYS.forEach(function (k) { if (r.cfg.hasOwnProperty(k) && typeof r.cfg[k] === typeof B.cfg[k]) o[k] = r.cfg[k]; });
      B.set(o); saved = js(); if (RS) { B.set(DEFS); RS = false; }
      var h = "<h2>🎞 হোম এনিমেশন ও চ্যাটের দরজা</h2><div class='sm'>যা বদলাবেন নিচের লাইভ প্রিভিউতে সঙ্গে সঙ্গে দেখা যাবে। 💾 সেভ না চাপা পর্যন্ত সাইটে বদলায় না।</div>" +
        "<div id='b12hd' style='position:relative;width:100%;max-width:640px;margin:8px auto;aspect-ratio:1200/630;border-radius:0 0 26px 26px;overflow:hidden;background:#0f2d20 url(images/bg/bg-12.png) center/cover;color:#fff;text-align:center;padding-top:5%;text-shadow:0 2px 14px rgba(0,0,0,.65)'><b style='display:block;font:800 clamp(16px,4.6vw,28px)/1.25 \"Anek Bangla\",sans-serif'>M.C COLLEGE MASTER’S<small style='display:block;font-size:.6em;color:#cfe5d6'>2023-24</small></b><i style='font:700 clamp(14px,4vw,22px) \"Anek Bangla\",sans-serif;font-style:normal;color:#ffd08a'>FRIENDS ADDA</i></div>" +
        "<div class='sm'>ডিজাইন (🆕 ১১–১৪ = রিয়েল পাখি ও মাছ)</div><div id='b12ch' style='display:flex;gap:6px;flex-wrap:wrap;margin:6px 0'></div>" +
        "<div id='b12sl' style='display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px 14px;margin-top:10px'></div><div id='b12ck' style='display:flex;gap:14px;flex-wrap:wrap;margin:10px 0'></div>" +
        "<div id='b12tx' style='display:grid;gap:8px'></div><div class='act' style='margin-top:8px'><button id='b12rs' type='button' class='l'>↺ ডিফল্ট এনিমেশন সেটিং</button></div>" +
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
        "<div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px'>" + numf("gap") + rngf("vol", 10) + rngf("cvol", 10) + rngf("sla", 1) + numf("fa") + numf("fl") + numf("bri") + numf("wx") + numf("wy") + numf("max") + numf("win") + "</div><div class='act'><button type='button' class='l' id='b12vf'>🔊 শব্দ ফুল করুন (দরজা ৫০০% + চ্যাট ৮০০%)</button></div><span class='sm'>ফোনের মিডিয়া ভলিউমও বাড়ানো থাকতে হবে। ফুল করে 👁 প্রিভিউতে শুনে দেখুন, তারপর 💾 সেভ।</span>";
      DT.forEach(function (r) { dh += "<label " + lab + ">" + r[1] + "<input type='text' data-d='" + r[0] + "' maxlength='" + r[2] + "' value='" + esc(door[r[0]]) + "'></label>"; });
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
 $("#b12dt").querySelector("[data-d=aud]").value = door.aud;
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
      function dirty() { var d = js() !== saved; $("#b12sv").style.cssText = "font-size:16px;padding:10px 18px;" + (d ? "background:var(--o);box-shadow:0 0 0 4px rgba(217,130,0,.35)" : "opacity:.65"); if (d) $("#b12m").textContent = "● বদল হয়েছে — 💾 সেভ চাপুন।"; }
      $("#b12sv").onclick = function () {
        if (js() === saved) { $("#b12m").textContent = "কোনো বদল নেই।"; return; }
        var pay = {}, q2; for (q2 in door) pay[q2] = door[q2]; if (JSON.stringify(pay.qa) === JSON.stringify(window.FADoor.defaults.qa)) delete pay.qa; // ডিফল্ট জোড়া সার্ভারে লাগে না (ছোট থাকে; SQL-18 ছাড়াও সেভ চলে)
        if (JSON.stringify(pay).length > 22000) { alert("সেটিং খুব বড় হয়ে গেছে (সীমা ২২০০০ অক্ষর)। কিছু প্রশ্ন–উত্তর জোড়া, নাম বা ⛔ বন্ধ-তালিকা কমান।"); return; }
        $("#b12m").textContent = "⏳ সেভ হচ্ছে…";
        m.rpc("mc2_admin_set_bg12", { p_cfg: snap(), p_door: pay }).then(function () { saved = js(); try { localStorage.removeItem("bg12cfg"); localStorage.removeItem("fa_door"); } catch (e) {} $("#b12m").textContent = "✅ সেভ হয়েছে — ইউজাররা রিফ্রেশ করলে পাবে।"; dirty(); })
          .catch(function (er) { var x = er && er.message ? er.message : String(er); $("#b12m").textContent = ""; alert(/cfg too long/.test(x) ? "সেটিং ৪০০০ অক্ষরের পুরোনো সীমা পার করেছে (কাস্টম প্রশ্ন–উত্তর/নাম বেশি)। sql/SQL-18-DOOR-SETTINGS-RAISE-SIZE-LIMIT.sql একবার Supabase SQL Editor-এ চালান, তারপর আবার সেভ করুন।\n\n" + x : /mc2_admin_set_bg12|PGRST202|42883|mc2_bg12_cfg/.test(x) ? "সার্ভারে সেটিং টেবিল নেই। sql/SQL-17-ANIMATION-DOOR-SETTINGS.sql একবার Supabase SQL Editor-এ চালান।\n\n" + x : x); });
      };
    }).catch(function (e) {
      var x = e && e.message ? e.message : String(e);
      m.$("#view").innerHTML = "<h2>🎞 এনিমেশন ও দরজা</h2><p class='warn'>লোড হয়নি: " + m.esc(x) + "</p><p class='sm'>sql/SQL-17-ANIMATION-DOOR-SETTINGS.sql একবার Supabase SQL Editor-এ চালান, তারপর রিফ্রেশ করুন।</p>";
    });
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { b12: view });
})();
