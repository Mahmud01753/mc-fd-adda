// d15: ডিজাইন বাছাই (dmode: ০ সিঙ্গেল · ১ র‍্যান্ডম=ডিফল্ট · ২ সব ক্রমে), doff = বন্ধ করা ডিজাইনের তালিকা, cvol = চ্যাট শব্দের জোর (আলাদা লাউড বাস), 🔒 তালা, সাইন টানা, বাম সিল, সিলের হেলা, গেইট ফুল-স্ক্রিন, চ্যাট উইন্ডোর নাম lt1/lt2।
// Friend Adda — চ্যাটে ঢোকার গেইট/দরজা (শব্দ সহ)। সাইটে: Enter চাপলে FADoor.play(নাম) নিজে চলে; অ্যাডমিন প্রিভিউতেও একই কোড (FADoor.play(নাম, {host, cfg, mode})).
// নামের বাবল: অ্যাডমিন → 🎞 → 💭 চ্যাটের নাম (door.names, সার্ভারে আগের mc2_bg12_cfg.door-এর ভেতরেই — নতুন SQL লাগে না)।
// সেটিং: Supabase mc2_bg12_cfg.door (অ্যাডমিন → 🎞 এনিমেশন ও দরজা)। সার্ভার না পেলে নিচের ডিফল্ট চলে।
// সময় (d5): প্রথম ৩ বার = গেইট wait1 সেকেন্ড → দরজা খোলে → স্বাগতম লেখা ধীরে ছোট হয়ে মিলায় (msg1×.45 + shr সেকেন্ড) → তখনই পেছনে চ্যাট শুরু, chat সেকেন্ড চলে। ৪র্থ বার (nth) থেকে = wait3 সেকেন্ডে দরজা খোলে, লেখা+চ্যাট msg3 সেকেন্ডের ভেতর শেষ। (আগের নোট:) প্রথম/২য় বার = (গেইট wait1 সেকেন্ড + স্বাগতম msg1 সেকেন্ড); nth-তম বার থেকে = (wait3 + msg3)। ক্লিকে খোলা: প্রথম দিকে cd1 সেকেন্ড পর, nth-তম বার থেকে cd3 সেকেন্ড পর।
// ডিজাইন (গেইট/দরজা), ভেতরের লাইভ-চ্যাট মক ও শব্দ: গেইট-প্রিভিউ ফাইল (friend-adda-gate-preview.html) থেকে নেওয়া। ছবি: images/gate/ (tl.jpg, tr.jpg, fac.jpg)।
(function () {
  "use strict";
  var NM0 = ["মাহমুদ", "সুহেল", "কামরুল", "মইনুল", "নাজনীন", "জাফরিন", "জেসি", "আফরিন", "রামিসা", "সাদিয়া", "নিশা", "রুদেলা", "জারা", "প্লাবন", "মাহিরা", "সোহাগ", "হিমানী", "শতাব্দী", "ইফাজ", "সুমাইয়া", "বর্ষা", "মাহবুবা", "হিটলার"];
  function cleanNames(a) { var r = [], s = {}, i, t; if (!Array.isArray(a)) return NM0.slice(); for (i = 0; i < a.length && r.length < 60; i++) { t = String(a[i] == null ? "" : a[i]).replace(/\s+/g, " ").trim().slice(0, 20); if (t && !s[t]) { s[t] = 1; r.push(t); } } return r; }
  var NQ0 = [
    ["আজকে ক্যান্টিনে কী আছে রে?", "খিচুড়ি আর ডিম ভাজি, জলদি চলে আয়!"], ["ক্লাস কয়টায় শুরু?", "১১টায়, আজ আর দেরি করিস না।"],
    ["কেউ কি গতকালের নোটটা দিতে পারবে?", "আমার কাছে আছে, এখনই পাঠিয়ে দিচ্ছি।"], ["আজ আড্ডা কোথায় বসবে?", "ফিল্ডের ওই বড় গাছের নিচে।"],
    ["@{নাম} তুই কি আজ আসছিস?", "হ্যাঁ, দশ মিনিটের মধ্যেই পৌঁছে যাব।"], ["আজ কি ক্লাস টেস্ট আছে?", "না রে, পরের সপ্তাহে।"],
    ["চা খাবি কেউ?", "আমি আছি, সাথে সিঙাড়া চাই!"], ["সবাই কি এসে গেছ?", "আরও দুইজন বাকি, আসছে।"],
    ["লাইব্রেরিতে বসে পড়বি আজ?", "চল, জানালার পাশের টেবিলটা ধরি।"], ["আজকের লেকচারের স্লাইড কেউ পেয়েছ?", "গ্রুপে দিয়ে দিয়েছি, দেখে নাও।"],
    ["পরীক্ষার রুটিন এসেছে?", "এখনো না, নোটিশ বোর্ডে নজর রাখিস।"], ["আজ বাসায় কখন ফিরবি?", "ক্লাস শেষ হলেই, তোর সাথে যাব।"],
    ["অ্যাসাইনমেন্ট জমার শেষ দিন কবে?", "বৃহস্পতিবার, কেউ ভুলিস না!"], ["ক্যান্টিনে ভিড় কেমন?", "একদম ফাঁকা, এখনই চল।"],
    ["কারও কাছে একটা কলম হবে?", "এই নে, কিন্তু ফেরত দিস।"], ["স্যার কি আজ ক্লাসে আসবেন?", "হ্যাঁ, এইমাত্র গেটে দেখলাম।"],
    ["ছবি তুলব সবাই, রেডি?", "এক মিনিট, চুলটা ঠিক করে নিই!"], ["কাল ছুটি নাকি রে?", "না, ক্লাস আছে, ঘুমিয়ে থাকিস না।"],
    ["{নাম}, তোর নোট খাতাটা একবার দিবি?", "নে, তবে কাল সকালেই ফেরত চাই।"], ["আজকের টপিক কিছু বুঝেছিস?", "অর্ধেক বুঝেছি, বাকিটা একসাথে পড়ি।"],
    ["রাতে অনলাইনে আসবি?", "আসব, ডিসকাশনটা তখনই করি।"], ["ফুচকা খেতে যাবি?", "চল, আজ তোর ট্রিট!"],
    ["প্রেজেন্টেশন কার আগে?", "তোর আগে, প্রস্তুত থাক।"], ["আজ কি বৃষ্টি হবে?", "মনে হয় হবে, ছাতা এনেছিস?"],
    ["@{নাম} আজ আড্ডায় থাকছিস তো?", "অবশ্যই, আড্ডা ছাড়া কি চলে!"], ["টিফিনে কী খাবি?", "যা-ই হোক, সবাই একসাথে বসব।"]
  ].map(function (p) { return { q: p[0], a: p[1] }; });
  function cleanQA(a) { var r = [], i, p, q, t, k; if (!Array.isArray(a)) return NQ0.map(function (x) { return { q: x.q, a: x.a }; }); for (i = 0; i < a.length && r.length < 60; i++) { p = a[i]; if (typeof p === "string") { k = p.search(/[|｜]/); p = k < 0 ? null : { q: p.slice(0, k), a: p.slice(k + 1) }; } if (!p || typeof p !== "object") continue; q = String(p.q == null ? "" : p.q).replace(/\s+/g, " ").trim().slice(0, 80); t = String(p.a == null ? "" : p.a).replace(/\s+/g, " ").trim().slice(0, 80); if (q && t) r.push({ q: q, a: t }); } return r; }
  var DEF = {
    on: true, sound: true, csnd: true, txt: true, aud: "all", click: true,
    design: 0, cspd: 1000, spd: 1, gap: 0, vol: 333, cvol: 800, dmode: 1, doff: "", lock: true, sgdrag: true, sl2: true, sla: -8, gfull: true, lt1: "এমসি আড্ডা", lt2: "মাস্টার্স আড্ডা", pl: true, plbg: "", plc: "", wtc: "", seal: true, bri: 100, fa: 0, fl: 4, wx: 0, wy: 0,
    wait1: 8, msg1: 7, shr: 3, chat: 10, wait3: 3, msg3: 7, nth: 4, cd1: 0, cd3: 2, sbtn: true,
    lim: true, max: 3, win: 5, blk: "",
    college: "M.C COLLEGE MASTER’S", group: "FRIENDS ADDA", session: "২০২৩-২৪", sign: "স্বাগতম, {নাম}",
    welcome: "হে {নাম}, M.C COLLEGE MASTER’S FRIENDS আড্ডায় আপনাকে স্বাগতম।।",
    w1: "#6b3f1d", w2: "#5a3216",
    names: NM0.slice(), qa: cleanQA(null), wnd: true, wmin: 1, wmax: 2,
    sgs: 100, sgb: 800, sgh: 30, sgw: 84, sgy: 0
  };
  var LIM = { wait1: [1, 120], msg1: [1, 60], wait3: [1, 120], msg3: [1, 60], nth: [1, 50], shr: [0, 30], chat: [1, 60], cd1: [0, 60], cd3: [0, 60], cspd: [150, 3000], spd: [0, 3], gap: [0, 3000], vol: [50, 500], cvol: [50, 800], dmode: [0, 2], sla: [-30, 30], max: [1, 20], win: [1, 60], design: [0, 99], bri: [30, 130], fa: [0, 16], fl: [1, 15], wx: [-12, 12], wy: [-12, 12], wmin: [.5, 6], wmax: [.5, 6], sgs: [40, 220], sgb: [400, 900], sgh: [15, 31], sgw: [60, 96], sgy: [-8, 8] };
  var MG = null, CF = {}, k, css, R = null, D = null, AC = null, tm = [], phase = 0, me = "", CFG = null, tt = null, T0 = 0, hostMode = false, savedOv = null;
  for (k in DEF) CF[k] = DEF[k];
  function clean(c) { var q, v; c.names = cleanNames(c.names); c.qa = cleanQA(c.qa); for (q in LIM) { v = +c[q]; if (isNaN(v)) v = DEF[q]; c[q] = Math.max(LIM[q][0], Math.min(LIM[q][1], v)); } if (c.wmax < c.wmin) c.wmax = c.wmin; return c; }
  function merge(o) { if (!o || typeof o !== "object") return; if (o.vol === 500) { o = JSON.parse(JSON.stringify(o)); o.vol = DEF.vol; } /* d18: পুরোনো ফুল-ডিফল্ট ৫০০% সেভ থাকলে নতুন ডিফল্ট (১/৩ কম) */ if (o.vol === 250 && !o.hasOwnProperty("cvol")) { o = JSON.parse(JSON.stringify(o)); o.vol = DEF.vol; } /* d15: পুরোনো ডিফল্ট ২৫০% সেভ করা থাকলে নতুন ফুল ডিফল্টে উঠবে */ for (var q in DEF) if (o.hasOwnProperty(q) && typeof o[q] === typeof DEF[q] && ((q !== "names" && q !== "qa") || Array.isArray(o[q]))) CF[q] = o[q]; clean(CF); }
  try { merge(JSON.parse(localStorage.getItem("fa_door") || "null")); } catch (e) {}
  try {
    var M = window.MC_CFG;
    if (M && M.url && window.fetch && !window.BG12_MANUAL) fetch(String(M.url).replace(/\/$/, "") + "/rest/v1/mc2_bg12_cfg?id=eq.1&select=door", { headers: { apikey: M.key, Authorization: "Bearer " + M.key } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var o = d && d[0] && d[0].door; if (o && typeof o === "object") { merge(o); try { localStorage.setItem("fa_door", JSON.stringify(o)); } catch (e) {} }
    }).catch(function () {});
  } catch (e) {}

  var $ = function (s) { return R.querySelector(s); };
  var BN = "০১২৩৪৫৬৭৮৯", bn = function (n) { return String(n).replace(/\d/g, function (d) { return BN[d]; }); };
  var esc = function (t) { return String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); };
  var absu = function (p) { try { return new URL(p, document.baseURI).href; } catch (e) { return p; } };
  var TL = absu("images/gate/tl.jpg"), TR = absu("images/gate/tr.jpg"), FACU = absu("images/gate/fac.jpg");

  // ===== ডিজাইন (১ম ৭টা গেইট, পরের ১১টা দরজা) =====
var VARS=["--dbg","--dbg2","--dbd","--fr","--hn","--sgbg","--sgbd","--sgc","--sga","--sgs","--rm","--rmc","--sh","--pn","--hd","--bf"];
var u=function(n){return "calc(var(--u)*"+n+")"};
var STEEL="linear-gradient(90deg,#f1f6f9,#9aa7b1,#55616b)",GOLD="linear-gradient(90deg,#fff2b0,#c9972e,#7a5a16)";
var DS=[
/* ===== গেইট ===== */
{n:"ডিপার্টমেন্ট গেইট (বিল্ডিং সহ)",g:1,s:1,f:1,v:{"--dbg":"linear-gradient(90deg,rgba(0,0,0,.5),transparent 24%,transparent 76%,rgba(0,0,0,.3)),url('"+TL+"') 0 0/100% auto repeat-y,#14110d","--dbg2":"linear-gradient(90deg,rgba(0,0,0,.3),transparent 24%,transparent 76%,rgba(0,0,0,.5)),url('"+TR+"') 0 0/100% auto repeat-y,#14110d","--dbd":"#15120e","--hn":GOLD,"--pn":"none","--sh":"inset 0 0 0 3px #b8903a,inset 0 0 40px rgba(0,0,0,.6)","--sgbg":"#101a14","--sgbd":"#c9a24a","--sgc":"#f3e3b0","--sga":"#ffd45e","--rm":"radial-gradient(ellipse at 50% 38%,#fffbe8,#e6c46e 42%,#1f3a2a 95%)","--rmc":"#1d2c20"}},
{n:"সবুজ কোলাপসিবল",g:1,s:1,v:{"--dbg":"repeating-linear-gradient(90deg,#1b5e3b 0 "+u(4)+",transparent "+u(4)+" "+u(36)+"),repeating-linear-gradient(58deg,transparent 0 "+u(16)+",#2f8f5f "+u(16)+" "+u(18)+"),repeating-linear-gradient(-58deg,transparent 0 "+u(16)+",#2f8f5f "+u(16)+" "+u(18)+")","--dbd":"#12402a","--sh":"none","--hn":STEEL,"--pn":"none","--sgbg":"#0d3d27","--sgbd":"#9fdc8a","--sgc":"#f1ffe9","--sga":"#ffd45e","--rm":"radial-gradient(ellipse at 50% 35%,#f6ffe9,#b7e6a0 45%,#1a5a34 95%)","--rmc":"#0d3d27"}},
{n:"লোহার ঝালর",g:1,s:1,v:{"--dbg":"radial-gradient(circle at 50% 50%,transparent "+u(8)+",#15151a "+u(8)+" "+u(10)+",transparent "+u(10)+") 0 "+u(20)+"/"+u(40)+" "+u(70)+","+"repeating-linear-gradient(90deg,transparent 0 "+u(18)+",#15151a "+u(18)+" "+u(22)+",transparent "+u(22)+" "+u(40)+"),linear-gradient(#15151a,#15151a) 0 "+u(16)+"/100% "+u(8)+" no-repeat,linear-gradient(#15151a,#15151a) 0 calc(100% - "+u(24)+")/100% "+u(8)+" no-repeat","--dbd":"#15151a","--sh":"none","--hn":GOLD,"--pn":"none","--sgbg":"#15151a","--sgbd":"#c9a24a","--sgc":"#f3e3b0","--sga":"#ffd45e","--rm":"radial-gradient(ellipse at 50% 35%,#fff7dc,#f0c874 45%,#5a3a10 95%)","--rmc":"#2a1a06"}},
{n:"কাঠের ফার্ম গেইট",g:1,s:1,v:{"--dbg":"linear-gradient(to top right,transparent calc(50% - "+u(10)+"),#3a210e calc(50% - "+u(10)+") calc(50% + "+u(10)+"),transparent calc(50% + "+u(10)+")),repeating-linear-gradient(0deg,#a8763c 0 "+u(17)+",#9a6a35 "+u(17)+" "+u(36)+",#3a210e "+u(36)+" "+u(40)+")","--dbg2":"linear-gradient(to top left,transparent calc(50% - "+u(10)+"),#3a210e calc(50% - "+u(10)+") calc(50% + "+u(10)+"),transparent calc(50% + "+u(10)+")),repeating-linear-gradient(0deg,#a8763c 0 "+u(17)+",#9a6a35 "+u(17)+" "+u(36)+",#3a210e "+u(36)+" "+u(40)+")","--dbd":"#3a210e","--sh":"inset 0 0 30px rgba(0,0,0,.45)","--hn":"linear-gradient(90deg,#666,#111)","--pn":"none","--sgbg":"#3a210e","--sgbd":"#d9b36a","--sgc":"#ffe9c0","--sga":"#ffcf6b","--rm":"radial-gradient(ellipse at 50% 35%,#f4ffe0,#a8d67a 45%,#2c5a22 95%)","--rmc":"#1e3a16"}},
{n:"আধুনিক স্লাট",g:1,s:1,v:{"--dbg":"linear-gradient(90deg,transparent 88%,#c58a50 88%),repeating-linear-gradient(0deg,#1d2023 0 "+u(17)+",#3a4046 "+u(17)+" "+u(19)+")","--dbg2":"linear-gradient(90deg,#c58a50 12%,transparent 12%),repeating-linear-gradient(0deg,#1d2023 0 "+u(17)+",#3a4046 "+u(17)+" "+u(19)+")","--dbd":"#101214","--sh":"none","--hn":"linear-gradient(90deg,#f0f0f0,#8a8f94)","--pn":"none","--sgbg":"#14171a","--sgbd":"#c58a50","--sgc":"#f2e6d8","--sga":"#e8b27a","--rm":"radial-gradient(ellipse at 50% 35%,#ffffff,#d9dde0 45%,#3a4046 95%)","--rmc":"#14171a"}},
{n:"রাজকীয় ফটক",g:1,s:1,v:{"--dbg":"radial-gradient(circle at 100% 46%,#f6dc8a 0 "+u(16)+",#7a5412 "+u(16)+" "+u(19)+",transparent "+u(19)+" "+u(40)+",#d9a63a "+u(40)+" "+u(42)+",transparent "+u(42)+"),repeating-linear-gradient(90deg,transparent 0 "+u(20)+",#d9a63a "+u(20)+" "+u(23)+"),linear-gradient(#1b1208,#2a1a0c)","--dbg2":"radial-gradient(circle at 0% 46%,#f6dc8a 0 "+u(16)+",#7a5412 "+u(16)+" "+u(19)+",transparent "+u(19)+" "+u(40)+",#d9a63a "+u(40)+" "+u(42)+",transparent "+u(42)+"),repeating-linear-gradient(90deg,transparent 0 "+u(20)+",#d9a63a "+u(20)+" "+u(23)+"),linear-gradient(#1b1208,#2a1a0c)","--dbd":"#caa03c","--sh":"inset 0 0 36px #000a","--hn":GOLD,"--pn":"none","--sgbg":"#1b1208","--sgbd":"#d9a63a","--sgc":"#ffe9a8","--sga":"#ffb347","--rm":"radial-gradient(ellipse at 50% 35%,#fff3d0,#e0a040 45%,#2a0a0a 92%)","--rmc":"#3a0810"}},
{n:"গ্লাস ও স্টিল",g:1,s:1,v:{"--dbg":"repeating-linear-gradient(0deg,#2b333a 0 "+u(3)+",transparent "+u(3)+" "+u(92)+"),linear-gradient(115deg,rgba(255,255,255,.6),rgba(255,255,255,.1) 42%,rgba(255,255,255,.35) 62%,rgba(255,255,255,.08)),linear-gradient(rgba(120,190,230,.38),rgba(120,190,230,.38))","--dbd":"#3b4650","--sh":"inset 0 0 20px rgba(255,255,255,.35)","--hn":STEEL,"--pn":"none","--sgbg":"#0b2a46","--sgbd":"#d9efff","--sgc":"#eaf6ff","--sga":"#8fd8ff","--rm":"radial-gradient(ellipse at 50% 35%,#ffffff,#bfe6ff 45%,#2a6aa0 92%)","--rmc":"#0b2a46"}},
/* ===== দরজা ===== */
{n:"ক্লাসিক কাঠ",wood:1,v:{}},
{n:"স্টিল ভল্ট",v:{"--dbg":"radial-gradient(circle at 14px 14px,#1d242a 3px,transparent 4px) 0 0/46px 46px,linear-gradient(90deg,#4a5560,#9aa7b1 45%,#5b6670 55%,#37414a)","--dbd":"#2b333a","--fr":"rgba(0,0,0,.45)","--hn":STEEL,"--sgbg":"#1c2227","--sgbd":"#9aa7b1","--sgc":"#dfe8ee","--sga":"#ffcf4a","--rm":"radial-gradient(ellipse at 50% 35%,#f2f7fa,#9fb2c0 45%,#2f3b45 90%)","--rmc":"#13202a","--sh":"inset 0 0 40px #000a"}},
{n:"রাজকীয় সোনা",v:{"--dbg":"repeating-linear-gradient(45deg,rgba(255,255,255,.1) 0 6px,transparent 6px 14px),linear-gradient(90deg,#8a5a10,#f0c75a 30%,#b98318 55%,#f6dc8a 80%,#8a5a10)","--dbd":"#5a3a08","--fr":"rgba(90,50,0,.6)","--hn":"linear-gradient(90deg,#ffffff,#d9a63a,#7a5a16)","--sgbg":"#3a0c14","--sgbd":"#f0c75a","--sgc":"#ffe9a8","--sga":"#ffb347","--rm":"radial-gradient(ellipse at 50% 35%,#fff3d0,#e9b64e 45%,#5a2a0a 90%)","--rmc":"#4a2406","--sh":"inset 0 0 40px #0008"}},
{n:"নিয়ন সাইবার",v:{"--dbg":"repeating-linear-gradient(0deg,rgba(53,243,255,.14) 0 1px,transparent 1px 26px),linear-gradient(90deg,#0a1226,#13204a)","--dbd":"#35f3ff","--fr":"rgba(255,61,242,.85)","--hn":"linear-gradient(90deg,#ff3df2,#35f3ff)","--sgbg":"#0a0f24","--sgbd":"#35f3ff","--sgc":"#c9fffb","--sga":"#ff3df2","--rm":"radial-gradient(ellipse at 50% 35%,#3a1a6a,#10163a 50%,#04060f 95%)","--rmc":"#c9fffb","--sh":"inset 0 0 44px rgba(53,243,255,.5)"}},
{n:"জাপানি শোজি",s:1,v:{"--dbg":"repeating-linear-gradient(90deg,transparent 0 56px,#5a3b1c 56px 60px),repeating-linear-gradient(0deg,transparent 0 56px,#5a3b1c 56px 60px),#f6f0df","--dbd":"#5a3b1c","--pn":"none","--hn":"linear-gradient(90deg,#4a2f14,#2b1a0a)","--sgbg":"#f6f0df","--sgbd":"#5a3b1c","--sgc":"#3b2610","--sga":"#b3261e","--sgs":"#3b2610","--rm":"radial-gradient(ellipse at 50% 35%,#fff0f5,#ffc9d9 45%,#8a4a60 95%)","--rmc":"#4a1f30","--sh":"inset 0 0 30px #0003"}},
{n:"সাই-ফাই স্লাইড",s:1,v:{"--dbg":"repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 3px,transparent 3px 22px),linear-gradient(135deg,#1b2733,#2f4558)","--dbd":"#27e0b0","--fr":"rgba(39,224,176,.7)","--hn":"linear-gradient(90deg,#9ffff0,#27e0b0)","--sgbg":"#0b2a2a","--sgbd":"#27e0b0","--sgc":"#d8fff6","--sga":"#27e0b0","--rm":"radial-gradient(ellipse at 50% 35%,#d8fff6,#3cd6b4 45%,#06332b 92%)","--rmc":"#04302a","--sh":"inset 0 0 40px rgba(39,224,176,.35)"}},
{n:"কলেজ সবুজ",v:{"--dbg":"linear-gradient(90deg,#0f5a37,#1d8a57 50%,#0f5a37)","--dbd":"#f2f2e8","--fr":"rgba(255,255,255,.6)","--hn":"linear-gradient(90deg,#ffffff,#d9d9c8)","--sgbg":"#0d3d27","--sgbd":"#f2f2e8","--sgc":"#f7f7ea","--sga":"#ffd45e","--rm":"radial-gradient(ellipse at 50% 35%,#f6ffe9,#9fdc8a 45%,#1a5a34 92%)","--rmc":"#0d3d27","--sh":"inset 0 0 40px #0006"}},
{n:"ক্যান্ডি পপ",v:{"--dbg":"linear-gradient(90deg,rgba(0,0,0,.15),transparent 14%,transparent 86%,rgba(0,0,0,.18)),repeating-linear-gradient(90deg,#ff8fc7 0 24px,#fff 24px 48px)","--dbd":"#ff5fae","--fr":"rgba(255,255,255,.85)","--hn":"linear-gradient(90deg,#ffe27a,#ff9d2e)","--sgbg":"#c93a8b","--sgbd":"#ffffff","--sgc":"#ffffff","--sga":"#ffe27a","--rm":"radial-gradient(ellipse at 50% 35%,#fff7d6,#ffc2e4 45%,#b05ad8 92%)","--rmc":"#5a1f6e","--sh":"inset 0 0 30px #0004"}},
{n:"ইট ও লোহা",v:{"--dbg":"repeating-linear-gradient(0deg,#3a1d12 0 3px,transparent 3px 26px),repeating-linear-gradient(90deg,#3a1d12 0 3px,transparent 3px 52px),#a4482c","--dbd":"#2a2a2a","--fr":"rgba(0,0,0,.5)","--hn":"linear-gradient(90deg,#8a8a8a,#2a2a2a)","--sgbg":"#1c1c1c","--sgbd":"#b0b0b0","--sgc":"#eeeeee","--sga":"#ff9f43","--rm":"radial-gradient(ellipse at 50% 35%,#fff0d0,#d98a4a 45%,#3a1d12 92%)","--rmc":"#3a1d12","--sh":"inset 0 0 40px #000a"}},
{n:"ক্রিস্টাল গ্লাস",s:1,v:{"--dbg":"linear-gradient(115deg,rgba(255,255,255,.55),rgba(255,255,255,.12) 40%,rgba(255,255,255,.4) 60%,rgba(190,230,255,.25))","--dbd":"rgba(255,255,255,.9)","--fr":"rgba(255,255,255,.65)","--hn":"linear-gradient(90deg,#ffffff,#9fb8cc)","--bf":"blur(4px)","--sgbg":"#0a325a","--sgbd":"#d9efff","--sgc":"#eaf6ff","--sga":"#8fd8ff","--rm":"radial-gradient(ellipse at 50% 35%,#ffffff,#bfe6ff 45%,#2a6aa0 92%)","--rmc":"#0b2a46","--sh":"inset 0 0 30px rgba(255,255,255,.5)"}},
{n:"থিয়েটার পর্দা",s:1,v:{"--dbg":"repeating-linear-gradient(90deg,#7a0f1c 0 18px,#b3182b 18px 30px,#5a0a14 30px 40px)","--dbd":"#d9a63a","--pn":"none","--hd":"none","--sgbg":"#3a0810","--sgbd":"#e8c36a","--sgc":"#ffe9a8","--sga":"#ff9f43","--rm":"radial-gradient(ellipse at 50% 35%,#fff3d0,#e0a040 45%,#2a0a0a 92%)","--rmc":"#3a0810","--sh":"inset 0 0 50px #000a"}}
];
  function dv(el, i) { VARS.forEach(function (k) { el.style.removeProperty(k); }); var v = DS[i].v, k; for (k in v) el.style.setProperty(k, v[k]); }
  function setCls(a, b, c) { D.classList.toggle("open", !!a && !!b); D.classList.toggle("show", !!c); if (R) { R.classList.toggle("lvon", !!c); var wl = R.querySelector("#wlw"); if (wl) wl.classList.toggle("show", !!c); } } // part60: ডেমো চ্যাট (#lv) ও স্বাগতম লেখা (#wlw) এখন দরজার বাইরে, তাই একই ক্লাস ওদেরও দিই
  // ===== part60: ডেমো চ্যাট ফুলস্ক্রিন =====
  // আগে #lv (দুই চ্যাট উইন্ডো) ও স্বাগতম লেখা (#rw, #bd) দরজার ভেতরের #dw-তে আটকা ছিল। এখন #lv গেইটের (#fgate) পুরো পর্দা জুড়ে, আর স্বাগতম লেখা হুবহু আগের জায়গা-মাপেই (#wlw) তার ওপরে।
  function layers() {
    var rm = R.querySelector(".rm"), lv = rm && rm.querySelector("#lv"), rw = rm && rm.querySelector("#rw"), bd = rm && rm.querySelector("#bd"), w;
    if (!lv || !rw || !bd) return;
    w = document.createElement("div"); w.id = "wlw"; w.innerHTML = '<div class="rm wl"></div>';
    w.firstChild.appendChild(rw); w.firstChild.appendChild(bd);
    R.appendChild(lv); R.appendChild(w);
  }
  function syncWl() { // দরজার ডিজাইনের রঙের ভ্যারিয়েবল (লেখার রং ইত্যাদি) স্বাগতম-লেখার স্তরেও দিই
    var w = R && R.querySelector("#wlw"); if (!w || !D) return;
    VARS.forEach(function (k) { var v = D.style.getPropertyValue(k); if (v) w.style.setProperty(k, v); else w.style.removeProperty(k); });
  }
  function posWl() { // স্বাগতম-লেখার স্তর = দরজার ভেতরের খোলা অংশের (#dw) চূড়ান্ত মাপ; ছবি-গেইটে xp-র পরের মাপ
    var w = R && R.querySelector("#wlw"), dw = $("#dw"), rr, dr, q, x, y, wd, h, g; if (!w || !dw || !D) return;
    rr = R.getBoundingClientRect(); dr = D.getBoundingClientRect();
    if (D.classList.contains("fac") && dr.width > 0) { g = R.classList.contains("facg"); x = dr.left + dr.width * (g ? .02 : .095); wd = dr.width * (g ? .96 : .815); y = dr.top + dr.height * .27; h = dr.height * .73; }
    else { q = dw.getBoundingClientRect(); x = q.left; y = q.top; wd = q.width; h = q.height; }
    w.style.left = (x - rr.left) + "px"; w.style.top = (y - rr.top) + "px"; w.style.width = wd + "px"; w.style.height = h + "px";
  }
  var LF = 0, rzOn = false;
  function lvScale() { // ফুলস্ক্রিন চ্যাটের লেখার একক (--f) পর্দার মাপ থেকে
    var lv = R && R.querySelector("#lv"), W, H; if (!lv) return;
    W = R.clientWidth || 360; H = R.clientHeight || 640; LF = Math.max(2, Math.min(W * .0088, H * .0135, 5.2));
    lv.style.setProperty("--f", LF.toFixed(2) + "px");
  }
  function onRz() { if (!R || !D) return; lvScale(); posWl(); }
  function applyD() {
    var d = CFG.design; if (d < 0 || d >= DS.length) d = 0;
    dv(D, d); syncWl();
    D.classList.toggle("slide", !!DS[d].s); D.classList.toggle("fac", !!DS[d].f); D.classList.toggle("fc", !!DS[d].fc);
    var lv = $("#lv"); lv.style.setProperty("--br", (CFG.bri / 100 * .85).toFixed(3)); lv.style.setProperty("--wx", CFG.wx); lv.style.setProperty("--wy", CFG.wy); lv.style.setProperty("--sa", CFG.sla + "deg"); if (R) R.classList.toggle("facg", !!DS[d].f && !!CFG.gfull);
    if (DS[d].wood) { D.style.setProperty("--w1", CFG.w1); D.style.setProperty("--w2", CFG.w2); } else { D.style.removeProperty("--w1"); D.style.removeProperty("--w2"); }
  }
  // ছবি-গেইটে সাইন: "রাষ্ট্রবিজ্ঞান বিভাগ" লেখার (ছবির ~২৫%) ঠিক নিচ থেকে দরজার মাথা (~৫৮%) পর্যন্ত জায়গায় বড়/মোটা; লেখা বেশি হলে অটো ছোট; বিভাগ-লেখা কখনো ঢাকে না
  function fitSign() {
    var sg = $("#sg"); if (!sg || !D || sg.parentNode !== D) return;
    var u = sg.clientWidth || D.clientWidth * .84, k = CFG.sgs / 100, els = [["#s1", .07], ["#s2", .1], ["#s3", .048], ["#s4", .085]], i;
    sg.style.gap = Math.round(u * .012) + "px";
    for (i = 0; i < 40; i++) {
      els.forEach(function (x) { var n = sg.querySelector(x[0]); n.style.fontSize = (u * x[1] * k).toFixed(1) + "px"; n.style.fontWeight = CFG.sgb; n.style.lineHeight = "1.2"; n.style.margin = "0"; });
      if (sg.scrollHeight <= sg.clientHeight + 1 && sg.scrollWidth <= sg.clientWidth + 1) break; k *= .94;
    }
  }
  function sgDrag() {
    var sg = $("#sg"), r = R; if (!sg || !r || sg._dg) return; sg._dg = 1;
    var cb = document.createElement("button"), open = !CFG.lock, on = false, y0 = 0, dy = 0;
    cb.type = "button"; cb.className = "sgb"; cb.textContent = "🔒"; cb.setAttribute("aria-label", "তালা: ট্যাপ করলে আনলক");
    cb.style.cssText = "position:absolute;top:10px;right:10px;z-index:10;width:40px;height:40px;border-radius:50%;border:1px solid #fff5;background:#000a;color:#fff;font-size:20px;line-height:1;padding:0;cursor:pointer;touch-action:manipulation;pointer-events:auto";
    cb.onclick = function (e) { e.stopPropagation(); if (!open) { open = true; cb.textContent = "✕"; cb.setAttribute("aria-label", "বন্ধ করুন"); sg.style.cursor = "grab"; } else finish(); };
    if (CFG.lock) r.appendChild(cb);
    r.addEventListener("pointerdown", function (e) {
      if (!CFG.sgdrag || !open || (e.target.closest && e.target.closest(".sgb"))) return;
      var b = sg.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) return;
      on = true; y0 = e.clientY - dy; e.stopPropagation(); e.preventDefault();
    }, true);
    r.addEventListener("pointermove", function (e) { if (!on) return; var lim = D ? D.clientHeight * .7 : 300; dy = Math.max(-lim, Math.min(lim, e.clientY - y0)); sg.style.translate = "0 " + dy + "px"; e.preventDefault(); }, true);
    var up = function () { on = false; }; r.addEventListener("pointerup", up, true); r.addEventListener("pointercancel", up, true);
  } // part60: পুরো ডিজাইনের ডান-ওপর কোনায় 🔒; ট্যাপে আনলক → একই জায়গায় ✕ (বন্ধ বাটন) আসে + সাইন-বোর্ড হাতে টানা যায়; ✕ চাপলে গেইট বন্ধ হয়ে সাইট
  function pickDesign(c) {
    var n = DS.length, off = String(c.doff || "").split(",").filter(Boolean).map(Number), en = [], i, last = -1, pick, pool;
    for (i = 0; i < n; i++) if (off.indexOf(i) < 0) en.push(i);
    if (!en.length || Math.round(c.dmode) === 0) return c.design; // সিঙ্গেল: শুধু বাছা দরজা
    try { // part60: সব/র‍্যান্ডমে এই ডিভাইসে ১ম বার "কলেজ সবুজ" দরজা (১৩), ২য় বার "ডিপার্টমেন্ট গেইট" (০); তারপর আগের নিয়ম
      var sq = parseInt(localStorage.getItem("fa_door_seq"), 10) || 0, fx = sq === 0 ? 13 : sq === 1 ? 0 : -1;
      localStorage.setItem("fa_door_seq", String(Math.min(sq + 1, 9)));
      if (fx >= 0 && en.indexOf(fx) >= 0) { localStorage.setItem("fa_door_last", String(fx)); return fx; }
    } catch (e) {}
    try { last = parseInt(localStorage.getItem("fa_door_last"), 10); if (isNaN(last)) last = -1; } catch (e) {}
    if (Math.round(c.dmode) === 2) { pick = en.filter(function (x) { return x > last; })[0]; if (pick == null) pick = en[0]; }
    else { pool = en.length > 1 ? en.filter(function (x) { return x !== last; }) : en; pick = pool[Math.floor(Math.random() * pool.length)]; }
    try { localStorage.setItem("fa_door_last", String(pick)); } catch (e) {}
    return pick;
  } // part61: ডিজাইন বাছাই — ০ = অ্যাডমিনের বাছা একটাই, ১ = চালু ডিজাইনগুলো থেকে র‍্যান্ডম (প্রতি ভিজিটে আলাদা), ২ = একটার পর একটা ঘুরে
  function placeSign() {
    var sg = $("#sg"); if (!sg || !D || !DS[CFG.design] || !DS[CFG.design].f) return;
    if (sg.parentNode !== D) D.appendChild(sg);
    var BT = 26.5, BB = 58, band = BB - BT, h = Math.min(CFG.sgh, band), top = Math.max(BT, Math.min(BB - h, BT + (band - h) / 2 + CFG.sgy));
    sg.style.top = top + "%"; sg.style.height = h + "%"; sg.style.width = CFG.sgw + "%"; sg.style.fontWeight = CFG.sgb;
    fitSign(); tm.push(setTimeout(fitSign, 300));
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (D && sg.parentNode === D) fitSign(); }); } catch (e) {}
  }
  function fillTx() {
    $("#s1").textContent = CFG.college; $("#s2").textContent = CFG.group; $("#s3").textContent = "সেশন · " + CFG.session; $("#s4").textContent = String(CFG.sign).replace(/\{নাম\}/g, me);
    $("#bd2").textContent = me; $("#bd3").textContent = CFG.group + " · " + CFG.college;
    var rw = $("#rw"); rw.innerHTML = ""; R.classList.toggle("nosl", !CFG.seal);
    if (CFG.plbg) rw.style.setProperty("--plbg", CFG.plbg); else rw.style.removeProperty("--plbg");
    if (CFG.plc) rw.style.setProperty("--plc", CFG.plc); else rw.style.removeProperty("--plc");
    rw.style.color = CFG.wtc || "";
    var wl = String(CFG.welcome).split(/\s+/).filter(Boolean), he = "", mk = function (t, c) { var s = document.createElement("span"); s.textContent = t; if (c) s.className = c; rw.appendChild(s); };
    wl.forEach(function (w, i) { var m;
      if (CFG.pl && w === "হে" && wl[i + 1] && wl[i + 1].indexOf("{নাম}") >= 0) { he = "হে "; return; }
      if (CFG.pl && (m = /^([\s\S]*?)\{নাম\}([\s\S]*)$/.exec(w))) { mk(he + m[1] + me, "pl"); if (m[2]) mk(m[2], "pn"); he = ""; return; }
      String(w).replace(/\{নাম\}/g, me).split(/\s+/).forEach(function (x) { if (x) mk(x); });
    });
  }

  // ===== ব্যাকগ্রাউন্ডে চলমান লাইভ চ্যাট মক (দরজা খুললে ভেতরে দেখা যায়) =====
