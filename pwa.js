/* Friend Adda — pwa.js (ভাগ ২): নোটিফিকেশন/ব্যাজ/হোম-স্ক্রীন গাইড। chat.js শুধু FAPwa.nm(n) ও FAPwa.guide() ডাকে। */
(function () {
  "use strict";
  var LSg = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var LSs = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var $ = function (s) { return document.querySelector(s); };
  var bn = function (n) { return String(n).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  var CNT = 0, REG = null, DEF = null;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = function () { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; };

  // ---- service worker ----
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(function (r) { REG = r; }).catch(function () {});
    navigator.serviceWorker.addEventListener("message", function (e) { if (e.data && e.data.t === "fa-open") { var b = $("#acMin"); if (b) b.click(); } });
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); DEF = e; });

  // ---- ব্যাজ ----
  function badge(n) { try { if (n > 0) { if (navigator.setAppBadge) navigator.setAppBadge(n).catch(function () {}); } else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(function () {}); } catch (e) {} }
  function chatFront() { var x = $("#acx"); return !!x && x.style.display !== "none" && !document.hidden; }
  function clear() { CNT = 0; badge(0); try { if (REG && REG.getNotifications) REG.getNotifications().then(function (l) { l.forEach(function (n) { n.close(); }); }); } catch (e) {} }
  document.addEventListener("visibilitychange", function () { if (chatFront()) clear(); });
  setInterval(function () { if (CNT && chatFront()) clear(); }, 1500);

  // ---- চ্যাট-বারে ঝাঁকুনি ----
  var st = document.createElement("style");
  st.textContent = "@keyframes faShk{0%,100%{transform:translateX(0)}15%{transform:translateX(-7px) rotate(-2deg)}30%{transform:translateX(7px) rotate(2deg)}45%{transform:translateX(-5px)}60%{transform:translateX(5px)}75%{transform:translateX(-2px)}}@keyframes faPop{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}#acMin.faShk{animation:faShk .6s ease,faPop .6s ease}" +
    "#faNp,#faGd{font-family:inherit}#faNp{position:fixed;left:10px;right:10px;bottom:calc(66px + env(safe-area-inset-bottom));z-index:2147483000;background:#0f2d20;color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:12px;box-shadow:0 8px 28px rgba(0,0,0,.45);max-width:420px;margin:0 auto;font-size:14px}#faNp div{margin-bottom:8px}#faNp button,#faGd button{border:0;border-radius:10px;padding:9px 14px;font:inherit;font-weight:600;margin-right:8px;cursor:pointer}#faNp .y,#faGd .y{background:#2fbf71;color:#04210f}#faNp .n,#faGd .n{background:rgba(255,255,255,.15);color:#fff}" +
    "#faGd{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}#faGd .b{background:#0f2d20;color:#fff;border-radius:16px;padding:18px;max-width:380px;width:100%;line-height:1.6;font-size:15px;max-height:86vh;overflow:auto}#faGd h3{margin:0 0 8px;font-size:18px}#faGd p{margin:6px 0}";
  document.head.appendChild(st);
  function shake() { var b = $("#acMin"); if (!b) return; b.classList.remove("faShk"); void b.offsetWidth; b.classList.add("faShk"); }

  // ---- ব্রাউজার নোটিফিকেশন (ব্যাকগ্রাউন্ড ট্যাব) ----
  function localNote(n) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    var o = { body: bn(CNT) + "টি নতুন মেসেজ", tag: "fa-new", renotify: true, icon: "images/icon-192.png", badge: "images/favicon-32.png", vibrate: [120, 60, 120] };
    try { if (REG && REG.showNotification) REG.showNotification("Friend Adda", o); else if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification("Friend Adda", o); }); } catch (e) {}
  }

  // chat.js নতুন বার্তা পেলে ডাকে (n = নতুন বার্তার সংখ্যা)
  function nm(n) {
    if (!n) return;
    var minz = !!$("#acMin");
    if (document.hidden || minz) { CNT += n; badge(CNT); }
    if (minz && !document.hidden) { shake(); try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {} }
    if (document.hidden) localNote(n);
  }

  // ---- অনুমতি: চ্যাটে ঢোকার পর একবার, ইউজারের ট্যাপে ----
  function today() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function askPerm() { // দিনে একবার: অনুমতি এখনো "default" (দেওয়া/ব্লক হয়নি) থাকলে প্রতিদিন প্রথমবার চ্যাটে ঢুকলে চায়
    if (!("Notification" in window) || Notification.permission !== "default" || LSg("fa_np_d") === today()) return;
    if ($("#faNp") || !$("#acM")) return;
    var d = document.createElement("div"); d.id = "faNp";
    d.innerHTML = '<div>🔔 চ্যাট মিনিমাইজ বা ব্যাকগ্রাউন্ডে থাকলেও নতুন মেসেজের খবর পেতে চান?</div><button class="y" type="button">OK</button><button class="n" type="button">No</button>';
    d.querySelector(".y").onclick = function () { LSs("fa_np_d", today()); d.remove(); try { var p = Notification.requestPermission(function () {}); if (p && p.then) p.then(function () {}); } catch (e) {} };
    d.querySelector(".n").onclick = function () { LSs("fa_np_d", today()); d.remove(); };
    document.body.appendChild(d);
  }
  var seen = 0, t0 = setInterval(function () { if ($("#acM")) { if (++seen >= 3) { clearInterval(t0); askPerm(); } } else seen = 0; }, 2000);

  // ---- হোম স্ক্রীনে সেভ গাইড ----
  function guide() {
    var d = document.createElement("div"); d.id = "faGd";
    var h = '<div class="b"><h3>📲 হোম স্ক্রীনে সেভ করুন</h3>';
    if (standalone()) h += "<p>✅ আপনি ইতিমধ্যে অ্যাপ হিসেবেই খুলেছেন।</p>";
    else if (isIOS) h += "<p><b>iPhone / iPad (Safari):</b></p><p>১) নিচের <b>Share</b> (⬆️) বাটনে চাপুন।</p><p>২) <b>Add to Home Screen</b> বেছে নিন।</p><p>৩) <b>Add</b> চাপুন — হোম স্ক্রীনে Friend Adda আইকন আসবে।</p><p style='opacity:.8;font-size:13px'>ℹ️ Safari ছাড়া অন্য ব্রাউজারে এই অপশন নাও থাকতে পারে।</p>";
    else { h += "<p><b>Android (Chrome):</b></p><p>১) ব্রাউজারের উপরের <b>⋯ / ⋮</b> মেনুতে চাপুন।</p><p>২) <b>Install app</b> বা <b>Add to Home screen</b> বেছে নিন।</p>"; if (DEF) h += '<p><button class="y" type="button" id="faIn">📲 এখনই ইনস্টল করুন</button></p>'; }
    h += '<p><button class="n" type="button" id="faX">বন্ধ করুন</button></p></div>';
    d.innerHTML = h;
    d.onclick = function (e) { if (e.target === d || e.target.id === "faX") d.remove(); };
    var i = d.querySelector("#faIn"); if (i) i.onclick = function () { try { DEF.prompt(); DEF.userChoice.then(function () { DEF = null; d.remove(); }); } catch (x) { d.remove(); } };
    document.body.appendChild(d);
  }

  window.FAPwa = { nm: nm, guide: guide, clear: clear };
})();
