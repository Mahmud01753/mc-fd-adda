/* Friend Adda service worker: install/activate + push + notificationclick। ক্যাশ নেই। */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

var BN = "০১২৩৪৫৬৭৮৯";
function bn(n) { return String(n).replace(/\d/g, function (d) { return BN.charAt(d); }); }

// সার্ভার (send-push) থেকে পুশ: {n: নতুন মেসেজ সংখ্যা, b: লেখা, tag}। বার্তার লেখা কখনো আসে না।
// শব্দ: ওয়েবে আলাদা সুর বসানো যায় না — silent:false থাকলে ফোনের নোটিফিকেশন-শব্দ বাজে।
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  var n = Math.max(1, parseInt(d.n, 10) || 1);
  var body = typeof d.b === "string" && d.b ? d.b : bn(n) + "টি নতুন মেসেজ";
  var opts = {
    body: body, tag: "fa-new-" + Date.now(), renotify: true, silent: false, requireInteraction: false,
    icon: "/images/icon-192.png", badge: "/images/favicon-32.png",
    vibrate: [300, 150, 300, 150, 300], data: { s: d.s || 0, n: n }
  };
  e.waitUntil(Promise.all([
    self.registration.showNotification("Friend Adda", opts), // সবসময় দেখানো হয় (iOS ফাঁকা পুশ সহ্য করে না)
    (function () { try { return self.navigator.setAppBadge ? self.navigator.setAppBadge(n) : null; } catch (x) { return null; } })()
  ]));
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if ("focus" in c) { try { c.postMessage({ t: "fa-open" }); } catch (x) {} return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow("/#anon");
  }));
});

// ব্রাউজার subscription বদলালে নতুনটা নেয়; সার্ভারে সেভ হয় পরের বার চ্যাটে ঢুকলে (chat.js সিঙ্ক করে)
self.addEventListener("pushsubscriptionchange", function (e) {
  var old = e.oldSubscription;
  if (!old || !old.options || !old.options.applicationServerKey) return;
  e.waitUntil(self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: old.options.applicationServerKey }).catch(function () {}));
});