var LS=[
 {t:"FRIENDS ADDA",s:"৩২ জন অনলাইন",e:"💬",ev:[["","{me} চ্যাটে যোগ দিয়েছে 🎉","s"],["সুমন","আরে {me} এসে গেছে! 🎉","t"],["তানিয়া","@{me} এতক্ষণ কই ছিলি? সবাই খুঁজছিল","t"],["{me}","এই তো, জ্যামে আটকে ছিলাম 😅","t"],["নাঈম","জ্যাম না ঘুম? 😂","t","{me}","এই তো, জ্যামে আটকে ছিলাম 😅"],["মিম","হাহাহা 😂😂"],["","❤️","r"],["{me}","চুপ কর! আগে একটা চা দে ☕","t"],["সুমন","আসো আসো, চা রেডি ☕","t"],["রাকিব","@{me} আজ ক্যান্টিনে সিঙাড়াও আছে 😋","t"]]},
 {t:"ক্লাস গ্রুপ · সেশন ২০২৩",s:"২৮ জন অনলাইন",e:"📚",ev:[["তানিয়া","কালকের ক্লাস টেস্টের সিলেবাস কেউ জানো?","t"],["রাকিব","প্রথম তিন অধ্যায়, স্যার বলেছেন","t"],["মিম","@{me} তোমার কাছে নোট আছে না?","t"],["{me}","আছে, এখনই পাঠাচ্ছি 📎","t"],["{me}","📎 নোট-৩.pdf"],["তানিয়া","থ্যাংক ইউ {me} 😍","t"],["রাকিব","লাইফ সেভার! 🙌","t","{me}","📎 নোট-৩.pdf"],["","👍","r"],["নাঈম","আমাকেও পাঠা ভাই 🙏","t"]]},
 {t:"রাকিব",s:"অনলাইন",e:"🧑",ev:[["রাকিব","{me} ভাই কই তুই?","t"],["{me}","গেইটে ঢুকছি 🚪","t"],["রাকিব","ক্যান্টিনে আয়, সিঙাড়া আছে 😋","t","{me}","গেইটে ঢুকছি 🚪"],["{me}","১ মিনিট 🙏"],["রাকিব","দেরি করলে সব আমি শেষ করে দিবো 😂","t"],["{me}","খবরদার!! 😱","t"],["রাকিব","😂😂😂"]]},
 {t:"ভিডিও কল · FRIENDS ADDA",s:"কল চলছে",e:"📹",ev:[["","📹 সুমন ভিডিও কল শুরু করেছে","s"],["","তানিয়া কলে যোগ দিয়েছে","s"],["সুমন","{me} জয়েন কর তাড়াতাড়ি","t"],["{me}","জয়েন করছি…","t"],["","{me} কলে যোগ দিয়েছে","s"],["তানিয়া","ভয়েস আসছে না 🔇","t"],["নাঈম","@{me} মাইক আনমিউট কর","t"],["{me}","ওহ্ সরি 😆 এখন ঠিক?","t"],["সুমন","হ্যাঁ এখন পরিষ্কার ✅","t"],["","👍","r"]]},
 {t:"পিকনিক প্ল্যান 🏞",s:"১৮ জন অনলাইন",e:"🏞",ev:[["ফাহিম","শুক্রবার পিকনিক ফাইনাল তো? 🏞","t"],["সাদিয়া","আমি রাজি ✋","t"],["আরিফ","@{me} তুই যাচ্ছিস তো?","t"],["{me}","অবশ্যই! বিরিয়ানি আমার দায়িত্ব 🍛","t"],["ফাহিম","ওয়াও 🔥 {me} ভাই জিন্দাবাদ!","t","{me}","অবশ্যই! বিরিয়ানি আমার দায়িত্ব 🍛"],["সাদিয়া","😂😂😂"],["","🔥","r"],["আরিফ","তাহলে সকাল ৮টায় গেইটে 🚌","t"]]},
 {t:"তানিয়া",s:"অনলাইন",e:"🧑‍🎓",ev:[["তানিয়া","হাই {me} 👋","t"],["{me}","হাই! কেমন আছো?","t"],["তানিয়া","ভালো, তুমি?","t"],["{me}","ভালো, কাল ক্লাসে আসছো?"],["তানিয়া","হ্যাঁ, নোট নিয়ে আসবো 📚","t"],["{me}","পারফেক্ট 👌","t"],["তানিয়া","❤️"]]},
 {t:"পলিটিক্যাল সায়েন্স · ২০২৩",s:"৪১ জন অনলাইন",e:"🏛",ev:[["রিফাত","ভাইভার ডেট কেউ দেখেছো? 😟","t"],["নুসরাত","নোটিশ বোর্ডে দিয়েছে","t"],["জেসমিন","@{me} ছবি তুলে পাঠাও না প্লিজ 🙏","t"],["{me}","পাঠাচ্ছি 📸","t"],["{me}","📷 notice.jpg"],["জেসমিন","থ্যাংকস ❤️","t","{me}","📷 notice.jpg"],["রিফাত","সবাই প্রস্তুতি নাও 💪","t"],["","👍","r"]]},
 {t:"মজার আড্ডা 😂",s:"২৪ জন অনলাইন",e:"😂",ev:[["তামিম","এই ভিডিওটা দেখেছো? 😂","t"],["মিম","হাসতে হাসতে শেষ 🤣","t"],["সুমন","@{me} দেখ দেখ","t"],["{me}","হা হা হা 🤣🤣","t"],["{me}","গ্রুপে আরেকটা পাঠা তো","t"],["তামিম","দাঁড়া, পাঠাচ্ছি 😎","t"],["","😂","r"]]}
];
var LW=[{},{}],lvT=0,lvTy=[],lvNx=0;
function rep(x){return String(x).replace(/\{me\}/g,me)}
function hhmm(){var d=new Date();return bn(("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2))}
function fmt(x){return esc(rep(x)).replace(/@([^\s,।!?]+)/g,function(m,n){return '<span class="mn'+(n===esc(me)?" me":"")+'">@'+n+"</span>"})}
// শব্দ: প্রতিটা বার্তায় নরম "পপ" (বামের উইন্ডো বাম কানে, ডানেরটা ডান কানে); মেনশনে দুই সুরের ডিং
function lvBeep(i,t,d,f0,f1,g,ty){g=Math.min(.95,g*((+(CFG&&CFG.cvol)||600)/100)*3);d=d*1.3;var a=AC,o=a.createOscillator(),ga=a.createGain(),p=null;
  if(a.createStereoPanner){p=a.createStereoPanner();p.pan.value=i?.55:-.55;p.connect((CB||MG||a.destination))}
  o.type=ty||"sine";o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+d);
  ga.gain.setValueAtTime(.0001,t);ga.gain.exponentialRampToValueAtTime(g,t+.012);ga.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(ga);ga.connect(p||(CB||MG||a.destination));o.start(t);o.stop(t+d+.03)}
function lvSnd(i,e){
  if(NBPV||!CFG.csnd||!sndOk()||!AC||AC.state!=="running")return;
  try{var t=AC.currentTime+.01,k=e[2]||"",x=rep(e[1]);
    if(k.indexOf("s")>=0){lvBeep(i,t,.18,520,780,.06);lvBeep(i,t+.1,.2,780,1040,.05)}
    else if(k.indexOf("r")>=0){lvBeep(i,t,.06,1500,1900,.03,"triangle")}
    else if(e[0]==="{me}"){lvBeep(i,t,.08,1250,950,.05,"triangle")}
    else if(x.indexOf("@"+me)>=0){lvBeep(i,t,.12,1320,1320,.06);lvBeep(i,t+.11,.16,1760,1760,.055)}
    else{var f=700+Math.random()*160;lvBeep(i,t,.1,f,f*.66,.06)}
  }catch(z){}
}
var XCSS="#fgate .bb{position:relative}#fgate .rw.b>div{padding-top:calc(var(--f)*2.8)}#fgate .nm{align-self:flex-start;display:inline-block;opacity:1;color:#fff;background:var(--nc,#c2185b);font-size:calc(var(--f)*3);font-weight:900;line-height:1.25;padding:calc(var(--f)*.4) calc(var(--f)*1.7) calc(var(--f)*.5);margin:0 0 calc(var(--f)*.6) calc(var(--f)*.2);border-radius:calc(var(--f)*1.8);text-shadow:0 1px 2px rgba(0,0,0,.55);box-shadow:0 1px 3px rgba(0,0,0,.45)}#fgate .bb .sl{position:absolute;top:calc(var(--f)*-2.7);right:calc(var(--f)*1.2);transform:rotate(-9deg);font-style:normal;font-size:calc(var(--f)*2.1);font-weight:900;line-height:1;padding:calc(var(--f)*.55) calc(var(--f)*1.5);border-radius:99px;background:#fffbe9;color:var(--nc,#c2185b);border:calc(var(--f)*.45) double var(--nc,#c2185b);box-shadow:0 1px 3px rgba(0,0,0,.45);white-space:nowrap;z-index:3}#fgate .bb .sl.o{transform:rotate(calc(var(--sa,-8deg)*.5))}#fgate .rm h3 span.pl{background:var(--plbg,var(--sgbg));color:var(--plc,var(--sga));border:.06em solid var(--sgbd);border-radius:.45em;padding:.02em .5em .08em;margin:0 .22em;font-weight:900;box-shadow:0 .08em .3em rgba(0,0,0,.4)}#fgate .rm h3 span.pn{margin-left:-.1em}#fgate.nosl .bb .sl{display:none}";
// স্বাগতম লেখার প্রতিটা শব্দ আলাদা রঙে; চ্যাটের নাম: রঙিন ব্যাকগ্রাউন্ডে বড়-মোটা নাম + বাবলের ফ্রেমে হেলানো সিলে আবার নাম
var NPAL=["#c2185b","#6a1b9a","#00695c","#e65100","#1565c0","#ad1457","#2e7d32","#b71c1c","#4527a0","#00838f"];
function NHASH(n){var h=0,i;n=String(n);for(i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))>>>0;return h}
function NCOL(n){return NPAL[NHASH(n)%NPAL.length]}
function lastB(m){var n=m.lastChild;while(n&&!n.classList.contains("b"))n=n.previousSibling;return n}
function lvSeal2(nm,e){if(!CFG.sl2)return"";return'<i class="sl l" style="--nc:'+NCOL(nm)+'">'+esc(nm)+"</i>"} // part58: বাম-ওপরের সিলেও একই বক্তার নাম
function lvRow(w,e,inst){
  var m=w.m,k=e[2]||"",nm=rep(e[0]),mine=e[0]==="{me}",d,h,x;
  if(k.indexOf("r")>=0){var l=lastB(m);if(!l)return;var c=l.querySelector(".col"),rx=c.querySelector(".rx");
    if(!rx){rx=document.createElement("span");rx.className="rx";c.appendChild(rx)}rx.textContent+=e[1];l.classList.add("hr");return}
  d=document.createElement("div");d.className="rw"+(inst?" ni":"");
  if(k.indexOf("s")>=0){w.last="";d.innerHTML='<div><div class="sy">'+fmt(e[1])+"</div></div>"}
  else{
    var first=w.last!==nm,tx=rep(e[1]),em=/^[\u2600-\u27BF\u{1F300}-\u{1FAFF}\u200d\ufe0f\s]+$/u.test(tx)&&Array.from(tx.replace(/\s/g,"")).length<=4;
    w.last=nm;d.className+=" b";
    h='<div class="r'+(mine?" mine":"")+'">';
    var nc=NCOL(nm);if(!mine)h+='<i class="av'+(first?"":" z")+'" style="background:'+nc+'">'+esc(Array.from(nm)[0]||"")+"</i>";
    h+='<div class="col">';
    if(!mine&&first)h+='<span class="nm" style="--nc:'+nc+'">'+esc(nm)+"</span>";
    if(e[3])h+='<div class="rqb"><b>'+esc(rep(e[3]))+"</b>"+esc(rep(e[4]))+"</div>";
    h+='<div class="bb'+(em?" e1":"")+(!mine&&tx.indexOf("@"+me)>=0?" mnm":"")+'">'+fmt(e[1])+(em?"":lvSeal2(nm,e)+'<i class="sl'+(NHASH(nm)%2?" o":"")+'" style="--nc:'+nc+'">'+esc(nm)+"</i>")+'<span class="tm">'+hhmm()+"</span></div></div></div>";
    d.innerHTML="<div>"+h+"</div>";
  }
  m.appendChild(d);if(!w.tk)while(m.children.length>16)m.removeChild(m.firstChild);
}
function lvTyping(w,nm){
  var d=document.createElement("div");d.className="rw";
  d.innerHTML='<div><div class="r"><i class="av">'+esc(Array.from(nm)[0]||"")+'</i><div class="col"><div class="bb dots"><span></span><span></span><span></span></div></div></div></div>';
  w.m.appendChild(d);return d;
}
function lvPlace(w,i,e,inst){
  lvRow(w,e,inst);
  if(!inst){lvSnd(i,e);if(e[0]==="{me}"&&w.sd){w.sd.classList.add("on");lvTy.push(setTimeout(function(){w.sd.classList.remove("on")},260))}}
}
var LNM=[NM0.slice(0,12),NM0.slice(12)],OLD=["সুমন","তানিয়া","নাঈম","মিম","রাকিব","ফাহিম","সাদিয়া","আরিফ","রিফাত","নুসরাত","জেসমিন","তামিম"],ORE=new RegExp(OLD.join("|"),"g");
// (পুরোনো দুই-উইন্ডো চ্যাট; এখন ব্যবহার হয় না) নামের বাবল নিচে nbStart() — অ্যাডমিন → 🎞 → 💭 চ্যাটের নাম
function lvMk(i,c){var pool=LNM[i].slice().sort(function(){return Math.random()-.5}),s=c.t+" "+c.ev.map(function(e){return e.join(" ")}).join(" "),f=[],mp={};
  OLD.forEach(function(o){var p=s.indexOf(o);if(p>=0)f.push([p,o])});f.sort(function(a,b){return a[0]-b[0]});
  f.forEach(function(x,k){mp[x[1]]=pool[k%pool.length]});return mp}
function lvMp(w,x){return w.mp?String(x).replace(ORE,function(m){return w.mp[m]||m}):x}
function lvLoad(i,inst){
  var w=LW[i],o=LW[1-i],c,n=0;
  do{c=LS[Math.floor(Math.random()*LS.length)]}while((c===(o&&o.sc)||c===w.sc)&&++n<30);
  var apply=function(){w.sc=c;w.ix=0;w.last="";w.mp=lvMk(i,c);w.m.innerHTML="";w.av.textContent=c.e;w.t.innerHTML=esc(lvMp(w,c.t))+"<small>"+esc(c.s)+"</small>";w.busy=false;w.m.classList.remove("fo")};
  if(inst){apply();return}
  w.busy=true;w.m.classList.add("fo");lvTy.push(setTimeout(apply,240));
}
function lvStep(i,inst){
  var w=LW[i];if(!w||!w.m||w.busy)return;
  if(!w.sc||w.ix>=w.sc.ev.length){lvLoad(i,inst);return}
  var e=w.sc.ev[w.ix++].map(function(x){return lvMp(w,x)}),k=e[2]||"";
  if(!inst&&k.indexOf("t")>=0&&e[0]&&e[0]!=="{me}"){
    var n=lvTyping(w,rep(e[0]));w.busy=true;
    lvTy.push(setTimeout(function(){if(n.parentNode)n.parentNode.removeChild(n);w.busy=false;lvPlace(w,i,e,false)},220));
  }else lvPlace(w,i,e,inst);
}
// ===== পেছনের চ্যাট: হোয়াটসঅ্যাপ-গ্রিন বাবল (ডিজাইন ৬) — প্যানেল/হেডার ছাড়া, শুধু বাবল; দরজার পেছনের দৃশ্য যেমন ছিল তেমনই =====
var AN=["scale(.4);scale(.7) translateY(-30px);scale(1.1)","translateX(calc(var(--d)*80%));translateX(calc(var(--d)*80%))","translateY(40px);translateY(-40px)","scale(.3);scale(1.4);;blur(10px);blur(12px)","perspective(500px) rotateX(80deg);perspective(500px) rotateX(-80deg)","translateY(-90px);translateY(60px);translateY(8px)","rotate(calc(var(--d)*-14deg)) translateY(20px);rotate(calc(var(--d)*14deg)) translateY(-30px)","!0%{opacity:0}4%{opacity:1}8%{opacity:.15}12%{opacity:1}16%{opacity:.4}20%,80%{opacity:1;transform:none}100%{opacity:0;transform:scale(.2)}","scaleX(.1);scaleX(.1);scaleX(1.15)","translateY(60px);translateY(-60px) scale(.9)","translateX(calc(var(--d)*120%)) skewX(calc(var(--d)*-25deg));translateX(calc(var(--d)*-120%)) skewX(calc(var(--d)*25deg))","rotate(-160deg) scale(0);rotate(120deg) scale(0)","scale(.85);scale(.6) translateY(-30px);;brightness(2.2);brightness(2)","!0%{opacity:1;clip-path:inset(0 100% 0 0)}14%,80%{opacity:1;clip-path:inset(0)}100%{opacity:1;clip-path:inset(0 0 0 100%)}","translateY(70px) scale(.5);scale(1.3);translateY(-4px) scale(1.05)","scale(1.9);translateX(calc(var(--d)*140%)) rotate(calc(var(--d)*8deg));scale(.94)"];
function FKF(){var k="@keyframes fadr{to{transform:translateY(-95px)}}";AN.forEach(function(a,i){var p=a.split(";");if(a.charAt(0)==="!"){k+="@keyframes fa"+(i+1)+"{"+a.slice(1)+"}";return}
  k+="@keyframes fa"+(i+1)+"{0%{opacity:0;transform:"+p[0]+(p[3]?";filter:"+p[3]:"")+"}"+(p[2]?"8%{opacity:1;transform:"+p[2]+"}":"")+"14%{opacity:1;transform:none;filter:none}80%{opacity:1;transform:none;filter:none}100%{opacity:0;transform:"+p[1]+(p[4]?";filter:"+p[4]:"")+"}}"});return k}
var FP=null,FI=0,FU={},FLast=0,FC=["#53bdeb","#ffb347","#e67cff","#7be495","#ff7a7a","#f7d154"],SL=[6,26,46,66];
// ===== দরজার পেছনে প্রশ্ন–উত্তর বাবল (পুরো স্ক্রিন জুড়ে, ঘোরাঘুরিসহ) =====
// নিয়ম: স্বাগতম বোর্ড/বিভাগের নাম/সাইন-এর জায়গা সবসময় খালি; সবসময় ৪টা (নাম বেশি হলে আরও) বড়; বাকিরা ফাঁকে ফাঁকে ছোট; প্রতিটা নাম কমপক্ষে ৩ বার;
// প্রতিটা বাবল: আসে (pop/fade/slide) → ১–২ সেকেন্ড ওপরের দিকে ভেসে ডানে-বামে ঘোরে → নিজের বিদায়-এনিমেশনে সরে মিলায়। প্রশ্ন ও উত্তর একসাথে মিলায়।
var NBU=[],ND=6,NBPV=false; // NBPV = অ্যাডমিনের বাবল-প্রিভিউ (দরজা বন্ধ): সাইন/বোর্ডের জোন পুরো সময় খালি রাখা
var NBA=[["scale(.4)","scale(.6)"],["translateY(18px)","translateY(-18px)"],["translateX(-22px)","translateX(22px)"],["translateX(22px)","translateX(-22px)"],["scale(1.6)","scale(.5)","blur(8px)","blur(6px)"],["rotate(-12deg) scale(.5)","rotate(12deg) scale(.6)"],["perspective(400px) rotateX(70deg)","perspective(400px) rotateX(-70deg)"],["translateY(-22px)","translateY(22px)"],["rotate(160deg) scale(.1)","rotate(-90deg) scale(.1)"],["skewX(30deg) translateX(-18px)","skewX(-30deg) translateX(18px)"],["scale(0)","scale(.3)","","",1],["none","none"]];
var NC=["","#53bdeb","#7be495","#ffe27a","#ffe27a","#7a4a00","#fff2a8","#9ffcff","#c2410c"];
var NBC="#fgate #nbl{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;pointer-events:none;z-index:6}#fgate .nbw{position:absolute;left:0;top:0;pointer-events:none;will-change:transform}#fgate .nb{position:relative;padding:.34em .8em .44em;border-radius:.8em;line-height:1.3;font-weight:700;opacity:0;text-align:left;overflow-wrap:anywhere;font-family:\"Anek Bangla\",\"Hind Siliguri\",sans-serif;box-shadow:0 1px 2px #0009,0 4px 12px #0006}#fgate .nb b{display:block;font-size:.76em;font-weight:800;line-height:1.15}#fgate .nb span{display:block}#fgate .nb .mn{font-weight:800;text-decoration:underline;text-underline-offset:2px}#fgate .nb.big{font-weight:800}"+
"#fgate .nb.d1{background:#202c33;color:#e9edef;border-radius:.8em .8em .8em .15em}#fgate .nb.d2{background:#005c4b;color:#e9fff6;border-radius:.8em .8em .15em .8em}#fgate .nb.d3{background:linear-gradient(135deg,#0a84ff,#0a5cff);color:#fff;border-radius:1.2em}#fgate .nb.d4{background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}#fgate .nb.d5{background:#ffd54a;color:#3a2a00;border-radius:.3em}#fgate .nb.d6{background:linear-gradient(135deg,#ff5fae,#b05ad8);color:#fff;border-radius:1.2em 1.2em 1.2em .2em}#fgate .nb.d7{background:rgba(5,10,30,.55);color:#c9fffb;border:2px solid #35f3ff;text-shadow:0 0 6px #35f3ff;box-shadow:0 0 10px #35f3ff99}#fgate .nb.d8{background:#fff;color:#10261b;border-radius:1.1em .3em 1.1em .3em}";
function nbNames(){return CFG&&CFG.names&&CFG.names.length?CFG.names:[]}
function nbLayer(){var l=$("#nbl");if(!l&&R){l=document.createElement("div");l.id="nbl";R.appendChild(l)}return l}
function nbFmt(x){return esc(String(x).replace(/\{নাম\}/g,me)).replace(/@([^\s,।!?]+)/g,function(m){return '<span class="mn">'+m+"</span>"})}
function nbHit(a,b,m){return a.x<b.x+b.w+m&&a.x+a.w+m>b.x&&a.y<b.y+b.h+m&&a.y+a.h+m>b.y}
// নিষিদ্ধ জোন: স্বাগতম বোর্ড (খুঁটিসহ), স্বাগতম লেখা, ছবির বিভাগের নাম, সাইন — সবই লেয়ারের মাপে; দরজার ছোট-বড় হওয়ার (xp) আগের ও পরের দুই অবস্থানই ধরা হয়
function nbZones(ov){
  var z=[],lr=ov.getBoundingClientRect(),dw=$("#dw"),bd=$("#bd"),rw=$("#rw"),sg=$("#sg"),dr=D?D.getBoundingClientRect():null,cur,fin,fac;
  var add=function(x,y,w,h,m,tg){if(w>0&&h>0)z.push({x:x-lr.left-m,y:y-lr.top-m,w:w+2*m,h:h+2*m,tg:tg||0})};
  if(dw&&D&&dr){
    cur=dw.getBoundingClientRect();fac=D.classList.contains("fac");fin=fac&&dr.width>0?{left:dr.left+dr.width*.02,top:dr.top+dr.height*.27,width:dr.width*.96,height:dr.height*.73}:cur;
    var wb=$("#wlw");if(wb){cur=wb.getBoundingClientRect();fin=cur} // part60: স্বাগতম লেখা এখন #wlw-তে (চূড়ান্ত মাপে), তাই সেটাই রেফারেন্স
    [cur].concat(fin===cur?[]:[fin]).forEach(function(r){var tg=r===cur&&fin!==cur?2:0; // 2 = দরজা বড় হওয়ার (xp) আগের অবস্থান: শুধু প্রথম ~২.৭ সেকেন্ড
      var kx=r.width/(cur.width||1),ky=r.height/(cur.height||1),bw,bh,q;
      if(bd){bw=bd.offsetWidth*kx;bh=bd.offsetHeight*kx;add(r.left+r.width/2-bw/2,r.top+r.height/2-bh/2-r.height*.1,bw,bh+r.height*.1,10,tg)}
      if(rw){q=rw.getBoundingClientRect();add(r.left+(q.left-cur.left)*kx,r.top+(q.top-cur.top)*ky,q.width*kx,q.height*ky,8,tg)}
    });
    if(fac)add(dr.left+dr.width*.17,dr.top+dr.height*.105,dr.width*.66,dr.height*.165,6); // ছবির "রাষ্ট্রবিজ্ঞান বিভাগ" লেখা
  }
  if(sg){try{if(+getComputedStyle(sg).opacity>.06){var s=sg.getBoundingClientRect();add(s.left,s.top,s.width,s.height,4,1)}}catch(e){}}
  return z;
}
function nbGeo(){var ov=nbLayer();if(!ov)return null;var W=ov.clientWidth,H=ov.clientHeight;if(W<40||H<40)return null;return{ov:ov,W:W,H:H,Z:nbZones(ov)}}
function nbZhit(r,Z,m){for(var i=0;i<Z.length;i++)if(nbHit(r,Z[i],m))return true;return false}
function nbAn(){if(CFG.fa>0)return((CFG.fa-1)%NBA.length)+1;return Math.random()<.4?11:1+Math.floor(Math.random()*NBA.length)} // ৪০% "ঠাস" pop
// ঘোরার পথ: ৩–৪ ধাপ, ডানে-বামে জিগজ্যাগ, মোটের ওপর ওপরের দিকে; জোন/স্ক্রিনের বাইরে গেলে ধাপ বদলায়
function nbPlan(g,x,y,w,h,amp){
  var pts=[{x:0,y:0}],n=amp>0?3+Math.floor(Math.random()*2):0,cx=x,cy=y,sgn=Math.random()<.5?-1:1,i,t,nx,ny,dx,dy,ok,r,last=sgn,X0=x,Y0=y,X1=x,Y1=y,ex=0,ey=0;
  var clx=function(v){return Math.max(3,Math.min(g.W-w-3,v))},cly=function(v){return Math.max(3,Math.min(g.H-h-3,v))};
  for(i=0;i<n;i++){
    ok=false;
    for(t=0;t<6&&!ok;t++){
      dx=sgn*(.08+Math.random()*.12)*g.W*amp*(t>3?.5:1);dy=-(.025+Math.random()*.05)*g.H*amp+(Math.random()-.5)*.03*g.H*amp;if(t&&t%2)dx=-dx;if(t>2)dy*=.5;
      nx=clx(cx+dx);ny=cly(cy+dy);
      r={x:nx,y:ny,w:w,h:h};ok=!nbZhit(r,g.Z,3)&&!nbZhit({x:(nx+cx)/2,y:(ny+cy)/2,w:w,h:h},g.Z,3);
    }
    if(ok){last=nx>=cx?1:-1;cx=nx;cy=ny}
    pts.push({x:cx-x,y:cy-y});if(Math.random()<.6)sgn=-sgn;
    X0=Math.min(X0,cx);Y0=Math.min(Y0,cy);X1=Math.max(X1,cx);Y1=Math.max(Y1,cy);
  }
  if(amp>0){ex=clx(cx+last*.05*g.W)-x;ey=cly(cy-.04*g.H)-y;r={x:x+ex,y:y+ey,w:w,h:h};if(nbZhit(r,g.Z,3)){ex=cx-x;ey=cy-y}
    X0=Math.min(X0,x+ex);Y0=Math.min(Y0,y+ey);X1=Math.max(X1,x+ex);Y1=Math.max(Y1,y+ey)}
  return{pts:pts,ex:ex,ey:ey,bb:{x:X0,y:Y0,w:X1-X0+w,h:Y1-Y0+h}};
}
// কোনো মুহূর্তে (t, ms) বাবলের জায়গা — পরিকল্পিত পথ ধরে (সরল রেখায় আনুমানিক)
function nbAt(o,t){
  var p=(t-o.ts)/(o.life*1000),eF=o.E/o.life,xF=1-o.X/o.life,n=o.pl.pts.length-1,dx=0,dy=0,f,i,a,b;
  if(p<=eF||n===0&&p<xF){dx=0;dy=0}
  else if(p<xF){f=(p-eF)/(xF-eF)*n;i=Math.min(n-1,Math.floor(f));f-=i;a=o.pl.pts[i];b=o.pl.pts[i+1];dx=a.x+(b.x-a.x)*f;dy=a.y+(b.y-a.y)*f}
  else{a=n?o.pl.pts[n]:{x:0,y:0};f=Math.min(1,(p-xF)/(1-xF));dx=a.x+(o.pl.ex-a.x)*f;dy=a.y+(o.pl.ey-a.y)*f}
  return{x:o.x+dx,y:o.y+dy,w:o.w,h:o.h};
}
function nbWin(o){return[o.ts+o.E*400,o.u-o.X*650]}
function nbClashWith(c,o,m){var a=nbWin(c),b=nbWin(o),t,s=Math.max(a[0],b[0]),e=Math.min(a[1],b[1]);if(e<s)return false;for(t=s;t<e;t+=140)if(nbHit(nbAt(c,t),nbAt(o,t),m))return true;return nbHit(nbAt(c,e),nbAt(o,e),m)}
function nbClash(c,now,big,m){ // c = প্রার্থী বাবল (ts,life,pl,x,y,w,h); অন্যদের সাথে সময় ধরে মিলিয়ে দেখে (বড় হলে শুধু অন্য বড়দের সাথে)
  var k,o;for(k=0;k<NBU.length;k++){o=NBU[k];if(o.u<=now||(big&&!o.b))continue;if(nbClashWith(c,o,m))return o}
  return null;
}
function nbMove(wr,pl,life,E,X,hop,delay){
  var L=life,eF=E/L,xF=1-X/L,n=pl.pts.length-1,k=[],T=function(a,b,c){return"translate("+a.toFixed(1)+"px,"+b.toFixed(1)+"px) rotate("+(c||0)+"deg)"},i,a,b,t0,t1;
  k.push({offset:0,transform:T(0,0)});k.push({offset:eF,transform:T(0,0)});
  for(i=1;i<=n;i++){a=pl.pts[i-1];b=pl.pts[i];t0=eF+(xF-eF)*(i-1)/n;t1=eF+(xF-eF)*i/n;
    k.push({offset:(t0+t1)/2,transform:T((a.x+b.x)/2,(a.y+b.y)/2-hop,0),easing:"ease-in"});
    k.push({offset:t1,transform:T(b.x,b.y,(b.x>=a.x?1:-1)*3),easing:"ease-out"})}
  k.push({offset:1,transform:T(pl.ex,pl.ey,(pl.ex>=0?1:-1)*5),easing:"ease-in"});
  if(n===0){k=[{offset:0,transform:T(0,0)},{offset:1,transform:T(pl.ex,pl.ey)}]}
  return wr.animate(k,{duration:L*1000,delay:(delay||0)*1000,fill:"both",easing:"linear"});
}
function nbShow(e,an,life,E,X,delay){
  var a=NBA[an-1],L=life,eF=E/L,xF=1-X/L,f=!!a[2],k=[{offset:0,opacity:0,transform:a[0]},{offset:eF,opacity:1,transform:"none"},{offset:xF,opacity:1,transform:"none"},{offset:1,opacity:0,transform:a[1]}];
  if(f){k[0].filter=a[2];k[1].filter="none";k[2].filter="none";k[3].filter=a[3]||a[2]}
  if(a[4])k.splice(1,0,{offset:eF*.6,opacity:1,transform:"scale(1.25)"});
  return e.animate(k,{duration:L*1000,delay:(delay||0)*1000,fill:"both",easing:"linear"});
}
// একটা বাবল: নাম + মেসেজ। life = আসা(E) + ঘোরা + বিদায়(X) সেকেন্ড
function nbSpawn(name,msg,big,life,E,X,fs,delay){
  var g0=nbGeo();if(!g0)return null;delay=delay||0;var gAll=g0.Z,g=g0;
  var zf=function(dl){return gAll.filter(function(z){return NBPV||z.tg===0||(z.tg===1&&dl<1)||(z.tg===2&&dl<2.7)})};g.Z=zf(delay);
  var wr=document.createElement("div"),e=document.createElement("div"),d=1+Math.floor(Math.random()*8),an=nbAn(),now=Date.now(),FS=[1,.88,.77,.68,.58],TR=[[1,0],[1,1],[.6,1],[.6,2],[.3,2],[0,3],[0,4]],TRr=[[.6,1],[0,2],[0,3]],i,k,r,w,h,pos=null,pl,cand,cs=-1,s,lo=Math.max(10,g.W*.025),rm=false,pass,ti,dd;
  try{rm=!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)}catch(_){}
  if(!CFG.wnd||rm||!wr.animate){TR=[[0,0],[0,1],[0,2],[0,3],[0,4]];TRr=[[0,2],[0,3]]}
  wr.className="nbw";wr.style.visibility="hidden";wr.style.zIndex=big?3:1;e.className="nb d"+d+(big?" big":"");
  e.innerHTML='<b style="color:'+NC[d]+'">'+esc(name)+"</b>"+(msg?"<span>"+nbFmt(msg)+"</span>":"");wr.appendChild(e);g.ov.appendChild(wr);
  var fit=function(sc){if(sc!==cs){cs=sc;e.style.fontSize=(fs*sc).toFixed(1)+"px";e.style.maxWidth=Math.min(g.W*(big?.6:.5),fs*sc*(big?14:12))+"px";w=wr.offsetWidth;h=wr.offsetHeight}};
  var place=function(dl,list,n,bigOnly){ // একটা নির্দিষ্ট শুরুর সময়ে জায়গা খোঁজা
    var t,i,r,o,ts=now+dl*1000;g.Z=zf(dl);
    for(t=0;t<list.length;t++){
      if(big&&list[t][1]>2)continue;fit(FS[list[t][1]]);
      for(i=0;i<n;i++){
        r={x:lo+Math.random()*Math.max(1,g.W-w-2*lo),y:lo+Math.random()*Math.max(1,g.H-h-2*lo),w:w,h:h};
        if(nbZhit(r,g.Z,3))continue;
        pl=nbPlan(g,r.x,r.y,w,h,list[t][0]);o={ts:ts,u:ts+life*1000,life:life,E:E,X:X,pl:pl,x:r.x,y:r.y,w:w,h:h};
        if(!nbClash(o,now,bigOnly,4))return{x:r.x,y:r.y,pl:pl,o:o};
      }
    }
    return null;
  };
  pos=place(delay,TR,90,false);
  if(!pos&&big)pos=place(delay,TR,90,true); // বড়: জায়গা না মিললে শুধু অন্য বড়দের সাথে মিলিয়ে, ছোটদের সরিয়ে
  if(!pos&&!big){for(dd=.4;dd<=2.4&&!pos;dd+=.4){if(delay+dd+life>ND+.6)break;pos=place(delay+dd,TRr,40,false);if(pos)delay+=dd}} // ছোট: ভিড় থাকলে একটু পরে আসে
  if(!pos){ // তবু না মিললে: সবচেয়ে ছোট করে, জোনের বাইরে যেকোনো ফাঁকা জায়গায় (ঘোরা ছাড়া)
    fit(FS[4]);
    for(i=0;i<60&&!pos;i++){r={x:lo+Math.random()*Math.max(1,g.W-w-2*lo),y:lo+Math.random()*Math.max(1,g.H-h-2*lo),w:w,h:h};if(!nbZhit(r,g.Z,3)){pl=nbPlan(g,r.x,r.y,w,h,0);pos={x:r.x,y:r.y,pl:pl,o:{ts:now+delay*1000,u:now+(delay+life)*1000,life:life,E:E,X:X,pl:pl,x:r.x,y:r.y,w:w,h:h}}}}
  }
  if(!pos||!wr.animate){if(wr.parentNode)wr.parentNode.removeChild(wr);return null}
  if(big)NBU.forEach(function(u){if(!u.b&&u.u>now&&nbClashWith(pos.o,u,0)){u.u=0;if(u.el){u.el.style.transition="opacity .25s";u.el.style.opacity="0"}}});
  NBU=NBU.filter(function(u){return u.u>now});
  pos.o.b=!!big;pos.o.el=wr;NBU.push(pos.o);
  wr.style.left=pos.x+"px";wr.style.top=pos.y+"px";wr.style.visibility="visible";
  try{nbMove(wr,pos.pl,life,E,X,Math.max(3,fs*.35),delay);nbShow(e,an,life,E,X,delay)}catch(_){e.style.opacity="1"}
  lvTy.push(setTimeout(function(){if(wr.parentNode)wr.parentNode.removeChild(wr)},(delay+life)*1000+300));
  return wr;
}
function nbStart(){
  var nm=nbNames().slice(),N=nm.length,qa=CFG.qa&&CFG.qa.length?CFG.qa:null,t0=Date.now(),nl=nbLayer();NBU=[];if(!N||!nl)return;
  var shuf=function(a){return a.slice().sort(function(){return Math.random()-.5})},rnd=function(a,b){return a+Math.random()*(b-a)};
  var dur=Math.max(1.4,ND),sc=Math.max(.7,Math.min(1,dur/7)),E=.32,X=.42,tight=dur<6;
  var wmin=Math.max(.5,+CFG.wmin||1),wmax=Math.max(wmin,+CFG.wmax||2);
  var wB=[Math.max(.75,wmin+(wmax-wmin)*.4)*sc,Math.max(.8,wmax)*sc],wS=[Math.max(.75,wmin)*sc,Math.max(.8,wmin+(wmax-wmin)*.6)*sc];
  var gapOf=function(){return tight?rnd(.4,.65):rnd(.6,1.2)},wOf=function(r){return Math.max(.75,rnd(r[0],r[1]))};
  var deck=[],di=0,pick=function(){if(!qa)return null;if(di>=deck.length){deck=shuf(qa.map(function(_,i){return i}));di=0}return qa[deck[di++]]};
  // কতজন একসাথে বড়: নাম বেশি/সময় কম হলে আরও (জোড়া, তাই জোড় সংখ্যা)
  var laNom=E+(wB[0]+wB[1])/2+X,lqNom=laNom+(tight?.52:.9),Gmax=Math.max(1,Math.floor((dur+.4-lqNom)/laNom)+1);
  var Bn=Math.min(12,Math.max(4,Math.ceil(N/Gmax)));if(Bn%2)Bn++;Bn=Math.min(Bn,Math.max(2,N%2?N+1:N));if(Bn<2)Bn=2;
  var G=Math.ceil(N/Bn),Bp=Bn/2,ord=shuf(nm),bi=0,stepMs=laNom*1000;if(G>1)stepMs=Math.max(400,Math.min(stepMs,(dur*1000+500-lqNom*1000)/(G-1))); // সময় কম হলে ঢেউ কাছাকাছি, যাতে সব বড় গেইট যাওয়ার আগে ১–২ সেকেন্ড থাকে
  var fbOf=function(g){var fb=Math.max(10,Math.min(16,g.W*.041,g.H*.045));return Bn>4?Math.max(9,fb*Math.sqrt(4/Bn)):fb};
  var avgLen=qa?qa.reduce(function(a,p){return a+Math.min(60,(p.q.length+p.a.length)/2)},0)/qa.length:0;
  var fsSmall=function(g){var K=Math.ceil(3*N/2),Cs=Math.min(2*K,Math.ceil(2*K*(E+(wS[0]+wS[1])/2+X)/dur)),nameW=Array.from(nm.join(" ")).length/N,ch=Math.min(18,Math.max(nameW,avgLen)),lines=1+(avgLen?Math.ceil(avgLen/18):0),zA=0,fs,a,free;
    g.Z.forEach(function(z){zA+=z.w*z.h});free=g.W*g.H-Math.min(zA,g.W*g.H*.6)-Bn*(g.W*.3*fbOf(g)*3);
    for(fs=Math.min(fbOf(g)*.72,13);fs>6.5;fs-=.5){a=(ch*.6+1.8)*fs*(fs*(.9+1.3*lines));if(Cs*a*1.5<=free)break}return Math.max(6.5,fs)};
  // সব বাবলের জায়গা ও পথ শুরুতেই ঠিক হয় (আগে বড়, পরে ছোট) — প্রতিটার নিজের সময় (delay) আছে, তাই একে অন্যের পথে পড়ে না
  var pair=function(a,b,big,fs,delay){
    var p=pick(),gap=gapOf(),Wa=wOf(big?wB:wS),La=E+Wa+X,Lq=gap+La;
    nbSpawn(a,p?p.q:"",big,Lq,E,X,fs,delay);
    nbSpawn(b,p?p.a:"",big,La,E,X,fs,delay+gap);
  };
  var g0=nbGeo();if(!g0)return;
  var k=0,fb=fbOf(g0),j,a,b,idx,wd;
  while(k<30&&(k*stepMs<dur*1000+400-lqNom*1000||bi<N)){
    wd=k*stepMs/1000;
    for(j=0;j<Bp;j++){idx=bi+2*j;a=ord[idx%N];b=ord[(idx+1)%N];if(a===b&&N>1)b=ord[(idx+2)%N];pair(a,b,true,fb,wd+j*.09)}
    bi+=Bn;k++;
    (function(w,i){lvTy.push(setTimeout(function(){fragSnd(i%2?"l":"r",false)},Math.max(0,w*1000)))})(wd,k);
  }
  // ছোট জোড়া: প্রতিটা নাম কমপক্ষে ৩ বার (৩ রাউন্ড), পুরো সময়ে সমানভাবে ছড়ানো
  var S=[],r;for(r=0;r<3;r++)S=S.concat(shuf(nm));
  var K=Math.ceil(S.length/2),span=Math.max(.5,dur-(E+(wS[0]+wS[1])/2+X+.5)),fs0=fsSmall(g0);
  for(j=0;j<K;j++){
    a=S[2*j];b=S[2*j+1]!==undefined?S[2*j+1]:nm[Math.floor(Math.random()*N)];
    if(a===b&&N>1)b=nm[(nm.indexOf(a)+1+Math.floor(Math.random()*(N-1)))%N];
    pair(a,b,false,fs0,span*(j+Math.random()*.9)/K);
  }
}
// ===== দরজার ভেতরের চ্যাট স্ক্রিন (প্রিভিউ-ফাইলের মতো দুই উইন্ডো) — অ্যাডমিনের নাম ও প্রশ্ন–উত্তরের লেখা এখানে বাবল হয়ে আসে, শব্দসহ =====
var LQ=[[],[]],LK=0,LND=[],LQD=[],LUN=0,LRS=0,LSN=0,LSEEN=[],LT0=0,LDUR=0,LDONE=false,SEENM=[],GAPMIN=900,SPD=[1500,1000,600,250],LREP=false;
function lvShuf(a){return a.slice().sort(function(){return Math.random()-.5})}
function lvMe(x){return String(x).replace(/\{নাম\}/g,function(){return me})}
// প্রতিটা নাম এক ভিজিটে একবারই; যারা বাদ পড়ে তারা পরের ভিজিটে আগে আসে (দেখা-হওয়া নামের তালিকা: আসল সাইটে localStorage "fa_door_seen", প্রিভিউতে মেমরিতে)
function seenGet(){if(hostMode)return SEENM.slice();try{var a=JSON.parse(localStorage.getItem("fa_door_seen")||"[]");return Array.isArray(a)?a:[]}catch(e){return []}}
function seenSet(a){a=a.slice(-80);if(hostMode){SEENM=a;return}try{localStorage.setItem("fa_door_seen",JSON.stringify(a))}catch(e){}}
function lvDeck(){var all=nbNames().filter(function(x){return x!==me}),sn,un;if(!all.length)all=["বন্ধু"];sn=seenGet().filter(function(x){return all.indexOf(x)>=0});un=all.filter(function(x){return sn.indexOf(x)<0});if(!un.length){sn=[];un=all.slice()}LSEEN=sn.slice();LUN=un.length;LRS=0;LSN=0;LREP=false;return lvShuf(sn).concat(lvShuf(un))}
function lvName(){if(!LND.length){LND=lvShuf(nbNames().filter(function(x){return x!==me}));if(!LND.length)LND=["বন্ধু"];LREP=true}var n=LND.pop();LSN++;if(LREP)return n;if(LUN>0)LUN--;else if(!LRS){LSEEN=[];LRS=1}LSEEN.push(n);seenSet(LSEEN);return n} // part57: সব গতিতে নাম ফুরোলে আবার প্রথম থেকে ঘুরে আসে — চ্যাট কখনো থামে না (এক নাম একাধিকবারও আসতে পারে)
function lvQA(){var qa=CFG.qa&&CFG.qa.length?CFG.qa:NQ0;if(!LQD.length)LQD=lvShuf(qa.map(function(_,i){return i}));return qa[LQD.pop()]}
// একটা প্রশ্ন + তার উত্তর (উত্তরে প্রশ্নের উদ্ধৃতি); প্রশ্নে {নাম} থাকলে উত্তর দেয় যে ঢুকছে সে (নীল বাবল)
function lvTurn(i){var ak=lvName(),p,toMe,q,a,an;if(!ak)return false;p=lvQA();toMe=/\{নাম\}/.test(p.q);q=lvMe(p.q);a=lvMe(p.a);an=toMe?"{me}":lvName();LQ[i].push([ak,q,"t"]);if(an)LQ[i].push([an,a,toMe?"":"t",ak,q]);return true}
function lvHead(i){var w=LW[i],n=nbNames().length+1;w.av.textContent=i?"📚":"💬";w.t.innerHTML=esc(i?CFG.lt2:CFG.lt1)+"<small>"+esc(bn(n)+" জন অনলাইন")+"</small>"}
function lvNext(){
  var i=LK,w=LW[i],e,k,L,j;if(!w||!w.m)return 0;
  if(w.busy){i=1-i;w=LW[i];if(!w||!w.m||w.busy)return 0}
  if(!LQ[i].length&&!lvTurn(i)){j=1-i;if(!LQ[j].length)return -1;i=j;w=LW[i];if(!w||!w.m||w.busy)return 0}
  e=LQ[i].shift();k=e[2]||"";L=String(e[1]).length;
  if(k.indexOf("t")>=0&&e[0]&&e[0]!=="{me}"){var n=lvTyping(w,rep(e[0]));w.busy=true;lvTy.push(setTimeout(function(){if(n.parentNode)n.parentNode.removeChild(n);w.busy=false;lvPlace(w,i,e,false)},320))}
  else lvPlace(w,i,e,false);
  return L;
}
function lvBuild(){
  lvStop();var lv=$("#lv");if(!lv)return;lvScale();if(!rzOn){rzOn=true;window.addEventListener("resize",onRz)}
  var h="",q;for(q=0;q<2;q++)h+='<div class="lr"><div class="lh"><i class="lav"></i><b class="lt"></b><span class="li">📞 📹</span></div><div class="lm"><div class="tk"></div></div><div class="ac"><i>মেসেজ লিখুন…</i><u>➤</u></div></div>';
  lv.innerHTML=h;LND=lvDeck();LQD=[];LQ=[[],[]];LK=0;LDONE=false;
  [].forEach.call(lv.children,function(el,i){LW[i]={el:el,vp:el.querySelector(".lm"),m:el.querySelector(".tk"),tk:1,y:0,dry:false,av:el.querySelector(".lav"),t:el.querySelector(".lt"),sd:el.querySelector(".ac u"),last:"",busy:false};lvHead(i)});
  lvFill();
}
// part56: লাগাতার ওপরে-স্লাইডিং চ্যাট — দুই উইন্ডো একসাথে; শুরুতেই পুরো পেজ মেসেজে ভর্তি, তারপর নিচ থেকে নতুন মেসেজ উঠে ওপর দিয়ে বেরিয়ে যায়, থামে না।
var LRAF=0,LPT=0;
function lvNextW(i,inst){
  var w=LW[i],e,k,n;if(!w||!w.m||w.busy)return 0;
  if(!LQ[i].length&&!lvTurn(i))return -1;
  e=LQ[i].shift();k=e[2]||"";
  if(!inst&&k.indexOf("t")>=0&&e[0]&&e[0]!=="{me}"){n=lvTyping(w,rep(e[0]));w.busy=true;lvTy.push(setTimeout(function(){if(n.parentNode)n.parentNode.removeChild(n);w.busy=false;lvPlace(w,i,e,false)},320))}
  else lvPlace(w,i,e,inst);
  return 1;
}
function lvFill(){ // এক ঝটকায় (এনিমেশন/শব্দ ছাড়া) উইন্ডো ভরে দেয়
  var i,w,vh,g;
  for(i=0;i<2;i++){w=LW[i];if(!w||!w.tk||!w.vp)continue;vh=w.vp.clientHeight;if(!vh)continue;g=0;
    while(g++<60&&w.m.offsetTop+w.m.offsetHeight<vh*1.08){if(lvNextW(i,true)<0){w.dry=true;break}}}
}
function lvTick(ts){
  LRAF=requestAnimationFrame(lvTick);
  var dt=LPT?Math.min(.1,(ts-LPT)/1000):0,i,w,vh,c,nx,base=+CFG.gap>0?+CFG.gap:(SPD[Math.round(CFG.spd)]||1000);LPT=ts;
  for(i=0;i<2;i++){w=LW[i];if(!w||!w.tk||!w.vp)continue;vh=w.vp.clientHeight;if(!vh)continue;
    if(!w.pf){w.pf=1;lvFill()}
    if(!w.dry||w.m.offsetTop+w.m.offsetHeight+w.y>vh+2)w.y-=(LF?Math.min(vh,LF*110):vh)*90/base*dt; // গতি = উইন্ডোর উচ্চতার অনুপাতে (cspd/গতি-অপশন মেনে)
    while((c=w.m.firstChild)&&(nx=c.nextSibling)&&c.offsetTop+c.offsetHeight+w.y<-6){w.y+=nx.offsetTop;w.m.removeChild(c)}
    if(w.y>0)w.y=0;
    w.m.style.transform="translateY("+w.y.toFixed(2)+"px)";
    if(!w.busy&&!w.dry&&w.m.offsetTop+w.m.offsetHeight+w.y<=vh-2&&lvNextW(i,false)<0)w.dry=true;
  }
  LDONE=!!(LW[0]&&LW[1]&&LW[0].dry&&LW[1].dry);
}
function lvStop(){if(LRAF)cancelAnimationFrame(LRAF);LRAF=0;LPT=0;lvTy.forEach(clearTimeout);lvTy=[]}
function lvStart(){lvStop();LT0=Date.now();LDUR=Math.max(1.4,ND)*1000;LDONE=false;lvFill();LRAF=requestAnimationFrame(lvTick)}

  // ===== শব্দ =====
