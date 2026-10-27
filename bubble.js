// Friend Adda — নামে ক্লিক বাবল + নাম ছাড়া বাবল + চ্যাটের নিচের অনলাইন স্ট্রিপ (চলন্ত নামের ব্যাজ) + অ্যাডমিনের 🔒 তালা-ফোল্ডার।
// SQL: sql/SQL-20-NAME-BUBBLES.sql (একবার)। chat.js থেকে window.faBub.mount({...}) / unmount() ডাকা হয়; admin.html-এর "💬 চ্যাট বাবল" ট্যাব faBub.panel() ব্যবহার করে।
// সেটিং সার্ভারে mc2_bub_cfg-এ; সব ইউজার ৩.৫ সেকেন্ড পরপর mc2_bub_get-এ নতুন বাবল ও সেটিং পায়। সব বাধা (লিমিট, খারাপ শব্দ, বন্ধ) সার্ভারে যাচাই হয়।
(function () {
  if (window.faBub) return;
  var BN = "০১২৩৪৫৬৭৮৯", bd = function (n) { return String(n).replace(/\d/g, function (d) { return BN[d]; }); };
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var EM = ["❤️", "🎉", "⭐", "🌹", "🔥", "😂", "👏", "🎈", "💖", "🌸", "🎁", "🍀", "😍", "✨"];
  var COL = { white: "#ffffff", gold: "#f59e0b", pink: "#ec4899", green: "#16a34a", blue: "#3b82f6" }, COLN = { white: "সাদা", gold: "সোনালি", pink: "গোলাপি", green: "সবুজ", blue: "নীল" };
  var ANIMS = ["বড় হয়ে ঠাস করে বসা", "ওপর থেকে আছড়ে পড়া", "বড় হয়ে বসে + টাইপরাইটার", "নিচ থেকে ভেসে এসে ঠাস", "ঘুরতে ঘুরতে বড় হয়ে বসা", "ঝাপসা বড় থেকে পরিষ্কার", "অনেক বড় জুম-ইন ঠাস", "বাঁ-ডান দুলে বসা", "ফ্লিপ হয়ে বসা", "তারার ঝিলিক সহ ঠাস", "ধোঁয়া থেকে ঠাস"];
  var DEF = { speed: 30, design: "auto", anim: 0, rnd: true, max: 50, sec: 1.5, snd: true, inChat: true, outChat: false, userShow: true, anonOn: true, userAnim: false, userColor: false, userEmoji: false,
    showSender: false, showAnon: false, notify: false, vis: "all", admSee: true, pos: "top", size: 3, color: "white", emoji: "rnd", kill: false, lim: { n: { m: 1, t: 3 }, a: { m: 1, t: 3 } } };
  var P = [["#e11d48", "#9f1239"], ["#2563eb", "#1e3a8a"], ["#059669", "#065f46"], ["#d97706", "#92400e"], ["#7c3aed", "#4c1d95"], ["#0891b2", "#155e75"], ["#db2777", "#831843"], ["#4d7c0f", "#365314"]];
  var CFG = JSON.parse(JSON.stringify(DEF)), ME = { u: "", mu: false, lm: 0, lt: 0 }, X = null, LAST = -1, TM = [], SEEN = {}, AUTO = true, DS = 1, NAMES = "", ONL = 0, NOTE = null, AC = null;
  function merge(c) { var o = JSON.parse(JSON.stringify(DEF)); if (c && typeof c === "object") { Object.keys(DEF).forEach(function (k) { if (k === "lim") { ["n", "a"].forEach(function (g) { ["m", "t"].forEach(function (q) { var v = c.lim && c.lim[g] && +c.lim[g][q]; if (v > 0) o.lim[g][q] = v; }); }); } else if (c.hasOwnProperty(k) && typeof c[k] === typeof DEF[k]) o[k] = c[k]; }); } return o; }
  function clen(s) { return Array.from(String(s || "")).length; }
  function hold(s) { return Math.max(1, Math.ceil(clen(s) / 10)) * (CFG.sec > 0 ? CFG.sec : 1.5); }

  // ---------------- CSS ----------------
  function css() {
    if (document.getElementById("faBubCss")) return;
    var s = document.createElement("style"); s.id = "faBubCss";
    s.textContent =
      ".faol{flex:none;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(29,107,67,.1));border-top:1px solid rgba(128,128,128,.25);padding:4px 0 6px;position:relative}" +
      "#acx.fa-st .ac{padding-bottom:8px}.faol{padding-bottom:calc(max(6px,env(safe-area-inset-bottom)) + var(--fa-lift,0px))}" +
      ".faolt{display:flex;align-items:center;gap:7px;padding:0 10px 3px 12px;font-size:13px;font-weight:700;color:#1d6b43}@media(prefers-color-scheme:dark){.faolt{color:#4cc183}}" +
      ".fadot{width:9px;height:9px;border-radius:50%;background:#22c55e;animation:faPl 1.8s infinite;flex:none}@keyframes faPl{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}" +
      ".faolt em{font-style:normal;font-weight:500;opacity:.7}.faot{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:380px){.faolt{font-size:12px;gap:5px}.faab{font-size:10px;padding:3px 8px 8px}}" +
      ".faab{margin:-3px 0 -5px auto;flex:none;border:0;font:inherit;font-size:11px;line-height:1.2;font-weight:700;color:#fff;padding:3px 10px 9px;cursor:pointer;background:linear-gradient(160deg,#7c3aed,#4c1d95);clip-path:polygon(0 0,100% 0,100% 62%,88% 84%,50% 100%,12% 84%,0 62%);filter:drop-shadow(0 2px 2px rgba(0,0,0,.25));white-space:nowrap}" +
      ".favp{overflow:hidden;position:relative;height:28px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}" +
      ".fatr{position:absolute;left:0;top:0;display:flex;gap:12px;white-space:nowrap;will-change:transform}" +
      ".fas{position:relative;flex:none;box-sizing:border-box;height:25px;min-width:44px;padding:6px 14px;color:#fff;font-weight:700;font-size:11px;line-height:13px;text-align:center;cursor:pointer;transition:opacity .4s;text-shadow:0 1px 2px rgba(0,0,0,.45)}.fas span{position:relative}.fasw .fas{opacity:0}" +
      ".fad1 .fas{padding:3px 10px 9px;background:linear-gradient(160deg,var(--a),var(--b));clip-path:polygon(0 0,100% 0,100% 64%,90% 84%,50% 100%,10% 84%,0 64%);filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}.fad1 .fas::before{content:'';position:absolute;top:2px;right:2px;bottom:2px;left:2px;clip-path:inherit;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 55%)}" +
      ".fad2 .fas{padding:6px 16px;background:linear-gradient(180deg,var(--a),var(--b));clip-path:polygon(0 0,100% 0,calc(100% - 7px) 50%,100% 100%,0 100%,7px 50%);box-shadow:0 2px 0 rgba(0,0,0,.2)}" +
      ".fad3 .fas{padding:4px 12px;border-radius:999px;color:var(--b);background:#fff;background:linear-gradient(180deg,rgba(255,255,255,.95),color-mix(in srgb,var(--a) 22%,#fff));border:2px solid var(--a);text-shadow:none;box-shadow:0 2px 6px rgba(0,0,0,.25);box-shadow:0 2px 6px color-mix(in srgb,var(--a) 40%,transparent)}.fad3 .fas span::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;margin-right:4px}" +
      ".fad4 .fas{padding:6px 14px;background:linear-gradient(135deg,var(--a),var(--b));border-radius:6px;-webkit-mask:radial-gradient(circle 4px at 0 50%,#0000 97%,#000) left/51% 100% no-repeat,radial-gradient(circle 4px at 100% 50%,#0000 97%,#000) right/51% 100% no-repeat;mask:radial-gradient(circle 4px at 0 50%,#0000 97%,#000) left/51% 100% no-repeat,radial-gradient(circle 4px at 100% 50%,#0000 97%,#000) right/51% 100% no-repeat}.fad4 .fas::after{content:'';position:absolute;left:8px;right:8px;bottom:3px;border-bottom:2px dashed rgba(255,255,255,.45)}" +
      ".fad5 .fas{padding:6px 16px;background:linear-gradient(135deg,var(--a),var(--b));clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 50%,calc(100% - 8px) 100%,8px 100%,0 50%)}.fad5 .fas::before{content:'';position:absolute;top:3px;right:3px;bottom:3px;left:3px;clip-path:inherit;background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,0) 60%)}" +
      ".favw{position:relative}.falk{display:none;position:absolute;left:8px;top:4px;z-index:3;width:34px;height:34px;border-radius:50%;border:0;background:rgba(16,38,27,.85);color:#fff;font-size:16px;cursor:pointer;padding:0;box-shadow:0 2px 6px rgba(0,0,0,.3)}.fa-adm .falk{display:block}" +
      ".fabl{position:absolute;top:0;right:0;bottom:0;left:0;z-index:90;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:10px;padding:70px 14px 150px;overflow:hidden}.fabl.fx{position:fixed}.fabl.pv{position:fixed;top:0;right:0;bottom:auto;left:0;height:auto;max-height:100vh;justify-content:flex-start;padding:max(14px,env(safe-area-inset-top)) 12px 0;z-index:2147483600}.fabl.top{justify-content:flex-start;padding-top:calc(env(safe-area-inset-top,0px) + 60px)}.fabl.mid{justify-content:center;padding:0 14px}.fabl.bot{justify-content:flex-end}" +
      ".fabw{max-width:92%;position:relative;will-change:transform,opacity}.fari{position:absolute;top:0;right:0;bottom:0;left:0;border-radius:24px;border:3px solid rgba(255,255,255,.9);pointer-events:none;box-shadow:0 0 18px rgba(255,255,255,.6)}" +
      ".fabub{position:relative;min-width:200px;max-width:100%;padding:18px 30px 19px;border-radius:24px;font-weight:700;line-height:1.5;text-align:center;letter-spacing:.2px;overflow-wrap:anywhere;font-family:inherit;border:1.5px solid rgba(255,255,255,.7);box-shadow:0 18px 44px rgba(0,0,0,.34),0 4px 12px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.75),inset 0 -3px 8px rgba(0,0,0,.08)}" +
      ".fabub::before{content:'';position:absolute;left:14px;right:14px;top:3px;height:42%;border-radius:20px 20px 60% 60%/20px 20px 14px 14px;background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,0));pointer-events:none}" +
      ".fabub::after{content:'';position:absolute;left:50%;bottom:-8px;width:18px;height:18px;margin-left:-9px;background:inherit;border-right:1.5px solid rgba(255,255,255,.7);border-bottom:1.5px solid rgba(255,255,255,.7);border-radius:0 0 6px 0;transform:rotate(45deg);z-index:-1}" +
      ".fabub small{display:table;margin:0 auto 6px;font-size:11.5px;font-weight:700;letter-spacing:.3px;padding:2px 11px;border-radius:999px;background:rgba(0,0,0,.16);color:inherit;opacity:.95}.fabub .at{opacity:.95;margin-right:6px;font-weight:800}.fabub .tx{position:relative}" +
      ".fsz1{font-size:18px}.fsz2{font-size:23px}.fsz3{font-size:30px}" +
      ".fc-white{background:#fff;color:#10261b;border:2px solid #cfe0d5}.fc-gold{background:linear-gradient(135deg,#fde68a,#f59e0b);color:#451a03}.fc-pink{background:linear-gradient(135deg,#fbcfe8,#ec4899);color:#500724}.fc-green{background:linear-gradient(135deg,#86efac,#16a34a);color:#052e16}.fc-blue{background:linear-gradient(135deg,#bfdbfe,#3b82f6);color:#0b1e4a}" +
      ".fax{position:absolute;top:-15px;right:-6px;width:36px;height:36px;border-radius:50%;border:2px solid #fff;background:rgba(16,38,27,.92);color:#fff;font:700 17px/1 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;pointer-events:auto;z-index:5;box-shadow:0 3px 10px rgba(0,0,0,.4)}.fax:active{transform:scale(.9)}.farain{position:absolute;top:-30px;font-size:22px;pointer-events:none;z-index:91}.faspk{position:absolute;pointer-events:none;font-size:16px}" +
      ".facmp{position:absolute;left:10px;right:10px;bottom:120px;z-index:95;max-width:460px;margin:0 auto;background:var(--bg,#fff);color:var(--fg,#10261b);border:1px solid rgba(128,128,128,.4);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.35);padding:8px 10px;font-size:13px}" +
      ".facmp,.facmp *,.fash,.fash *{box-sizing:border-box}" +
      ".facmp h4{margin:0 0 4px;padding-right:32px;font-size:14px;color:#1d6b43}@media(prefers-color-scheme:dark){.facmp h4{color:#4cc183}}.fa-lim{color:#d11a2a;font-weight:700;font-size:12px;margin-bottom:4px;line-height:1.3}@media(prefers-color-scheme:dark){.fa-lim,.fa-err{color:#ff6b6b}}.fa-err{color:#d11a2a;font-weight:700;font-size:13px;min-height:18px;margin:4px 0}" +
      ".facmp textarea{width:100%;font:inherit;background:transparent;color:inherit;border:1px solid rgba(128,128,128,.4);border-radius:10px;padding:6px 9px;resize:none;height:44px}" +
      ".fa-row{display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap;font-size:13px}.fa-cnt{margin-left:auto;opacity:.7;font-size:12px}" +
      ".fabtn{font:inherit;font-weight:700;border:0;border-radius:10px;padding:7px 12px;background:#1d6b43;color:#fff;cursor:pointer}.fabtn.l{background:rgba(128,128,128,.18);color:inherit}.fabtn.r{background:#d11a2a;color:#fff}" +
      ".fachip{width:24px;height:24px;border-radius:50%;border:2px solid rgba(128,128,128,.5);cursor:pointer;padding:0}.fachip.on{border-color:#1d6b43;box-shadow:0 0 0 2px #1d6b43}.faemo{border:1px solid rgba(128,128,128,.4);background:transparent;border-radius:9px;padding:2px 5px;cursor:pointer;font-size:16px}.faemo.on{background:#1d6b43;color:#fff}" +
      "#acx .facmp select,#acx .fap select,#acx .fap input[type=text]{width:auto;padding:4px 6px;border-radius:8px;font-size:13px}#acx .fap input[type=text].w{width:100%}" +
      ".facmp{--cx:0}.facmp .fax2{position:absolute;top:6px;right:8px;width:26px;height:26px;border-radius:50%;border:0;background:rgba(128,128,128,.22);color:inherit;font-size:14px;line-height:1;padding:0;cursor:pointer;z-index:2}.facmp .fa-err{min-height:0;margin:3px 0}.facmp .fa-err:empty{display:none}.facmp .fa-opt{margin-top:6px;padding-top:6px;border-top:1px dashed rgba(128,128,128,.4)}.facmp .fa-opt .fa-row:first-child{margin-top:0}.facmp .fa-row .fabtn{padding:6px 12px}" +
      ".fash{position:absolute;left:0;right:0;bottom:0;height:90%;background:var(--bg,#fff);color:var(--fg,#10261b);z-index:96;border-radius:18px 18px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.4);display:flex;flex-direction:column}.fash .sh1{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-weight:700;border-bottom:1px solid rgba(128,128,128,.3)}.fash .bd{overflow:auto;padding:8px 12px 24px;flex:1}" +
      ".fatoast{position:absolute;left:12px;right:12px;top:64px;margin:0 auto;max-width:420px;background:#10261b;color:#fff;padding:9px 13px;border-radius:12px;z-index:97;font-size:13px;text-align:center}" +
      ".fap{font-size:13px;color:inherit}.fap details{border:1px solid rgba(128,128,128,.35);border-radius:12px;margin:7px 0}.fap summary{padding:9px 12px;font-weight:700;cursor:pointer}.fap details>div{padding:4px 12px 10px}" +
      ".fap .f{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}.fap .f>span{flex:1;min-width:130px}.fap input[type=number]{width:64px;font:inherit;padding:3px 6px;border:1px solid rgba(128,128,128,.45);border-radius:8px;background:transparent;color:inherit}.fap select,.fap textarea{font:inherit;border:1px solid rgba(128,128,128,.45);border-radius:8px;background:transparent;color:inherit}.fap select option{color:#000}" +
      ".fasw2{position:relative;width:42px;height:24px;border-radius:99px;background:#9aa8a0;cursor:pointer;border:0;flex:none;padding:0}.fasw2::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s}.fasw2.on{background:#1d6b43}.fasw2.on::after{left:21px}" +
      ".faag{display:grid;grid-template-columns:1fr 1fr;gap:5px}.faag button{font:inherit;font-size:12px;border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit;border-radius:9px;padding:6px 4px;cursor:pointer;text-align:left}.faag button.on{background:#1d6b43;color:#fff;border-color:#1d6b43}" +
      ".fap table{width:100%;border-collapse:collapse;font-size:12px}.fap td,.fap th{border-bottom:1px solid rgba(128,128,128,.25);padding:4px 3px;text-align:left}.fa-logl{font-size:12px;border-bottom:1px solid rgba(128,128,128,.25);padding:4px 0;overflow-wrap:anywhere}.fa-logl.bad{color:#d11a2a}@media(prefers-color-scheme:dark){.fa-logl.bad{color:#ff8a80}}.fap small{opacity:.75}";
    document.head.appendChild(s);
  }

  // ---------------- সাউন্ড ----------------
  function beep() { if (!CFG.snd) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); var t = AC.currentTime;[660, 880].forEach(function (f, i) { var o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(.0001, t + i * .12); g.gain.exponentialRampToValueAtTime(.2, t + i * .12 + .02); g.gain.exponentialRampToValueAtTime(.0001, t + i * .12 + .25); o.connect(g); g.connect(AC.destination); o.start(t + i * .12); o.stop(t + i * .12 + .3); }); } catch (e) {} }

  function thud() { if (!CFG.snd) return; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .22); g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.0001, t + .28); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .3); } catch (e) {} }
  // ---------------- বাবল ----------------
  var KF = [
    [{ opacity: 0, transform: "scale(5)" }, { opacity: 1, transform: "scale(1)" }],
    [{ opacity: 0, transform: "translateY(-340px) scale(3.2)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
    [{ opacity: 0, transform: "scale(3.2)" }, { opacity: 1, transform: "scale(1)" }],
    [{ opacity: 0, transform: "translateY(300px) scale(3.2)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
    [{ opacity: 0, transform: "rotate(-34deg) scale(4.4)" }, { opacity: 1, transform: "rotate(0) scale(1)" }],
    [{ opacity: 0, transform: "scale(4)", filter: "blur(20px)" }, { opacity: 1, transform: "scale(1)", filter: "blur(0)" }],
    [{ opacity: 0, transform: "scale(7)" }, { opacity: 1, transform: "scale(1)" }],
    [{ opacity: 0, transform: "rotate(26deg) scale(3.6)" }, { opacity: 1, transform: "rotate(0) scale(1)" }],
    [{ opacity: 0, transform: "perspective(600px) rotateX(70deg) scale(3.4)" }, { opacity: 1, transform: "perspective(600px) rotateX(0) scale(1)" }],
    [{ opacity: 0, transform: "scale(4.2)", filter: "brightness(3)" }, { opacity: 1, transform: "scale(1)", filter: "brightness(1)" }],
    [{ opacity: 0, transform: "scale(4.6)", filter: "blur(16px)" }, { opacity: 1, transform: "scale(1)", filter: "blur(0)" }]
  ];
  var TOPMODE = false; // অ্যাডমিন প্রিভিউ: সবসময় পেইজের ওপরে, সব পেইজে দেখা যায়
  function chatShown() { var r = X && X.root; return !!r && r.style.display !== "none" && r.getClientRects().length > 0; }
  function layer() {
    if (TOPMODE) { var P2 = document.getElementById("faPvL"); if (!P2) { P2 = document.createElement("div"); P2.id = "faPvL"; document.body.appendChild(P2); } P2.className = "fabl pv"; return P2; }
    var R = X && X.root && document.getElementById("acx") === X.root ? X.root : null, L;
    // আসল চ্যাটেও বাবল পুরো স্ক্রিন জুড়ে (fixed) বড় হয়ে বসে — প্রিভিউর মতোই; চ্যাট লুকানো থাকলে দেখা যায় না
    var shown = chatShown();
    if (R && !shown && !CFG.outChat) { L = R.querySelector(".fabl"); if (!L) { L = document.createElement("div"); L.className = "fabl"; R.appendChild(L); } L.className = "fabl " + CFG.pos; return L; }
    L = document.getElementById("faFxL"); if (!L) { L = document.createElement("div"); L.id = "faFxL"; L.className = "fabl fx"; L.style.zIndex = 2147483000; document.body.appendChild(L); }
    L.className = "fabl fx " + CFG.pos; return L;
  }
  function rain(e) {
    if (!e || e === "none") return; if (e === "rnd") e = EM[Math.floor(Math.random() * EM.length)];
    var L = layer(), H = (L.clientHeight || window.innerHeight) + 60;
    for (var i = 0; i < 20; i++) (function (i) { var s = document.createElement("span"); s.className = "farain"; s.textContent = e; s.style.left = (Math.random() * 94) + "%"; L.appendChild(s); s.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(" + H + "px)", opacity: .9 }], { duration: 2600 + Math.random() * 1800, delay: i * 120, fill: "both", easing: "ease-in" }).onfinish = function () { s.remove(); }; })(i);
  }
  // o: {t, to, f, an, sp, a, c, e}
  // ইউজার নিজে নিজের জন্য বাবল বন্ধ রাখতে পারে (⋯ মেনু) — শুধু তার ব্রাউজারে, অন্য কারও কিছু বদলায় না
  function myOff() { try { return localStorage.getItem("fa_bub_off") === "1"; } catch (e) { return false; } }
  function userOn() { return !myOff(); }
  function toggleUser() {
    var off = !myOff(); try { if (off) localStorage.setItem("fa_bub_off", "1"); else localStorage.removeItem("fa_bub_off"); } catch (e) {}
    if (off) [].forEach.call(document.querySelectorAll(".fabl .fabw"), function (w) { w.remove(); });
    note(off ? "💬 আপনার জন্য বাবল বন্ধ। ⋯ মেনু থেকে আবার চালু করতে পারবেন।" : "💬 বাবল আবার চালু হয়েছে");
  }
  function bubble(o, quiet) {
    if (CFG.kill && !o.force) return;
    if (!o.force && myOff()) return;
    if (!o.force && X) { var sh = chatShown(); if (sh ? !CFG.inChat : !CFG.outChat) return; } // অ্যাডমিন সুইচ: চ্যাটের ভেতরে / বাইরে বাবল চালু-বন্ধ
    var a = o.a != null ? +o.a : (CFG.rnd ? Math.floor(Math.random() * 11) : CFG.anim), col = o.c || (o.sp ? "gold" : CFG.color), em = o.e != null && o.e !== "" ? o.e : CFG.emoji;
    var wrap = document.createElement("div"); wrap.className = "fabw";
    var el = document.createElement("div"); el.className = "fabub fc-" + col + " fsz" + CFG.size; wrap.appendChild(el);
    var h = "";
    if (o.sp) h += "<small>🎉 বিশেষ বার্তা</small>";
    else if (o.f) h += "<small>💬 " + esc(o.f) + (o.to ? " ➜ @" + esc(o.to) : " ➜ সবাই" + (o.an ? " (বেনামি)" : "")) + "</small>";
    else if (o.an) h += "<small>💬 বেনামি বাবল</small>";
    var showTo = o.to && !(o.f && !o.sp);
    h += (showTo ? '<span class="at">@' + esc(o.to) + "</span>" : "") + '<span class="tx">' + (a === 2 ? "" : esc(o.t)) + "</span>"; el.innerHTML = h;
    var L = layer(); L.appendChild(wrap); if (!quiet) beep();
    var xb = document.createElement("button"); xb.type = "button"; xb.className = "fax"; xb.setAttribute("aria-label", "বাবল বন্ধ করুন"); xb.textContent = "✕"; wrap.appendChild(xb);
    xb.onclick = function (ev) { ev.stopPropagation(); wrap.remove(); };
    var IN = .85, OUT = .8, H2 = hold(o.t), D = (IN + H2 + OUT) * 1000, k = KF[a] || KF[0];
    var ex = a === 10 ? { opacity: 0, transform: "translateY(-70px) scale(1.2)", filter: "blur(16px)" } : { opacity: 0, transform: "translateY(-90px) scale(1.06)" };
    var f = [Object.assign({ offset: 0, easing: "cubic-bezier(.17,1.45,.35,1)" }, k[0]),
      Object.assign({ offset: IN * 1000 / D }, k[1]),
      Object.assign({ offset: (IN + H2) * 1000 / D, easing: "ease-in" }, k[1]), Object.assign({ offset: 1 }, ex)];
    f[0].opacity = 0; f[1].opacity = 1;
    wrap.animate(f, { duration: D, fill: "both" }).onfinish = function () { wrap.remove(); };
    // ভাসা: বসার পর হালকা ওঠানামা
    el.animate([{ transform: "translateY(0)" }, { transform: "translateY(-7px)" }, { transform: "translateY(0)" }], { duration: 2400, delay: IN * 700, iterations: Infinity, easing: "ease-in-out" });
    // ঠাস: বসার মুহূর্তে শকওয়েভ রিং + স্ক্রিন কাঁপুনি + ধপ শব্দ
    setTimeout(function () {
      if (!wrap.parentNode) return;
      var ring = document.createElement("i"); ring.className = "fari"; wrap.appendChild(ring);
      ring.animate([{ opacity: .7, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.7,2.4)" }], { duration: 650, easing: "ease-out" }).onfinish = function () { ring.remove(); };
      try { L.animate([{ transform: "translate(0,0)" }, { transform: "translate(-5px,4px)" }, { transform: "translate(5px,-4px)" }, { transform: "translate(-3px,2px)" }, { transform: "translate(0,0)" }], { duration: 300 }); } catch (e) {}
      if (!quiet) thud();
    }, IN * 380);
    if (a === 2) { var tx = el.querySelector(".tx"), ch = Array.from(o.t), i = 0, st = Math.max(30, (H2 * 600) / ch.length), iv = setInterval(function () { tx.textContent = ch.slice(0, ++i).join(""); if (i >= ch.length) clearInterval(iv); }, st); }
    if (a === 9) for (var j = 0; j < 8; j++) { var s = document.createElement("span"); s.className = "faspk"; s.textContent = "✨"; s.style.left = (Math.random() * 100) + "%"; s.style.top = (Math.random() * 100) + "%"; el.appendChild(s); s.animate([{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1.3)" }, { opacity: 0, transform: "scale(0)" }], { duration: 900, delay: j * 140, iterations: 2 }); }
    rain(em);
  }

  // ---------------- স্ট্রিপ ----------------
  function setDesign(k) { var tr = X && X.root.querySelector(".fatr"); if (!tr) return; tr.className = "fatr fad" + k; DS = k; speed(); }
  function speed() {}
  // মার্কিউ JS দিয়ে চলে (পিক্সেল/সেকেন্ড): নতুন নাম শেষে যোগ হলেও চলন্ত অবস্থান নড়ে না, শুরু থেকে রিস্টার্ট হয় না।
  var MX = 0, RAF = 0, LT = 0, HOLD = false;
  function tick(t) {
    if (!X) { RAF = 0; return; }
    var tr = X.root.querySelector(".fatr"), vp = X.root.querySelector(".favp");
    if (tr && vp) { var dt = LT ? Math.min(.1, (t - LT) / 1000) : 0; LT = t; if (!HOLD) { MX -= Math.max(5, +CFG.speed || 30) * dt; if (MX < -tr.scrollWidth) MX = vp.offsetWidth; tr.style.transform = "translateX(" + MX.toFixed(1) + "px)"; } }
    RAF = requestAnimationFrame(tick);
  }
  var CI = 0;
  function drawNames(L) {
    var tr = X.root.querySelector(".fatr"), vp = X.root.querySelector(".favp"); ONL = L.length;
    var em = X.root.querySelector(".faolt em"); if (em) em.textContent = "(" + bd(Math.max(ONL, 1)) + " জন)";
    if (!L.length) { if (!tr.querySelector(".fae")) { tr.innerHTML = '<div class="fas fae" style="--a:#64748b;--b:#334155;cursor:default"><span>এখন আর কেউ অনলাইনে নেই</span></div>'; MX = vp.offsetWidth; } return; }
    if (tr.querySelector(".fae")) { tr.innerHTML = ""; MX = vp.offsetWidth; }
    var have = {}; Array.prototype.forEach.call(tr.querySelectorAll(".fas"), function (e) { have[e.dataset.k] = e; });
    var want = {}; L.forEach(function (m) { want[m.u] = m; });
    Object.keys(have).forEach(function (k) {
      var e = have[k]; if (want[k]) return;
      var w = e.offsetWidth + 12; if (e.offsetLeft < -MX) MX += w; // সামনের (বাঁয়ে সরে যাওয়া) ব্যাজ সরালে বাকিরা লাফ দেবে না
      e.remove(); delete have[k];
    });
    L.forEach(function (m) {
      var e = have[m.u];
      if (!e) { var c = P[CI++ % P.length]; e = document.createElement("div"); e.className = "fas"; e.dataset.k = m.u; e.style.cssText = "--a:" + c[0] + ";--b:" + c[1]; e.innerHTML = "<span></span>"; tr.appendChild(e); }
      e.dataset.n = m.n; e.dataset.u = m.tu || (m.me ? (ME.u || "") : m.u); e.dataset.me = m.me ? "1" : ""; e.style.cursor = "";
      var t = m.n + (m.me && X.cur() && m.n === X.cur().n ? " (আপনি)" : ""), sp = e.firstChild; if (sp.textContent !== t) sp.textContent = t;
    });
  }
  // একবার নাম উঠলে ইউজার চলে গেলেও ৩ মিনিট (LINGER) স্ট্রিপে থাকবে
  var SEENU = {}, LINGER = 180000;
  // নিজে চ্যাটে ঢুকে থাকলে নিজে সবসময় অনলাইন — তাই স্ট্রিপ কখনো ফাঁকা থাকে না, সার্ভারের উত্তরের আগেই নিজের নাম দেখায়
  function withMe(out) {
    var c = X.cur(), n = (c && c.n) || "বেনামি";
    for (var i = 0; i < out.length; i++) if (out[i].me) return out;
    out.push({ u: "~me", n: n, t: Date.now(), me: true }); return out;
  }
  function loadNames() {
    if (!X) return; var cur = X.cur();
    function show(arr) {
      if (!X) return; var now = Date.now(), me = ME.u;
      arr.forEach(function (m) { SEENU[m.k] = { u: m.u, n: m.n, t: now }; });
      var out = [];
      Object.keys(SEENU).forEach(function (k) { var e = SEENU[k]; if (now - e.t > LINGER) delete SEENU[k]; else out.push({ u: k, tu: e.u, n: e.n, t: e.t, me: !!me && e.u === me }); });
      out.sort(function (x, y) { return y.t - x.t; });
      drawNames(withMe(out));
    }
    X.rpc("mc2_bub_online", { p_session: +cur.s }).then(function (L) {
      if (!Array.isArray(L)) throw 0; show(L.map(function (m) { return { k: m.k, u: m.u, n: m.n }; }));
    }).catch(function () {
      // SQL-21 না চালালে: আগের পথ (সর্বশেষ বার্তার নাম)
      X.rpc("mc2_ac_members", { p_session: +cur.s }).then(function (L) {
        show((L || []).filter(function (m) { return m.onl && m.u; }).map(function (m) { return { k: m.u, u: m.u, n: m.n }; }));
      }).catch(function () { if (X) drawNames(withMe([])); });
    });
  }
  // নিজের উপস্থিতি জানানো (সার্ভারে "অনলাইন" ধরার জন্য) — চ্যাটে থাকা অবস্থায় প্রতি ২০ সেকেন্ডে
  function ping() {
    if (!X || document.hidden) return; var c = X.cur(); if (!c) return;
    try { var r = X.rpc("mc2_bub_ping", { p_voter: X.vid(), p_session: +c.s, p_nick: c.n || "" }); if (r && r.catch) r.catch(function () {}); } catch (e) {}
  }
  function canSend() { return !!(CFG.userShow || (X && X.adm())); }

  // ---------------- লিমিট লেখা ও পাঠানো ----------------
  function eff(k) { var b = CFG.lim[k]; return { m: ME.lm > 0 ? ME.lm : b.m, t: ME.lt > 0 ? ME.lt : b.t }; }
  function limLine(k) { if (X && X.adm()) return "🛠 আপনি অ্যাডমিন — লিমিট নেই"; var l = eff(k); return "⏱ আপনার লিমিট: ১ মিনিটে " + bd(l.m) + " বার অথবা ১০ মিনিটে " + bd(l.t) + " বার"; }
  function errMsg(r) {
    var e = r && r.err;
    if (e === "limit") return "⏳ আরও " + bd(r.wait || 1) + " সেকেন্ড অপেক্ষা করুন (লিমিট: ১ মিনিটে " + bd(r.lm) + " বার / ১০ মিনিটে " + bd(r.lt) + " বার)";
    if (e === "badword") return "⚠ খারাপ শব্দ লিখেছেন, সেন্ড হবে না";
    if (e === "muted") return "অ্যাডমিন আপনার বাবল বন্ধ করে রেখেছেন";
    if (e === "kill") return "🛑 বাবল এখন বন্ধ আছে";
    if (e === "off") return "এই সুবিধা এখন বন্ধ আছে";
    if (e === "long") return "সর্বোচ্চ " + bd(r.max || CFG.max) + " অক্ষর";
    if (e === "empty") return "কিছু লিখুন";
    return "পাঠানো যায়নি — আবার চেষ্টা করুন";
  }
  function closeCmp() { var c = X && X.root.querySelector(".facmp"); if (c) c.remove(); }
  function openCmp(t) { // t = {u, n} বা null (নাম ছাড়া)
    if (!X) return; closeCmp();
    if (CFG.kill) { note("🛑 বাবল এখন বন্ধ আছে"); return; }
    var adm = X.adm(), an = !t, k = an ? "a" : "n";
    if (an && !CFG.anonOn && !adm) { note("নাম ছাড়া বাবল এখন বন্ধ আছে"); return; }
    if (!an && !CFG.userShow && !adm) return;
    var pick = { a: null, c: null, e: null }, c = document.createElement("div"); c.className = "facmp";
    var h = '<button class="fax2" id="faCl" type="button" aria-label="বন্ধ করুন">✕</button><h4>' + (an ? "💬 নাম ছাড়া বাবল (সবাই দেখবে)" : "💬 @" + esc(t.n) + " কে বাবল পাঠান") + '</h4><div class="fa-lim">' + limLine(k) + '</div><textarea id="faTx" placeholder="এখানে লিখুন…"></textarea><div class="fa-row"><span class="fa-cnt" id="faCn">' + bd(0) + " / " + bd(CFG.max) + "</span></div>";
    var opt = "";
    if (adm || CFG.userAnim) opt += '<div class="fa-row">🎞 <select id="faAn"><option value="">ডিফল্ট' + (CFG.rnd ? " (র‍্যান্ডম)" : "") + "</option>" + ANIMS.map(function (a, i) { return '<option value="' + i + '">' + bd(i + 1) + ". " + a + "</option>"; }).join("") + "</select></div>";
    if (adm || CFG.userColor) opt += '<div class="fa-row">🎨 ' + Object.keys(COL).map(function (q) { return '<button type="button" class="fachip" data-c="' + q + '" title="' + COLN[q] + '" style="background:' + COL[q] + '"></button>'; }).join("") + "</div>";
    if (adm || CFG.userEmoji) opt += '<div class="fa-row">✨ <button type="button" class="faemo on" data-e="">ডিফল্ট</button><button type="button" class="faemo" data-e="none">নেই</button><button type="button" class="faemo" data-e="rnd">🔀</button>' + EM.map(function (e) { return '<button type="button" class="faemo" data-e="' + e + '">' + e + "</button>"; }).join("") + "</div>";
    h += '<div class="fa-err" id="faEr"></div><div class="fa-row"><button type="button" class="fabtn" id="faSd">➤ পাঠান</button>' + (opt ? '<button type="button" class="fabtn l" id="faOp" aria-expanded="false">⚙ অপশন ▾</button>' : "") + '</div>' + (opt ? '<div class="fa-opt" id="faOpt" hidden>' + opt + "</div>" : "");
    c.innerHTML = h; X.root.appendChild(c);
    var ta = c.querySelector("#faTx"), er = c.querySelector("#faEr"), busy = false; try { ta.focus(); } catch (e) {}
    ta.oninput = function () { var a = Array.from(ta.value); if (a.length > CFG.max) ta.value = a.slice(0, CFG.max).join(""); c.querySelector("#faCn").textContent = bd(clen(ta.value)) + " / " + bd(CFG.max) + " · থাকবে " + bd(hold(ta.value || "x")) + " সে."; };
    c.querySelector("#faCl").onclick = closeCmp;
    var fo = c.querySelector("#faOp"); if (fo) fo.onclick = function () { var bx = c.querySelector("#faOpt"), op = bx.hidden; bx.hidden = !op; fo.textContent = op ? "⚙ অপশন ▴" : "⚙ অপশন ▾"; fo.setAttribute("aria-expanded", op ? "true" : "false"); };
    [].forEach.call(c.querySelectorAll("[data-c]"), function (b) { b.onclick = function () { pick.c = b.dataset.c; [].forEach.call(c.querySelectorAll("[data-c]"), function (x) { x.classList.toggle("on", x === b); }); }; });
    [].forEach.call(c.querySelectorAll("[data-e]"), function (b) { b.onclick = function () { pick.e = b.dataset.e === "" ? null : b.dataset.e; [].forEach.call(c.querySelectorAll("[data-e]"), function (x) { x.classList.toggle("on", x === b); }); }; });
    c.querySelector("#faSd").onclick = function () {
      if (busy) return; var txt = ta.value.trim(); er.textContent = ""; if (!txt) { er.textContent = "কিছু লিখুন"; return; }
      var sel = c.querySelector("#faAn"); pick.a = sel && sel.value !== "" ? +sel.value : null; busy = true;
      var args = { p_session: +X.cur().s, p_nick: X.cur().n, p_voter: X.vid(), p_to_uid: t ? t.u : null, p_to_nick: t ? t.n : null, p_body: txt, p_anon: an, p_anim: pick.a, p_color: pick.c, p_emoji: pick.e };
      (adm ? X.arpc("mc2_bub_send", args) : X.rpc("mc2_bub_send", args)).then(function (r) {
        busy = false; if (r && r.ok) { SEEN[r.id] = 1; closeCmp(); bubble({ t: txt, to: t && t.n, f: ((!an && CFG.showSender) || CFG.showAnon) ? X.cur().n : null, an: an, a: adm || CFG.userAnim ? pick.a : null, c: adm || CFG.userColor ? pick.c : null, e: adm || CFG.userEmoji ? pick.e : null }); }
        else er.textContent = errMsg(r);
      }).catch(function () { busy = false; er.textContent = "পাঠানো যায়নি — SQL-20 চালানো আছে কি? নেটওয়ার্কও দেখুন।"; });
    };
  }
  function note(m) { if (!X) return; var e = X.root.querySelector(".fatoast"); if (!e) { e = document.createElement("div"); e.className = "fatoast"; X.root.appendChild(e); } e.textContent = m; e.style.display = "block"; clearTimeout(NOTE); NOTE = setTimeout(function () { e.style.display = "none"; }, 3200); }

  // ---------------- পোলিং ----------------
  function applyCfg(c) {
    var old = JSON.stringify([CFG.speed, CFG.design]); CFG = merge(c);
    if (!X) return; var ab = X.root.querySelector(".faab"); if (ab) ab.style.display = (CFG.anonOn || X.adm()) ? "" : "none";
    X.root.classList.toggle("fa-adm", !!X.adm());
    if (old !== JSON.stringify([CFG.speed, CFG.design])) { AUTO = CFG.design === "auto"; if (!AUTO) setDesign(+CFG.design || 1); else speed(); }
  }
  function poll() {
    if (X && !document.body.contains(X.root)) { unmount(); return; }
    if (!X || document.hidden) return;
    X.rpc("mc2_bub_get", { p_session: +X.cur().s, p_after: LAST, p_voter: X.vid() }).then(function (r) {
      if (!r || !X) return; ME = r.me || ME; applyCfg(r.cfg); var first = LAST < 0; LAST = Math.max(LAST, +r.last || 0);
      if (first) loadNames();
      if (first || CFG.kill) return;
      (r.items || []).forEach(function (it) {
        if (SEEN[it.id]) return; SEEN[it.id] = 1;
        // দৃশ্যমানতা: "to" হলে নামে-পাঠানো বাবল শুধু যাকে দিয়েছে সে (ও অ্যাডমিন, সুইচ অন থাকলে) দেখে; নাম-ছাড়া ও বিশেষ বাবল সবসময় সবাই দেখে
        if (CFG.vis === "to" && !it.sp && !it.an && it.tu && it.tu !== ME.u && !(CFG.admSee && X.adm())) return;
        if (it.tu && it.tu === ME.u && CFG.notify && !it.sp) note("💬 " + (it.f || "কেউ একজন") + " আপনাকে একটা বাবল পাঠিয়েছেন");
        var vis = chatShown() || !!CFG.outChat; bubble({ t: it.t, to: it.to, f: it.f, an: it.an, sp: it.sp, a: it.a, c: it.c, e: it.e }, !vis);
      });
    }).catch(function () {});
  }

  // ---------------- মাউন্ট ----------------
  // x: { root, cur(), rpc(n,a), arpc(n,a), vid(), adm(), input() }
  function mount(x) {
    unmount(); css(); X = x; LAST = -1; SEEN = {}; SEENU = {}; NAMES = ""; CI = 0; AUTO = true; DS = 1;
    var R = x.root; R.classList.add("fa-st");
    var o = document.createElement("div"); o.className = "faol";
    o.innerHTML = '<div class="faolt"><span class="fadot"></span><span class="faot">এখন অনলাইনে আছেন <em>(' + bd(1) + ' জন)</em></span><button type="button" class="faab" style="display:none">💬 নাম ছাড়া বাবল</button></div><div class="favw"><div class="favp"><div class="fatr fad1"></div></div><button type="button" class="falk" aria-label="অ্যাডমিন সেটিং">🔒</button></div>';
    var T = R.querySelector("#acT"); if (T) R.insertBefore(o, T); else R.appendChild(o);
    var tr = o.querySelector(".fatr");
    tr.addEventListener("click", function (e) {
      var el = e.target.closest(".fas"); if (!el || el.classList.contains("fae")) return; var mine = el.dataset.me === "1", t = { u: mine ? (ME.u || el.dataset.u || "") : el.dataset.u, n: mine && x.cur() && x.cur().n ? x.cur().n : el.dataset.n };
      if (canSend()) openCmp(t); else { note("💬 নামে ক্লিক করে বাবল পাঠানো এখন বন্ধ আছে"); if (!mine) { var i = x.input(); if (i) { i.value = "@" + t.n + " " + i.value; i.focus(); } } }
    });
    o.querySelector(".faab").onclick = function () { openCmp(null); };
    o.querySelector(".falk").onclick = function () { openSheet(this); };
    TM.push(setInterval(function () { if (!AUTO || !X) return; var t = X.root.querySelector(".fatr"); if (!t) return; t.classList.add("fasw"); setTimeout(function () { var q = X && X.root.querySelector(".fatr"); if (!q) return; setDesign(DS % 5 + 1); q.classList.remove("fasw"); }, 450); }, 15000));
    var vpEl = o.querySelector(".favp"); MX = vpEl.offsetWidth; LT = 0; HOLD = false; ["mouseenter", "touchstart"].forEach(function (n) { vpEl.addEventListener(n, function () { HOLD = true; }, { passive: true }); }); ["mouseleave", "touchend", "touchcancel"].forEach(function (n) { vpEl.addEventListener(n, function () { HOLD = false; }, { passive: true }); }); cancelAnimationFrame(RAF); RAF = requestAnimationFrame(tick);
    TM.push(setInterval(poll, 3500)); TM.push(setInterval(loadNames, 10000)); TM.push(setInterval(ping, 20000)); ping(); drawNames(withMe([])); loadNames();
    R.classList.toggle("fa-adm", !!x.adm()); setDesign(1); poll(); loadNames();
    setTimeout(function () { if (X) { R.classList.toggle("fa-adm", !!X.adm()); applyCfg(CFG); } }, 1500); setTimeout(function () { if (X) { R.classList.toggle("fa-adm", !!X.adm()); applyCfg(CFG); } }, 5000);
  }
  function unmount() {
    TM.forEach(clearInterval); TM = []; cancelAnimationFrame(RAF); RAF = 0; if (X) { var R = X.root; R.classList.remove("fa-st", "fa-adm"); [".faol", ".facmp", ".fash", ".fabl", ".fatoast"].forEach(function (q) { var e = R.querySelector(q); if (e) e.remove(); }); }
    X = null; LAST = -1; var fx = document.getElementById("faFxL"); if (fx) fx.remove();
  }
  function openSheet(btn) {
    if (!X) return; var R = X.root, old = R.querySelector(".fash"); if (old) { old.remove(); btn.textContent = "🔒"; return; }
    btn.textContent = "🔓"; var s = document.createElement("div"); s.className = "fash"; s.innerHTML = '<div class="sh1"><span>🔓 বাবল সেটিং (শুধু অ্যাডমিন)</span><button type="button" class="fabtn l" id="faSx">✕ বন্ধ</button></div><div class="bd"></div>';
    R.appendChild(s); s.querySelector("#faSx").onclick = function () { s.remove(); btn.textContent = "🔒"; };
    panel(s.querySelector(".bd"), { rpc: function (n, a) { return X.arpc(n, a); }, session: function () { return +X.cur().s; } });
  }

  // ---------------- অ্যাডমিন প্যানেল (তালা-ফোল্ডার ও মূল অ্যাডমিন — দুই জায়গায় একই) ----------------
  // host: ফাঁকা DOM; A: { rpc(name,args) → Promise, session() }
  function panel(host, A) {
    css(); host.innerHTML = '<div class="fap">⏳ লোড হচ্ছে…</div>';
    var C = merge({}), USERS = [], saveT = null;
    A.rpc("mc2_bub_get", { p_session: 0, p_after: -1, p_voter: "" }).then(function (r) { C = merge(r && r.cfg); draw(); }).catch(function (e) { host.innerHTML = '<div class="fap"><b style="color:#d11a2a">লোড হয়নি — SQL-20 চালানো আছে কি? (' + esc(e && e.message ? String(e.message).slice(0, 80) : "") + ")</b></div>"; });
    function save(now) { clearTimeout(saveT); var st = host.querySelector("#faSv"); if (st) st.textContent = "…"; saveT = setTimeout(function () { A.rpc("mc2_admin_set_bub", { p_cfg: C }).then(function () { if (st) st.textContent = "✔ সেভ হয়েছে"; }).catch(function (e) { if (st) st.textContent = "✖ সেভ হয়নি: " + (e && e.message ? String(e.message).slice(0, 80) : ""); }); }, now ? 0 : 500); }
    function sw(k, l) { return '<div class="f"><span>' + l + '</span><button type="button" class="fasw2' + (C[k] ? " on" : "") + '" data-k="' + k + '"></button></div>'; }
    function opt(v, t, s) { return '<option value="' + v + '"' + (String(s) === String(v) ? " selected" : "") + ">" + t + "</option>"; }
    function draw() {
      var o = opt, h = '<div class="fap"><div class="f"><button type="button" class="fabtn ' + (C.kill ? "" : "r") + '" id="faKill">' + (C.kill ? "✅ বাবল আবার চালু করুন" : "🛑 জরুরি অফ — সব বাবল এখনই বন্ধ") + '</button><small id="faSv"></small></div>' +
        "<details open><summary>🎞 অনলাইন স্ট্রিপ (গতি ও ডিজাইন)</summary><div>" +
        '<div class="f"><span>⏩ গতি</span><input type="range" id="faSp" min="5" max="200" value="' + C.speed + '"><b id="faSpv">' + bd(C.speed) + "</b></div>" +
        '<div class="f"><span>🎨 ডিজাইন</span><select id="faDs">' + o("auto", "🔄 নিজে নিজে ঘুরবে", C.design) + ["শিল্ড", "রিবন", "গ্লাস ক্যাপসুল", "টিকিট", "ষড়ভুজ"].map(function (n, i) { return o(i + 1, n, C.design); }).join("") + "</select></div></div></details>" +
        "<details open><summary>💬 বাবল — লেখা, সময়, সাউন্ড, জায়গা</summary><div>" +
        '<div class="f"><span>সর্বোচ্চ অক্ষর (যেকোনো ভাষা)</span><input type="number" id="faMx" min="5" max="500" value="' + C.max + '"></div>' +
        '<div class="f"><span>প্রতি ১০ অক্ষরে কত সেকেন্ড থাকবে</span><input type="number" id="faSc" step="0.5" min="0.5" max="30" value="' + C.sec + '"></div>' + sw("snd", "🔊 বাবল ওঠার সাউন্ড") + sw("inChat", "🟢 চ্যাটের ভেতরে বাবল দেখাবে") + sw("outChat", "🌐 চ্যাটের বাইরে (চ্যাট মিনিমাইজ/অন্য পেইজে থাকলে) বাবল দেখাবে") +
        '<div class="f"><span>📍 কোথায় আসবে</span><select id="faPs">' + o("top", "উপরে", C.pos) + o("mid", "মাঝে", C.pos) + o("bot", "নিচে", C.pos) + '</select></div>' +
        '<div class="f"><span>🔠 সাইজ</span><select id="faSz">' + o(1, "ছোট", C.size) + o(2, "মাঝারি", C.size) + o(3, "বড়", C.size) + '</select></div>' +
        '<div class="f"><span>🎨 ডিফল্ট রঙ</span><select id="faCl">' + Object.keys(COL).map(function (k) { return o(k, COLN[k], C.color); }).join("") + "</select></div>" +
        '<div class="f"><span>✨ ইমোজি বৃষ্টি</span><select id="faEm">' + o("rnd", "🔀 র‍্যান্ডম (যেকোনো একটা)", C.emoji) + o("none", "নেই", C.emoji) + EM.map(function (e) { return o(e, e, C.emoji); }).join("") + "</select></div></div></details>" +
        "<details><summary>🎬 অ্যানিমেশন (ক্লিক করলেই প্রিভিউ)</summary><div>" + sw("rnd", "🔀 র‍্যান্ডম — প্রতিবার যেকোনো একটা (ডিফল্ট)") + '<div class="faag">' + ANIMS.map(function (a, i) { return '<button type="button" data-a="' + i + '" class="' + (!C.rnd && C.anim === i ? "on" : "") + '">' + bd(i + 1) + ". " + a + "</button>"; }).join("") + '</div><div class="f"><button type="button" class="fabtn" id="faPv">▶ প্রিভিউ দেখুন</button></div></div></details>' +
        "<details open><summary>👥 ইউজারের জন্য সুইচ (নামে ক্লিক ও নাম ছাড়া শুরুতে চালু)</summary><div>" + sw("userShow", "👤 ইউজার নামে ক্লিক করে বাবল পাঠাতে পারবে") + sw("anonOn", '💬 "নাম ছাড়া বাবল" শিল্ড বাটন (ইউজারকে দেখাবে)') + sw("userAnim", "🎞 ইউজার অ্যানিমেশন বাছতে পারবে") + sw("userColor", "🎨 ইউজার রঙ বাছতে পারবে") + sw("userEmoji", "✨ ইউজার ইমোজি বৃষ্টি বাছতে পারবে") +
        '<div class="f"><span>👁 নামে-পাঠানো বাবল কে দেখবে</span><select id="faVs">' + o("all", "সবাই দেখবে (ডিফল্ট)", C.vis) + o("to", "শুধু যাকে দিয়েছে সে দেখবে", C.vis) + "</select></div>" + sw("admSee", "🛡 \"শুধু যাকে দিয়েছে\" থাকলেও অ্যাডমিন সব বাবল দেখবে") + sw("showSender", '🏷 "কে পাঠাল" নাম দেখাবে (বেনামি বাদে)') + sw("showAnon", "🕵 কে কাকে পাঠাল — বেনামিসহ সবার নাম সবাইকে দেখাবে") + sw("notify", '🔔 "কে তোমাকে বাবল পাঠাল" নোটিফিকেশন') + "<small>বেনামির আসল নাম অ্যাডমিন লগে সবসময় দেখা যায়, এই সুইচ বন্ধ থাকলেও। নাম-ছাড়া বাবল ও বিশেষ দিনের বাবল কারও নির্দিষ্ট প্রাপক নেই, তাই সবসময় সবাই দেখে।</small></div></details>" +
        "<details open><summary>⏱ স্প্যাম লিমিট (ডিফল্ট: ১ মিনিটে ১ বার · ১০ মিনিটে ৩ বার)</summary><div>" + ["n", "a"].map(function (k) { return "<b>" + (k === "n" ? "নামে ক্লিক করে বাবল" : "নাম ছাড়া বাবল") + '</b><div class="f"><span>১ মিনিটে</span><input type="number" min="1" data-l="' + k + 'm" value="' + C.lim[k].m + '"> বার</div><div class="f"><span>১০ মিনিটে</span><input type="number" min="1" data-l="' + k + 't" value="' + C.lim[k].t + '"> বার</div>'; }).join("") + "<small>ইউজার বাক্স খুললে ওপরে এই লিমিট লাল লেখায় দেখবে। অ্যাডমিনের লিমিট নেই।</small></div></details>" +
        "<details><summary>👤 ইউজার ধরে ধরে (বাবল বন্ধ / আলাদা লিমিট)</summary><div id='faUs'><small>লোড হচ্ছে…</small></div></details>" +
        "<details><summary>🎉 বিশেষ দিনের বাবল (অ্যাডমিন → সব রুমে সবাইকে)</summary><div><textarea id='faSp2' style='width:100%;height:50px' maxlength='200'>🎂 শুভ জন্মদিন! আজ আমাদের এক বন্ধুর বিশেষ দিন।</textarea><div class='f'><button type='button' class='fabtn' id='faSpb'>🎂 সবাইকে পাঠান</button><small id='faSpm'></small></div></div></details>" +
        "<details open><summary>📜 লগ — কে কাকে কী পাঠাল (আটকানোগুলোও)</summary><div><div class='f'><button type='button' class='fabtn l' id='faLr'>↻ রিফ্রেশ</button><button type='button' class='fabtn l' id='faLc'>🗑 লগ মুছুন</button></div><div id='faLg'><small>লোড হচ্ছে…</small></div></div></details></div>";
      host.innerHTML = h; bind(); users(); log();
    }
    function bind() {
      var q = function (s) { return host.querySelector(s); };
      [].forEach.call(host.querySelectorAll("[data-k]"), function (b) { b.onclick = function () { C[b.dataset.k] = !C[b.dataset.k]; b.classList.toggle("on", C[b.dataset.k]); if (b.dataset.k === "rnd") draw(); save(); }; });
      q("#faKill").onclick = function () { C.kill = !C.kill; if (C.kill) { var L = document.querySelectorAll(".fabl .fabub"); [].forEach.call(L, function (e) { e.remove(); }); } save(true); draw(); };
      q("#faSp").oninput = function () { C.speed = +this.value; q("#faSpv").textContent = bd(C.speed); save(); };
      q("#faDs").onchange = function () { C.design = this.value === "auto" ? "auto" : +this.value; save(); };
      q("#faMx").onchange = function () { C.max = Math.min(500, Math.max(5, +this.value || 50)); this.value = C.max; save(); };
      q("#faSc").onchange = function () { C.sec = Math.min(30, Math.max(.5, +this.value || 1.5)); this.value = C.sec; save(); };
      q("#faVs").onchange = function () { C.vis = this.value === "to" ? "to" : "all"; save(); };
      q("#faPs").onchange = function () { C.pos = this.value; save(); }; q("#faSz").onchange = function () { C.size = +this.value; save(); }; q("#faCl").onchange = function () { C.color = this.value; save(); }; q("#faEm").onchange = function () { C.emoji = this.value; save(); };
      [].forEach.call(host.querySelectorAll("[data-a]"), function (b) { b.onclick = function () { C.anim = +b.dataset.a; C.rnd = false; save(); draw(); preview(C.anim); }; });
      q("#faPv").onclick = function () { preview(C.rnd ? null : C.anim); };
      [].forEach.call(host.querySelectorAll("[data-l]"), function (e) { e.onchange = function () { var d = e.dataset.l; C.lim[d[0]][d[1]] = Math.max(1, +e.value || 1); e.value = C.lim[d[0]][d[1]]; save(); }; });
      q("#faSpb").onclick = function () { var t = q("#faSp2").value.trim(); if (!t) return; A.rpc("mc2_admin_bub_special", { p_body: t, p_emoji: "🎉", p_anim: 9, p_color: "gold" }).then(function () { q("#faSpm").textContent = "✔ পাঠানো হয়েছে (৩-৪ সেকেন্ডে সবার কাছে যাবে)"; log(); }).catch(function (e) { q("#faSpm").textContent = "✖ " + (e && e.message ? String(e.message).slice(0, 80) : "হয়নি"); }); };
      q("#faLr").onclick = log; q("#faLc").onclick = function () { if (!confirm("সব বাবল লগ মুছবেন?")) return; A.rpc("mc2_admin_bub_clear", {}).then(log); };
    }
    function preview(a) { var pc = JSON.parse(JSON.stringify(CFG)); CFG = C; var keep = CFG.kill; CFG.kill = false; TOPMODE = true; try { bubble({ t: "এটা একটা নমুনা বাবল লেখা, প্রিভিউ দেখছেন", to: "সুমাইয়া", a: a, force: true }); } finally { TOPMODE = false; } CFG.kill = keep; CFG = pc; }
    function users() {
      A.rpc("mc2_admin_bub_users", {}).then(function (L) {
        USERS = L || []; var b = host.querySelector("#faUs"); if (!b) return;
        b.innerHTML = "<table><tr><th>ইউজার</th><th>বন্ধ</th><th>১মি</th><th>১০মি</th><th>আজ</th></tr>" + USERS.map(function (u, i) { return "<tr><td>" + esc(u.n || "—") + "<br><small>" + esc(u.u) + '</small></td><td><button type="button" class="fasw2' + (u.mu ? " on" : "") + '" data-m="' + i + '"></button></td><td><input type="number" style="width:46px" min="0" data-o="' + i + '|lm" value="' + u.lm + '"></td><td><input type="number" style="width:46px" min="0" data-o="' + i + '|lt" value="' + u.lt + '"></td><td>' + bd(u.today || 0) + "</td></tr>"; }).join("") + "</table><small>০ = ডিফল্ট লিমিট। \"বন্ধ\" করলে ওই ইউজার কোনো বাবল দিতে পারবে না (আইডি ব্যান হয় না)।</small>";
        var sv = function (u) { A.rpc("mc2_admin_bub_user_set", { p_uid: u.u, p_nick: u.n, p_muted: !!u.mu, p_m: +u.lm || 0, p_t: +u.lt || 0 }).catch(function (e) { alert("হয়নি: " + (e && e.message ? e.message : e)); }); };
        [].forEach.call(b.querySelectorAll("[data-m]"), function (e) { e.onclick = function () { var u = USERS[+e.dataset.m]; u.mu = !u.mu; e.classList.toggle("on", u.mu); sv(u); }; });
        [].forEach.call(b.querySelectorAll("[data-o]"), function (e) { e.onchange = function () { var p = e.dataset.o.split("|"), u = USERS[+p[0]]; u[p[1]] = Math.max(0, +e.value || 0); sv(u); }; });
      }).catch(function () { var b = host.querySelector("#faUs"); if (b) b.innerHTML = "<small>লোড হয়নি</small>"; });
    }
    function log() {
      A.rpc("mc2_admin_bub_log", { p_limit: 300 }).then(function (L) {
        var b = host.querySelector("#faLg"); if (!b) return; var ST = { ok: "পাঠানো হয়েছে", badword: "খারাপ শব্দ — আটকানো", limit: "লিমিট — আটকানো", muted: "বন্ধ করা ইউজার — আটকানো" };
        // 🎭 একই ডিভাইস (একই ছদ্ম-আইডি) থেকে একাধিক নামে বাবল দিলে — নামগুলো এক গ্রুপে
        var G = {}; (L || []).forEach(function (x) { if (!x.uid) return; var g = G[x.uid] || (G[x.uid] = { names: {}, n: 0 }); g.n++; g.names[x.nick || "—"] = (g.names[x.nick || "—"] || 0) + 1; });
        var GH = Object.keys(G).filter(function (u) { return Object.keys(G[u].names).length > 1; }).sort(function (a, c) { return Object.keys(G[c].names).length - Object.keys(G[a].names).length; }).map(function (u) {
          var ns = Object.keys(G[u].names); return '<div class="fa-logl"><b>🎭 ' + bd(ns.length) + " নাম — একই ব্যক্তি</b> <small>" + esc(u) + "</small><br>" + ns.map(function (n) { return esc(n) + " <small>(" + bd(G[u].names[n]) + "টা)</small>"; }).join(" · ") + "</div>";
        }).join("");
        GH = '<div style="margin-bottom:8px"><b>🎭 একই ডিভাইস, একাধিক নাম</b> <small>(লগের শেষ ৩০০ বাবল থেকে)</small>' + (GH || "<div><small>এখনো কেউ একাধিক নামে বাবল দেননি।</small></div>") + "</div>";
        b.innerHTML = GH + ((L || []).length ? L.map(function (x) { var d = new Date(x.ts); return '<div class="fa-logl' + (x.st !== "ok" ? " bad" : "") + '">' + bd(d.getHours() + ":" + ("0" + d.getMinutes()).slice(-2)) + " · <b>" + esc(x.nick || "—") + "</b> <small>" + esc(x.uid) + "</small> ➜ " + (x.sp ? "সবাই (বিশেষ)" : x.an ? "সবাই (নাম ছাড়া)" : x.to ? "@" + esc(x.to) : "—") + '<br>"' + esc(x.t) + '" · ' + (ST[x.st] || esc(x.st)) + "</div>"; }).join("") : "<small>এখনো কোনো বাবল নেই।</small>");
      }).catch(function () { var b = host.querySelector("#faLg"); if (b) b.innerHTML = "<small>লোড হয়নি</small>"; });
    }
  }
  window.faBub = { mount: mount, unmount: unmount, panel: panel, EM: EM, userOn: userOn, toggleUser: toggleUser };
})();