function A(){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state!=="running")AC.resume()}catch(e){AC=null}return AC}
// শব্দ না আসার কারণ: ব্রাউজার ইউজার-ট্যাপ ছাড়া শব্দ চালু করতে দেয় না, আর আগে প্রতিবার শব্দের যন্ত্র নতুন বানিয়ে বন্ধ করা হতো। এখন পেজের প্রথম যেকোনো ট্যাপ/ক্লিকেই শব্দের যন্ত্র চালু হয়ে থাকে, আর বন্ধ হয় না।
function prime(){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state!=="running")AC.resume()}catch(e){}}
["pointerdown","touchstart","touchend","mousedown","keydown","click"].forEach(function(ev){try{document.addEventListener(ev,prime,{capture:true,passive:true})}catch(e){}});
function sndUser(){try{return localStorage.getItem("fa_gate_snd")!=="0"}catch(e){return true}}
function sndOk(){return !!CFG&&!!CFG.sound&&(hostMode||sndUser())}
function sndVol(){return Math.max(.5,Math.min(5,(+(CFG&&CFG.vol)||250)/100))}
var CB=null;function newMG(){try{if(MG)MG.disconnect()}catch(e){}try{if(CB)CB.disconnect()}catch(e){}MG=null;CB=null;if(AC){try{var g=AC.createGain(),c=AC.createDynamicsCompressor?AC.createDynamicsCompressor():null;g.gain.value=sndVol();if(c){c.threshold.value=-14;c.knee.value=12;c.ratio.value=8;c.attack.value=.003;c.release.value=.2;var lm=AC.createDynamicsCompressor();lm.threshold.value=-3;lm.knee.value=0;lm.ratio.value=20;lm.attack.value=.001;lm.release.value=.08;g.connect(c);c.connect(lm);lm.connect(AC.destination)}else g.connect(AC.destination);MG=g}catch(e){MG=null}try{var cg=AC.createGain(),cc=AC.createDynamicsCompressor?AC.createDynamicsCompressor():null,cm=AC.createGain(),cl=AC.createDynamicsCompressor?AC.createDynamicsCompressor():null;cg.gain.value=1;cm.gain.value=1.7;if(cc&&cl){cc.threshold.value=-8;cc.knee.value=6;cc.ratio.value=10;cc.attack.value=.002;cc.release.value=.15;cl.threshold.value=-1.5;cl.knee.value=0;cl.ratio.value=20;cl.attack.value=.001;cl.release.value=.08;cg.connect(cc);cc.connect(cm);cm.connect(cl);cl.connect(AC.destination)}else{cg.connect(AC.destination)}CB=cg}catch(e){CB=null}}} // শব্দের জোর = অ্যাডমিনের vol% + কম্প্রেসর (ফেটে না যাওয়ার জন্য)
function nz(t,d,f,g,ty){var a=AC,n=a.sampleRate*d|0,b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0),i;for(i=0;i<n;i++)x[i]=Math.random()*2-1;var s=a.createBufferSource(),fl=a.createBiquadFilter(),ga=a.createGain();s.buffer=b;fl.type=ty||"lowpass";fl.frequency.value=f;ga.gain.setValueAtTime(g,t);ga.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(fl);fl.connect(ga);ga.connect((MG||a.destination));s.start(t)}
function tn(t,d,f0,f1,g,ty){var a=AC,o=a.createOscillator(),ga=a.createGain();o.type=ty||"sine";o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+d);ga.gain.setValueAtTime(g,t);ga.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(ga);ga.connect((MG||a.destination));o.start(t);o.stop(t+d+.05)}
function creak(t,d){var a=AC,o=a.createOscillator(),l=a.createOscillator(),lg=a.createGain(),f=a.createBiquadFilter(),ga=a.createGain();o.type="sawtooth";o.frequency.setValueAtTime(70,t);o.frequency.linearRampToValueAtTime(150,t+d*.5);o.frequency.linearRampToValueAtTime(95,t+d);l.frequency.value=23;lg.gain.value=22;l.connect(lg);lg.connect(o.frequency);f.type="bandpass";f.Q.value=6;f.frequency.setValueAtTime(500,t);f.frequency.linearRampToValueAtTime(1300,t+d*.6);f.frequency.linearRampToValueAtTime(700,t+d);ga.gain.setValueAtTime(0,t);ga.gain.linearRampToValueAtTime(.5,t+.25);ga.gain.setValueAtTime(.5,t+d-.4);ga.gain.linearRampToValueAtTime(0,t+d);o.connect(f);f.connect(ga);ga.connect((MG||a.destination));o.start(t);l.start(t);o.stop(t+d);l.stop(t+d)}
function pnd(p){var a=AC;if(a.createStereoPanner){var s=a.createStereoPanner();s.pan.value=p;s.connect(MG||a.destination);return s}return MG||a.destination}
function thas(t,p){var a=AC,d=pnd(p),n=a.sampleRate*.09|0,b=a.createBuffer(1,n,a.sampleRate),x=b.getChannelData(0),i;for(i=0;i<n;i++)x[i]=(Math.random()*2-1)*(1-i/n);
  var s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),o=a.createOscillator(),og=a.createGain();s.buffer=b;f.type="bandpass";f.frequency.value=1800;f.Q.value=.8;g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);s.connect(f);f.connect(g);g.connect(d);s.start(t);
  o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(70,t+.12);og.gain.setValueAtTime(.7,t);og.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(og);og.connect(d);o.start(t);o.stop(t+.16)}
function tung(t,f,p){var a=AC,d=pnd(p);[1,2.01,3.02].forEach(function(m,k){var o=a.createOscillator(),g=a.createGain();o.frequency.value=f*m;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime([.3,.12,.05][k],t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+.55-k*.12);o.connect(g);g.connect(d);o.start(t);o.stop(t+.6)})}
function fragSnd(side,mine){if(!CFG.csnd||!sndOk()||!AC||AC.state!=="running")return;try{var t=AC.currentTime+.02,p=side==="l"?-.5:.5,v=[784,880,988,1175][Math.floor(Math.random()*4)];if(mine){thas(t,p);thas(t+.11,p)}else{thas(t,p);tung(t+.07,v,p);tung(t+.2,v*1.335,p)}}catch(e){}}
function swoosh(t,d){nz(t,d,1600,.5,"bandpass");tn(t,d,200,900,.15,"sine")}
function knock(t){tn(t,.14,170,70,.9);nz(t,.08,500,.5)}
function bang(t){tn(t,.7,110,28,1.4);nz(t,.6,260,1.2);tn(t+.18,.35,90,40,.6)}

  // ===== নিয়ম (ব্লক / নিজে বন্ধ / সীমা) =====
  function ls(k, d) { try { var v = localStorage.getItem(k); if (v != null) return v; } catch (e) {} return d; }
  function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function selfOff() { return ls("fa_gate_off", "0") === "1"; }
  function blockedBy(c, name) { var n = String(name).trim().toLowerCase(); return String(c.blk || "").split(/[,\n،;]+/).some(function (x) { x = x.trim().toLowerCase(); return x && x === n; }); }
  function hist(c) { var now = Date.now(), a = []; try { a = JSON.parse(ls("fa_gate_h", "[]")) || []; } catch (e) {} return a.filter(function (t) { return now - t < c.win * 60000; }); }
  function why(c, name, o) {
    var sm = o.sim || {};
    if (!c.on) return "অ্যাডমিন দরজা বন্ধ রেখেছে";
    if (c.aud === "named" && o.anon) return "শুধু নামি ইউজারকে দেখানো হয় — বেনামি বাদ";
    if (c.aud === "anon" && !o.anon) return "শুধু বেনামি ইউজারকে দেখানো হয় — নামি বাদ";
    if ((sm.blk ? true : blockedBy(c, name))) return "অ্যাডমিন এই ইউজারের দরজা বন্ধ রেখেছে";
    if (sm.self !== undefined ? sm.self : selfOff()) return "ইউজার নিজে দরজা বন্ধ করেছে";
    if (c.lim && (sm.lim !== undefined ? sm.lim : hist(c).length >= c.max)) return "বারবার দেখা হয়ে গেছে — কিছুক্ষণ পরে আবার আসবে";
    return "";
  }
  function bump() { var n = parseInt(ls("fa_gate_n", "0"), 10) || 0; n++; lset("fa_gate_n", String(n)); return n; }
  function timing(c, n) { var th = n >= c.nth; return { wait: th ? c.wait3 : c.wait1, msg: th ? c.msg3 : c.msg1, cd: th ? c.cd3 : c.cd1, third: th }; }

  // ===== দরজা চালানো =====
  function styles() {
    if (css) return; css = document.createElement("style"); css.id = "fgateCss";
    css.textContent = "#fgate #door{--u:1px}#fgate #door{--w1:#6b3f1d;--w2:#5a3216;--dbg:linear-gradient(90deg,rgba(0,0,0,.4),transparent 14%,transparent 86%,rgba(0,0,0,.45)),repeating-linear-gradient(90deg,var(--w1) 0 20px,var(--w2) 20px 40px);--dbd:#b8903a;--fr:rgba(0,0,0,.38);--hn:linear-gradient(90deg,#fff2b0,#c9972e,#7a5a16);--sgbg:#2a1807;--sgbd:#e8c36a;--sgc:#ffe9a8;--sga:#ff9f43;--sgs:#fff;--rm:radial-gradient(ellipse at 50% 35%,#fff6cf,#f4bd62 38%,#7a4a14 85%);--rmc:#3a2208;--sh:inset 0 0 50px #000a}#fgate #door{position:relative;height:min(60vh,420px);border-radius:14px;overflow:hidden;background:#05080a;cursor:pointer;display:flex;flex-direction:column}#fgate #door.fc{height:min(68vh,500px)}#fgate #fc{display:none;flex:none;line-height:0;background:#0b140f}#fgate #fc img{width:100%;display:block}#fgate #door.fc #fc{display:block}#fgate #door{transition:opacity .9s}#fgate #door.gone{opacity:0;pointer-events:none}#fgate #door.fac{display:block;height:auto;aspect-ratio:600/760;max-width:440px;margin:0 auto;background:#9fc7bd var(--fac) center/100% 100% no-repeat}#fgate #door.fac #fc{display:none}#fgate #door.fac #dw{position:absolute;flex:none;left:9.5%;width:81.5%;top:58.7%;height:41.3%}#fgate #door.fac .lf,#fgate #door.fac .rt{border-width:2px}#fgate #door.fac #sg{width:90%;padding:8px;top:50%}#fgate #door.fac #sg b{font-size:clamp(12px,3.4vw,16px)}#fgate #door.fac #sg em{font-size:clamp(14px,4vw,19px)}#fgate #door.fac #sg u{font-size:11px;margin-top:2px}#fgate #door.fac #sg strong{font-size:clamp(13px,3.6vw,17px);margin-top:4px}#fgate #door.fac #dw{transition:top .9s cubic-bezier(.4,0,.2,1),height .9s cubic-bezier(.4,0,.2,1)}#fgate #door.fac.xp #dw{top:27%;height:73%}#fgate #dw{position:relative;flex:1;min-height:0;perspective:1500px;overflow:hidden;container-type:size}#fgate .rm{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:5% 6%;color:var(--rmc);font-family:\"Anek Bangla\",\"Hind Siliguri\",sans-serif;overflow:hidden;isolation:isolate}#fgate .rm:after{content:\"\";position:absolute;inset:0;z-index:-2;background:var(--rm);transform-origin:50% 50%;border-radius:3%}#fgate .rm:before{display:none}#fgate #bd{position:absolute;left:50%;top:50%;width:84%;z-index:1;transform:translate(-50%,-50%) scale(.15);opacity:0;text-align:center;padding:3cqw 3cqw 3.4cqw;border-radius:2.5cqw;background:linear-gradient(rgba(90,58,26,.8),rgba(51,32,14,.82));-webkit-backdrop-filter:blur(1.5px);backdrop-filter:blur(1.5px);border:.8cqw solid #d9b36a;box-shadow:0 1.5cqw 4cqw #000a;color:#ffe9a8;font-family:\"Anek Bangla\",\"Hind Siliguri\",sans-serif}#fgate #bd:before,#fgate #bd:after{content:\"\";position:absolute;top:-9cqh;width:.6cqw;height:9cqh;background:#c9a24a}#fgate #bd:before{left:16%}#fgate #bd:after{right:16%}#fgate #bd small{display:block;font-size:5.4cqw;line-height:1.2}#fgate #bd strong{display:block;font-size:min(14cqw,26cqh);line-height:1.15;color:#fff;text-shadow:0 0 3cqw #ffb347;overflow-wrap:anywhere}#fgate #bd em{display:block;font-style:normal;font-size:3.2cqw;opacity:.85;margin-top:1cqw}#fgate .show #bd{animation:fgbdin calc(var(--T) * .55) cubic-bezier(.2,.9,.3,1.15) var(--bdd,calc(var(--T) * .42)) both}@keyframes fgbdin{from{opacity:0;transform:translate(-50%,-50%) scale(.15)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}#fgate #lv{--f:min(1cqw,1.5cqh,5.2px);position:absolute;inset:0;z-index:-3;display:flex;justify-content:space-between;gap:calc(var(--f)*4);padding:calc(var(--f)*2.2) calc(var(--f)*2.4);background:linear-gradient(180deg,rgba(6,16,12,.66),rgba(6,16,12,.82));filter:brightness(var(--br,.85)) saturate(.95);pointer-events:none;transform-origin:50% 50%;perspective:calc(var(--f)*260);font-family:\"MCDigits\",\"Hind Siliguri\",\"Anek Bangla\",sans-serif}#fgate .show #lv{animation:fglvz calc(var(--T) + .6s) linear forwards}@keyframes fglvz{to{transform:scale(1.1)}}#fgate .lr{--wb:#fff;--wf:#10261b;--ob:#e9ecef;--of:#10261b;--rq:#d9dde1;--rqc:#10261b;flex:1 1 0;min-width:0;display:flex;flex-direction:column;border-radius:calc(var(--f)*3);background:var(--wb);color:var(--wf);overflow:hidden;box-shadow:0 calc(var(--f)*1.5) calc(var(--f)*6) #000b,0 0 0 1px rgba(255,255,255,.1);transform:translate(calc(var(--wx,0)*var(--f)*-1),calc(var(--wy,0)*var(--f)))rotateY(6deg)}#fgate .lr+.lr{transform:translate(calc(var(--wx,0)*var(--f)),calc(var(--wy,0)*var(--f)))rotateY(-6deg)}@media(prefers-color-scheme:dark){#fgate .lr{--wb:#0f1a14;--wf:#e8f1ea;--ob:#303030;--of:#fff;--rq:#262626;--rqc:#c9cdd1}}#fgate .lh{flex:none;display:flex;align-items:center;gap:calc(var(--f)*1.6);padding:calc(var(--f)*1.8) calc(var(--f)*2);border-bottom:.5px solid rgba(128,128,128,.3)}#fgate .lav{flex:none;width:calc(var(--f)*6.4);height:calc(var(--f)*6.4);border-radius:50%;background:linear-gradient(135deg,#ffb300,#ff7a18);display:grid;place-items:center;font-style:normal;font-size:calc(var(--f)*3.2)}#fgate .lt{flex:1;min-width:0;font-weight:700;font-size:calc(var(--f)*3.3);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#fgate .lt small{display:flex;align-items:center;gap:calc(var(--f)*.8);font-weight:500;opacity:.7;font-size:calc(var(--f)*2.3)}#fgate .lt small:before{content:\"\";flex:none;width:calc(var(--f)*1.3);height:calc(var(--f)*1.3);border-radius:50%;background:#22c55e}#fgate .li{flex:none;font-size:calc(var(--f)*3);opacity:.85;letter-spacing:calc(var(--f)*.6)}#fgate .lm{flex:1;min-height:0;position:relative;display:block;padding:0;overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 16%);mask-image:linear-gradient(transparent,#000 16%);transition:opacity .22s}#fgate .lm.fo{opacity:0}#fgate .tk{position:absolute;left:calc(var(--f)*1.8);right:calc(var(--f)*1.8);top:calc(var(--f)*1.6);display:flex;flex-direction:column;will-change:transform}#fgate .rw{display:grid;grid-template-rows:1fr;animation:fgrwin .26s cubic-bezier(.2,.8,.3,1) both}#fgate .rw.ni{animation:none}#fgate .rw>div{min-height:0;overflow:hidden;padding:calc(var(--f)*.35) 0 calc(var(--f)*.6)}#fgate .rw.hr>div{padding-bottom:calc(var(--f)*3)}@keyframes fgrwin{from{grid-template-rows:0fr;opacity:0;transform:translateY(40%) scale(.96)}to{grid-template-rows:1fr;opacity:1;transform:none}}#fgate .r{display:flex;align-items:flex-end;gap:calc(var(--f)*1.3);max-width:94%}#fgate .r.mine{margin-left:auto;flex-direction:row-reverse}#fgate .col{display:flex;flex-direction:column;min-width:0;position:relative}#fgate .mine .col{align-items:flex-end}#fgate .nm{font-size:calc(var(--f)*2.3);opacity:.65;font-weight:600;margin:0 0 calc(var(--f)*.3) calc(var(--f)*.8)}#fgate .av{flex:none;width:calc(var(--f)*5.4);height:calc(var(--f)*5.4);border-radius:50%;background:linear-gradient(135deg,#ffb300,#ff7a18);color:#fff;font-weight:800;display:grid;place-items:center;font-size:calc(var(--f)*2.8);font-style:normal}#fgate .av.z{visibility:hidden}#fgate .bb{max-width:100%;padding:calc(var(--f)*1.6) calc(var(--f)*2.6);border-radius:calc(var(--f)*3.8);font-size:calc(var(--f)*3.3);line-height:1.35;background:var(--ob);color:var(--of);box-shadow:0 1px 2px rgba(0,0,0,.12);overflow-wrap:anywhere}#fgate .mine .bb{background:linear-gradient(135deg,#0a84ff,#0a5cff);color:#fff}#fgate .bb.mnm{box-shadow:0 0 0 calc(var(--f)*.5) rgba(255,179,0,.85)}#fgate .bb.e1{background:none;box-shadow:none;color:inherit;padding:0 calc(var(--f)*.6);font-size:calc(var(--f)*8);line-height:1.15}#fgate .bb.e1 .tm{display:none}#fgate .tm{display:block;text-align:right;font-size:calc(var(--f)*2);opacity:.7;margin-top:calc(var(--f)*.2)}#fgate .mine .tm{color:rgba(255,255,255,.88);opacity:1}#fgate .rqb{max-width:100%;background:var(--rq);color:var(--rqc);border-radius:calc(var(--f)*3.8);padding:calc(var(--f)*1.3) calc(var(--f)*2.4) calc(var(--f)*3.6);font-size:calc(var(--f)*2.6);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.92}#fgate .rqb b{display:block;font-weight:700}#fgate .rqb+.bb{margin-top:calc(var(--f)*-2.8);position:relative;z-index:1}#fgate .mn{font-weight:700;color:#0a66ff}#fgate .mine .mn{color:#fff}#fgate .mn.me{background:rgba(255,179,0,.38);border-radius:calc(var(--f)*.8);padding:0 calc(var(--f)*.6);color:inherit}#fgate .rx{position:absolute;right:calc(var(--f)*1);bottom:calc(var(--f)*-2.6);z-index:2;background:var(--wb);border:1px solid rgba(128,128,128,.3);border-radius:99px;padding:0 calc(var(--f)*1.2);font-size:calc(var(--f)*2.6);line-height:1.45;box-shadow:0 1px 3px rgba(0,0,0,.28);animation:fgrxp .25s cubic-bezier(.3,1.6,.5,1)}#fgate .mine .rx{right:auto;left:calc(var(--f)*1)}@keyframes fgrxp{from{transform:scale(.2);opacity:0}}#fgate .sy{text-align:center;font-size:calc(var(--f)*2.4);font-weight:600;opacity:.7;padding:calc(var(--f)*.4) 0}#fgate .dots span{display:inline-block;width:calc(var(--f)*1.3);height:calc(var(--f)*1.3);border-radius:50%;background:currentColor;opacity:.5;margin:calc(var(--f)*.7) calc(var(--f)*.35);animation:fglbk .9s infinite}#fgate .dots span:nth-child(2){animation-delay:.15s}#fgate .dots span:nth-child(3){animation-delay:.3s}@keyframes fglbk{50%{opacity:.15;transform:translateY(-25%)}}#fgate .ac{flex:none;display:flex;align-items:center;gap:calc(var(--f)*1.6);padding:calc(var(--f)*1.6) calc(var(--f)*2);border-top:.5px solid rgba(128,128,128,.3)}#fgate .ac i{flex:1;min-width:0;border:.5px solid rgba(128,128,128,.45);border-radius:99px;padding:calc(var(--f)*1.5) calc(var(--f)*2.6);font-style:normal;font-size:calc(var(--f)*2.8);opacity:.6;white-space:nowrap;overflow:hidden}#fgate .ac u{flex:none;width:calc(var(--f)*6.4);height:calc(var(--f)*6.4);border-radius:50%;background:#0084ff;color:#fff;display:grid;place-items:center;text-decoration:none;font-size:calc(var(--f)*3);transition:transform .15s}#fgate .ac u.on{transform:scale(1.28)}#fgate #in{position:absolute;inset:0;z-index:-4;overflow:hidden;background:#fffbe6}#fgate #in svg{width:100%;height:100%;display:block;transform-origin:50% 47%}#fgate .rm h3{margin:0;width:100%;font-size:clamp(13px,min(7cqw,13cqh),44px);line-height:1.3;font-weight:800;position:relative;overflow-wrap:anywhere}#fgate .rm h3 span{display:inline-block;opacity:0;margin:0 .1em;will-change:transform,opacity}#fgate .show .rm:after{animation:fgzout calc(var(--T) * .45) cubic-bezier(.45,0,.55,1) forwards,fgzfade calc(var(--T) * .45) cubic-bezier(.3,0,.8,.5) forwards}#fgate .show .rm h3{animation:fghz calc(var(--T) * .45) cubic-bezier(.45,0,.55,1) forwards}#fgate .show #in svg{animation:fgfwd calc(var(--T) + .6s) cubic-bezier(.35,0,.8,.7) forwards}#fgate .show .rm h3 span{animation-name:fgwd;animation-timing-function:cubic-bezier(.3,0,.8,.5);animation-fill-mode:both}@keyframes fghz{0%{transform:scale(1)}35%{transform:scale(1)}100%{transform:scale(.12)}}@keyframes fgzout{0%{transform:scale(1)}35%{transform:scale(1)}100%{transform:scale(.12)}}@keyframes fgzfade{0%{opacity:1}28%{opacity:1}100%{opacity:0}}@keyframes fgfwd{from{transform:scale(1)}to{transform:scale(3.6)}}@keyframes fgwd{0%{opacity:0;transform:scale(1.5)}9%{opacity:1;transform:scale(1)}28%{opacity:1;transform:scale(1)}100%{opacity:0;transform:translate(var(--dx,0),var(--dy,0)) scale(.3)}}#fgate .lf,#fgate .rt{position:absolute;top:0;bottom:0;width:50%;transform-style:preserve-3d;transition:transform 2.5s cubic-bezier(.45,0,.2,1);background:var(--dbg);box-shadow:var(--sh);border:7px solid var(--dbd);backface-visibility:visible;-webkit-backdrop-filter:var(--bf,none);backdrop-filter:var(--bf,none)}#fgate .lf{left:0;transform-origin:left center;border-right-width:3px}#fgate .rt{right:0;transform-origin:right center;border-left-width:3px;background:var(--dbg2,var(--dbg))}#fgate .lf:before,#fgate .rt:before,#fgate .lf:after,#fgate .rt:after{content:\"\";display:var(--pn,block);position:absolute;left:12%;right:12%;border:4px solid var(--fr);border-radius:8px;box-shadow:inset 0 0 20px #0005}#fgate .lf:before,#fgate .rt:before{top:7%;bottom:55%}#fgate .lf:after,#fgate .rt:after{top:50%;bottom:7%}#fgate .hn{position:absolute;top:50%;width:13px;height:64px;border-radius:8px;background:var(--hn);box-shadow:0 3px 8px #000a;display:var(--hd,block)}#fgate .lf .hn{right:8px}#fgate .rt .hn{left:8px}#fgate .open .lf{transform:rotateY(-110deg)}#fgate .open .rt{transform:rotateY(110deg)}#fgate #door.slide .lf,#fgate #door.slide .rt{transition-duration:2.2s}#fgate #door.slide.open .lf{transform:translateX(-101%)}#fgate #door.slide.open .rt{transform:translateX(101%)}#fgate #sg{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);width:min(84%,400px);text-align:center;padding:14px 12px;border-radius:12px;background:var(--sgbg);border:2px solid var(--sgbd);color:var(--sgc);transition:opacity .8s,transform 1s;font-family:\"Anek Bangla\",\"Hind Siliguri\",sans-serif;z-index:2}#fgate .open #sg{opacity:0;transform:translate(-50%,-50%) scale(.9)}#fgate #sg b{display:block;font-size:clamp(15px,4.2vw,23px);line-height:1.3}#fgate #sg em{display:block;font-style:normal;color:var(--sga);font-size:clamp(17px,5vw,26px);font-weight:800;margin-top:2px}#fgate #sg u{display:block;text-decoration:none;font-size:13px;opacity:.85;margin-top:4px}#fgate #sg strong{display:block;margin-top:8px;font-size:clamp(16px,4.6vw,22px);color:var(--sgs)}#fgate,#fgate *{box-sizing:border-box}#fgate{position:fixed;left:0;top:0;right:0;bottom:0;z-index:99999;background:rgba(3,7,5,.94);display:flex;align-items:center;justify-content:center;padding:12px;transition:opacity .9s;font:15px/1.5 'Hind Siliguri','Noto Sans Bengali','Nirmala UI',system-ui,sans-serif;-webkit-tap-highlight-color:transparent;overscroll-behavior:contain;touch-action:none}#fgate.out{opacity:0;pointer-events:none}#fgate.host{position:absolute;z-index:5;border-radius:16px;padding:6px;overflow:hidden;background:#0b1410}#fgate #door{width:100%;max-width:520px;flex:none;cursor:default}#fgate #door.cl{cursor:pointer}#fgate #door.fac{width:min(100%,440px,calc((100vh - 24px)*.789));max-width:none;margin:0}#fgate.host #door{height:min(92%,400px)}#fgate.host #door.fac{height:auto;width:min(100%,236px)}.fgmini{--u:.45px;--w1:#6b3f1d;--w2:#5a3216;--dbg:linear-gradient(90deg,rgba(0,0,0,.4),transparent 14%,transparent 86%,rgba(0,0,0,.45)),repeating-linear-gradient(90deg,var(--w1) 0 20px,var(--w2) 20px 40px);--dbd:#b8903a;--fr:rgba(0,0,0,.38);--hn:linear-gradient(90deg,#fff2b0,#c9972e,#7a5a16);--rm:radial-gradient(ellipse at 50% 35%,#fff6cf,#f4bd62 38%,#7a4a14 85%);--sh:inset 0 0 50px #000a;height:78px;display:grid;grid-template-columns:1fr 1fr;border-radius:8px;overflow:hidden;background:var(--rm)}.fgmini i{display:block;background:var(--dbg);border:2px solid var(--dbd);box-shadow:var(--sh)}.fgmini i:first-child{border-right-width:1px}.fgmini i:last-child{border-left-width:1px;background:var(--dbg2,var(--dbg))}.fgmini.fm{background:#9fc7bd var(--fac) center top/cover no-repeat}.fgmini.fm i{display:none}";
    css.textContent += "#fgate #door.fac #sg{transition:top 1.8s cubic-bezier(.4,0,.2,1),transform 1.8s cubic-bezier(.4,0,.2,1),width 1.8s,opacity .8s}#fgate #door.fac.up #sg{top:40%;width:80%;transform:translate(-50%,-50%) scale(1.18)}#fgate #door.fac.up.open #sg{opacity:0;transform:translate(-50%,-50%) scale(1.05)}#fgate .show .rm:after{animation-duration:calc(var(--T) * .45 + var(--S,0s))}#fgate .show .rm h3{animation-duration:calc(var(--T) * .45 + var(--S,0s))}#fgate #door.fac>#sg,#fgate #door.fac.up>#sg{left:50%;transform:translate(-50%,0);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:1% 2%;overflow:hidden;text-align:center;overflow-wrap:anywhere;border-radius:14px;transition:opacity .8s}#fgate #door.fac.open>#sg,#fgate #door.fac.up.open>#sg{opacity:0;transform:translate(-50%,0) scale(.96)}#fgate #gsnd{position:absolute;top:10px;right:10px;z-index:9;width:40px;height:40px;border-radius:50%;border:1px solid #fff5;background:#000a;color:#fff;font-size:20px;line-height:1;cursor:pointer}#fgate .bb .sl{transform:rotate(calc(var(--sa,-8deg)*1.1))}#fgate .bb .sl.l{right:auto;left:calc(var(--f)*1.2);transform:rotate(var(--sa,-8deg))}#fgate .nm{margin-bottom:calc(var(--f)*2.9)}#fgate #gsnd{right:58px}#fgate.facg{padding:0}#fgate.facg #door.fac{width:min(100%,calc(100dvh*.789));max-width:none}#fgate.facg #door.fac #dw{transition:top .9s cubic-bezier(.4,0,.2,1),height .9s cubic-bezier(.4,0,.2,1),left .9s cubic-bezier(.4,0,.2,1),width .9s cubic-bezier(.4,0,.2,1)}#fgate.facg #door.fac.xp #dw{left:2%;width:96%}";
    css.textContent += "#fgate #lv{--f:3px;position:absolute;left:0;right:0;top:0;bottom:0;margin:0 auto;max-width:900px;width:100%;z-index:2;opacity:0;padding:calc(var(--f)*3) calc(var(--f)*3);gap:calc(var(--f)*3);background:linear-gradient(180deg,rgba(4,10,8,.9),rgba(4,10,8,.96));filter:brightness(var(--br,.85)) saturate(.95);transform:none}#fgate.lvon #lv{animation:fglvin .7s ease-out forwards}@keyframes fglvin{0%{opacity:0;transform:translateY(7%)}100%{opacity:1;transform:none}}#fgate #wbk{position:absolute;z-index:2;pointer-events:none;border-radius:3%;transform-origin:50% 50%;animation:fgzout var(--wbd,6s) cubic-bezier(.45,0,.55,1) forwards,fgzfade var(--wbd,6s) cubic-bezier(.3,0,.8,.5) forwards}#fgate #wlw{position:absolute;z-index:3;container-type:size;perspective:1500px;pointer-events:none;overflow:hidden;--rmc:#3a2208}#fgate #wlw .rm.wl:after{display:none}#fgate #anm{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:8;max-width:calc(100% - 24px);background:#0b7a4b;color:#fff;font-size:15px;line-height:1.35;padding:14px 20px;border-radius:18px;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.35);animation:fganm .35s ease both;transition:opacity .4s}#fgate #anm.off{opacity:0}@keyframes fganm{from{opacity:0;transform:translate(-50%,-50%) scale(.9)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}";
    // part61: দরজা ও ডেমো চ্যাট ওপর-নিচে ~৯৫% স্ক্রিন; চ্যাট বক্স চারদিকে গোল। (অ্যাডমিন প্রিভিউ .host আগের মতো — বেশি specificity)
    css.textContent += "#fgate #door,#fgate #door.fc{height:95dvh}#fgate #door.fac,#fgate.facg #door.fac{height:95dvh;width:min(100%,calc(95dvh*.789));max-width:none;aspect-ratio:auto;background-size:cover;background-position:center}#fgate #lv{padding:2.5dvh calc(var(--f)*3);box-sizing:border-box}#fgate .lr{border-radius:max(16px,calc(var(--f)*4))}";
    // part62b: ডেমো চ্যাট দরজা খোলার সাথে সাথে (০.৪৫ সেকেন্ডে) ফুটে ওঠে — আগে ~২.৪ সেকেন্ড দেরি ও ধীরে ফোটা ছিল (fglvin অ্যানিমেশন)।
    // part62: ডেমো চ্যাট ওপর-নিচে ১০% করে ছোট (প্যাডিং ২.৫dvh → ১২dvh); দুই চ্যাট বক্সে সিলের মতো মোটা ডবল (double) সোনালি বর্ডার
    css.textContent += "#fgate #lv{padding:12dvh calc(var(--f)*3)}#fgate .lr{box-sizing:border-box;border:max(5px,calc(var(--f)*1.7)) double #e8c36a;box-shadow:0 calc(var(--f)*1.5) calc(var(--f)*6) #000b,0 0 0 max(2px,calc(var(--f)*.6)) #7a5a16,inset 0 0 0 1px rgba(0,0,0,.45)}";
    css.textContent += NBC + FKF() + XCSS;
    document.head.appendChild(css);
  }
  function addSndBtn() {
    var b = document.createElement("button"); b.type = "button"; b.id = "gsnd"; b.setAttribute("aria-label", "দরজার শব্দ চালু/বন্ধ");
    var sh = function () { b.textContent = sndUser() ? "🔊" : "🔇"; };
    b.onclick = function (e) { e.stopPropagation(); lset("fa_gate_snd", sndUser() ? "0" : "1"); sh(); if (sndUser() && CFG && CFG.sound && A()) { if (!MG) newMG(); if (MG) MG.gain.value = sndVol(); knock(AC.currentTime + .03); } else if (MG) MG.gain.value = 0; };
    b.onpointerdown = function (e) { e.stopPropagation(); }; sh(); R.appendChild(b);
  }
  function stopAll() { lvStop(); tm.forEach(clearTimeout); tm = []; phase = 0; try { if (MG) MG.disconnect(); } catch (e) {} MG = null; }
  function knockLoop() { if (phase !== 1 || !AC) return; var t = AC.currentTime + .05; knock(t); knock(t + .4); knock(t + .8); tm.push(setTimeout(knockLoop, 5000)); }
  function layoutWords() {
    var rw = $("#rw"), sp = [].slice.call(rw.children), T = Math.max(1, tt.msg), r = rw.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, ex = tt.third ? 0 : CFG.shr, end = 0;
    sp.forEach(function (s, i) {
      var q = s.getBoundingClientRect(), dl = i * .1, du0 = Math.max(.8, T * .45 - dl) + ex, du = Math.max(.4, T * .45 + ex - dl); // ex = বড় থেকে ছোট হয়ে মিলাতে বাড়তি সেকেন্ড (প্রথম ৩ বার); du = প্রতিটা শব্দ ব্যাকগ্রাউন্ডের সাথে একই মুহূর্তে মিলায়; du0 = আগের চ্যাট-শুরুর হিসাব (টাইমিং অপরিবর্তিত)
      s.style.setProperty("--dx", (cx - (q.left + q.width / 2)) * .92 + "px"); s.style.setProperty("--dy", (cy - (q.top + q.height / 2)) * .92 + "px");
      s.style.animationDelay = dl + "s"; s.style.animationDuration = du + "s"; if (dl + du0 > end) end = dl + du0;
    });
    return end;
  }
  var WBK_EXTRA = 2; // part62f: স্বাগতম-ব্যাকগ্রাউন্ড লেখার চেয়ে এত সেকেন্ড বেশি সময় ধরে ছোট হয়ে মিলায় (দ্রুত চলে যাচ্ছিল)
  function openDoor() {
    if (phase !== 1) return; phase = 2;
    var sl = !!DS[CFG.design].s, T = Math.max(1, tt.msg), th = tt.third, showAt = th ? 200 : 500;
    D.style.setProperty("--T", T + "s"); D.style.setProperty("--S", (th ? 0 : CFG.shr) + "s"); R.style.setProperty("--T", T + "s"); R.style.setProperty("--S", (th ? 0 : CFG.shr) + "s"); D.classList.remove("cl"); posWl();
    if (sndOk() && A()) { if (!MG) newMG(); var snd = function () { if (phase < 2 || !AC) return; var t = AC.currentTime + .05; if (sl) { swoosh(t, 2.2); bang(t + 2.0); } else { creak(t, 2.5); bang(t + 2.3); } }; if (AC.state === "running") snd(); else AC.resume().then(snd, function () {}); }
    setCls(1, 1, 0); lvBuild(); tm.push(setTimeout(function () { D.classList.add("xp"); }, sl ? 1600 : 200));
    if (CFG.txt) {
      var te = layoutWords(), chatAt = showAt + te * 1000; R.style.setProperty("--bdd", (th ? Math.min(te + WBK_EXTRA, T * .6) : te + WBK_EXTRA) + "s"); /* part62g: "স্বাগতম রাফি" সাইনবোর্ড লেখা+ব্যাকগ্রাউন্ড মিলানোর পরে আসে */ // লেখা পুরো মিলিয়ে গেলে চ্যাটের (হোল্ড) সময় শুরু — আগের মতোই
      if (th) chatAt = Math.min(chatAt, T * 1000 - 600);
      ND = th ? T : chatAt / 1000 + CFG.chat; // বাবল চলে দরজা খোলার শুরু থেকেই, গেইট যাওয়ার সময় পর্যন্ত (দরজার টাইমিং অপরিবর্তিত)
      tm.push(setTimeout(function () { setCls(1, 1, 1); if (R && !R.querySelector("#wbk")) { var bk = document.createElement("div"); bk.id = "wbk"; bk.style.background = getComputedStyle(D).getPropertyValue("--rm") || "#f6ffe9"; bk.style.setProperty("--wbd", (Math.max(2, te) + WBK_EXTRA) + "s"); var rwb = R.querySelector("#rw"), rr0 = R.getBoundingClientRect(), qq = rwb && rwb.getBoundingClientRect(); if (qq) { bk.style.left = (qq.left - rr0.left - 26) + "px"; bk.style.top = (qq.top - rr0.top - 30) + "px"; bk.style.width = (qq.width + 52) + "px"; bk.style.height = (qq.height + 60) + "px"; } else { bk.style.left = "6%"; bk.style.right = "6%"; bk.style.top = "40%"; bk.style.height = "20%"; } R.insertBefore(bk, R.querySelector("#wlw")); } }, showAt)); // part62e: আগের (part49) ব্যাকগ্রাউন্ড = ডিজাইনের নিজস্ব --rm গ্রেডিয়েন্ট, আগের মতোই ছোট হয়ে মিলায় (fgzout/fgzfade); শুধু স্বাগতম লেখার পেছনে (পুরো স্ক্রিনে নয়); লেখার সাথে আস্তে মিলায়, চ্যাট পেছনে সাথে সাথে
      lvStart();
      tm.push(setTimeout(hold, th ? T * 1000 : chatAt + CFG.chat * 1000)); // ৪র্থ বার থেকে: মোট msg3 সেকেন্ডে শেষ; আগে: লেখা শেষ + ৬ সেকেন্ড চ্যাট
    } else { ND = th ? T : CFG.chat; lvStart(); tm.push(setTimeout(hold, (th ? T : CFG.chat) * 1000)); }
  }
  // স্বাগতম বোর্ডের সময় শেষ হলে: আসল চ্যাট (#acx) এসে গেলে গেইট সরে যায়; না এলে সর্বোচ্চ ১২ সেকেন্ড অপেক্ষা (পেছনে লাইভ চ্যাট মক চলতে থাকে)
  var ANON_MS = 4000; // part60b: "আপনি বেনামে প্রবেশ করেছেন" বার্তা মূল চ্যাটের ওপর কত সময় থাকবে (মিলিসেকেন্ড)
  function anonMsg() { // দরজা সরার মুহূর্তেই মূল চ্যাটের ওপর বার্তা; সময় শেষে মিলায়
    var m = document.createElement("div"); m.setAttribute("role", "status");
    m.innerHTML = "<div>আপনি বেনামে প্রবেশ করেছেন</div><div style=\"font-size:13px;margin-top:5px;opacity:.95\">নাম চেঞ্জ করতে চাইলে এখানে ক্লিক করুন</div>"; // part64: দ্বিতীয় লাইন + ⋯ বাটনের দিকে তীর
    m.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483000;max-width:calc(100vw - 24px);background:#0b7a4b;color:#fff;font:15px/1.35 'Hind Siliguri','Noto Sans Bengali',system-ui,sans-serif;padding:14px 20px;border-radius:18px;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none;opacity:0;transition:opacity .35s";
    document.body.appendChild(m); requestAnimationFrame(function () { m.style.opacity = "1"; });
    var NS = "http://www.w3.org/2000/svg", sv = document.createElementNS(NS, "svg"); sv.setAttribute("aria-hidden", "true");
    sv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147482999;pointer-events:none;opacity:0;transition:opacity .35s";
    sv.innerHTML = '<defs><marker id="fdAh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#0b7a4b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker></defs><line id="fdLn" x1="0" y1="0" x2="0" y2="0" stroke="#0b7a4b" stroke-width="1.6" stroke-linecap="round" marker-end="url(#fdAh)" style="display:none"/>';
    document.body.appendChild(sv);
    var ln = sv.querySelector("#fdLn"), iv = setInterval(function () {
      var t = document.getElementById("acMr"); if (!t || !t.offsetParent) { ln.style.display = "none"; return; }
      var a = m.getBoundingClientRect(), r = t.getBoundingClientRect(), x2 = r.left + r.width / 2, y2 = r.bottom + 4, x1 = a.right - 18, y1 = a.top;
      var dx = x2 - x1, dy = y2 - y1, d = Math.sqrt(dx * dx + dy * dy) || 1; x1 += dx / d * 6; y1 += dy / d * 6;
      ln.setAttribute("x1", x1); ln.setAttribute("y1", y1); ln.setAttribute("x2", x2); ln.setAttribute("y2", y2); ln.style.display = "";
    }, 100);
    requestAnimationFrame(function () { sv.style.opacity = "1"; });
    setTimeout(function () { m.style.opacity = "0"; sv.style.opacity = "0"; }, ANON_MS);
    setTimeout(function () { clearInterval(iv); if (m.parentNode) m.parentNode.removeChild(m); if (sv.parentNode) sv.parentNode.removeChild(sv); }, ANON_MS + 450);
  }
  function hold() { // স্বাগতম + ডেমো চ্যাট শেষ → মূল চ্যাট তৈরি থাকলে (না থাকলে সর্বোচ্চ ১২ সেকেন্ড অপেক্ষা, পেছনে ডেমো চলে) দরজা সরে, একই সাথে বেনামি বার্তা আসে
    if (phase !== 2) return; phase = 3; var t0 = Date.now(), an = curAnon && !hostMode;
    (function chk() { if (phase !== 3) return; if (hostMode || document.getElementById("acx") || Date.now() - t0 > 12000) { finish(); if (an) anonMsg(); return; } tm.push(setTimeout(chk, 200)); })();
  }
  function finish() {
    var r = R; stopAll(); if (!r) return; r.classList.add("out"); unlock();
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); if (R === r) { R = null; D = null; } }, 950);
  }
  function lock() { if (savedOv === null) { savedOv = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden"; } }
  function unlock() { if (savedOv !== null) { document.documentElement.style.overflow = savedOv; savedOv = null; } }
  function teardown() {
    stopAll(); unlock();
    var old = document.querySelectorAll("#fgate"), i; for (i = 0; i < old.length; i++) if (old[i].parentNode) old[i].parentNode.removeChild(old[i]);
    R = null; D = null;
  }
  var HTML = "<div id=\"door\"><div id=\"fc\"></div><div id=\"dw\"><div class=\"rm\"><div id=\"in\"><svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 200\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\"><defs><linearGradient id=\"fggl\" x1=\"0\" x2=\"1\"><stop offset=\"0\" stop-color=\"#6f9d8e\"/><stop offset=\"1\" stop-color=\"#cfe6dc\"/></linearGradient><linearGradient id=\"fggr\" x1=\"1\" x2=\"0\"><stop offset=\"0\" stop-color=\"#6f9d8e\"/><stop offset=\"1\" stop-color=\"#cfe6dc\"/></linearGradient><linearGradient id=\"fgfl\" x1=\"0\" y1=\"1\" x2=\"0\" y2=\"0\"><stop offset=\"0\" stop-color=\"#8d8a80\"/><stop offset=\"1\" stop-color=\"#d9d3c0\"/></linearGradient><linearGradient id=\"fgce\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#5d6a66\"/><stop offset=\"1\" stop-color=\"#c9d4cf\"/></linearGradient><radialGradient id=\"fglt\" cx=\"50%\" cy=\"50%\" r=\"60%\"><stop offset=\"0\" stop-color=\"#fffbe6\"/><stop offset=\".55\" stop-color=\"#ffe7a3\"/><stop offset=\"1\" stop-color=\"#f3c566\"/></radialGradient><radialGradient id=\"fgvg\" cx=\"50%\" cy=\"46%\" r=\"75%\"><stop offset=\".45\" stop-color=\"#000\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#000\" stop-opacity=\".55\"/></radialGradient><linearGradient id=\"fgsky\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#cfeeff\"/><stop offset=\"1\" stop-color=\"#fffbe6\"/></linearGradient></defs><polygon points=\"0.0,0.0 300.0,0.0 182.0,66.0 118.0,66.0\" fill=\"url(#fgce)\" /><polygon points=\"0.0,200.0 300.0,200.0 182.0,120.0 118.0,120.0\" fill=\"url(#fgfl)\" /><polygon points=\"0.0,0.0 118.0,66.0 118.0,120.0 0.0,200.0\" fill=\"url(#fggl)\" /><polygon points=\"300.0,0.0 182.0,66.0 182.0,120.0 300.0,200.0\" fill=\"url(#fggr)\" /><rect x=\"118\" y=\"66\" width=\"64\" height=\"54\" fill=\"url(#fgsky)\"/><ellipse cx=\"150\" cy=\"119\" rx=\"30\" ry=\"9\" fill=\"#5fae6a\"/><ellipse cx=\"136\" cy=\"112\" rx=\"12\" ry=\"11\" fill=\"#3f9a55\"/><ellipse cx=\"166\" cy=\"110\" rx=\"14\" ry=\"13\" fill=\"#4aa85c\"/><rect x=\"146\" y=\"102\" width=\"3\" height=\"18\" fill=\"#6b4a2a\"/><rect x=\"118\" y=\"66\" width=\"64\" height=\"54\" fill=\"url(#fglt)\" opacity=\".55\"/><polygon points=\"0.0,152.0 118.0,107.0 118.0,112.4 0.0,172.0\" fill=\"#c8b98f\" opacity=\".9\"/><polygon points=\"0.0,172.0 118.0,112.4 118.0,120.0 0.0,200.0\" fill=\"#8b7d5a\" opacity=\".55\"/><polygon points=\"0.0,10.0 118.0,68.7 118.0,69.8 0.0,14.0\" fill=\"#ffffff\" opacity=\".35\"/><polygon points=\"300.0,152.0 182.0,107.0 182.0,112.4 300.0,172.0\" fill=\"#c8b98f\" opacity=\".9\"/><polygon points=\"300.0,172.0 182.0,112.4 182.0,120.0 300.0,200.0\" fill=\"#8b7d5a\" opacity=\".55\"/><polygon points=\"300.0,10.0 182.0,68.7 182.0,69.8 300.0,14.0\" fill=\"#ffffff\" opacity=\".35\"/><polygon points=\"10.0,46.9 34.0,53.8 34.0,161.2 10.0,174.5\" fill=\"#6b4a2a\" /><polygon points=\"11.8,56.7 32.2,61.3 32.2,155.7 11.8,166.0\" fill=\"#8a6238\" /><polygon points=\"14.8,66.4 29.2,68.8 29.2,98.3 14.8,99.1\" fill=\"#bfe3f2\" opacity=\".85\"/><polygon points=\"28.7,118.0 30.6,117.6 30.6,127.4 28.7,127.9\" fill=\"#f2d27a\" /><polygon points=\"48.0,57.8 66.0,62.9 66.0,143.4 48.0,153.4\" fill=\"#6b4a2a\" /><polygon points=\"49.4,65.1 64.7,68.6 64.7,139.4 49.4,147.1\" fill=\"#8a6238\" /><polygon points=\"51.6,72.4 62.4,74.2 62.4,96.3 51.6,96.9\" fill=\"#bfe3f2\" opacity=\".85\"/><polygon points=\"62.0,111.1 63.5,110.8 63.5,118.1 62.0,118.5\" fill=\"#f2d27a\" /><polygon points=\"78.0,66.4 93.0,70.7 93.0,128.5 78.0,136.8\" fill=\"#6b4a2a\" /><polygon points=\"79.1,71.8 91.9,74.7 91.9,125.6 79.1,132.1\" fill=\"#8a6238\" /><polygon points=\"81.0,77.2 90.0,78.7 90.0,94.7 81.0,95.2\" fill=\"#bfe3f2\" opacity=\".85\"/><polygon points=\"89.7,105.4 90.9,105.1 90.9,110.4 89.7,110.7\" fill=\"#f2d27a\" /><polygon points=\"100.0,72.7 110.0,75.6 110.0,119.0 100.0,124.6\" fill=\"#6b4a2a\" /><polygon points=\"100.8,76.7 109.2,78.6 109.2,116.9 100.8,121.1\" fill=\"#8a6238\" /><polygon points=\"102.0,80.7 108.0,81.6 108.0,93.6 102.0,93.9\" fill=\"#bfe3f2\" opacity=\".85\"/><polygon points=\"107.8,101.6 108.6,101.4 108.6,105.4 107.8,105.6\" fill=\"#f2d27a\" /><polygon points=\"38.0,67.1 46.0,68.7 46.0,97.3 38.0,97.7\" fill=\"#fffdf2\" opacity=\".9\"/><polygon points=\"70.0,77.7 76.0,78.5 76.0,95.5 70.0,95.8\" fill=\"#f7e8b0\" opacity=\".85\"/><polygon points=\"38.4,21.5 41.6,23.3 41.6,171.8 38.4,174.0\" fill=\"#e9efe9\" opacity=\".35\"/><polygon points=\"72.4,40.5 75.6,42.3 75.6,148.7 72.4,150.9\" fill=\"#e9efe9\" opacity=\".35\"/><polygon points=\"290.0,46.9 266.0,53.8 266.0,161.2 290.0,174.5\" fill=\"#6b4a2a\" /><polygon points=\"288.2,56.7 267.8,61.3 267.8,155.7 288.2,166.0\" fill=\"#8a6238\" /><polygon points=\"285.2,66.4 270.8,68.8 270.8,98.3 285.2,99.1\" fill=\"#bfe3f2\" opacity=\".85\"/><polygon points=\"271.3,118.0 269.4,117.6 269.4,127.4 271.3,127.9\" fill=\"#f2d27a\" /><polygon points=\"252.0,57.8 234.0,62.9 234.0,143.4 252.0,153.4\" fill=\"#6b4a2a\" /><polygon points=\"250.7,65.1 235.3,68.6 235.3,139.4 250.7,147.1\" fill=\"#8a6238\" /><polygon points=\"248.4,72.4 237.6,74.2 237.6,96.3 248.4,96.9\" fill=\"#bfe3f2\" opacity=\".85\"/><polygon points=\"238.0,111.1 236.5,110.8 236.5,118.1 238.0,118.5\" fill=\"#f2d27a\" /><polygon points=\"222.0,66.4 207.0,70.7 207.0,128.5 222.0,136.8\" fill=\"#6b4a2a\" /><polygon points=\"220.9,71.8 208.1,74.7 208.1,125.6 220.9,132.1\" fill=\"#8a6238\" /><polygon points=\"219.0,77.2 210.0,78.7 210.0,94.7 219.0,95.2\" fill=\"#bfe3f2\" opacity=\".85\"/><polygon points=\"210.3,105.4 209.1,105.1 209.1,110.4 210.3,110.7\" fill=\"#f2d27a\" /><polygon points=\"200.0,72.7 190.0,75.6 190.0,119.0 200.0,124.6\" fill=\"#6b4a2a\" /><polygon points=\"199.2,76.7 190.8,78.6 190.8,116.9 199.2,121.1\" fill=\"#8a6238\" /><polygon points=\"198.0,80.7 192.0,81.6 192.0,93.6 198.0,93.9\" fill=\"#bfe3f2\" opacity=\".85\"/><polygon points=\"192.2,101.6 191.4,101.4 191.4,105.4 192.2,105.6\" fill=\"#f2d27a\" /><polygon points=\"262.0,67.1 254.0,68.7 254.0,97.3 262.0,97.7\" fill=\"#fffdf2\" opacity=\".9\"/><polygon points=\"230.0,77.7 224.0,78.5 224.0,95.5 230.0,95.8\" fill=\"#f7e8b0\" opacity=\".85\"/><polygon points=\"261.6,21.5 258.4,23.3 258.4,171.8 261.6,174.0\" fill=\"#e9efe9\" opacity=\".35\"/><polygon points=\"227.6,40.5 224.4,42.3 224.4,148.7 227.6,150.9\" fill=\"#e9efe9\" opacity=\".35\"/><line x1=\"0.0\" y1=\"200\" x2=\"118.0\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"30.0\" y1=\"200\" x2=\"124.4\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"60.0\" y1=\"200\" x2=\"130.8\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"90.0\" y1=\"200\" x2=\"137.2\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"120.0\" y1=\"200\" x2=\"143.6\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"150.0\" y1=\"200\" x2=\"150.0\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"180.0\" y1=\"200\" x2=\"156.4\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"210.0\" y1=\"200\" x2=\"162.8\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"240.0\" y1=\"200\" x2=\"169.2\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"270.0\" y1=\"200\" x2=\"175.6\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"300.0\" y1=\"200\" x2=\"182.0\" y2=\"120\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".55\"/><line x1=\"113.6\" y1=\"123\" x2=\"186.4\" y2=\"123\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".5\"/><line x1=\"107.7\" y1=\"127\" x2=\"192.3\" y2=\"127\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".5\"/><line x1=\"98.8\" y1=\"133\" x2=\"201.2\" y2=\"133\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".5\"/><line x1=\"87.0\" y1=\"141\" x2=\"213.0\" y2=\"141\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".5\"/><line x1=\"69.3\" y1=\"153\" x2=\"230.7\" y2=\"153\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".5\"/><line x1=\"42.8\" y1=\"171\" x2=\"257.2\" y2=\"171\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".5\"/><line x1=\"5.9\" y1=\"196\" x2=\"294.1\" y2=\"196\" stroke=\"#6e6a5f\" stroke-width=\".6\" opacity=\".5\"/><polygon points=\"104.3,4.0 195.7,4.0 191.1,12.0 108.9,12.0\" fill=\"#fffdf0\" opacity=\".95\"/><polygon points=\"113.4,20.0 186.6,20.0 182.6,27.0 117.4,27.0\" fill=\"#fffdf0\" opacity=\".95\"/><polygon points=\"121.5,34.0 178.5,34.0 175.7,39.0 124.3,39.0\" fill=\"#fffdf0\" opacity=\".95\"/><polygon points=\"128.3,46.0 171.7,46.0 169.4,50.0 130.6,50.0\" fill=\"#fffdf0\" opacity=\".95\"/><polygon points=\"133.5,55.0 166.5,55.0 164.8,58.0 135.2,58.0\" fill=\"#fffdf0\" opacity=\".95\"/><polygon points=\"136.9,61.0 163.1,61.0 162.0,63.0 138.0,63.0\" fill=\"#fffdf0\" opacity=\".95\"/><ellipse cx=\"150\" cy=\"150\" rx=\"24\" ry=\"40\" fill=\"#fff6d0\" opacity=\".14\"/><rect width=\"300\" height=\"200\" fill=\"url(#fgvg)\"/></svg></div><div id=\"lv\"></div><h3 id=\"rw\"></h3><div id=\"bd\"><small id=\"bd1\">স্বাগতম</small><strong id=\"bd2\"></strong><em id=\"bd3\"></em></div></div><div class=\"lf\"><i class=\"hn\"></i></div><div class=\"rt\"><i class=\"hn\"></i></div><div id=\"sg\"><b id=\"s1\"></b><em id=\"s2\"></em><u id=\"s3\"></u><strong id=\"s4\"></strong></div></div></div>";
  // play(নাম, {host: প্রিভিউ-বক্স, cfg: সেটিং, mode: "first"|"third", anon: বেনামি কিনা}) → দেখানো হলে true
  var curAnon = false;
  function play(name, o) {
    o = o || {}; var c = {}, q; for (q in CF) c[q] = CF[q];
    if (o.cfg) for (q in DEF) if (o.cfg.hasOwnProperty(q) && typeof o.cfg[q] === typeof DEF[q] && ((q !== "names" && q !== "qa") || Array.isArray(o.cfg[q]))) c[q] = o.cfg[q];
    clean(c); name = String(name || "").trim() || "বন্ধু";
    var real = !o.host; curAnon = real && !!o.anon;
    if (real && why(c, name, o)) return false;
    teardown(); styles(); NBPV = false; LDONE = false; LSN = 0;
    CFG = c; me = name; hostMode = !!o.host; if (real) c.design = pickDesign(c);
    var n = real ? bump() : (o.mode === "third" ? c.nth : 1); tt = timing(c, n);
    if (real && c.lim) { var h = hist(c); h.push(Date.now()); lset("fa_gate_h", JSON.stringify(h)); }
    R = document.createElement("div"); R.id = "fgate"; if (o.host) R.className = "host";
    R.innerHTML = HTML; R.style.setProperty("--fac", "url('" + FACU + "')"); layers();
    (o.host || document.body).appendChild(R); if (real) lock();
    D = $("#door"); fillTx(); applyD(); placeSign(); sgDrag(); setCls(0, 0, 0); phase = 1; T0 = Date.now();
    if (c.click) { // ক্লিকে খোলা: অ্যাডমিনে 👆 চালু করলে (ডিফল্ট বন্ধ)
      var cl = function () { if (D && phase === 1) D.classList.add("cl"); };
      if (tt.cd <= 0) cl(); else tm.push(setTimeout(cl, tt.cd * 1000));
      D.onclick = function () { if (phase === 1 && Date.now() - T0 >= tt.cd * 1000 - 20) openDoor(); };
    }
    if (c.sound && (hostMode || sndUser()) && A()) { newMG(); knockLoop(); }
    if (real && c.sbtn) addSndBtn();
    tm.push(setTimeout(openDoor, tt.wait * 1000));
    return true;
  }
  function cfgOf(oc) { var c = {}, q; for (q in CF) c[q] = CF[q]; if (oc) for (q in DEF) if (oc.hasOwnProperty(q) && typeof oc[q] === typeof DEF[q] && ((q !== "names" && q !== "qa") || Array.isArray(oc[q]))) c[q] = oc[q]; return clean(c); }
  // check(নাম, {cfg, anon, sim:{blk,self,lim}}) → "" হলে দরজা আসবে, নইলে না-আসার কারণ (প্রিভিউর জন্য; কিছু বদলায় না)
  function check(name, o) { o = o || {}; return why(cfgOf(o.cfg), String(name || "").trim() || "বন্ধু", o); }
  function thumb(i) {
    var b = document.createElement("span"); b.className = "fgmini" + (DS[i].f ? " fm" : ""); b.innerHTML = "<i></i><i></i>"; dv(b, i); b.style.setProperty("--fac", "url('" + FACU + "')");
    if (DS[i].wood) { b.style.setProperty("--w1", CF.w1); b.style.setProperty("--w2", CF.w2); } return b;
  }
  // bubbles(নাম, {host, cfg, dur}) — অ্যাডমিন প্রিভিউ: দরজা না খুলে (বন্ধ রেখে) শুধু প্রশ্ন–উত্তর বাবল চালায়; শব্দ নেই
  function bubbles(name, o) {
    o = o || {}; if (!o.host) return false; var c = cfgOf(o.cfg); name = String(name || "").trim() || "বন্ধু";
    teardown(); styles(); CFG = c; me = name; hostMode = true; tt = timing(c, 1); NBPV = true;
    R = document.createElement("div"); R.id = "fgate"; R.className = "host"; R.innerHTML = HTML; R.style.setProperty("--fac", "url('" + FACU + "')"); layers();
    o.host.appendChild(R); D = $("#door"); fillTx(); applyD(); placeSign(); setCls(0, 0, 0); phase = 1; T0 = Date.now();
    setCls(1, 1, 0); D.classList.add("xp"); NBPV = true; posWl();
    ND = Math.max(3, +o.dur || 7); lvBuild(); lvStart(); return true;
  }
  function toggleSelf() { var off = !selfOff(); lset("fa_gate_off", off ? "1" : "0"); return !off; }
  window.FADoor = {
    play: play, check: check, bubbles: bubbles, cleanQA: cleanQA, stop: teardown, resetSeen: function () { SEENM = []; try { localStorage.removeItem("fa_door_seen"); } catch (e) {} }, info: function () { return { shown: LSN, total: nbNames().length, seen: seenGet().length, done: LDONE }; }, on: function () { return !!CF.on; }, defaults: DEF, cfg: CF, limits: LIM, thumb: thumb,
    designs: DS.map(function (d, i) { return { i: i, n: d.n, gate: !!d.g, slide: !!d.s }; }),
    selfOn: function () { return !selfOff(); }, toggleSelf: toggleSelf,
    sndOn: sndUser, toggleSnd: function () { var on = !sndUser(); lset("fa_gate_snd", on ? "1" : "0"); if (MG) MG.gain.value = on ? sndVol() : 0; if (CB) CB.gain.value = on ? 1 : 0; return on; }
  };
})();
