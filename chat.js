// Friend Adda — চ্যাট সিস্টেম (Messenger-স্টাইল): বিভাগ → সেশন → নাম → চ্যাট। ঠিকানা: #anon
// ইমোজি, রিঅ্যাকশন, রিপ্লাই, Seen, নাম Edit, AM/PM সময়, আগের বার্তা, মোছা, ছবি/ভিডিও/অডিও/ফাইল।
// বিভাগ/সেশন/আপলোড ON-OFF অ্যাডমিন প্যানেলের "💬 বেনামি চ্যাট" ট্যাবে। SQL: supabase-anonchat.sql।
// মডারেশন (রিপোর্ট, সতর্কতা, ব্যান, রেট লিমিট, ফাইল যাচাই): SQL supabase-moderation.sql; অ্যাডমিন: "🛡️ মডারেশন" ট্যাব (admin-moderation.js)।
(function () {
  // ডিভাইস-আইডি/নাম হারানো ঠেকাতে: গুরুত্বপূর্ণ কী-গুলো কুকিতেও কপি থাকে। ব্রাউজার localStorage ফাঁকা করে ফেললে (ক্রোম ক্লিন/স্টোরেজ কমে গেলে)
  // কুকি থেকে ফেরত আসে — তাই একই ডিভাইসে নিজের আগের বার্তা আবার \"আমার\" দেখায়, নামও থাকে। লগআউট/ভুলে যাওয়া (removeItem) করলে কুকিও মোছে।
  try {
    var KK = ["mc2_vid", "mc2_ac_p", "fa_unlock", "fa_anon_code", "fa_anon_on"], PF = "fk_";
    var ckGet = function (k) { var m = document.cookie.match(new RegExp("(?:^|; )" + PF + k + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : null; };
    var ckSet = function (k, v) { v = String(v); if (v.length > 3000) return; document.cookie = PF + k + "=" + encodeURIComponent(v) + "; path=/; max-age=34128000; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : ""); };
    var ckDel = function (k) { document.cookie = PF + k + "=; path=/; max-age=0; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : ""); };
    KK.forEach(function (k) { try { var v = localStorage.getItem(k), c = ckGet(k); if (v == null && c != null) localStorage.setItem(k, c); else if (v != null && c == null) ckSet(k, v); } catch (e) {} });
    var sp = Storage.prototype, si = sp.setItem, ri = sp.removeItem;
    sp.setItem = function (k, v) { si.apply(this, arguments); try { if (this === window.localStorage && KK.indexOf(k) >= 0) ckSet(k, v); } catch (e) {} };
    sp.removeItem = function (k) { ri.apply(this, arguments); try { if (this === window.localStorage && KK.indexOf(k) >= 0) ckDel(k); } catch (e) {} };
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); // ব্রাউজারকে বলা: এই সাইটের ডেটা নিজে থেকে মুছো না
    // তৃতীয় কপি: IndexedDB (localStorage ও কুকি দুটোই গেলেও অনেক সময় এটা থাকে)। ফেরত আনা async, তাই ফেরত আসার আগে vid() নতুন আইডি স্থায়ী করে না (window.faIdbPending)।
    var IDBN = "fa_keep", idb = function () { return new Promise(function (ok, no) { try { var q = indexedDB.open(IDBN, 1); q.onupgradeneeded = function () { q.result.createObjectStore("kv"); }; q.onsuccess = function () { ok(q.result); }; q.onerror = function () { no(q.error); }; } catch (e) { no(e); } }); };
    var idbGet = function (k) { return idb().then(function (d) { return new Promise(function (ok) { var r = d.transaction("kv").objectStore("kv").get(k); r.onsuccess = function () { ok(r.result == null ? null : r.result); }; r.onerror = function () { ok(null); }; }); }).catch(function () { return null; }); };
    var idbSet = function (k, v) { return idb().then(function (d) { d.transaction("kv", "readwrite").objectStore("kv").put(String(v), k); }).catch(function () {}); };
    var idbDel = function (k) { return idb().then(function (d) { d.transaction("kv", "readwrite").objectStore("kv").delete(k); }).catch(function () {}); };
    var rawSet = function (k, v) { si.call(window.localStorage, k, v); try { ckSet(k, v); } catch (e) {} };
    window.faIdbPending = !!window.indexedDB;
    if (window.indexedDB) {
      Promise.all(KK.map(function (k) { return idbGet(k).then(function (iv) { var v = null; try { v = localStorage.getItem(k); } catch (e) {} if (v == null && iv != null) { try { rawSet(k, iv); } catch (e) {} } else if (v != null && iv !== v) idbSet(k, v); }); })).then(function () { window.faIdbPending = false; if (window.faIdbDone) window.faIdbDone(); }, function () { window.faIdbPending = false; });
      var s2 = sp.setItem, r2 = sp.removeItem;
      sp.setItem = function (k, v) { s2.apply(this, arguments); try { if (this === window.localStorage && KK.indexOf(k) >= 0) idbSet(k, v); } catch (e) {} };
      sp.removeItem = function (k) { r2.apply(this, arguments); try { if (this === window.localStorage && KK.indexOf(k) >= 0) idbDel(k); } catch (e) {} };
    }
  } catch (e) {}
})();
(function () {
  var C = window.MC_CFG || {}, ON = !!(C.url && C.key), base = ON ? String(C.url).replace(/\/$/, "") : "", iv = null, CUR = null, BUBMS = 4000;
  var SEL = 0, SENT = {}, ONL = 0, MSGS = [], MET = {}, UP = true, REPLY = null, SIG = "", MORE = true, LASTSEEN = 0, BUSY = false;
  var LS = { get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var $ = function (s) { return document.querySelector(s); }, bd = function (s) { return String(s).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };
  var MON = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
  var EMC = [["😀", "স্মাইলি", ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "🙂", "🙃", "😉", "😍", "🥰", "😘", "😗", "😋", "😜", "🤪", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😢", "😭", "😤", "😠", "😡", "🤬", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "😐", "😶", "🙄", "😬", "😴", "🤤", "😷", "🤒", "🤕", "🤢", "🥵", "🥶", "😇", "🥺", "😳", "🙈", "🙉", "🙊", "💀", "👻", "🤡"]], ["👍", "মানুষ", ["👍", "👎", "👏", "🙌", "🙏", "💪", "👌", "✌️", "🤞", "👋", "🤝", "☝️", "👆", "👇", "👈", "👉", "✋", "🖐️", "🤟", "🤘", "✍️", "👀", "👅", "👶", "🧒", "👦", "👧", "🧑", "👨", "👩", "🧓", "👮", "👷", "🎓", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💕", "💖", "💗", "💘"]], ["🐶", "প্রাণী", ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦅", "🦆", "🦉", "🐺", "🐴", "🦄", "🐝", "🦋", "🐌", "🐞", "🐢", "🐍", "🐟", "🐬", "🐳", "🦈", "🐘", "🐅", "🐆", "🐒", "🌳", "🌴", "🌸", "🌹", "🌻", "🌼", "🍀", "🍁"]], ["🍕", "খাবার", ["🍎", "🍌", "🍉", "🍇", "🍓", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥕", "🌽", "🥔", "🍞", "🧀", "🍳", "🥞", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🌮", "🍜", "🍝", "🍣", "🍤", "🍚", "🍛", "🍦", "🍩", "🍪", "🎂", "🍰", "🍫", "🍬", "🍭", "☕", "🍵", "🥤", "🍺", "🥛", "🧃"]], ["⚽", "কার্যক্রম", ["⚽", "🏏", "🏀", "🏈", "⚾", "🎾", "🏐", "🏓", "🏸", "🥊", "🎯", "🎮", "🎲", "🎨", "🎬", "🎤", "🎧", "🎸", "🎹", "🥁", "🎻", "📚", "✏️", "🏆", "🥇", "🥈", "🥉", "🏅", "🎉", "🎊", "🎁", "🎈"]], ["🚗", "ভ্রমণ", ["🚗", "🚕", "🚌", "🚎", "🚑", "🚒", "🚓", "🚲", "🛵", "🏍️", "🚆", "🚂", "✈️", "🚀", "🛳️", "⛵", "🚤", "🏫", "🏠", "🏢", "🏥", "🕌", "⛪", "🏖️", "🏝️", "⛰️", "🌄", "🌅", "🌃", "🌉", "🌧️", "☀️", "⛅", "☁️", "⛈️", "🌈", "❄️", "🌙", "⭐"]], ["💡", "বস্তু", ["📱", "💻", "🖥️", "⌚", "📷", "🎥", "📞", "💡", "🔦", "🔋", "💰", "💵", "💳", "🎒", "👜", "👓", "🕶️", "👕", "👖", "👗", "👟", "👑", "💍", "🔑", "🔒", "📖", "📝", "📌", "📎", "✂️", "🗓️", "🔔", "🧳", "🛏️", "🚪"]], ["💯", "চিহ্ন", ["💯", "✅", "❌", "❎", "⭕", "❗", "❓", "‼️", "⚠️", "🚫", "🔥", "✨", "💥", "💫", "💢", "💤", "➕", "➖", "✔️", "➡️", "⬅️", "⬆️", "⬇️", "🔄", "♻️", "⚡", "☮️", "♥️", "🔴", "🟢", "🔵", "🟡", "⚫", "⚪"]], ["🇧🇩", "পতাকা", ["🇧🇩", "🇮🇳", "🇵🇰", "🇳🇵", "🇱🇰", "🇧🇹", "🇲🇻", "🇦🇫", "🇸🇦", "🇦🇪", "🇶🇦", "🇰🇼", "🇴🇲", "🇲🇾", "🇸🇬", "🇮🇩", "🇹🇭", "🇯🇵", "🇰🇷", "🇨🇳", "🇹🇷", "🇮🇷", "🇮🇶", "🇪🇬", "🇬🇧", "🇺🇸", "🇨🇦", "🇦🇺", "🇫🇷", "🇩🇪", "🇮🇹", "🇪🇸", "🇷🇺", "🇧🇷", "🇦🇷", "🇵🇸", "🇺🇳", "🏁", "🚩", "🏳️", "🏴"]]], EMI = 0;
  function emoHtml() { var c = EMC[EMI]; return '<div style="flex:0 0 100%;width:100%;grid-column:1/-1;display:flex;gap:2px;overflow-x:auto;border-bottom:1px solid rgba(128,128,128,.3);padding-bottom:4px">' + EMC.map(function (k, i) { return '<button type="button" data-ec="' + i + '" title="' + k[1] + '" style="flex:none;border:0;background:' + (i === EMI ? "rgba(128,128,128,.28)" : "transparent") + ';border-radius:8px;padding:4px 7px;font-size:19px;cursor:pointer">' + k[0] + "</button>"; }).join("") + '</div><div style="flex:0 0 100%;font-size:12px;opacity:.65;padding:2px 4px">' + c[1] + "</div>" + c[2].map(function (e) { return '<button type="button" data-em="' + e + '">' + e + "</button>"; }).join(""); }
  var RX = ["👍", "❤️", "😂", "😆", "😮", "😢", "🙏"],
    // অনুমোদিত ফাইল: এক্সটেনশন -> [ধরন, মাইম, সর্বোচ্চ MB]। সার্ভারের mc2_ac_ftypes()-এর সাথে একই রাখুন (SVG/HTML/JS/EXE/ZIP নেই)।
    FT = { jpg: ["image", "image/jpeg", 10], jpeg: ["image", "image/jpeg", 10], png: ["image", "image/png", 10], gif: ["image", "image/gif", 10], webp: ["image", "image/webp", 10],
      mp4: ["video", "video/mp4", 25], webm: ["video", "video/webm", 25], mov: ["video", "video/quicktime", 25],
      mp3: ["audio", "audio/mpeg", 15], m4a: ["audio", "audio/mp4", 15], wav: ["audio", "audio/wav", 15], ogg: ["audio", "audio/ogg", 15], aac: ["audio", "audio/aac", 15],
      pdf: ["file", "application/pdf", 15], txt: ["file", "text/plain", 2], csv: ["file", "text/csv", 5], doc: ["file", "application/msword", 15],
      docx: ["file", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 15], xls: ["file", "application/vnd.ms-excel", 15],
      xlsx: ["file", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 15], ppt: ["file", "application/vnd.ms-powerpoint", 25],
      pptx: ["file", "application/vnd.openxmlformats-officedocument.presentationml.presentation", 25] };
  var EVS = [], EVLAST = -1, TYP = 0, LT = 0, LB = false, LV = null, ACCEPT = Object.keys(FT).map(function (e) { return "." + e; }).join(","), NOMR = false, NOMN = false, ME = { s: "ok", w: [] }, WSHOW = {}, MINZ = false, MINL = 0, PH = "home", TCH = 0;
  var RR = [["abuse", "🤬 গালিগালাজ / অশ্লীল ভাষা"], ["harass", "😡 হয়রানি / বুলিং"], ["threat", "⚠️ হুমকি / সহিংসতা"], ["adult", "🔞 অশালীন ছবি/ভিডিও/কনটেন্ট"], ["spam", "📢 স্প্যাম / বিজ্ঞাপন / লিংক"], ["privacy", "🔒 ব্যক্তিগত তথ্য ফাঁস"], ["illegal", "🚫 বেআইনি/ক্ষতিকর ফাইল"], ["other", "✍️ অন্য কারণ"]];
  var RS = { p: {}, m: [], sg: "" }, RSV = 0, RST = null, BNK = "", LK = null, SHOT = false, BAD = [], BADT = 0, SHB = 0; // Restriction (ওয়ার্নিং-চিহ্ন): p = সবার, m = নিজের; SQL: supabase-restrict.sql
  var TMPV = ""; function vid() { if (window.mcVid) return window.mcVid(); var v = LS.get("mc2_vid", ""); if (!v) { if (window.faIdbPending) { if (!TMPV) TMPV = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); return TMPV; } v = TMPV || "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); LS.set("mc2_vid", v); } return v; }
  function H() { return { apikey: C.key, Authorization: "Bearer " + C.key, "Content-Type": "application/json", "x-voter": vid() }; }
  function api(p) { return fetch(base + "/rest/v1/" + p, { headers: H() }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function rpc(n, a) { return fetch(base + "/rest/v1/rpc/" + n, { method: "POST", headers: H(), body: JSON.stringify(a) }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function toast(t) { var e = $("#acT"); if (!e) return; e.textContent = t; e.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(function () { e.style.opacity = 0; }, 2400); }
  function tm(t) { var d = new Date(t), h = d.getHours(), m = d.getMinutes(), n = new Date(), s = bd((h % 12 || 12) + ":" + (m < 10 ? "0" : "") + m) + " " + (h < 12 ? "AM" : "PM"); if (d.toDateString() !== n.toDateString()) s = bd(d.getDate()) + " " + MON[d.getMonth()] + ", " + s; return s; }
  function sz(n) { return n > 1048576 ? bd((n / 1048576).toFixed(1)) + " MB" : bd(Math.max(1, Math.round(n / 1024))) + " KB"; }
  function ago(t) { if (!t) return "জানা নেই"; var s = Math.max(0, Math.round((Date.now() - t) / 1000)); if (s < 60) return "এইমাত্র"; var m = Math.round(s / 60); if (m < 60) return bd(m) + " মিনিট আগে"; var h = Math.round(m / 60); if (h < 24) return bd(h) + " ঘণ্টা আগে"; return bd(Math.round(h / 24)) + " দিন আগে"; }
  var furl = function (p) { return base + "/storage/v1/object/public/mc2-chat/" + String(p).split("/").map(encodeURIComponent).join("/"); };

  var st = document.createElement("style");
  st.textContent = "#acx{--bg:#fff;--fg:#10261b;position:fixed;top:0;right:0;bottom:0;left:0;z-index:60;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;font-family:'MCDigits','Hind Siliguri','Noto Sans Bengali','Nirmala UI','Bangla Sangam MN','Kalpurush','Siyam Rupali',system-ui,sans-serif}@media(prefers-color-scheme:dark){#acx{--bg:#0f1a14;--fg:#e8f1ea}}#acx [hidden]{display:none!important}" +
    "#acx .ah{display:flex;align-items:center;gap:10px;padding:10px 12px;padding-top:max(10px,env(safe-area-inset-top));border-bottom:1px solid rgba(128,128,128,.25)}#acx .ah b{flex:1;font-size:16px;line-height:1.2;min-width:0}#acx .ah small{display:block;font-weight:500;opacity:.65;font-size:12px}" +
    "#acx .ab{border:0;background:rgba(128,128,128,.15);color:inherit;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;flex:none}" +
    "#acx .ag{padding:16px;display:grid;gap:12px;max-width:460px;width:100%;margin:0 auto;overflow:auto}#acx label{font-weight:700;font-size:14px;display:grid;gap:4px}" +
    "#acx select,#acx input[type=text],#acx input:not([type]){font:inherit;padding:11px 12px;border-radius:12px;border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;width:100%}#acx option{color:#000}" +
    "#acx .go{border:0;border-radius:999px;padding:13px;font:800 16px inherit;font-family:inherit;color:#fff;background:linear-gradient(135deg,#0084ff,#7b4dff);cursor:pointer}#acx .go:disabled{opacity:.5}" +
    "#acx .am{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:3px;overscroll-behavior:contain}#acx .r{display:flex;align-items:flex-end;gap:12px;max-width:88%}#acx .r:not(.mine){max-width:calc(88% + 18px)}#acx .r .av{width:40px;height:40px;font-size:18px}#acx .r.mine{align-self:flex-end;flex-direction:row-reverse;margin-right:-4px}" +
    "#acx .av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#ffb300,#ff7a18);color:#fff;font-weight:800;display:grid;place-items:center;font-size:13px;flex:none}#acx .nm{font-size:11px;opacity:.65;margin:6px 0 2px 12px}" +
    "#acx .col{display:flex;flex-direction:column;align-items:flex-start;min-width:0}#acx .col>.rst{align-self:stretch}#acx .mine .col{align-items:flex-end}#acx .bb{padding:8px 12px;border-radius:18px;background:#e9ecef;color:#10261b;overflow-wrap:anywhere;white-space:pre-wrap;line-height:1.35;max-width:100%}#acx .mine .bb{background:#0084ff;color:#fff}#acx .bb.dl{background:none;border:1px dashed rgba(128,128,128,.5);color:inherit;opacity:.65;font-size:13px}" +
    "#acx .tm{display:block;text-align:right;font-size:10px;opacity:.7;margin-top:2px;white-space:nowrap}#acx .mo{border:0;background:none;color:inherit;opacity:.7;font-size:20px;cursor:pointer;padding:2px 6px;flex:none;display:none;border-radius:999px}#acx .r.sel .mo{display:block;animation:acPop .15s ease-out}@keyframes acPop{from{opacity:0;transform:scale(.6)}to{opacity:.7;transform:scale(1)}}#acRx{position:absolute;z-index:5;background:var(--bg);color:inherit;border:1px solid rgba(128,128,128,.35);border-radius:14px;box-shadow:0 6px 22px rgba(0,0,0,.32);padding:6px;min-width:170px;max-width:250px;max-height:260px;overflow:auto;font-size:14px;animation:acPop .15s ease-out}#acRx .rh{font-size:12px;opacity:.65;padding:2px 8px 4px}#acRx .ri{display:flex;align-items:center;gap:8px;width:100%;border:0;background:none;color:inherit;font:inherit;text-align:left;padding:6px 8px;border-radius:10px;cursor:default}#acRx .ri.me{cursor:pointer}#acRx .ri.me:active{background:rgba(128,128,128,.18)}#acRx .ri em{font-style:normal;font-size:20px;line-height:1;flex:none}#acRx .ri span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}#acRx .ri small{display:block;font-size:11px;opacity:.6;white-space:normal}" +
    "#acx .rq{border-left:3px solid #0084ff;background:rgba(128,128,128,.2);border-radius:6px;padding:2px 8px;margin-bottom:5px;font-size:12px;opacity:.9}#acx .rq b{display:block}#acx .mine .rq{border-color:#fff;background:rgba(255,255,255,.2)}" +
    "#acx .r{content-visibility:auto;contain-intrinsic-size:auto 56px}#acx .bb img,#acx .bb video{max-width:100%;max-height:300px;border-radius:12px;display:block}#acx .bb audio{max-width:100%;width:230px}#acx .fc{display:flex;gap:8px;align-items:center;color:inherit;text-decoration:none}#acx .fc small{display:block;opacity:.75}" +
    "#acx .ah b.rh{font-size:16px}#acx .ah b.rh small{opacity:1;font-size:inherit;font-weight:inherit}#acx .gn{color:#0b7a4b}#acx .nl{color:#7b3fe4}@media(prefers-color-scheme:dark){#acx .gn{color:#5ee0a0}#acx .nl{color:#c4a6ff}}#acx .gn{display:block;white-space:nowrap;overflow:hidden;font-size:24px;font-weight:800;line-height:1.25}#acx .nl{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:20px;font-weight:700;line-height:1.25;margin-top:1px;opacity:.9}#acx .ol{border:0;background:none;color:inherit;font:inherit;font-size:13px;font-weight:600;padding:2px 0;margin-top:1px;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;opacity:.85}" +
    "#acx .bb.e1,#acx .mine .bb.e1,#acx .bb.e2,#acx .mine .bb.e2{background:none;color:inherit;padding:0 2px}#acx .bb.e1>div{font-size:52px;line-height:1.2}#acx .bb.e2>div{font-size:28px;line-height:1.3}#acx .bb.e1 .tm,#acx .bb.e2 .tm,#acx .mine .bb.e1 .tm,#acx .mine .bb.e2 .tm{color:inherit;opacity:.6}" +
    "#acx .bb{padding:11px 16px;border-radius:22px;font-size:17px;line-height:1.32;background:#e9ecef;color:#10261b}#acx .mine .bb{background:#0a66ff;color:#fff}#acx .bb.mm{padding:3px}#acx .bb.dl,#acx .mine .bb.dl{background:none;color:inherit;padding:8px 12px}#acx .bb.e1,#acx .mine .bb.e1,#acx .bb.e2,#acx .mine .bb.e2{background:none;color:inherit;padding:0 2px}" +
    "#acx .r:not(.mine)+.r:not(.mine) .bb:not(.e1):not(.e2){border-top-left-radius:6px}#acx .r:not(.mine):has(+.r:not(.mine)) .bb:not(.e1):not(.e2){border-bottom-left-radius:6px}#acx .r.mine+.r.mine .bb:not(.e1):not(.e2){border-top-right-radius:6px}#acx .r.mine:has(+.r.mine) .bb:not(.e1):not(.e2){border-bottom-right-radius:6px}" +
    "#acx .rl2{font-size:8px;opacity:.65;margin:6px 4px 3px 12px;display:flex;align-items:center;gap:4px}#acx .mine .rl2{justify-content:flex-end;margin:6px 12px 3px 4px}#acx .rqb{background:#d9dde1;color:#10261b;opacity:.9;border-radius:22px;padding:10px 16px 22px;font-size:16px;line-height:1.3;overflow-wrap:anywhere;white-space:pre-wrap;max-width:100%}#acx .rqb+.bb{margin-top:-14px;position:relative;z-index:1}#acx .rqb .rqf{display:flex;align-items:center;gap:6px}" +
    "@media(prefers-color-scheme:dark){#acx .bb{background:#303030;color:#fff}#acx .mine .bb{background:#0a66ff}#acx .bb.dl,#acx .mine .bb.dl{background:none}#acx .bb.e1,#acx .mine .bb.e1,#acx .bb.e2,#acx .mine .bb.e2{background:none}#acx .rqb{background:#262626;color:#c9cdd1}}" +
    "#acx .sn{border:0;background:none;color:inherit;opacity:.6;font-size:10px;padding:0 2px;cursor:pointer}#acx .old{align-self:center;border:0;background:rgba(128,128,128,.18);color:inherit;border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;cursor:pointer;margin-bottom:6px}" +
    "#acx .ac{display:flex;align-items:center;gap:6px;padding:8px 10px;padding-bottom:max(8px,env(safe-area-inset-bottom));border-top:1px solid rgba(128,128,128,.25)}#acx .ac input{border-radius:999px;background:rgba(128,128,128,.12);border:0;flex:1;min-width:0}#acx .ib{border:0;background:none;color:#0084ff;font-size:22px;cursor:pointer;padding:0 4px;flex:none}" +
    "#acx .rp{display:flex;align-items:center;gap:8px;padding:6px 12px;border-top:1px solid rgba(128,128,128,.25);font-size:13px}#acx .rp>span{flex:1;min-width:0;display:flex;align-items:center;gap:8px;border-left:3px solid #0084ff;padding-left:8px}" +
    "#acx .em{margin:auto;text-align:center;opacity:.6;font-size:14px;padding:20px}#acx .ep{display:grid;grid-template-columns:repeat(8,1fr);max-height:168px;overflow:auto;border-top:1px solid rgba(128,128,128,.25);padding:4px}#acx .ep button{border:0;background:none;font-size:23px;cursor:pointer;padding:4px 0}" +
    "#acx .sh0{position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;z-index:3}#acx .sh{background:var(--bg);width:100%;max-width:520px;margin:0 auto;border-radius:18px 18px 0 0;padding:12px;padding-bottom:max(12px,env(safe-area-inset-bottom));display:grid;gap:4px;max-height:80vh;overflow:auto}" +
    "#acx .sh button{border:0;background:rgba(128,128,128,.12);color:inherit;border-radius:12px;padding:11px;font:inherit;text-align:left;cursor:pointer}#acx .sh .rb{display:flex;justify-content:space-around;background:none;padding:0 0 6px}#acx .sh .rb button{font-size:26px;background:none;padding:2px 6px;text-align:center}#acx .sh .dg{color:#d93025}#acx .sh.ms{gap:6px;padding:6px 10px 10px;padding-bottom:max(10px,env(safe-area-inset-bottom))}#acx .sh.ms .hd{position:relative;display:flex;justify-content:center;height:20px}#acx .sh.ms .hd span{width:34px;height:4px;border-radius:4px;background:rgba(128,128,128,.35);margin-top:6px}#acx .sh.ms .szb{position:absolute;right:0;top:0;padding:1px 9px;font-size:11px;font-weight:700;border-radius:999px;background:rgba(128,128,128,.2)}#acx .sh.ms .rb{padding:0 0 4px}#acx .sh.ms .rb button{font-size:var(--em,22px);padding:2px 5px}#acx .sh.ms .rb .mr{font-size:17px;width:30px;height:30px}#acx .sg{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}#acx .sg button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:6px 2px;border-radius:10px;font-size:var(--lb,11px);line-height:1.2;text-align:center}#acx .sg button i{font-style:normal;font-size:var(--ic,17px)}#acx .sg button small{font-size:.8em;opacity:.65}#acx .sg .wd{grid-column:1/-1;flex-direction:row;gap:8px;padding:8px}" +
    "#acT{position:absolute;left:50%;bottom:62px;transform:translateX(-50%);background:#222;color:#fff;padding:8px 14px;border-radius:999px;font-size:13px;opacity:0;transition:opacity .2s;pointer-events:none;z-index:4;text-align:center;max-width:90%}" +
    "#acx .uc{cursor:pointer}#acx .ui{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:14px;padding:4px 2px}#acx .ui b{opacity:.65;font-weight:600}#acx .ml{display:flex;align-items:center;gap:8px;width:100%}#acx .ml small{margin-left:auto;opacity:.65}#acx .dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#9aa3a0;flex:none}#acx .dot.on{background:#22c55e}" +
    "#acx .bn{background:rgba(217,48,37,.14);border-top:1px solid rgba(217,48,37,.45);padding:8px 12px;font-size:13px;text-align:center;line-height:1.5}#acx .sm2{font-size:12px;opacity:.7}#acx .rr{display:flex;gap:8px;align-items:center;padding:9px 10px;border-radius:12px;background:rgba(128,128,128,.12);cursor:pointer}#acx .rr input{width:auto;margin:0}" +
    "#acx #acRn{border:1px solid rgba(128,128,128,.4);border-radius:12px;padding:10px;font:inherit;background:var(--bg);color:inherit;width:100%;box-sizing:border-box}#acx .ib:disabled,#acx #acI:disabled{cursor:not-allowed}#acx .sy{text-align:center;font-size:8px;line-height:1.15;opacity:.55;margin:0;padding:0}#acx .sy b{font-weight:600}#acx .shx{font-size:10.5px;opacity:.95;color:#d97706;margin:3px 0;padding:2px 0}#acx .shtm{background:none;border:0;padding:3px 5px;margin:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer}#acx .ty{padding:3px 14px;font-size:12.5px;opacity:.85;font-style:italic}" +
    "#acx .r{background:none;padding:0;border:0;border-radius:0;box-shadow:none;position:relative;transition:transform .18s}#acx .tm{color:inherit;font-weight:400}#acx .mine .tm{color:rgba(255,255,255,.8)}#acx .rxs{display:flex;position:relative;z-index:1;margin:-9px 8px 0;align-self:flex-end}#acx .mine .rxs{align-self:flex-start}#acx .rxs button{display:flex;align-items:center;gap:1px;background:var(--bg);color:inherit;border:1px solid rgba(128,128,128,.28);border-radius:999px;padding:1px 6px;font-size:13px;line-height:1.35;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.25)}#acx .rxs button.on{border-color:#0084ff}#acx .rxs i{font-style:normal;font-size:11.5px;opacity:.8;margin-left:3px}#acx .bb .th{display:block;width:190px;max-width:100%;max-height:230px;object-fit:cover;border-radius:12px;cursor:pointer}#acx .bb .vt{position:relative;width:190px;max-width:100%;border-radius:12px;overflow:hidden;cursor:pointer;background:#000}#acx .bb .vt video{display:block;width:100%;max-height:230px;object-fit:cover;pointer-events:none;border-radius:0}#acx .vt span{position:absolute;top:0;right:0;bottom:0;left:0;display:grid;place-items:center;color:#fff;font-size:30px;background:rgba(0,0,0,.22)}#acx .bb.mm{padding:3px}#acx .bb.mm .tm{padding:0 6px 2px}#acx .fc{cursor:pointer}#acx .pt{position:relative;width:38px;height:38px;border-radius:8px;object-fit:cover;flex:none;display:grid;place-items:center;background:rgba(128,128,128,.28);font-size:20px;overflow:hidden;line-height:1}#acx .pt video{width:100%;height:100%;object-fit:cover;pointer-events:none;border-radius:0;max-height:none}#acx .pt u{position:absolute;top:0;right:0;bottom:0;left:0;display:grid;place-items:center;text-decoration:none;color:#fff;font-size:14px;background:rgba(0,0,0,.28)}#acx #acRc{width:34px;height:34px;font-size:19px;font-weight:800;background:rgba(217,48,37,.14);color:#d93025}#acx .rp>span>i{font-style:normal;display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#acx .rq .rqf{display:flex;align-items:center;gap:6px;margin-top:2px}#acx .rq .pt{width:34px;height:34px;font-size:17px}#acx .sh .ep button{background:none;padding:4px 0;text-align:center;border-radius:0}#acx .sh .ep{border-top:0}#acx .sh .rb .mr{font-size:20px;background:rgba(128,128,128,.2);border-radius:50%;width:34px;height:34px;padding:0;align-self:center}#acx .rt{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}#acx .sh .rt button{flex:none;padding:6px 12px;border-radius:999px}#acx .sh .rt button.on{background:#0084ff;color:#fff}#acx .sh .rl{display:flex;align-items:center;gap:10px}#acx .rl>span:nth-child(2){flex:1;display:grid}#acx .rl small{opacity:.65;font-size:11px}#acx .rl em{font-style:normal;font-size:22px}#acFv{position:fixed;top:0;right:0;bottom:0;left:0;z-index:80;background:rgba(0,0,0,.97);color:#fff;display:flex;flex-direction:column;align-items:center;font-family:inherit}#acFv .fx{position:absolute;top:max(10px,env(safe-area-inset-top));right:12px;width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:22px;cursor:pointer;z-index:2}#acFv .fm{flex:1;min-height:0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:64px 12px 8px;box-sizing:border-box;text-align:center;overflow:auto}#acFv .fm img,#acFv .fm video{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}#acFv .fm small{opacity:.7}#acFv .fd{margin:8px 0;margin-bottom:max(18px,env(safe-area-inset-bottom));border:0;border-radius:999px;padding:12px 30px;font:800 16px inherit;font-family:inherit;color:#fff;background:linear-gradient(135deg,#0084ff,#7b4dff);cursor:pointer}#acMin{position:fixed;z-index:59;left:50%;transform:translateX(-50%);bottom:calc(74px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:11px 18px;font:800 14px inherit;font-family:'MCDigits','Hind Siliguri','Noto Sans Bengali','Nirmala UI','Bangla Sangam MN','Kalpurush','Siyam Rupali',system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,#0084ff,#7b4dff);box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer;max-width:92vw;white-space:nowrap}#acMin{touch-action:none;user-select:none;-webkit-user-select:none}#acMin .mx{position:absolute;top:-9px;right:-7px;width:24px;height:24px;border-radius:50%;background:#fff;color:#10261b;font-size:13px;font-weight:800;line-height:24px;text-align:center;box-shadow:0 1px 5px rgba(0,0,0,.4)}#acMin em{font-style:normal;background:#e23b57;border-radius:999px;padding:0 7px;min-width:20px;text-align:center;line-height:20px}/* রিপ্লাই বার্তায় রিঅ্যাকশন: বাবল + চিপ একসঙ্গে মোড়ানো, তাই চিপ সবসময় বাবলের গায়েই বসে (রিপ্লাই-বক্স চওড়া হলেও দূরে যায় না) */#acx .bw{display:flex;flex-direction:column;min-width:0;max-width:100%}#acx .mine .bw{align-self:flex-end}#acx .rqb+.bw{margin-top:-14px;position:relative;z-index:1}#acx .rxs{margin:-9px 8px 0}#acx .ac{gap:8px;padding:8px 12px;padding-bottom:calc(max(8px,env(safe-area-inset-bottom)) + var(--fa-lift));border-top:.5px solid rgba(128,128,128,.3)}#acx .ac input#acI{background:transparent;border:.5px solid rgba(128,128,128,.45);padding:9px 14px;font-size:15px;color:inherit;outline:0}#acx .ac input#acI:focus{border-color:#0084ff}#acx .ac textarea#acI{background:transparent;border:.5px solid rgba(128,128,128,.45);padding:9px 14px;font-size:15px;color:inherit;outline:0;flex:1;min-width:0;box-sizing:border-box;display:block;resize:none;overflow-y:hidden;min-height:40px;max-height:140px;line-height:1.35;font-family:inherit;border-radius:20px}#acx .ac textarea#acI:focus{border-color:#0084ff}#acx .ac{align-items:flex-end}#acx #acAt,#acx #acEb{height:40px}#acx #acSd{margin-bottom:1px}#acx #acAt,#acx #acEb{color:inherit;opacity:.65;padding:0 2px}#acx #acSd{width:38px;height:38px;padding:0;border-radius:50%;background:#0084ff;color:#fff;font-size:17px!important;display:grid;place-items:center}#acx #acSd:disabled{opacity:.5}#acx .rp{background:rgba(128,128,128,.08);border-top:.5px solid rgba(128,128,128,.3);padding:8px 12px}#acx .ty{padding:2px 14px 4px}" +
    "#acx .dt{align-self:center;font-size:11px;background:rgba(128,128,128,.18);border-radius:999px;padding:2px 12px;margin:10px 0 4px}" +
    "#acx .nt{background:rgba(255,179,0,.16);border-bottom:.5px solid rgba(255,179,0,.55);padding:7px 14px;font-size:13px;line-height:1.45;text-align:center;cursor:pointer;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}#acx .nt.op{display:block}" +
    "#acx .bb a{color:inherit;text-decoration:underline;word-break:break-all}#acx .mine .bb a{color:#fff}#acx .mn{font-weight:700;color:#0a66ff}#acx .mine .bb .mn{color:#fff}#acx .mn.me{background:rgba(255,179,0,.35);border-radius:6px;padding:0 3px;color:inherit}#acx .bb.mnm{box-shadow:0 0 0 2px rgba(255,179,0,.8)!important}" +
    "#acx .bb{padding:8px 13px;border-radius:20px;font-size:15px;line-height:1.4}#acx .bb:not(.mm):not(.e1):not(.e2):not(.dl){box-shadow:0 1px 2px rgba(0,0,0,.10)}#acx .mine .bb:not(.e1):not(.e2){background:linear-gradient(135deg,#0a84ff,#0a5cff)}" +
    "#acx .ah{box-shadow:0 2px 10px rgba(0,0,0,.07)}#acx .ah b{font-weight:700}#acx .ol{background:rgba(34,197,94,.16);text-decoration:none;border-radius:999px;padding:2px 10px;margin-top:3px;display:inline-block;opacity:1;font-size:12.5px}#acx .nm{font-weight:600}";
  // Friend Adda: ফ্রি হোস্টের নিচের লেখা/ব্যানার বা মোবাইল ব্রাউজারের নিচের বার যেন চ্যাট বক্স ও Send ঢাকতে না পারে — ইনপুট সারি ওপরে উঠে বসে।
  // উচ্চতা কম/বেশি চাইলে নিচের --fa-lift (px) বদলান।
  st.textContent += "#acx .nb{position:fixed;z-index:70;display:flex;align-items:center;gap:6px;max-width:calc(100vw - 16px);background:#0b7a4b;color:#fff;font-size:12.5px;line-height:1.2;padding:5px 5px 5px 11px;border-radius:999px;box-shadow:0 3px 10px rgba(0,0,0,.28);animation:acNb .25s ease-out;white-space:nowrap}#acx .nb:before{content:'';position:absolute;top:-5px;right:var(--nbx,20px);width:10px;height:10px;background:inherit;transform:rotate(45deg);border-radius:2px}#acx .nb span{cursor:pointer}#acx .nb button{border:0;background:rgba(255,255,255,.25);color:#fff;width:20px;height:20px;border-radius:50%;font-size:11px;line-height:1;padding:0;cursor:pointer;flex:none}@keyframes acNb{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}";
  st.textContent += "#acx .ah2{display:block;padding-bottom:8px}#acx .ah2 .gl{display:block;min-width:0;padding:0 2px 6px}#acx .ah2 .gn{font-size:22px;letter-spacing:.2px}#acx .ah2 .gr{display:flex;align-items:center;gap:7px}#acx .ah2 .ab{width:34px;height:34px;font-size:16px}#acx .ah2 .gm{flex:1;min-width:0}#acx .ah2 .gm{display:flex;flex-wrap:wrap;align-items:center;column-gap:8px;row-gap:1px;overflow:hidden}#acx .ah2 .nl{font-size:16px;flex:0 1 auto;max-width:100%;min-width:0;text-overflow:ellipsis}#acx .ah2 .ol{flex:none;margin-top:0;white-space:nowrap}#acx .ah2 .ol{font-size:12px;text-decoration:none;background:rgba(40,180,90,.16);border-radius:999px;padding:1px 9px;margin-top:2px;display:inline-block}";
  st.textContent += "#acx .bb.dl .adn{display:block;margin-top:4px;padding-top:4px;border-top:1px dashed rgba(128,128,128,.45);font-size:12.5px;font-weight:600;opacity:.95;white-space:pre-wrap;overflow-wrap:anywhere}";
  st.textContent += "#acx .gn .gs{font-size:.58em;font-weight:700;letter-spacing:.2px;color:#d9480f;white-space:nowrap;vertical-align:.12em}#acx .gn .gs i{font-style:normal;font-weight:800;opacity:.85;margin:0 .06em}@media(prefers-color-scheme:dark){#acx .gn .gs{color:#ffb454}}";
  st.textContent += "#acx .ah2 #acSn,#acx .ah2 #acIn,#acx .ah2 #acEd{display:none}#acx .ah2 .nl{font-size:17px;max-width:none}#acx .mnu{position:fixed;z-index:75;min-width:190px;background:var(--bg);color:var(--fg);border:1px solid rgba(128,128,128,.35);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.28);padding:6px;display:grid;gap:2px;animation:acNb .15s ease-out}#acx .mnu button{border:0;background:none;color:inherit;font:inherit;font-size:15px;font-weight:600;text-align:left;padding:10px 14px;border-radius:10px;cursor:pointer;white-space:nowrap}#acx .mnu button:active,#acx .mnu button:hover{background:rgba(128,128,128,.18)}#acx .mnu .fh{display:flex;justify-content:space-between;align-items:center;gap:10px}#acx .mnu .fb{display:grid;gap:2px;margin:0 0 2px 10px;padding-left:6px;border-left:2px solid rgba(128,128,128,.3)}#acx .mnu .fb[hidden]{display:none}";
  st.textContent += "#acx{--fa-lift:56px}@supports(height:100dvh){#acx{height:100dvh}}" +
    "#acx .ac{padding-bottom:calc(max(8px,env(safe-area-inset-bottom)) + var(--fa-lift))}#acT{bottom:calc(62px + var(--fa-lift))}";

  // ---------- Restriction / ব্যান ডিজাইন ----------
  st.textContent += "#acx .avs{position:absolute;left:50%;top:-9px;transform:translateX(-50%);z-index:2;white-space:nowrap;font-family:inherit;font-weight:800;font-size:7.5px;line-height:1.4;letter-spacing:.2px;color:#7a1410;background:repeating-linear-gradient(135deg,#fde4e2 0 6px,#fbd0cc 6px 12px);border:1.5px dashed #d93025;border-radius:999px;padding:0 6px;cursor:pointer;box-shadow:0 1px 3px rgba(217,48,37,.3)}";
  st.textContent += "#acx .avw{position:relative;flex:none;display:block}#acx .avw .av{filter:saturate(.45)}#acx .avx{position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:#d93025;color:#fff;font-size:10px;font-weight:900;display:grid;place-items:center;border:1.5px solid var(--bg);cursor:pointer;line-height:1;padding:0;box-shadow:0 1px 3px rgba(0,0,0,.35)}" +
    "#acx .rst{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;font-size:10.5px;font-weight:800;letter-spacing:.4px;color:#fff;background:#d93025;border-radius:999px;padding:2px 10px;margin:0 0 3px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.25)}#acx .mine .rst{align-self:flex-end}" +
    "#acx .rsp{display:inline-block;font-size:10px;font-weight:800;color:#fff;background:#d93025;border-radius:999px;padding:0 7px;margin-left:4px;cursor:pointer}" +
    "#acx .rsb{background:repeating-linear-gradient(135deg,rgba(217,48,37,.16) 0 12px,rgba(217,48,37,.08) 12px 24px);border-bottom:2px solid #d93025;padding:8px 14px;font-size:13px;line-height:1.5;max-height:34vh;overflow:auto;flex:none}#acx .rsb b{color:#d93025;display:block}#acx .rsw{background:rgba(128,128,128,.12);border-left:3px solid #d93025;border-radius:8px;padding:6px 10px;margin:4px 0;overflow-wrap:anywhere}#acx .rsw small{display:block;opacity:.7;font-size:11px;margin-top:2px}" +
    "#acx .bn{background:repeating-linear-gradient(135deg,rgba(217,48,37,.2) 0 12px,rgba(217,48,37,.1) 12px 24px);border-top:2px solid #d93025;font-weight:700}" +
    "#acx .bnm{text-align:center;border:2px solid #d93025}#acx .bni{font-size:46px;line-height:1.1}#acx .bnt{font-size:18px;color:#d93025}#acx .bnw{background:rgba(217,48,37,.12);border-radius:12px;padding:10px 12px;overflow-wrap:anywhere;text-align:left;font-weight:600}#acx .bnw small{display:block;opacity:.7;font-weight:700;margin-bottom:2px}#acx .bnd{font-size:15px}";

  // ---------- ছোট করা: লক/ব্যান ব্যানার, লক বক্স, Restricted বাটন ----------
  st.textContent += "#acx .bn{padding:3px 10px;font-size:11px;line-height:1.3;font-weight:600;border-top-width:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    "#acx .sh0:has(.bnm){align-items:center;justify-content:center;background:rgba(0,0,0,.3)}#acx .bnm{width:auto;max-width:min(250px,84vw);margin:0;border-radius:12px;padding:8px 10px;gap:5px;text-align:center;border-width:1.5px;max-height:none}#acx .bnm .bnt{font-size:13px;line-height:1.3}#acx .bnm .bnw{font-size:12px;line-height:1.35;padding:5px 8px;border-radius:8px;text-align:center;font-weight:600;max-height:64px;overflow:auto}#acx .bnm button{padding:5px 10px;font-size:12px;border-radius:8px;text-align:center;font-weight:700}" +
    "#acx .rsp{font-size:8px;padding:0 5px;margin-left:3px;line-height:1.5;letter-spacing:0}#acx .rst{display:flex;flex-direction:column;align-items:flex-start;gap:0;font-size:17px;line-height:1.2;font-weight:800;letter-spacing:0;padding:3px 12px 4px;border-radius:12px;margin:0 0 3px}#acx .rst small{font-size:8px;font-weight:600;line-height:1.2;opacity:.95;letter-spacing:0}#acx .avx{width:12px;height:12px;font-size:7px;top:-4px;right:-4px;border-width:1px}" +
    "#acx .rsb{padding:3px 10px;font-size:11px;line-height:1.35;max-height:14vh;border-bottom-width:1px}#acx .rsb .rsw{padding:2px 7px;margin:2px 0;font-size:11px;border-radius:6px}#acx .rsb .rsw small,#acx .rsb .sm2{font-size:9.5px}";
  st.textContent += "#acx.noshot{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}#acx.noshot input{-webkit-user-select:text;user-select:text}#acx.shotblur>*:not(#acShC):not(#acWm){visibility:hidden;pointer-events:none}#acShC{display:none;position:absolute;top:0;right:0;bottom:0;left:0;z-index:75;align-items:center;justify-content:center;flex-direction:column;text-align:center;font-size:44px;font-weight:800;color:#fff;background:#000;line-height:1.4}#acShC small{display:block;font-size:13px;font-weight:500;opacity:.8;max-width:260px}#acx.shotblur #acShC{display:flex}@media print{body.faNoShot *{display:none!important}body.faNoShot::before{content:'প্রিন্ট বন্ধ';display:block;font-size:30px}}" +
    "#acx .bb.rsbad{background:repeating-linear-gradient(135deg,#fde4e2 0 10px,#fbd0cc 10px 20px)!important;color:#7a1410!important;border:2px dashed #d93025;box-shadow:0 0 0 3px rgba(217,48,37,.14)!important}#acx .bb.rsbad .tm{color:#7a1410!important}#acx .rsh{font-weight:800;font-size:13.5px;line-height:1.35}#acx .rsc{font-size:12px;font-weight:700;margin-top:3px;opacity:.92}#acx .rsw b{overflow-wrap:anywhere}@media(prefers-color-scheme:dark){#acx .bb.rsbad{background:repeating-linear-gradient(135deg,#3b1614 0 10px,#2f1110 10px 20px)!important;color:#ffd9d6!important}#acx .bb.rsbad .tm{color:#ffd9d6!important}}";
  document.head.appendChild(st);


  // ---------- ফাইল প্রিভিউ / ফুল ভিউ / রিঅ্যাকশন / ইমোজি / মিনিমাইজ (সহায়ক) ----------
  function isF(m) { return !!(m && m.kind && m.kind !== "text" && m.file_path); }
  function lab(m) { return m.kind === "image" ? "ছবি" : m.kind === "video" ? "ভিডিও" : m.kind === "audio" ? "অডিও" : "ফাইল"; }
  function thumb(m) { var u = furl(m.file_path); if (m.kind === "image") return '<img class="pt" src="' + u + '" alt="" loading="lazy" decoding="async">'; if (m.kind === "video") return '<span class="pt"><video src="' + u + '#t=0.1" preload="metadata" muted playsinline></video><u>▶</u></span>'; return '<span class="pt">' + (m.kind === "audio" ? "🎵" : "📄") + "</span>"; }
  function find(id) { return MSGS.filter(function (z) { return z.id === id; })[0]; }
  function setReply(id) { if (lockOn()) return toast("আপনি এখন রিপ্লাই দিতে পারবেন না।"); var m = find(id); if (!m) return; var x = MET[id] || {}; if (x.d || m.deleted) return; REPLY = { id: id, nick: x.n || m.nick, text: hid(m) ? "⛔ লুকানো লেখা" : (m.body || (isF(m) ? lab(m) : "ফাইল")), f: isF(m) ? m : null }; showReply(); var i = $("#acI"); if (i && !i.disabled) i.focus(); }
  function react(id, e) {
    if (lockOn()) return; var x = MET[id] = MET[id] || {}, r = x.r = x.r || {};
    if (x.m) { r[x.m] = (r[x.m] || 1) - 1; if (r[x.m] <= 0) delete r[x.m]; }
    if (x.m === e) x.m = null; else { x.m = e; r[e] = (r[e] || 0) + 1; }
    render(true);
    rpc("mc2_ac_react", { p_msg: id, p_voter: vid(), p_emoji: e }).catch(function () {}).then(function () { rtNudge(); return load("new"); });
  }
  function rxlist(id) {
    var Z = document.createElement("div"), L = null, cur = ""; Z.className = "sh0";
    function draw() {
      var r = (MET[id] || {}).r || {}, ks = Object.keys(r).filter(function (e) { return r[e] > 0; }).sort(function (a, b) { return r[b] - r[a]; }), tot = ks.reduce(function (n, e) { return n + r[e]; }, 0);
      var h = '<div class="sh"><b>রিঅ্যাকশন · ' + bd(tot) + '</b><div class="rt"><button type="button" data-t="" class="' + (cur ? "" : "on") + '">সব ' + bd(tot) + "</button>" + ks.map(function (e) { return '<button type="button" data-t="' + esc(e) + '" class="' + (cur === e ? "on" : "") + '">' + esc(e) + " " + bd(r[e]) + "</button>"; }).join("") + "</div>";
      if (L) h += L.filter(function (i) { return !cur || i.e === cur; }).map(function (i) { return '<button type="button" class="rl"' + (i.o ? ' data-own="' + esc(i.e) + '"' : "") + '><span class="av"' + avs(i.n) + '>' + esc(Array.from(i.n || "?")[0] || "?") + "</span><span>" + esc(i.n || "বেনামি") + (i.o ? " (আপনি)<small>ট্যাপ করলে রিঅ্যাকশন সরবে</small>" : "") + "</span><em>" + esc(i.e) + "</em></button>"; }).join("") || '<div class="sm2">কেউ নেই।</div>'; else h += '<div class="sm2">⏳ লোড হচ্ছে…</div>';
      Z.innerHTML = h + '<button type="button" data-x>বন্ধ করুন</button></div>';
    }
    Z.onclick = function (e) {
      var t = e.target.closest("[data-t]"); if (t) { cur = t.dataset.t; return draw(); }
      var o = e.target.closest("[data-own]"); if (o) { var em = o.dataset.own; Z.remove(); return react(id, em); }
      if (e.target === Z || e.target.closest("[data-x]")) Z.remove();
    };
    draw(); $("#acx").appendChild(Z);
    rpc("mc2_ac_reactors", { p_msg: id, p_voter: vid() }).then(function (R) { L = Array.isArray(R) ? R : []; draw(); }).catch(function () {
      var x = MET[id] || {}, r = x.r || {}; L = []; Object.keys(r).forEach(function (e) { for (var k = 0; k < r[e]; k++) L.push({ n: x.m === e && k === 0 ? "আপনি" : "একজন", e: e, o: x.m === e && k === 0 }); }); draw();
    });
  }
  // রিঅ্যাকশনে চাপলে চিপের পাশে ভাসমান বাক্স: কে কোন ইমোজি দিয়েছে
  var RXID = 0, RXOFF = null;
  function rxclose() { var P = $("#acRx"); if (P) P.remove(); RXID = 0; if (RXOFF) { RXOFF(); RXOFF = null; } }
  function rxpop(id, chip) {
    if (RXID === id) return rxclose(); rxclose(); if (!chip) return;
    var A = $("#acx"), P = document.createElement("div"), L = null, mine = !!(MET[id] || {}).o; P.id = "acRx"; RXID = id; P.style.visibility = "hidden";
    function place() {
      var ar = A.getBoundingClientRect(), cr = chip.getBoundingClientRect(), w = P.offsetWidth, h = P.offsetHeight;
      var l = mine ? cr.left - ar.left - w - 6 : cr.right - ar.left + 6; l = Math.max(8, Math.min(l, ar.width - w - 8));
      var t = cr.bottom - ar.top - h; t = Math.max(8, Math.min(t, ar.height - h - 8));
      P.style.left = l + "px"; P.style.top = t + "px"; P.style.visibility = "";
    }
    function draw() {
      var h = L ? (L.length ? L.map(function (i) { return '<button type="button" class="ri' + (i.o ? " me" : "") + '"' + (i.o ? ' data-own="' + esc(i.e) + '"' : "") + "><em>" + esc(i.e) + "</em><span>" + esc(i.n || "বেনামি") + (i.o ? " (আপনি)<small>ট্যাপ করলে রিঅ্যাকশন সরবে</small>" : "") + "</span></button>"; }).join("") : '<div class="rh">কেউ নেই।</div>') : '<div class="rh">⏳ লোড হচ্ছে…</div>';
      P.innerHTML = '<div class="rh">রিঅ্যাকশন · ' + bd(L ? L.length : ((MET[id] || {}).r ? Object.keys(MET[id].r).reduce(function (n, e) { return n + MET[id].r[e]; }, 0) : 0)) + "</div>" + h; place();
    }
    P.onclick = function (e) { var o = e.target.closest("[data-own]"); if (o) { var em = o.dataset.own; rxclose(); react(id, em); } };
    var out = function (e) { if (P.contains(e.target) || (e.target.closest && e.target.closest("[data-rxs]"))) return; rxclose(); };
    var M = $("#acM"), sc = function () { rxclose(); };
    document.addEventListener("click", out, true); if (M) M.addEventListener("scroll", sc, { passive: true });
    RXOFF = function () { document.removeEventListener("click", out, true); if (M) M.removeEventListener("scroll", sc); };
    A.appendChild(P); draw();
    rpc("mc2_ac_reactors", { p_msg: id, p_voter: vid() }).then(function (R) { if (RXID !== id) return; L = Array.isArray(R) ? R : []; draw(); }).catch(function () {
      if (RXID !== id) return; var x = MET[id] || {}, r = x.r || {}; L = []; Object.keys(r).forEach(function (e) { for (var k = 0; k < r[e]; k++) L.push({ n: x.m === e && k === 0 ? "আপনি" : "একজন", e: e, o: x.m === e && k === 0 }); }); draw();
    });
  }
  function emoPick(cb) {
    var Z = document.createElement("div"); Z.className = "sh0";
    function draw() { Z.innerHTML = '<div class="sh"><b>ইমোজি বাছুন</b><div class="ep">' + emoHtml() + '</div><div style="display:flex;gap:6px"><input id="acCe" type="text" maxlength="12" placeholder="নিজের ইমোজি লিখুন বা পেস্ট করুন" style="flex:1"><button type="button" data-ce style="flex:none">যোগ</button></div><button type="button" data-x>বন্ধ করুন</button></div>'; }
    Z.onclick = function (e) {
      var c = e.target.closest("[data-ec]"); if (c) { EMI = +c.dataset.ec; return draw(); }
      var b = e.target.closest("[data-em]"); if (b) { Z.remove(); return cb(b.dataset.em); }
      if (e.target.closest("[data-ce]")) {
        var v = ($("#acCe").value || "").trim(), g = v ? (window.Intl && Intl.Segmenter ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(v))[0].segment : Array.from(v)[0]) : "";
        if (!g || !/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/u.test(g) || Array.from(g).length > 16) return toast("একটি ইমোজি লিখুন।"); Z.remove(); return cb(g);
      }
      if (e.target === Z || e.target.closest("[data-x]")) Z.remove();
    };
    draw(); $("#acx").appendChild(Z);
  }
  function dl(m, btn) {
    var u = furl(m.file_path), n = m.file_name || "file", t = btn ? btn.textContent : ""; if (btn) { btn.textContent = "⏳ ডাউনলোড হচ্ছে…"; btn.disabled = true; }
    var end = function () { if (btn) { btn.textContent = t; btn.disabled = false; } };
    fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(function (b) { var a = document.createElement("a"), o = URL.createObjectURL(b); a.href = o; a.download = n; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(o); }, 4000); end(); }).catch(function () { end(); window.open(u, "_blank"); });
  }
  function viewer(id) {
    var m = find(id); if (!m || !isF(m)) return; var u = furl(m.file_path), h;
    if (m.kind === "image") h = '<img src="' + u + '" alt="' + esc(m.file_name) + '">'; else if (m.kind === "video") h = '<video src="' + u + '" controls autoplay playsinline></video>';
    else if (m.kind === "audio") h = '<div style="font-size:64px">🎵</div><audio src="' + u + '" controls autoplay style="width:min(92vw,360px)"></audio><div>' + esc(m.file_name || "অডিও") + "</div>";
    else h = '<div style="font-size:64px">📄</div><div style="overflow-wrap:anywhere">' + esc(m.file_name || "ফাইল") + "</div><small>" + (m.file_size ? sz(m.file_size) : "") + "</small>";
    var Z = document.createElement("div"); Z.id = "acFv"; Z.setAttribute("role", "dialog");
    Z.innerHTML = '<button class="fx" type="button" aria-label="বন্ধ করুন" data-fx>✕</button><div class="fm">' + h + '</div><button class="fd" type="button" data-fd>⬇ ডাউনলোড</button>';
    var kh = function (e) { if (e.key === "Escape") cl(); }, cl = function () { document.removeEventListener("keydown", kh); Z.remove(); }; document.addEventListener("keydown", kh);
    Z.onclick = function (e) { if (e.target.closest("[data-fd]")) return dl(m, e.target.closest("[data-fd]")); if (e.target.closest("[data-fx]") || e.target === Z || e.target.classList.contains("fm")) cl(); };
    $("#acx").appendChild(Z);
  }
  function pill() {
    var b = $("#acMin"); if (!MINZ || !CUR) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement("button"); b.id = "acMin"; b.type = "button"; b.onclick = function (e) { if (e.target.closest && e.target.closest(".mx")) { e.stopPropagation(); return close(); } if (Date.now() - PDT < 400) return; restore(); }; pdrag(b); document.body.appendChild(b); }
    var n = MSGS.filter(function (m) { return m.id > MINL && !(MET[m.id] || {}).o; }).length;
    b.innerHTML = "💬 " + esc(CUR.sn || "চ্যাট") + " — চ্যাট খুলুন" + (n ? "<em>" + bd(n > 99 ? "99+" : n) + "</em>" : "") + '<span class="mx" role="button" aria-label="চ্যাট বন্ধ করুন">✕</span>';
    pclamp(b);
  }
  // মিনিমাইজ বাটন হাত/মাউস দিয়ে টেনে সরানো; টানলে চ্যাট খোলে না, শুধু ট্যাপে খোলে
  var PDT = 0, PPOS = null;
  function pclamp(b) { if (!PPOS) return; var r = b.getBoundingClientRect(), w = window.innerWidth, h = window.innerHeight; PPOS.l = Math.max(0, Math.min(PPOS.l, w - r.width)); PPOS.t = Math.max(0, Math.min(PPOS.t, h - r.height)); b.style.transform = "none"; b.style.bottom = "auto"; b.style.left = PPOS.l + "px"; b.style.top = PPOS.t + "px"; }
  function pdrag(b) {
    var sx = 0, sy = 0, ox = 0, oy = 0, on = false, mv = false, id = null;
    b.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse" && e.button !== 0) return; var r = b.getBoundingClientRect(); sx = e.clientX; sy = e.clientY; ox = e.clientX - r.left; oy = e.clientY - r.top; on = true; mv = false; id = e.pointerId; });
    b.addEventListener("pointermove", function (e) {
      if (!on || e.pointerId !== id) return;
      if (!mv) { if (Math.abs(e.clientX - sx) < 7 && Math.abs(e.clientY - sy) < 7) return; mv = true; try { b.setPointerCapture(id); } catch (x) {} }
      e.preventDefault(); PPOS = { l: e.clientX - ox, t: e.clientY - oy }; pclamp(b);
    });
    var up = function (e) { if (!on || (e && e.pointerId !== id)) return; on = false; if (mv) { PDT = Date.now(); try { b.releasePointerCapture(id); } catch (x) {} } mv = false; };
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
  }
  function minimize() { var R = $("#acx"); if (!R || !CUR) return; MINZ = true; MINL = MSGS.length ? MSGS[MSGS.length - 1].id : 0; R.style.display = "none"; pill(); location.hash = PH && PH !== "anon" ? PH : "home"; }
  function restore() { var R = $("#acx"); MINZ = false; pill(); if (R) { R.style.display = ""; if (location.hash !== "#anon") location.hash = "anon"; if ($("#acM")) { render(true, "x"); load("new"); } } else if (location.hash === "#anon") gate(); else location.hash = "anon"; }

  function root() { var e = $("#acx"); if (!e) { e = document.createElement("div"); e.id = "acx"; e.setAttribute("role", "dialog"); e.setAttribute("aria-label", "বেনামি চ্যাট"); document.body.appendChild(e); } return e; }
  function unjoin() { if (!CUR || !$("#acM")) return; try { fetch(base + "/rest/v1/rpc/mc2_ac_unjoin", { method: "POST", keepalive: true, headers: H(), body: JSON.stringify({ p_session: +CUR.s, p_voter: vid() }) }).catch(function () {}); } catch (e) {} } // ছাড়লে পাসওয়ার্ড-অ্যাক্সেস মোছে
  function close() { unjoin(); leaveRoom(); rtStop(); clearInterval(iv); iv = null; clearInterval(LV); clearInterval(RST); RST = null; MINZ = false; pill(); var e = $("#acx"); if (e) e.remove(); }
  function head(t, sub, back, right, cls) { return '<div class="ah"><button class="ab" id="acB" type="button" aria-label="পেছনে">' + (back ? "←" : "✕") + '</button><b' + (cls ? ' class="' + cls + '"' : "") + ">" + t + (sub ? "<small>" + sub + "</small>" : "") + "</b>" + (right || "") + "</div>"; }

  // Friend Adda: ঢোকার পর্দা এখন index.html-এ। এখানে শুধু চ্যাট বন্ধ করে ল্যান্ডিং পেইজে ফেরা।
  function gate() { var e = $("#acx"); if (e) e.remove(); if (location.hash !== "#home") location.hash = "home"; }

  // ---------- বার্তা আঁকা ----------
  // রিপ্লাই: বাবলের ওপরে ছোট ফন্টে "↩ আপনি X-কে রিপ্লাই দিয়েছেন" লেখা + ধূসর কোটেশন বাবল (Messenger ধাঁচ)
  function rqx(m, own, nick) {
    if (!m.reply_to) return "";
    var o = find(m.reply_to), ox = o ? MET[o.id] || {} : {}, of = o && isF(o) && !o.deleted && !ox.d, gen = !o && /^📎/.test(m.reply_text || ""), rn = esc(m.reply_nick || "একজন");
    return '<div class="rl2">↩ ' + (own ? "আপনি " + rn + "-কে রিপ্লাই দিয়েছেন" : esc(nick) + " " + rn + "-কে রিপ্লাই দিয়েছেন") + '</div><div class="rqb" data-bb>' + (of ? '<span class="rqf">' + thumb(o) + "<span>" + esc(hid(o) ? "⛔ লুকানো লেখা" : (o.body || lab(o))) + "</span></span>" : gen ? '<span class="rqf"><span class="pt">📎</span><span>ফাইল</span></span>' : (o && hid(o) ? "⛔ লুকানো লেখা" : esc(m.reply_text || ""))) + "</div>";
  }
  function body(m, hd) {
    var h = "", u = m.file_path ? furl(m.file_path) : "";


    if (m.kind === "image" && u) h += '<img class="th" data-fv src="' + u + '" alt="' + esc(m.file_name) + '" loading="lazy" decoding="async">';
    else if (m.kind === "video" && u) h += '<div class="vt" data-fv><video src="' + u + '#t=0.1" preload="metadata" muted playsinline></video><span>▶</span></div>';
    else if (m.kind === "audio" && u) h += '<div class="fc" data-fv><span style="font-size:26px">🎵</span><span>অডিও<small>' + (m.file_size ? sz(m.file_size) : "") + "</small></span></div>";
    else if (m.kind === "file" && u) h += '<div class="fc" data-fv><span style="font-size:26px">📄</span><span>' + esc(m.file_name || "ফাইল") + "<small>" + (m.file_size ? sz(m.file_size) : "") + "</small></span></div>";
    if (m.file_expired && !u) h += '<div style="opacity:.65;font-size:13px">⌛ ফাইলের মেয়াদ শেষ (' + esc(m.file_name || "ফাইল") + ")</div>";
    return h + (m.body ? (h ? '<div style="margin-top:4px">' : "<div>") + (hd ? '<div class="rsh">⛔ RESTRICTED — আপত্তিকর লেখা লুকানো হয়েছে</div><div class="rsc">⚠️ কমিউনিটি ওয়ার্নিং: এই ইউজার আপত্তিকর শব্দ ব্যবহার করেছে।</div>' : fmt(m.body)) + "</div>" : "");
  }
  // ---------- লিংক, @উল্লেখ, তারিখ, শব্দ, নোটিশ (২০২৬-১০-২৩) ----------
  var DUPM = {};
  function dupName(nick, u) { var a = DUPM[String(nick).toLowerCase()]; if (!a || a.length < 2 || !u) return nick; var i = a.indexOf(u); return i > 0 ? nick + " (" + bd(i + 1) + ")" : nick; }
  function pickUser(L) {
    var Z = document.createElement("div"); Z.className = "sh0";
    Z.innerHTML = '<div class="sh"><b>একই নামে ' + bd(L.length) + ' জন — কার তথ্য দেখবেন?</b>' + L.map(function (p) { return '<button type="button" class="ml" data-uc="' + esc(p.u) + '"><span class="dot' + (p.a ? " on" : "") + '"></span><span>' + esc(dupName(p.n, p.u)) + "</span><small>" + esc(String(p.t).slice(0, 18)) + "</small></button>"; }).join("") + '<button type="button" data-x>বন্ধ করুন</button></div>';
    Z.onclick = function (e) { var b = e.target.closest("[data-uc]"); if (b) { var u = b.dataset.uc; Z.remove(); return card(u); } if (e.target === Z || e.target.closest("[data-x]")) Z.remove(); };
    $("#acx").appendChild(Z);
  }
  function mkey(n) { return "@" + String(n || "").replace(/\s+/g, "_"); }
  function fmt(t) {
    var me = CUR ? esc(mkey(CUR.n)) : "";
    return esc(t).replace(/(https?:\/\/[^\s<]+?)(?=(?:[.,;:!?)]*(?:\s|$))|&quot;|&#39;|&gt;)|(@[^\s@<,.;:!?]{1,24})/g, function (a, u, mn) {
      if (u) return '<a href="' + u + '" target="_blank" rel="noopener noreferrer nofollow">' + u + "</a>";
      return '<b class="mn' + (mn === me ? " me" : "") + '">' + mn + "</b>";
    });
  }
  function mentionsMe(m) { return !!(m && m.body && CUR && (String(m.body).match(/@[^\s@<,.;:!?]{1,24}/g) || []).indexOf(mkey(CUR.n)) >= 0); }
  function dlab(t) { var d = new Date(t), n = new Date(), y = new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1); if (d.toDateString() === n.toDateString()) return "আজ"; if (d.toDateString() === y.toDateString()) return "গতকাল"; return bd(d.getDate()) + " " + MON[d.getMonth()] + (d.getFullYear() !== n.getFullYear() ? " " + bd(d.getFullYear()) : ""); }
  var SND = { on: LS.get("fa_snd", 1) !== 0, ctx: null, t: 0, n: 0, title: "" };
  function sndUnlock() { try { if (!SND.ctx) { var A = window.AudioContext || window.webkitAudioContext; if (A) SND.ctx = new A(); } if (SND.ctx && SND.ctx.state === "suspended") SND.ctx.resume(); } catch (e) {} }
  ["pointerdown", "keydown", "touchend"].forEach(function (ev) { document.addEventListener(ev, sndUnlock, { passive: true }); });
  function ding(soft) { // part63: soft=1 → চ্যাট সামনে খোলা (নরম, ভাইব্রেশন নেই); নইলে ব্যাকগ্রাউন্ড/মিনিমাইজ (পুরো শব্দ + ভাইব্রেশন)
    if (!SND.on) return; var now = Date.now(); if (now < (SND.mu || 0)) return; /* নিজে পাঠানোর ঠিক পরে ডিং নয় */ if (now - SND.t < 2500) return; SND.t = now;
    if (!soft) { try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) {} }
    if (!SND.ctx || SND.ctx.state !== "running") return;
    try { var c = SND.ctx, o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime; o.type = "sine"; o.frequency.setValueAtTime(880, t0); o.frequency.setValueAtTime(1175, t0 + 0.12); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(soft ? 0.14 : 0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.42); } catch (e) {}
  }
  var TYS = {}; // part63: কে কখন শেষ টাইপ-শব্দ করিয়েছে
  function tick() { // কেউ টাইপ শুরু করলে ছোট নরম "টুক"
    if (!SND.on || !SND.ctx || SND.ctx.state !== "running") return;
    try { var c = SND.ctx, o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime; o.type = "sine"; o.frequency.setValueAtTime(660, t0); o.frequency.exponentialRampToValueAtTime(520, t0 + 0.07); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09); o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.1); } catch (e) {}
  }
  function bump(n) { if (!SND.title) SND.title = document.title; SND.n += n; document.title = "(" + bd(SND.n) + ") নতুন বার্তা"; }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && SND.title) { document.title = SND.title; SND.title = ""; SND.n = 0; } });
  function sndLab() { return SND.on ? "🔔 নতুন বার্তার শব্দ: চালু" : "🔕 নতুন বার্তার শব্দ: বন্ধ"; }
  function loadNote() {
    var e = $("#acNt"); if (!e || !CUR) return;
    api("mc2_ac_sessions?select=pw_note&id=eq." + CUR.s).then(function (r) { var t = r && r[0] && r[0].pw_note ? String(r[0].pw_note).trim() : ""; e = $("#acNt"); if (!e) return; e.hidden = !t; if (t) e.textContent = "📢 " + t; }).catch(function () {});
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) loadNote(); });
  function avs(n) { var k = String(n || "?").toLowerCase(), h = 0, i; for (i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 360; return ' style="background:linear-gradient(135deg,hsl(' + h + ',72%,58%),hsl(' + ((h + 40) % 360) + ',78%,44%));box-shadow:0 0 0 2px var(--bg,#fff),0 0 0 3.5px hsl(' + h + ',72%,55%)"'; }
  function bub(m, prev) {
    var x0 = MET[m.id]; if (x0 && x0.ed && x0.b != null && !x0.d && !m.deleted) m = Object.assign({}, m, { body: x0.b });
    var x = MET[m.id] || {}, own = !!x.o, nick = x.n || m.nick, nm = "", rk = (x.d || m.deleted) ? "" : rsKey(x, own), hd = !!(RSON !== false && m.body && !(x.d || m.deleted) && badText(m.body));
    if (!own && (!prev || prev.own || prev.nick !== nick)) nm = '<div class="nm uc" data-uc="' + esc(x.u || "") + '">' + (x.a ? '<span class="dot on"></span> ' : "") + esc(dupName(nick, x.u)) + (rk ? ' <span class="rsp" data-rs="' + esc(rk) + '">⛔ Restricted</span>' : "") + "</div>";
    var rx = "", r = x.r || {}, ks = Object.keys(r).filter(function (e) { return r[e] > 0; }).sort(function (a, b) { return r[b] - r[a]; }), tot = ks.reduce(function (n, e) { return n + r[e]; }, 0);
    if (tot) rx = '<button type="button" data-rxs aria-label="কে কী রিঅ্যাকশন দিয়েছে দেখুন"' + (x.m ? ' class="on"' : "") + ">" + ks.slice(0, 3).map(esc).join("") + (tot > 1 ? "<i>" + bd(tot) + "</i>" : "") + "</button>";
    return '<div class="r' + (own ? " mine" : "") + (rk ? " rs" : "") + (SEL === m.id ? " sel" : "") + '" data-id="' + m.id + '">' + (own ? "" : (rk ? '<span class="avw">' : "") + '<span class="av uc" data-uc="' + esc(x.u || "") + '"' + avs(nick) + '>' + esc(Array.from(nick)[0] || "?") + "</span>" + (rk ? '<button type="button" class="avs" data-rs="' + esc(rk) + '" aria-label="Restricted — ওয়ার্নিং দেখুন">Restricted</button><button type="button" class="avx" data-rs="' + esc(rk) + '" aria-label="Restricted — ওয়ার্নিং দেখুন">✕</button></span>' : "")) +
      '<div class="col">' + (m.reply_to && !(x.d || m.deleted) ? "" : nm) + (rk ? '<div class="rst" data-rs="' + esc(rk) + '">' + "⛔ RESTRICTED<small>এই মেসেজ আপত্তিকর ছিল</small>" + "</div>" : "") + (x.d || m.deleted ? "" : rqx(m, own, nick)) + '<div class="bw">' + (x.d || m.deleted ? '<div class="bb dl">' + ((x.mr != null ? x.mr : m.mod_removed) ? "🛡️ অ্যাডমিন এই বার্তাটি সরিয়েছেন" + (function () { var nt = String(x.mn != null ? x.mn : m.mod_note || "").trim(); return nt ? '<span class="adn">📝 অ্যাডমিন নোট: ' + esc(nt) + "</span>" : ""; })() : "🚫 বার্তা মুছে ফেলা হয়েছে") + "</div>" : '<div class="bb' + (!m.body && !m.reply_to && m.file_path && (m.kind === "image" || m.kind === "video") ? " mm" : "") + (hd ? " rsbad" : emc(m)) + (mentionsMe(m) && !own ? " mnm" : "") + '" data-bb>' + body(m, hd) + '<span class="tm">' + (x.ed ? '<u class="edl" data-eh="' + m.id + '" role="button" style="cursor:pointer;text-decoration:underline dotted">✎ Edited</u> · ' : "") + tm(m.created_at) + "</span></div>") +
      (rx ? '<div class="rxs">' + rx + "</div>" : "") + "</div>" + (own && !(x.d || m.deleted) ? '<button class="sn" type="button" data-seen>' + (x.s > 0 ? "👁 দেখেছে " + bd(x.s) : "✓ পাঠানো হয়েছে") + "</button>" : "") + '</div></div>';
  }
  // বদলানো অংশ খুঁজে শুধু সেটুকু বসায়: শুরু ও শেষ থেকে যেগুলো হুবহু মেলে সেগুলো যেমন আছে তেমন থাকে (ছবি আবার ডিকোড হয় না, লেআউট নড়ে না)
  function patchList(M, h) {
    try {
      var T = document.createElement("template"); T.innerHTML = h;
      var nw = [].slice.call(T.content.childNodes), od = [].slice.call(M.childNodes), n = nw.length, o = od.length, a = 0, b = 0, i;
      var same = function (x, y) { return x.nodeType === y.nodeType && (x.nodeType === 1 ? x.outerHTML === y.outerHTML : x.nodeValue === y.nodeValue); };
      while (a < n && a < o && same(od[a], nw[a])) a++;
      while (b < n - a && b < o - a && same(od[o - 1 - b], nw[n - 1 - b])) b++;
      var ref = b ? od[o - b] : null;
      for (i = a; i < o - b; i++) M.removeChild(od[i]);
      for (i = a; i < n - b; i++) M.insertBefore(nw[i], ref);
    } catch (er) { M.innerHTML = h; }
  }
  function render(force, mode, keep) {
    var M = $("#acM"); if (!M) return;
    // টাইপ করার সময় পুরো লিস্ট আঁকা পিছিয়ে দেয় (থামলে ০.৮ সেকেন্ডে আঁকে; সর্বোচ্চ ৪ সেকেন্ড দেরি)
    if (!force && TYP && Date.now() - TYP < 700) { if (!render._s) render._s = Date.now(); if (Date.now() - render._s < 4000) { clearTimeout(render._t); render._t = setTimeout(function () { render(false, mode, keep); }, 800); return; } }
    render._s = 0; clearTimeout(render._t); var hide = LS.get("mc2_ac_hide", []);
    var sig = MSGS.length + ":" + (MSGS.length ? MSGS[MSGS.length - 1].id : 0) + ":" + MORE + ":" + UP + ":" + hide.length + ":" + EVS.length + ":" + (EVS.length ? EVS[EVS.length - 1].id : 0) + ":" + RSV + ":" + SHL.length + ":" + (SHL.length ? SHL[SHL.length - 1].id : 0) + ":" + JSON.stringify(MET);
    if (!force && sig === SIG) return;
    if (!force && TCH && Date.now() - TCH < 8000) return; // আঙুল ঠেকানো অবস্থায় আঁকা বন্ধ (সোয়াইপ-রিপ্লাই ভাঙত)
    if ([].some.call(M.querySelectorAll("video,audio"), function (e) { return !e.paused; })) return; // চলার সময় আঁকা বন্ধ
    DUPM = {}; MSGS.forEach(function (m) { var x = MET[m.id] || {}; if (!x.u) return; var k = String(x.n || m.nick).toLowerCase(), a = DUPM[k] || (DUPM[k] = []); if (a.indexOf(x.u) < 0) a.push(x.u); });
    SIG = sig; var near = M.scrollHeight - M.scrollTop - M.clientHeight < 90, ph = M.scrollHeight, pt = M.scrollTop, prev = null, h = MORE && MSGS.length ? '<button class="old" id="acHi" type="button">⬆ আগের বার্তা দেখুন</button>' : "";
    var items = MSGS.map(function (m) { return { t: Date.parse(m.created_at), m: m }; }).concat(EVS.map(function (e) { return { t: e.t, e: e }; })).concat(shotItems()).sort(function (a, b) { return a.t - b.t; });
    var IN = {}, LD = "", sep = function (t) { var k = new Date(t).toDateString(); if (k === LD) return ""; LD = k; return '<div class="dt">' + dlab(t) + "</div>"; };
    items.forEach(function (it) {
      if (it.s) { h += sep(it.t); h += '<div class="sy shx"><b>📸 ' + esc(it.s.n || "বেনামি") + "</b> স্ক্রীনশট নিয়েছে · " + '<button type="button" class="shtm" data-shu="' + esc(it.s.v) + '" data-sht="' + it.s.id + '">' + tm(it.t) + "</button></div>"; prev = null; return; }
      if (it.e) { var en = it.e.n, jn = it.e.k === "join"; if (jn && IN[en]) return; /* একই নামে বারবার "যোগ দিয়েছে" দেখাবে না */ IN[en] = jn; h += sep(it.t); h += '<div class="sy"><b>' + esc(en) + "</b> " + (jn ? "যোগ দিল" : "বের হল") + " · " + tm(it.e.t) + "</div>"; prev = null; return; }
      var m = it.m; if (hide.indexOf(m.id) >= 0) return; var sp = sep(it.t); if (sp) { h += sp; prev = null; } h += bub(m, prev); var o = (MET[m.id] || {}); prev = { own: !!o.o, nick: o.n || m.nick };
    });
    // part103: পুরো লিস্ট মুছে নতুন করে না এঁকে শুধু যে অংশ বদলেছে সেটুকু বদলানো (HTML আগের মতোই; রিঅ্যাক্ট/রিপ্লাই/এডিট/ডিলেট সব একই)
    if (!h) M.innerHTML = '<div class="em">এখনো কেউ কিছু লেখেনি।<br>প্রথম বার্তাটা আপনিই পাঠান 👋</div>';
    else if (!M.firstChild) M.innerHTML = h;
    else patchList(M, h);
    if (mode === "old") M.scrollTop = M.scrollHeight - ph + pt; else if (near || force === "bottom") M.scrollTop = M.scrollHeight;
    applyLock();
  }
  // ---------- মেসেঞ্জারের মতো: ⬇ ভাসমান বাটন + ওপরে স্ক্রল করলে আগের বার্তা নিজে আসা (দেরি হলে ক্লিক করে আনা) ----------
  var OLDBUSY = 0;
  function oldBtn(t, dis) { var b = $("#acHi"); if (b) { b.textContent = t; b.disabled = dis; } }
  function loadOld(force) {
    if (!MORE || !MSGS.length || !CUR) return Promise.resolve();
    if (OLDBUSY && !force) return Promise.resolve();
    OLDBUSY = Date.now(); oldBtn("⏳ আগের বার্তা আসছে…", true);
    var tt = setTimeout(function () { oldBtn("⬆ আসতে দেরি হচ্ছে — এখানে ট্যাপ করে আনুন", false); }, 2500);
    return load("old").then(function () { clearTimeout(tt); OLDBUSY = 0; }, function () { clearTimeout(tt); OLDBUSY = 0; });
  }
  function bindScroll() {
    var M = $("#acM"), X = $("#acx"); if (!M || !X) return;
    if (!document.getElementById("acJdS")) { var sx = document.createElement("style"); sx.id = "acJdS"; sx.textContent = "#acx .jd{position:absolute;right:14px;z-index:5;width:38px;height:38px;border-radius:50%;border:1px solid rgba(128,128,128,.4);background:var(--bg);color:inherit;font-size:18px;line-height:1;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);padding:0;display:grid;place-items:center;opacity:.95}#acx .jd:active{transform:scale(.94)}"; document.head.appendChild(sx); }
    var jb = $("#acJd"); if (jb) jb.remove();
    jb = document.createElement("button"); jb.id = "acJd"; jb.className = "jd"; jb.type = "button"; jb.hidden = true; jb.textContent = "⬇"; jb.setAttribute("aria-label", "সর্বশেষ বার্তায় যান"); X.appendChild(jb);
    var upd = function () {
      if (!jb.isConnected) return; var gap = M.scrollHeight - M.scrollTop - M.clientHeight;
      jb.hidden = gap < Math.max(300, M.clientHeight); // এক পেজ ওপরে গেলে দেখা যায়, নিচে এলে চলে যায়
      if (!jb.hidden) { var r = M.getBoundingClientRect(), xr = X.getBoundingClientRect(); jb.style.bottom = Math.max(8, xr.bottom - r.bottom + 64) + "px"; }
      if (M.scrollTop < 120 && MORE && MSGS.length && !OLDBUSY && M.scrollHeight > M.clientHeight) loadOld(false); // ওপরে পৌঁছালে আগের বার্তা নিজে আসে
    };
    M.addEventListener("scroll", upd, { passive: true }); window.addEventListener("resize", upd);
    jb.onclick = function () { M.scrollTo({ top: M.scrollHeight, behavior: "smooth" }); };
  }
  function load(mode) {
    var q = "mc2_ac_messages?select=id,nick,body,created_at,reply_to,reply_nick,reply_text,kind,file_path,file_name,file_size,file_mime,deleted" + (NOMR ? "" : ",mod_removed,file_expired" + (NOMN ? "" : ",mod_note")) + "&session_id=eq." + CUR.s, first = MSGS.length ? MSGS[0].id : 0, last = MSGS.length ? MSGS[MSGS.length - 1].id : 0;
    q += mode === "new" ? "&id=gt." + last + "&order=id.asc&limit=100" : mode === "old" ? "&id=lt." + first + "&order=id.desc&limit=40" : "&order=id.desc&limit=40";
    return api(q).then(function (L) {
      if (mode !== "new") { L.reverse(); MORE = L.length >= (mode === "old" ? 40 : 40); }
      if (mode === "old") { var hv = {}; MSGS.forEach(function (m) { hv[m.id] = 1; }); MSGS = L.filter(function (m) { return !hv[m.id]; }).concat(MSGS); } else if (mode === "new") { var have = {}; MSGS.forEach(function (m) { have[m.id] = 1; }); MSGS = MSGS.concat(L.filter(function (m) { return !have[m.id]; })); } else MSGS = L;
      // স্পিড: নিচে থাকলে শুধু শেষ ১২০টা বার্তা রাখি (বাকিগুলো "⬆ আগের বার্তা"-য় আসবে)
      if (mode === "new" && MSGS.length > 150) { var Mq = $("#acM"); if (Mq && Mq.scrollHeight - Mq.scrollTop - Mq.clientHeight < 90) { MSGS = MSGS.slice(-120); MORE = true; } }
      // নতুন মেসেজ আগে সঙ্গে সঙ্গে আঁকে (রিঅ্যাকশন/মেটা পরে বসে); নিজের পাঠানো মেসেজ SENT দিয়ে আগেই "আমার" চেনা যায়
      if (mode === "new" && L.length) { var nw = L.filter(function (m) { return !SENT[m.id] && !(MET[m.id] && MET[m.id].o); }); if (nw.length) { ding(!(document.hidden || MINZ)); if (document.hidden) bump(nw.length); } /* part63: চ্যাট সামনে খোলা থাকলেও নতুন বার্তায় নরম শব্দ */ L.forEach(function (m) { if (!MET[m.id]) MET[m.id] = SENT[m.id] ? { o: 1 } : {}; }); if (L.some(function (m) { return m.body && badText(m.body); })) { setTimeout(rsLoad, 800); setTimeout(rsLoad, 3500); } render(false, mode); pill(); }
      return rpc("mc2_ac_meta", { p_session: +CUR.s, p_min: MSGS.length ? MSGS[0].id : 0, p_voter: vid() }).then(function (r) { UP = r.up !== false; ONL = r.on || 0; ME = r.me || { s: "ok", w: [] }; applyMe(); subt(); MET = {}; (r.rows || []).forEach(function (x) { MET[x.id] = x; }); if (r.rows) { var cap = r.rows.length >= 500, lo = r.rows.length ? Math.min.apply(null, r.rows.map(function (x) { return x.id; })) : 0; MSGS = MSGS.filter(function (m) { return (cap && m.id < lo) || !!MET[m.id]; }); } }).catch(function () {});
    }).then(function () {
      render(mode === "first" ? "bottom" : mode === "old", mode); pill();
      var l = MSGS.length ? MSGS[MSGS.length - 1].id : 0; if (l > LASTSEEN && !document.hidden && !MINZ) { LASTSEEN = l; rpc("mc2_ac_seen", { p_session: +CUR.s, p_voter: vid(), p_nick: CUR.n, p_last: l }).catch(function () {}); }
    }).catch(function () { if (!NOMN && !NOMR) { NOMN = true; return load(mode); } if (!NOMR) { NOMR = true; return load(mode); } if (mode === "first") { var M = $("#acM"); if (M) M.innerHTML = '<div class="em">বার্তা লোড হয়নি — নেটওয়ার্ক বা SQL দেখুন।</div>'; } });
  }

  // ---------- মেনু / অ্যাকশন ----------
  // ✎ Edited লেখায় চাপলে: কতবার বদলেছে + আগের সব লেখা সময়সহ (সবাই দেখে) — SQL-14: mc2_ac_edit_history
  function editHist(id) {
    rpc("mc2_ac_edit_history", { p_msg: id, p_voter: vid() }).then(function (r) {
      var L = r && r.versions ? r.versions : [];
      if (!r || !L.length) return toast("Edit History পাওয়া যায়নি।");
      var h = "<b>✎ Edit History</b><div class=\"sm2\">মোট " + bd(L.length) + " বার Edit করা হয়েছে।</div>";
      L.forEach(function (v, i) { h += "<div style=\"margin:8px 0;padding:8px 10px;border-radius:12px;background:rgba(128,128,128,.14);text-align:left;overflow-wrap:anywhere\"><small style=\"opacity:.7\">" + (i === 0 ? "প্রথম লেখা" : bd(i + 1) + " নম্বর লেখা") + " · " + tm(v.t) + " পর্যন্ত</small><div>" + esc(v.b) + "</div></div>"; });
      h += "<div style=\"margin:8px 0;padding:8px 10px;border-radius:12px;background:rgba(10,102,255,.16);text-align:left;overflow-wrap:anywhere\"><small style=\"opacity:.7\">এখনকার লেখা</small><div>" + esc(r.cur) + "</div></div>";
      pop(h);
    }).catch(function () { toast("ইতিহাস লোড হয়নি।"); });
  }
  // নিজের পাঠানো লেখা পাঠানোর ৫ মিনিটের মধ্যে সম্পাদনা (সার্ভারেও ৫ মিনিট যাচাই হয়: mc2_ac_edit, SQL-14)
  function editMsg(id, m, x) {
    var cur = x && x.ed && x.b != null ? x.b : m.body;
    var Z = document.createElement("div"); Z.className = "sh0";
    Z.innerHTML = '<div class="sh"><b>✏️ Edit Message</b><div class="sm2">পাঠানোর ৫ মিনিটের মধ্যে Edit করা যায়। Edit করলে বার্তায় “Edited” লেখা সবসময় থাকবে।</div><textarea id="acEdT" rows="3" maxlength="400" aria-label="বার্তা" style="width:100%;box-sizing:border-box;border-radius:12px;padding:10px;font:inherit;font-size:15px;border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;resize:vertical">' + esc(cur) + '</textarea><button type="button" data-ok>✅ সেভ করুন</button><button type="button" data-x>বাতিল</button></div>';
    Z.onclick = function (e) {
      var b = e.target.closest("button");
      if (!b) { if (e.target === Z) Z.remove(); return; }
      if (b.hasAttribute("data-x")) return Z.remove();
      if (!b.hasAttribute("data-ok")) return;
      var t = ($("#acEdT").value || "").trim();
      if (!t) return toast("লেখা খালি রাখা যাবে না।");
      if (t === cur) return Z.remove();
      b.disabled = true;
      rpc("mc2_ac_edit", { p_msg: id, p_voter: vid(), p_body: t }).then(function (r) {
        Z.remove();
        if (r > 0) { toast("Edit হয়েছে।"); rtNudge(); load("new"); }
        else if (r === 0) toast("৫ মিনিট পেরিয়ে গেছে — এখন আর Edit করা যাবে না।");
        else if (r === -3 || r === -6) toast("এখন বার্তা বদলানো যাবে না।");
        else if (r === -4) toast("খুব দ্রুত হয়ে যাচ্ছে — একটু থামুন।");
        else toast("লেখাটি ঠিক নয়।");
      }).catch(function () { b.disabled = false; toast("Edit হয়নি — নেটওয়ার্ক দেখুন।"); });
    };
    $("#acx").appendChild(Z);
    setTimeout(function () { var q = $("#acEdT"); if (q) { q.focus(); } }, 60);
  }
  var SH_SZ = { s: [22, 17, 11], m: [26, 20, 12.5], l: [30, 24, 14] };
  function shSz(next) { var k = LS.get("mc2_ac_shsz", "s"); if (!SH_SZ[k]) k = "s"; if (next) { k = k === "s" ? "m" : k === "m" ? "l" : "s"; LS.set("mc2_ac_shsz", k); } var z = SH_SZ[k]; return "--em:" + z[0] + "px;--ic:" + z[1] + "px;--lb:" + z[2] + "px"; }
  function sheet(id, own) {
    var m = MSGS.filter(function (x) { return x.id === id; })[0]; if (!m) return; var x = MET[id] || {}, dead = x.d || m.deleted, mine = !!x.o || own, fresh = Date.now() - new Date(m.created_at).getTime() < 300000;
    var S = document.createElement("div"); S.className = "sh0"; S.id = "acSh";
    var tl = function (d, ic, lb, cl, hn, wd) { var c = ((cl || "") + (wd ? " wd" : "")).trim(); return '<button type="button"' + (c ? ' class="' + c + '"' : "") + ' data-do="' + d + '"><i>' + ic + "</i><span>" + lb + (hn ? " <small>" + hn + "</small>" : "") + "</span></button>"; };
    S.innerHTML = '<div class="sh ms" style="' + shSz() + '"><div class="hd"><span></span><button type="button" class="szb" data-sz aria-label="সাইজ বদলান">Aa</button></div>' +
      (dead ? "" : '<div class="rb">' + RX.map(function (e) { return '<button type="button" data-e="' + e + '">' + e + "</button>"; }).join("") + '<button type="button" class="mr" data-more aria-label="আরও ইমোজি">➕</button></div>') +
      '<div class="sg">' +
      (dead ? "" : (lockOn() ? "" : tl("reply", "↩️", "উত্তর")) + (m.body && !SHOT && !hid(m) ? tl("copy", "📋", "কপি") : "") + (!mine ? tl("mention", "@", "উল্লেখ") : "") + (mine ? tl("seen", "👁", "কারা দেখেছে") : "")) +
      (mine && !dead && fresh && m.body && (!m.kind || m.kind === "text") && !lockOn() ? tl("edit", "✏️", "এডিট", "", "৫ মি.") : "") + (mine && !dead && fresh ? tl("unsend", "🗑", "সবার জন্য মুছুন", "dg", "৫ মি.") : "") +
      (dead ? "" : (!mine ? tl("report", "🚩", "রিপোর্ট", "dg") : "") + (ADM && !mine ? tl("adm", "🛡️", "অ্যাডমিন: Restriction / ব্যান / বার্তা সরান", "", "", 1) : "")) +
      tl("me", "🗑", "আমার জন্য মুছুন", "dg") + "</div></div>";
    $("#acx").appendChild(S);
    S.onclick = function (e) {
      var b = e.target.closest("button"), cl = function () { S.remove(); };
      if (!b) return cl();
      if ("sz" in b.dataset) { var sh = S.firstChild; if (sh) sh.setAttribute("style", shSz(1)); return; }
      if (b.dataset.e) { cl(); return react(id, b.dataset.e); }
      if ("more" in b.dataset) { cl(); return emoPick(function (em) { react(id, em); }); }
      var d = b.dataset.do; cl();
      if (d === "reply") setReply(id);
      else if (d === "report") report(id, m, x);
      else if (d === "adm") admMenu(id);
      else if (d === "mention") { var iN = $("#acI"); if (iN && !iN.disabled) { iN.value += (iN.value && !/\s$/.test(iN.value) ? " " : "") + mkey(x.n || m.nick) + " "; growI(); iN.focus(); } }
      else if (d === "copy") { try { navigator.clipboard.writeText(x.ed && x.b != null ? x.b : m.body); toast("কপি হয়েছে।"); } catch (er) { toast("কপি হয়নি।"); } }
      else if (d === "seen") rpc("mc2_ac_seenlist", { p_msg: id }).then(function (L) { var Z = document.createElement("div"); Z.className = "sh0"; Z.innerHTML = '<div class="sh"><b>👁 যারা দেখেছে (' + bd(L.length) + ")</b>" + (L.length ? L.map(function (n) { return "<div>• " + esc(n) + "</div>"; }).join("") : "<div>এখনো কেউ দেখেনি।</div>") + '<button type="button">বন্ধ করুন</button></div>'; Z.onclick = function () { Z.remove(); }; $("#acx").appendChild(Z); }).catch(function () { toast("লোড হয়নি।"); });
      else if (d === "edit") editMsg(id, m, x);
      else if (d === "unsend") { if (confirm("সবার জন্য মুছে ফেলবেন?")) rpc("mc2_ac_unsend", { p_msg: id, p_voter: vid() }).then(function (ok) { toast(ok ? "সবার জন্য মুছে গেছে।" : "৫ মিনিট পেরিয়ে গেছে — এখন শুধু নিজের জন্য মোছা যাবে।"); if (ok) rtNudge(); load("new"); }).catch(function () { toast("মোছা যায়নি।"); }); }
      else if (d === "me") { var k = LS.get("mc2_ac_hide", []); k.push(id); LS.set("mc2_ac_hide", k.slice(-1000)); render(true); }
    };
  }
  function selClear() { SEL = 0; var M = $("#acM"); if (M) [].forEach.call(M.querySelectorAll(".r.sel"), function (r) { r.classList.remove("sel"); }); }
  function showReply() { var p = $("#acRp"); if (!p) return; p.hidden = !REPLY; if (REPLY) p.querySelector("span").innerHTML = (REPLY.f ? thumb(REPLY.f) : "") + "<i><b>↩️ " + esc(REPLY.nick) + "</b><br>" + esc(REPLY.text) + "</i>"; }

  // হেডার: ১ম লাইনে গ্রুপের নাম (যতটা বড় হয়, এক লাইনে ধরে), ২য় লাইনে শুধু চ্যাটকারীর নাম, ৩য় লাইনে ক্লিকযোগ্য "🟢 N জন অনলাইন"
  function subt() { if (!CUR) return; var n = $("#acNm"), o = $("#acOl"); if (n) n.textContent = CUR.n; if (o) { o.hidden = false; o.textContent = "🟢 অনলাইন (" + bd(Math.max(ONL, 1)) + ")"; } }
  function fit() { var e = $("#acGn"); if (!e) return; var z = 22; e.style.fontSize = z + "px"; e.style.whiteSpace = "nowrap"; while (e.scrollWidth > e.clientWidth && z > 12) { z--; e.style.fontSize = z + "px"; } e.style.textOverflow = "ellipsis"; }
  window.addEventListener("resize", fit);
  // শুধু ইমোজির বার্তা: ১টা = বড় (e1), ২+ = ছোট (e2), বাবল ছাড়া। স্কিন-টোন/ZWJ জোড়া ১টা ইমোজি। (Extended_Pictographic)
  var EMO = null; try { var ep = "\\p{Extended_Pictographic}(?:\\uFE0F|[\\u{1F3FB}-\\u{1F3FF}])*"; EMO = new RegExp(ep + "(?:\\u200D" + ep + ")*", "gu"); } catch (e) {}
  function emc(m) {
    if (!EMO || !m.body || m.reply_to || m.file_path) return ""; var t = String(m.body).replace(/\s+/g, ""); if (!t) return "";
    var k = t.match(EMO); if (!k || k.join("") !== t) return ""; return k.length === 1 ? " e1" : " e2";
  }
  function pop(h) { var Z = document.createElement("div"); Z.className = "sh0"; Z.innerHTML = '<div class="sh">' + h + '<button type="button" data-x>বন্ধ করুন</button></div>'; Z.onclick = function (e) { if (e.target.closest("[data-uc]")) { var u = e.target.closest("[data-uc]").dataset.uc; Z.remove(); return card(u); } if (e.target === Z || e.target.closest("[data-x]")) Z.remove(); }; $("#acx").appendChild(Z); }
  // নাম ক্লিক: ইউজার কার্ড (শুধু নাম, আইডি, বিভাগ, সেশন, স্কোর, অনলাইন, Last Active; আইপি/ডিভাইস/ফোন অ্যাডমিন ছাড়া কেউ দেখে না)
  function card(u) {
    if (!u) return toast("এই ইউজারের তথ্য নেই।");
    var exP = ADM ? arpc("mc2_ac_admin_active", { p_hours: 87600, p_dept: null }).catch(function () { return null; }) : Promise.resolve(null);
    var nhP = ADM ? arpc("fa_admin_name_history", { p_uid: u }).catch(function () { return null; }) : Promise.resolve(null); // শুধু অ্যাডমিন: নামের ইতিহাস (SQL-6)
    Promise.all([rpc("mc2_ac_usercard", { p_session: +CUR.s, p_uid: u }), exP, nhP]).then(function (rr) {
      var c = rr[0], AL = rr[1], NH = rr[2], ex = "";
      if (!c) return toast("তথ্য পাওয়া যায়নি।");
      if (ADM && Array.isArray(AL)) { // শুধু অ্যাডমিন লগইন থাকলে ফুল ডিটেলস
        var a = AL.filter(function (x) { return x.uid === u; })[0];
        if (a) { var loc = [a.city, a.region, a.country].filter(Boolean).join(", "), r2 = function (k, v) { return "<b>" + k + "</b><span>" + esc(v == null || v === "" ? "—" : v) + "</span>"; };
          ex = r2("🔒 আইপি", a.ip) + r2("🔒 লোকেশন (আনুমানিক)", loc) + r2("🔒 ডিভাইস", a.ua ? String(a.ua).slice(0, 120) : "") + r2("🔒 ফোন মডেল", a.model) + r2("🔒 ডিভাইস আইডি", a.voter); }
      }
      if (ADM && Array.isArray(NH)) ex += "<b>🔒 নামের ইতিহাস</b><span>" + (NH.length ? NH.map(function (h) { return esc(h.o || "—") + " → " + esc(h.n) + " <small style=\"opacity:.65\">(" + ago(h.t) + ")</small>"; }).join("<br>") : "কখনো নাম বদলায়নি") + "</span>";
      var st = ""; // ব্লক/রেস্ট্রিকশন + দৈনিক বার্তা (SQL-5 চালানো না থাকলে এই অংশ আসে না)
      if (c.days) {
        var rw = function (k, v) { return "<b>" + k + "</b><span>" + v + "</span>"; };
        var dl = function (d, i) { if (i === 0) return "আজ"; if (i === 1) return "গতকাল"; var q = String(d).split("-"); return bd(+q[2]) + "/" + bd(+q[1]); };
        var left = function (t) { var m = Math.max(1, Math.round((t - Date.now()) / 60000)); if (m < 60) return bd(m) + " মিনিট"; var h = Math.round(m / 60); return h < 48 ? bd(h) + " ঘণ্টা" : bd(Math.round(h / 24)) + " দিন"; };
        st = rw("🚫 ব্লক", c.banned ? '<b style="color:#e5484d">হ্যাঁ — ব্লক আছে</b>' : "না")
          + rw("⛔ রেস্ট্রিকশন", c.restricted ? '<b style="color:#e5484d">হ্যাঁ — এখন আছে' + (c.ru ? " (আরও " + left(c.ru) + ")" : "") + "</b>" : "এখন নেই") + rw("⛔ মোট রেস্ট্রিকশন", bd(c.rcnt || 0) + " বার")
          + rw("📅 আজ পাঠিয়েছে", bd(c.today || 0) + "টি")
          + rw("📊 দৈনিক (৭ দিন)", c.days.map(function (x, i) { return dl(x.d, i) + ": " + bd(x.n) + "টি"; }).join("<br>"));
      }
      pop('<div style="text-align:center;padding:6px"><span class="av"' + avs(c.n).replace('style="','style="width:56px;height:56px;font-size:24px;margin:0 auto 6px;') + '>' + esc(Array.from(c.n)[0] || "?") + '</span><b style="font-size:17px">' + esc(c.n) + '</b>' + (c.days ? '<div style="margin-top:6px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;font-size:13px;font-weight:700"><span style="padding:3px 10px;border-radius:999px;background:rgba(128,128,128,.16)">💬 মোট বার্তা ' + bd(c.msgs || 0) + '</span><span style="padding:3px 10px;border-radius:999px;background:' + ((c.rcnt || 0) > 0 || c.restricted ? "rgba(229,72,77,.18)" : "rgba(128,128,128,.16)") + '">⛔ রেস্ট্রিকশন ' + bd(c.rcnt || 0) + ' বার</span></div>' : "") + '</div><div class="ui"><b>ইউজার আইডি</b><span>' + esc(c.u) + '</span><b>বিভাগ</b><span>' + esc(c.dept || "—") + '</span><b>সেশন</b><span>' + esc(c.sess || "—") + '</span><b>স্কোর</b><span>' + (c.best != null ? bd(c.best) + " / ১০০০ (" + bd(c.plays) + " বার খেলেছে)" : "এখনো খেলেনি") + '</span><b>স্ট্যাটাস</b><span>' + (c.onl ? '<span class="dot on"></span> অনলাইন' : '<span class="dot"></span> অফলাইন') + '</span><b>Last Active</b><span>' + (c.onl ? "এখন" : ago(c.ls)) + '</span><b>এ পর্যন্ত মোট বার্তা</b><span>' + bd(c.msgs || 0) + 'টি</span>' + (ADM ? st : "") + ex + '</div>');
    }).catch(function () { toast("লোড হয়নি — SQL (supabase-userinfo.sql) চালানো আছে কি?"); });
  }
  function members() {
    rpc("mc2_ac_members", { p_session: +CUR.s }).then(function (L) {
      var me = ""; Object.keys(MET).forEach(function (k) { if (MET[k].o && MET[k].u) me = MET[k].u; });
      L = L || []; var onN = L.filter(function (m) { return m.onl; }).length;
      var vis = L.filter(function (m) { return ADM || m.onl || m.u === me; }); // সাধারণ ইউজার: শুধু অনলাইনে যারা আছে; অ্যাডমিন: সবাই
      var row = function (k, v) { return "<b>" + k + "</b><span>" + esc(v == null || v === "" ? "—" : v) + "</span>"; };
      var h = '<b>👥 User Info</b>';
      h += '<div class="ui">' + row("আপনার নাম", CUR.n) + row("আপনার আইডি", me || "—") + row("বিভাগ", CUR.dn) + row("সেশন", CUR.sn) + row("অনলাইন এখন", bd(onN) + " জন") + '</div>';
      h += '<b>🟢 ' + (ADM ? "সদস্য" : "অনলাইনে আছেন") + ' (' + bd(vis.length) + ' জন)</b>';
      h += vis.length ? vis.map(function (m) { return '<button type="button" class="ml" data-uc="' + esc(m.u) + '"><span class="dot' + (m.onl ? " on" : "") + '"></span><span>' + esc(m.n) + (m.u === me ? " (আপনি)" : "") + '</span>' + (m.m != null ? '<small class="mcs">💬 ' + bd(m.m) + " · ⛔ " + bd(m.r || 0) + "</small>" : "") + '<small' + (m.m != null ? ' style="margin-left:0"' : "") + '>' + (m.onl ? "অনলাইন" : ago(m.ls)) + "</small></button>"; }).join("") : "<div>এখন কেউ অনলাইনে নেই।</div>";
      h += '<div style="font-size:12px;opacity:.65">নামের পাশে: 💬 = মোট বার্তা, ⛔ = মোট রেস্ট্রিকশন। নামে ক্লিক করলে সাধারণ তথ্য দেখাবে।' + (ADM ? " (আপনি অ্যাডমিন — ফুল ডিটেলস আসবে)" : "") + '</div>';
      pop(h);
    }).catch(function () { toast("লোড হয়নি — SQL (supabase-userinfo.sql) চালানো আছে কি?"); });
  }
  function nbOff() { try { var q = LS.get("fa_nb", {}) || {}, n = new Date(); q.off = n.getFullYear() + "-" + (n.getMonth() + 1) + "-" + n.getDate(); LS.set("fa_nb", q); } catch (e) {} } // আজকের মতো টিপ বন্ধ (কাল থেকে আবার নিয়মমতো)
  function nbDone() { try { var q = LS.get("fa_nb", {}) || {}; q.done = 1; LS.set("fa_nb", q); } catch (e) {} } // নাম একবার বদলালে টিপ আর কখনো আসবে না
  // নামে ক্লিক বাবল + চ্যাটের নিচের অনলাইন স্ট্রিপ + অ্যাডমিনের 🔒 তালা-ফোল্ডার: bubble.js (SQL-20)
  function faMount() { try { if (window.faBub) window.faBub.mount({ root: $("#acx"), cur: function () { return CUR; }, rpc: rpc, arpc: arpc, vid: vid, adm: function () { return ADM; }, input: function () { return $("#acI"); } }); } catch (e) {} }
  function room() {
    var R = root(); MSGS = []; MET = {}; REPLY = null; SIG = ""; SEL = 0; RXID = 0; if (RXOFF) { RXOFF(); RXOFF = null; } EVS = []; EVLAST = -1; SHL = []; SHLAST = 0; SHT = 0; TYP = 0; LB = false; clearInterval(LV); MORE = true; LASTSEEN = 0; BNK = "";
    R.innerHTML = '<div class="ah ah2"><div class="gl"><span class="gn" id="acGn">' + (CUR.sn && String(CUR.sn).toLowerCase().indexOf(String(CUR.dn || "").toLowerCase()) >= 0 && CUR.dn ? esc(CUR.sn) : esc(CUR.dn) + (CUR.sn ? ' <span class="gs"><i>(</i>' + esc(CUR.sn) + '<i>)</i></span>' : "")) + '</span></div><div class="gr"><button class="ab" id="acB" type="button" aria-label="পেছনে">←</button><div class="gm"><span class="nl" id="acNm"></span><button class="ol" id="acOl" type="button" hidden aria-label="সদস্যদের তালিকা"></button></div><button class="ab" id="acMr" type="button" aria-label="মেনু" aria-haspopup="true" style="font-weight:800">⋯</button><button class="ab" id="acSn" type="button" aria-label="নতুন বার্তার শব্দ চালু/বন্ধ">' + (SND.on ? "🔔" : "🔕") + '</button><button class="ab" id="acIn" type="button" aria-label="User Info">👥</button><button class="ab" id="acEd" type="button" aria-label="নাম বদলান">✎</button><button class="ab" id="acMn" type="button" aria-label="মিনিমাইজ" style="font-weight:800">—</button><button class="ab" id="acCl" type="button" aria-label="চ্যাট বন্ধ করুন">✕</button></div></div>' + '<div class="nt" id="acNt" hidden></div><div class="rsb" id="acRsB" hidden></div><div class="am" id="acM"><div class="em">⏳ লোড হচ্ছে…</div></div><div class="ty" id="acTy" hidden></div><div class="rp" id="acRp" hidden><span></span><button class="ab" id="acRc" type="button" aria-label="রিপ্লাই বাতিল">✕</button></div><div class="ep" id="acEm" hidden>' + emoHtml() + '</div><div class="bn" id="acBn" hidden></div><div class="ac"><button class="ib" id="acAt" type="button" aria-label="ফাইল পাঠান">📎</button><button class="ib" id="acEb" type="button" aria-label="ইমোজি">😊</button><textarea id="acI" rows="1" maxlength="400" placeholder="বার্তা লিখুন…" aria-label="বার্তা" autocomplete="off"></textarea><button class="ib" id="acSd" type="button" aria-label="পাঠান" style="font-size:24px">➤</button><input type="file" id="acFl" hidden accept="' + ACCEPT + '"></div><div id="acT"></div>';
    var sub = subt; sub(); faMount(); $("#acIn").onclick = members; $("#acOl").onclick = members; fit(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    $("#acB").onclick = function () { if (!confirm("আপনি কি চ্যাট থেকে বের হতে চান?")) return; unjoin(); leaveRoom(); gate(); };
    $("#acMn").onclick = minimize;
    $("#acSn").onclick = function () { SND.on = !SND.on; LS.set("fa_snd", SND.on ? 1 : 0); this.textContent = SND.on ? "🔔" : "🔕"; toast(SND.on ? "নতুন বার্তার শব্দ চালু" : "নতুন বার্তার শব্দ বন্ধ"); if (SND.on) { sndUnlock(); SND.t = 0; ding(); } };
    // ⋯ মেনু: 🔔 শব্দ · 👥 User Info · ✎ নাম বদল (আসল বাটনগুলো লুকানো থাকে, মেনু সেগুলোই চাপে)
    function closeMenu() { var m = $("#acMnu"); if (m) m.remove(); document.removeEventListener("click", outMenu, true); }
    function outMenu(e) { var m = $("#acMnu"); if (m && !m.contains(e.target) && e.target.id !== "acMr") closeMenu(); }
    function openMenu() {
      if ($("#acMnu")) { closeMenu(); return; }
      var host = $("#acx"), mr = $("#acMr"); if (!host || !mr) return;
      var m = document.createElement("div"); m.className = "mnu"; m.id = "acMnu"; m.setAttribute("role", "menu");
      m.innerHTML = '<button type="button" data-t="acIn">👥 User Info</button><button type="button" data-t="acEd">✎ আপনার নাম বদলান</button>' + (window.FATheme && (ADM || FATheme.canPick()) ? '<button type="button" data-th="1">🎨 চ্যাট থিম' + (ADM ? ' (অ্যাডমিন)' : '') + '</button>' : '') + '<button type="button" class="fh" data-f aria-expanded="false"><span>⚙️ চালু/বন্ধ অপশন</span><b>▾</b></button><div class="fb" hidden><button type="button" data-t="acSn">' + (SND.on ? "🔔 শব্দ: চালু (বন্ধ করুন)" : "🔕 শব্দ: বন্ধ (চালু করুন)") + '</button>' + (window.FADoor && FADoor.selfOn ? '<button type="button" data-g="1">' + (FADoor.selfOn() ? "🚪 আমার দরজা: চালু (বন্ধ করুন)" : "🚪 আমার দরজা: বন্ধ (চালু করুন)") + '</button><button type="button" data-g="2">' + (FADoor.sndOn() ? "🔊 দরজার শব্দ: চালু (বন্ধ করুন)" : "🔇 দরজার শব্দ: বন্ধ (চালু করুন)") + '</button>' : "") + (window.faBub && faBub.userOn ? '<button type="button" data-g="3">' + (faBub.userOn() ? "💬 বাবল: চালু (বন্ধ করুন)" : "💬 বাবল: বন্ধ (চালু করুন)") + '</button>' : "") + "</div>";
      host.appendChild(m);
      var r = mr.getBoundingClientRect(); m.style.top = (r.bottom + 6) + "px"; m.style.right = Math.max(8, window.innerWidth - r.right) + "px"; m.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 16) + "px"; m.style.overflowY = "auto";
      m.onclick = function (e) { var th = e.target.closest("[data-th]"); if (th) { closeMenu(); try { FATheme.sheet("chat", { adm: ADM, arpc: arpc }); } catch (z) {} return; } var f = e.target.closest("[data-f]"); if (f) { var fb = m.querySelector(".fb"), op = fb.hidden; fb.hidden = !op; f.setAttribute("aria-expanded", op ? "true" : "false"); f.lastChild.textContent = op ? "▴" : "▾"; return; } var g = e.target.closest("[data-g]"); if (g) { closeMenu(); try { if (g.dataset.g === "3") faBub.toggleUser(); else if (g.dataset.g === "2") FADoor.toggleSnd(); else FADoor.toggleSelf(); } catch (z) {} return; } var b = e.target.closest("[data-t]"); if (!b) return; var t = $("#" + b.dataset.t); closeMenu(); if (t) t.click(); };
      setTimeout(function () { document.addEventListener("click", outMenu, true); }, 0);
    }
    $("#acMr").onclick = function () { openMenu(); };
    // নাম বদলের ছোট টিপ-বাবল (⋯ বাটনের নিচে): প্রথমবার ৫ সেকেন্ড, পরে ২ সেকেন্ড, দিনে ৩ বার; ✕ বা ⋯ চাপলে সরে যায়
    (function () {
      var ed = $("#acMr"), host = $("#acx"); if (!ed || !host) return;
      var old = $("#acNb"); if (old) old.remove();
      // দেখানোর নিয়ম: প্রথমবার (নতুন ইউজার) ৫ সেকেন্ড; পরে প্রতিবার ঢুকলে ২ সেকেন্ড; দিনে সর্বোচ্চ ৩ বার; নাম বদলের অপশনে ঢুকলে আর কখনো না
      try {
        var st = LS.get("fa_nb", {}) || {}, nw = new Date(), dk = nw.getFullYear() + "-" + (nw.getMonth() + 1) + "-" + nw.getDate();
        if (st.done || st.off === dk) return; if (st.d !== dk) { st.d = dk; st.n = 0; }
        if ((st.n || 0) >= 3) { LS.set("fa_nb", st); return; }
        BUBMS = st.seen ? 2000 : 5000; st.n = (st.n || 0) + 1; st.seen = 1; LS.set("fa_nb", st);
      } catch (e0) { BUBMS = 2000; }
      var b = document.createElement("div"); b.className = "nb"; b.id = "acNb"; b.setAttribute("role", "status");
      b.innerHTML = '<span>এখানে ক্লিক করে নাম বদলান</span><button type="button" aria-label="বন্ধ করুন">✕</button>';
      host.appendChild(b);
      var tm = 0, kill = function () { clearTimeout(tm); window.removeEventListener("resize", place); if (b.parentNode) b.remove(); };
      function place() {
        var r = ed.getBoundingClientRect(), w = b.offsetWidth, cx = r.left + r.width / 2, vw = window.innerWidth;
        var left = Math.max(8, Math.min(vw - w - 8, cx - w + 28));
        b.style.top = (r.bottom + 8) + "px"; b.style.left = left + "px"; b.style.setProperty("--nbx", Math.max(10, left + w - cx - 5) + "px");
      }
      place(); window.addEventListener("resize", place);
      b.querySelector("button").onclick = function (e) { e.stopPropagation(); kill(); };
      b.querySelector("span").onclick = function () { nbOff(); openMenu(); }; // লেখায় চাপলে বাবল সরে না; আজ আর দেখাবে না
      ed.addEventListener("click", kill, { once: true });
      tm = setTimeout(kill, BUBMS);
    })();
    $("#acCl").onclick = function () { if (!confirm("চ্যাট বন্ধ করতে চান?")) return; location.hash = PH && PH !== "anon" ? PH : "home"; };
    $("#acI").oninput = function () { growI(); if (this.value.trim()) { TYP = Date.now(); if (Date.now() - LT > 1500) live(); } };
    $("#acEd").onclick = function () {
      var Z = document.createElement("div"); Z.className = "sh0";
      Z.innerHTML = '<div class="sh"><b>✎ আপনার নাম বদলান</b><div class="sm2">শুধু নিজের নামই বদলানো যায়। আপনার আগের বার্তাতেও নতুন নাম দেখাবে।</div><input id="acNn" type="text" maxlength="20" value="' + esc(CUR.n) + '" aria-label="নতুন নাম"><button type="button" data-ok>✅ সেভ করুন</button><button type="button" data-x>বাতিল</button><button type="button" data-snd>' + sndLab() + '</button><button type="button" class="dg" data-lo>↪ লগআউট (কোড মুছবে, নাম থাকবে)</button></div>';
      var go = function () { var n = ($("#acNn").value || "").trim().slice(0, 20); if (!n) return toast("নাম খালি রাখা যাবে না।"); Z.remove(); if (n === CUR.n) return; CUR.n = n; nbDone(); var P = LS.get("mc2_ac_p", {}); P.n = n; LS.set("mc2_ac_p", P); sub(); rpc("mc2_ac_rename", { p_voter: vid(), p_nick: n }).then(function () { load("new"); toast("নাম বদলেছে।"); }).catch(function () { toast("নাম বদলানো যায়নি।"); }); };
      Z.onclick = function (e) { var sb = e.target.closest("[data-snd]"); if (sb) { SND.on = !SND.on; LS.set("fa_snd", SND.on ? 1 : 0); sb.textContent = sndLab(); if (SND.on) { sndUnlock(); SND.t = 0; ding(); } return; } if (e.target.closest("[data-lo]")) { if (!confirm("লগআউট করবেন? পরের বার ঢুকতে আবার কোড লাগবে (নাম সেভ থাকবে)।")) return; unjoin(); leaveRoom(); try { localStorage.removeItem("fa_unlock"); } catch (x) {} var ax = $("#acx"); if (ax) ax.remove(); location.hash = "home"; location.reload(); return; } if (e.target.closest("[data-ok]")) go(); else if (e.target === Z || e.target.closest("[data-x]")) Z.remove(); };
      Z.onkeydown = function (e) { if (e.key === "Enter") go(); }; $("#acx").appendChild(Z); $("#acNn").focus(); $("#acNn").select();
    };
    $("#acRc").onclick = function () { REPLY = null; showReply(); };
    $("#acEb").onclick = function () { var e = $("#acEm"); e.hidden = !e.hidden; };
    $("#acEm").onclick = function (e) { var t = e.target.closest("[data-ec]"); if (t) { EMI = +t.dataset.ec; this.innerHTML = emoHtml(); return; } var b = e.target.closest("[data-em]"); if (b) { var i = $("#acI"); i.value += b.dataset.em; growI(); i.focus(); this.hidden = true; } };
    $("#acx").onclick = function (e) { var em = $("#acEm"); if (!em || em.hidden) return; var pth = e.composedPath ? e.composedPath() : []; if (pth.indexOf(em) < 0 && pth.indexOf($("#acEb")) < 0) em.hidden = true; };
    $("#acAt").onclick = function () { if (lockOn()) return toast("আপনি এখন ফাইল পাঠাতে পারবেন না।"); if (!UP) return toast("ফাইল আপলোড এখন বন্ধ আছে।"); $("#acFl").click(); };
    applyLock();
    $("#acFl").onchange = function () { var f = this.files[0]; this.value = ""; if (f) preview(f); };
    $("#acSd").onclick = send; /* এন্টারে সেন্ড নয়, নতুন লাইন; শুধু ➤ বাটনে সেন্ড */
    bindScroll();
    $("#acM").onclick = function (e) {
      if (e.target.id === "acHi") return loadOld(true);
      var shE = e.target.closest("[data-shu]"); if (shE) return shotInfo(shE.dataset.shu, +shE.dataset.sht); // 📸 সময়ে চাপলে ইউজার ইনফো (শুধু অ্যাডমিন)
      var ehE = e.target.closest("[data-eh]"); if (ehE) return editHist(+ehE.dataset.eh); // ✎ Edited চাপলে আগের লেখাগুলোর ইতিহাস (সবাই দেখে)
      var rsE = e.target.closest("[data-rs]"); if (rsE) return rsPop(rsE.dataset.rs); // ❌ / RESTRICTED ট্যাগ: সবাই ওয়ার্নিং দেখে
      var uc = e.target.closest("[data-uc]"); if (uc) return card(uc.dataset.uc); var mnE = e.target.closest(".mn"); if (mnE) { var tk2 = mnE.textContent, fu = [], sn2 = {}; MSGS.forEach(function (q) { var qx = MET[q.id] || {}; if (!qx.u || mkey(qx.n || q.nick) !== tk2) return; if (!sn2[qx.u]) { sn2[qx.u] = { u: qx.u, n: qx.n || q.nick }; fu.push(sn2[qx.u]); } sn2[qx.u].a = qx.a; sn2[qx.u].t = q.body || "📎 ফাইল"; }); if (!fu.length) return toast("এই নামে কাউকে পাওয়া যায়নি।"); return fu.length === 1 ? card(fu[0].u) : pickUser(fu); }
      var row = e.target.closest("[data-id]"); if (!row) { selClear(); return; } var id = +row.dataset.id;
      if (e.target.closest("[data-seen]")) return rpc("mc2_ac_seenlist", { p_msg: id }).then(function (L) { var Z = document.createElement("div"); Z.className = "sh0"; Z.innerHTML = '<div class="sh"><b>👁 যারা দেখেছে (' + bd(L.length) + ")</b>" + (L.length ? L.map(function (n) { return "<div>• " + esc(n) + "</div>"; }).join("") : "<div>এখনো কেউ দেখেনি।</div>") + '<button type="button">বন্ধ করুন</button></div>'; Z.onclick = function () { Z.remove(); }; $("#acx").appendChild(Z); });
      if (e.target.closest("[data-rxs]")) return rxpop(id, e.target.closest("[data-rxs]"));
      if (e.target.closest("[data-fv]")) return viewer(id);
      if (e.target.closest("[data-menu]")) { selClear(); return sheet(id); }
      if (e.target.closest("[data-bb]") && !e.target.closest("a,video,audio")) { rxclose(); selClear(); return sheet(id); } // Friend Adda: থ্রি-ডট (⋯) নেই; বার্তার লেখায় চাপলে সরাসরি মেনু খোলে
    };
    (function () { // বাঁ↔ডান swipe = রিপ্লাই (আঙুলের সাথে বাবল সরে; বারবার কাজ করে)
      var sx = 0, sy = 0, sr = null, tg = null, mv = false, MM = $("#acM");
      function clean() { if (tg) { tg.removeEventListener("touchend", done); tg.removeEventListener("touchcancel", done); tg.removeEventListener("touchmove", move); } tg = null; }
      function move(e) { if (!sr || !e.touches[0]) return; var dx = e.touches[0].clientX - sx, dy = Math.abs(e.touches[0].clientY - sy); if (!mv && Math.abs(dx) > 10 && Math.abs(dx) > dy * 1.5) mv = true; if (mv) sr.style.transform = "translateX(" + Math.max(-70, Math.min(70, dx * 0.6)) + "px)"; }
      function done(e) { var r = sr; clean(); sr = null; TCH = 0; if (!r) return; r.style.transform = ""; var t = (e.changedTouches || [])[0]; if (e.type !== "touchend" || !t) return; var dx = t.clientX - sx, dy = Math.abs(t.clientY - sy); if (Math.abs(dx) > 60 && dy < 40) setReply(+r.dataset.id); }
      MM.addEventListener("touchstart", function (e) { clean(); if (sr) { sr.style.transform = ""; } var r = e.target.closest("[data-id]"); if (!r || e.touches.length !== 1) { sr = null; TCH = 0; return; } sr = r; mv = false; TCH = Date.now(); sx = e.touches[0].clientX; sy = e.touches[0].clientY;
        // আঁকার সময় এলিমেন্ট DOM থেকে সরলেও যেন touchend ধরা পড়ে, তাই টার্গেটে সরাসরি বসানো
        tg = e.target; tg.addEventListener("touchend", done); tg.addEventListener("touchcancel", done); tg.addEventListener("touchmove", move, { passive: true }); }, { passive: true }); })();
    $("#acNt").onclick = function () { this.classList.toggle("op"); }; loadNote(); var tk = 0; rpc("mc2_ac_tick", {}).catch(function () {}); live(); rtStart(+CUR.s); LV = setInterval(function () { if (!$("#acM")) return clearInterval(LV); if (!document.hidden) { if (RT.ok && ++RT.lt % 6) return; live(); } }, 2000);
    rsStart(); applyShot(); load("first"); clearInterval(iv); iv = setInterval(function () { if (!$("#acM")) return clearInterval(iv); if (!document.hidden) { if (++tk % 15 === 0) rpc("mc2_ac_tick", {}).catch(function () {}); if (RT.ok && ++RT.mt % 4) return; load("new"); } }, 4000);
  }

  function sent(r) {
    if (r > 0) { SENT[r] = 1; SND.mu = Date.now() + 2500; rtNudge(); var i = $("#acI"); if (i) { i.value = ""; growI(); } REPLY = null; showReply(); return load("new").then(function () { var M = $("#acM"); if (M) M.scrollTop = M.scrollHeight; }); }
    if (r === -3) load("new");
    toast(r === 0 ? "এই সেশনের চ্যাট এখন বন্ধ।" : r === -6 ? "এই চ্যাটের পাসওয়ার্ড বদলেছে — বের হয়ে আবার পাসওয়ার্ড দিয়ে ঢুকুন।" : r === -1 ? "বার্তাটি পাঠানো যায়নি — লেখা ঠিক আছে কিনা দেখুন (লিংক সর্বোচ্চ ৩টি)।" : r === -2 ? "ফাইল আপলোড এখন বন্ধ আছে।" : r === -3 ? "আপনি এখন বার্তা পাঠাতে পারবেন না।" : r === -5 ? "এই ফাইল পাঠানো যায় না (ধরন বা সাইজ অনুমোদিত নয়)।" : "খুব দ্রুত বা বারবার পাঠাচ্ছেন — একটু থামুন।");
  }
  function growI() { var i = $("#acI"); if (!i) return; i.style.height = "auto"; var h = Math.min(i.scrollHeight + 2, 140); i.style.height = h + "px"; i.style.overflowY = i.scrollHeight + 2 > 140 ? "auto" : "hidden"; }
  function send() {
    var i = $("#acI"), t = i.value.trim(); if (!t || BUSY) return; BUSY = true; TYP = 0; SND.mu = Date.now() + 6000; /* নিজের মেসেজে শব্দ নয় */
    rpc("mc2_ac_send", { p_session: +CUR.s, p_nick: CUR.n, p_body: t, p_voter: vid(), p_reply: REPLY ? REPLY.id : null }).then(function (r) { BUSY = false; return sent(r); }).catch(function () { toast("পাঠানো যায়নি — নেটওয়ার্ক দেখুন।"); }).then(function () { BUSY = false; }); // সার্ভার সাড়া দিলেই ঘর খালি/আনলক; বার্তা তালিকা রিফ্রেশের জন্য অপেক্ষা করে না
  }
  function ftype(f) { var e = (String(f.name).split(".").pop() || "").toLowerCase(), t = Object.prototype.hasOwnProperty.call(FT, e) ? FT[e] : null; return t ? { ext: e, kind: t[0], mime: t[1], max: t[2] * 1048576, mb: t[2] } : null; }
  // ফাইলের প্রথম বাইট দেখে নামের সাথে ভেতরের ধরন মেলে কিনা (ভুল/নকল এক্সটেনশন ধরার জন্য; আসল সুরক্ষা সার্ভারে)
  function sniff(f, e) {
    var rd = f.slice(0, 16), p = rd.arrayBuffer ? rd.arrayBuffer() : new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = no; r.readAsArrayBuffer(rd); });
    return p.then(function (ab) {
      var b = new Uint8Array(ab), s = function (o, t) { for (var i = 0; i < t.length; i++) if (b[o + i] !== t.charCodeAt(i)) return false; return true; };
      if (e === "jpg" || e === "jpeg") return b[0] === 255 && b[1] === 216 && b[2] === 255;
      if (e === "png") return b[0] === 137 && s(1, "PNG");
      if (e === "gif") return s(0, "GIF8");
      if (e === "webp") return s(0, "RIFF") && s(8, "WEBP");
      if (e === "wav") return s(0, "RIFF") && s(8, "WAVE");
      if (e === "pdf") return s(0, "%PDF");
      if (e === "mp4" || e === "mov" || e === "m4a") return s(4, "ftyp") || s(4, "moov") || s(4, "mdat") || s(4, "wide") || s(4, "free");
      if (e === "webm") return b[0] === 26 && b[1] === 69 && b[2] === 223 && b[3] === 163;
      if (e === "mp3") return s(0, "ID3") || (b[0] === 255 && (b[1] & 224) === 224);
      if (e === "aac") return b[0] === 255 && (b[1] & 240) === 240;
      if (e === "ogg") return s(0, "OggS");
      if (e === "docx" || e === "xlsx" || e === "pptx") return b[0] === 80 && b[1] === 75;
      if (e === "doc" || e === "xls" || e === "ppt") return b[0] === 208 && b[1] === 207 && b[2] === 17 && b[3] === 224;
      if (e === "txt" || e === "csv") return [].indexOf.call(b, 0) < 0;
      return true;
    }).catch(function () { return true; });
  }
  // পাঠানোর আগে ফাইলের Preview
  function preview(f) {
    var t = ftype(f); if (!t) return sendFile(f); var u = URL.createObjectURL(f), h = '<div class="sh"><b>📎 পাঠানোর আগে দেখুন</b>';
    if (t.kind === "image") h += '<img src="' + u + '" alt="" style="max-width:100%;max-height:240px;border-radius:12px">'; else if (t.kind === "video") h += '<video src="' + u + '" controls playsinline style="max-width:100%;max-height:240px;border-radius:12px"></video>'; else if (t.kind === "audio") h += '<audio src="' + u + '" controls style="width:100%"></audio>'; else h += "<div>📄 " + esc(f.name) + "</div>";
    h += '<div class="sm2">' + esc(f.name) + " · " + bd((f.size / 1048576).toFixed(2)) + ' MB</div><button type="button" data-go>➤ পাঠান</button><button type="button" data-x>বাতিল</button></div>';
    var Z = document.createElement("div"); Z.className = "sh0"; Z.innerHTML = h; var cl = function () { try { URL.revokeObjectURL(u); } catch (er) {} Z.remove(); };
    Z.onclick = function (e) { if (e.target.closest("[data-go]")) { cl(); sendFile(f); } else if (e.target.closest("[data-x]") || e.target === Z) cl(); }; $("#acx").appendChild(Z);
  }
  function sendFile(f) {
    if (BUSY) return; if (!UP) return toast("ফাইল আপলোড এখন বন্ধ আছে।"); if (lockOn()) return toast("আপনি এখন ফাইল পাঠাতে পারবেন না।");
    var t = ftype(f); if (!t) return toast("এই ধরনের ফাইল পাঠানো যায় না। ছবি, ভিডিও, অডিও, PDF, Word/Excel/PowerPoint, TXT/CSV চলবে।");
    if (f.size < 1) return toast("ফাইলটি খালি।"); if (f.size > t.max) return toast("এই ধরনের ফাইল সর্বোচ্চ " + bd(t.mb) + " MB হতে পারে।");
    BUSY = true; toast("⏳ ফাইল যাচাই হচ্ছে…");
    sniff(f, t.ext).then(function (ok) {
      if (!ok) throw new Error("bad");
      var path = CUR.s + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10) + "." + t.ext; toast("⏳ আপলোড হচ্ছে…");
      return fetch(base + "/storage/v1/object/mc2-chat/" + path, { method: "POST", headers: { apikey: C.key, Authorization: "Bearer " + C.key, "Content-Type": t.mime }, body: f }).then(function (r) { if (!r.ok) throw new Error("up"); })
        .then(function () { return rpc("mc2_ac_send", { p_session: +CUR.s, p_nick: CUR.n, p_body: $("#acI").value.trim(), p_voter: vid(), p_reply: REPLY ? REPLY.id : null, p_kind: t.kind, p_path: path, p_fname: f.name, p_size: f.size, p_mime: t.mime }); }).then(sent);
    }).catch(function (e) { toast(e && e.message === "bad" ? "ফাইলের ভেতরের ধরন নামের সাথে মেলে না — পাঠানো যায়নি।" : e && e.message === "up" ? "আপলোড হয়নি (বন্ধ আছে বা ফাইল অনুমোদিত নয়)।" : "পাঠানো যায়নি — নেটওয়ার্ক দেখুন।"); }).then(function () { BUSY = false; });
  }

  // ---------- মডারেশন: নিজের স্ট্যাটাস (সতর্কতা / Restriction / Ban) ও রিপোর্ট ----------
  function EM() { return ME && ME.s !== "ok" ? ME : LK && (!LK.x || LK.x > Date.now()) ? { s: "banned", u: LK.x || 0, r: LK.r, lk: 1 } : ME || { s: "ok", w: [] }; } // বাস্তব ব্যান/Restriction (ME) অথবা অ্যাডমিনের স্থায়ী লক (LK)
  function lockOn() { return EM().s !== "ok"; }
  function left(ms) { var t = Math.max(1, Math.ceil((ms - Date.now()) / 60000)), d = Math.floor(t / 1440), h = Math.floor(t % 1440 / 60), m = t % 60; return d ? bd(d) + " দিন " + bd(h) + " ঘণ্টা" : h ? bd(h) + " ঘণ্টা " + bd(m) + " মিনিট" : bd(m) + " মিনিট"; }
  function applyLock() {
    var EX = EM(), a = $("#acAt"), i = $("#acI"), sd = $("#acSd"), e = $("#acEb"), b = $("#acBn"), L = lockOn();
    if (a) { a.disabled = !UP || L; a.style.opacity = a.disabled ? ".35" : ""; a.title = L ? "" : !UP ? "ফাইল আপলোড এখন বন্ধ আছে" : "ফাইল পাঠান"; }
    if (i) { i.disabled = L; i.placeholder = L ? "⛔ আপনি ব্লক — বার্তা/রিপ্লাই বন্ধ" : "বার্তা লিখুন…"; if (L && REPLY) { REPLY = null; showReply(); } }
    if (sd) sd.disabled = L; if (e) e.disabled = L;
    if (b) { b.hidden = !L; if (L) { var bt = (EX.s === "banned" ? (EX.u ? "⛔ সাময়িক ব্যান · বাকি " + left(EX.u) : "⛔ স্থায়ী ব্যান") : "⏳ বার্তা বন্ধ" + (EX.u ? " · বাকি " + left(EX.u) : "")) + (EX.r ? " · ⚠️ " + EX.r : ""); b.innerHTML = esc(bt); b.title = bt; } }
  }
  function applyMe() {
    applyLock(); banNotice();
    if ($("#acBnM")) return; // ব্যান-নোটিশ খোলা থাকলে সাধারণ সতর্কবার্তা পরে আসবে
    var w = (ME.w || []).filter(function (x) { return !WSHOW[x.id]; })[0];
    if (!w || $("#acWn") || !$("#acx")) return; WSHOW[w.id] = 1;
    var Z = document.createElement("div"); Z.className = "sh0"; Z.id = "acWn";
    Z.innerHTML = '<div class="sh"><b>⚠️ অ্যাডমিনের সতর্কবার্তা</b><div>' + esc(w.r) + '</div><div class="sm2">নিয়ম ভাঙলে আপনার বার্তা পাঠানো সাময়িক বা স্থায়ীভাবে বন্ধ হতে পারে।</div><button type="button" data-ok>✅ বুঝেছি</button></div>';
    Z.onclick = function (e) { if (e.target.closest("[data-ok]")) { Z.remove(); rpc("mc2_ac_ack_warn", { p_voter: vid(), p_id: w.id }).catch(function () {}); } };
    $("#acx").appendChild(Z);
  }

  // ---------- ব্যান নোটিশ (চ্যাটে ঢুকলে ভেসে ওঠে) ----------
  function banNotice() {
    if (!lockOn()) { var o = $("#acBnM"); if (o) o.remove(); BNK = ""; return; }
    if (!$("#acx") || $("#acBnM")) return;
    var EX = EM(), k = EX.s + ":" + (EX.u || 0) + ":" + (EX.r || ""); if (BNK === k) return; BNK = k;
    var ban = EX.s === "banned", Z = document.createElement("div"); Z.className = "sh0"; Z.id = "acBnM";
    Z.innerHTML = '<div class="sh bnm"><b class="bnt">⛔ ' + (EX.lk ? (EX.u ? "সাময়িক লক" : "স্থায়ী লক") : ban ? "ব্যান করা হয়েছে" : "বার্তা বন্ধ") + (EX.u ? " · " + left(EX.u) : ban ? " · স্থায়ী" : "") + '</b><div class="bnw">⚠️ ' + (EX.r ? esc(EX.r) : "নিয়ম ভাঙার কারণে অ্যাডমিন ব্লক করেছেন।") + '</div><button type="button" data-ok>ঠিক আছে</button></div>';
    Z.onclick = function (e) { if (e.target.closest("[data-ok]") || e.target === Z) Z.remove(); };
    $("#acx").appendChild(Z);
  }

  // ---------- Restriction (ওয়ার্নিং-চিহ্ন): ❌ ছবির কোনায়, শাস্তির বাবল, সবার জন্য ওয়ার্নিং, নিজের ওপরের বার ----------
  // ---------- খারাপ শব্দ: Restricted ইউজারের লেখায় থাকলে লেখা লুকিয়ে লাল বক্স ----------
  function nbad(t) { return String(t || "").toLowerCase().replace(/[\s​-‍.,_\-*+'"!?()]+/g, ""); }
  function badText(t) { if (!t || !BAD.length) return false; var n = nbad(t); return BAD.some(function (w) { return n.indexOf(w) >= 0; }); }
  function hid(m) { var x = MET[m.id] || {}; return !!(RSON !== false && m && m.body && !(x.d || m.deleted) && badText(m.body)); } // খারাপ শব্দ থাকলে যে-ই লিখুক লেখা লুকায় (সার্ভার তাকে অটো-Restriction দেয়, কয়েক সেকেন্ডে ⛔ চিহ্ন আসে)

  // ---------- 📸 স্ক্রীনশট নোটিশ (শুধু অ্যাডমিন দেখে) ----------
  // কেউ স্ক্রীনশটের চেষ্টা করলে (সুরক্ষা চালু/বন্ধ যাই থাক) সার্ভারে লগ হয় (fa_log_shot)। সাধারণ ইউজার কাউকে দেখে না — পড়ার ফাংশন fa_admin_shots শুধু অ্যাডমিনের।
  // অ্যাডমিন (একই ব্রাউজারে admin.html-এ লগইন থাকলে) চ্যাটের ভেতরে ঘটনার জায়গায় "📸 নাম স্ক্রীনশট নিয়েছে · সময়" দেখে; সময়ে চাপলে ইউজার ইনফো।
  // ⚠ ওয়েব ব্রাউজার ফোনের পাওয়ার+ভলিউম স্ক্রীনশট বুঝতে পারে না — ধরা পড়ে শুধু কিবোর্ড শর্টকাট ও ৩-আঙুলের স্পর্শ।
  function shotLog() {
    if (!ON || !CUR || !$("#acx") || ADM || Date.now() - SHGO < 8000) return; SHGO = Date.now();
    rpc("fa_log_shot", { p_session: +CUR.s, p_voter: vid(), p_nick: CUR.n }).catch(function () {});
  }
  function shotItems() {
    if (!ADM || !SHL.length) return []; var t0 = MSGS.length ? Date.parse(MSGS[0].created_at) : 0;
    return SHL.filter(function (q) { return !MSGS.length || q.t >= t0; }).map(function (q) { return { t: q.t, s: q }; });
  }
  function shotLoad() {
    if (!ADM || !CUR || SHB2 || Date.now() - SHT < 4000) return; SHB2 = true; SHT = Date.now();
    arpc("fa_admin_shots", { p_session: +CUR.s, p_after: SHLAST }).then(function (r) {
      if (!Array.isArray(r) || !r.length) return;
      r.forEach(function (q) { if (q.id > SHLAST) SHLAST = q.id; if (!SHL.some(function (x) { return x.id === q.id; })) SHL.push({ id: +q.id, v: String(q.v || ""), n: String(q.n || ""), t: +q.t }); });
      SHL.sort(function (a, b) { return a.t - b.t; }); render(false);
    }).catch(function () {}).then(function () { SHB2 = false; }); // SQL (supabase-screenshot-log.sql) না চালালে কিছু হয় না
  }
  function shotInfo(v, sid) {
    if (!ADM) return; var q = SHL.filter(function (x) { return x.id === sid; })[0] || { v: v, n: "", t: 0 };
    arpc("mc2_ac_admin_active", { p_hours: 87600, p_dept: null }).then(function (L) {
      var u = (L || []).filter(function (x) { return x.voter === v; })[0] || null, cnt = SHL.filter(function (x) { return x.v === v; }).length;
      var nm = (u && u.nick) || q.n || "বেনামি", ls = u && u.ls ? (typeof u.ls === "number" ? u.ls : Date.parse(u.ls)) : 0;
      var loc = u ? [u.city, u.region, u.country].filter(Boolean).join(", ") : "";
      var row = function (k, val) { return "<b>" + k + "</b><span>" + esc(val == null || val === "" ? "—" : val) + "</span>"; };
      pop('<div style="text-align:center;padding:6px"><b style="font-size:16px">📸 ' + esc(nm) + '</b><div style="font-size:12px;opacity:.75">স্ক্রীনশট নিয়েছে · ' + (q.t ? tm(q.t) : "") + '</div></div><div class="ui">' +
        row("নাম", nm) + row("ইউজার আইডি", u && u.uid) + row("বিভাগ", u && u.dept) + row("সেশন", u && u.sess) + row("আইপি", u && u.ip) + row("লোকেশন (আনুমানিক)", loc) + row("ডিভাইস", u && u.ua ? String(u.ua).slice(0, 120) : "") +
        row("ফোন মডেল", u && u.model) + row("স্ট্যাটাস", u ? (u.onl ? "🟢 অনলাইন" : "অফলাইন") : "") + row("Last Active", u ? (u.onl ? "এখন" : (ls ? ago(ls) : "জানা নেই")) : "") + row("মোট বার্তা", u ? bd(u.msgs || 0) + "টি" : "") +
        row("এই চ্যাটে স্ক্রীনশট", bd(cnt) + " বার (লোড করা তালিকায়)") + row("ডিভাইস আইডি", v) + "</div>");
    }).catch(function (er) { toast("ইউজার ইনফো আসেনি: " + (er && er.message ? String(er.message).slice(0, 60) : "")); });
  }
  (function () {
    document.addEventListener("keydown", function (e) { var k = e.key; if (k === "PrintScreen" || k === "Snapshot" || (e.metaKey && e.shiftKey && /^[345sS]$/.test(k))) shotLog(); }, true);
    document.addEventListener("keyup", function (e) { if (e.key === "PrintScreen" || e.key === "Snapshot") shotLog(); }, true);
    document.addEventListener("touchstart", function (e) { if (e.touches && e.touches.length >= 3) shotLog(); }, { passive: true, capture: true });
  })();

  // ---------- স্ক্রীনশট সুরক্ষা (অ্যাডমিন চালু করলে) ----------
  // ⚠ ওয়েবপেইজ ফোন/কম্পিউটারের স্ক্রীনশট আসলে আটকাতে পারে না। এটা বাধা দেওয়ার ব্যবস্থা: উইন্ডো ছাড়লে/PrintScreen চাপলে লেখা ঢেকে যায়, প্রিন্ট ও কপি বন্ধ, আর পর্দায় নাম-আইডির ওয়াটারমার্ক থাকে (ছবি ফাঁস হলে কে তা বোঝা যায়)।
  function shotCover(ms) { var R = $("#acx"); if (!R || !SHOT) return; SHB = Date.now() + (ms || 0); R.classList.add("shotblur"); if (ms) setTimeout(function () { if (Date.now() >= SHB) shotUncover(); }, ms + 30); }
  function shotUncover() { var R = $("#acx"); if (R && Date.now() >= SHB && !document.hidden && document.hasFocus()) R.classList.remove("shotblur"); }
  function applyShot() {
    var R = $("#acx"); document.body.classList.toggle("faNoShot", SHOT); if (!R) return;
    R.classList.toggle("noshot", SHOT); var w = $("#acWm"); if (w) w.remove();
    if (!SHOT) { R.classList.remove("shotblur"); var c = $("#acShC"); if (c) c.remove(); return; }
    var nm = (CUR && CUR.n || "").slice(0, 14), id = String(vid()).slice(-5), t = nm + " · " + id;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="150"><text x="20" y="90" transform="rotate(-24 120 75)" font-size="15" font-family="sans-serif" fill="rgba(128,128,128,0.22)">' + esc(t) + "</text></svg>";
    w = document.createElement("div"); w.id = "acWm"; w.style.cssText = "position:absolute;top:0;right:0;bottom:0;left:0;z-index:70;pointer-events:none;background:url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")"; R.appendChild(w);
    if (!$("#acShC")) { var c2 = document.createElement("div"); c2.id = "acShC"; c2.innerHTML = "🔒<br>সুরক্ষিত চ্যাট<small>স্ক্রীনশট/রেকর্ডিং নিষেধ — চ্যাটে ফিরে আসুন</small>"; R.appendChild(c2); }
    if (document.hidden || !document.hasFocus()) shotCover(0);
  }
  window.addEventListener("blur", function () { if (SHOT) shotCover(0); });
  window.addEventListener("focus", function () { if (SHOT) setTimeout(shotUncover, 150); });
  document.addEventListener("visibilitychange", function () { if (SHOT) { if (document.hidden) shotCover(0); else setTimeout(shotUncover, 150); } });
  // বাড়তি সংকেত (অনুমান-ভিত্তিক, ১০০% নয়): পেইজ লুকালে/ফ্রিজ হলে, ডেস্কটপে ফোকাস হারালে, ৩+ আঙুলের স্পর্শ (অনেক ফোনের ৩-আঙুল স্ক্রীনশট), পর্দার ওপর/নিচের কিনার থেকে টানা (নোটিফিকেশন শেড/স্ক্রীন রেকর্ড বোতাম/কন্ট্রোল সেন্টার)।
  ["pagehide", "freeze"].forEach(function (ev) { window.addEventListener(ev, function () { if (SHOT) shotCover(0); }); document.addEventListener(ev, function () { if (SHOT) shotCover(0); }); });
  window.addEventListener("pageshow", function () { if (SHOT) setTimeout(shotUncover, 150); });
  setInterval(function () { if (SHOT && $("#acx") && !document.hidden && window.matchMedia && matchMedia("(pointer:fine)").matches && !document.hasFocus()) shotCover(0); }, 700);
  var TY0 = -1;
  document.addEventListener("touchstart", function (e) {
    if (!SHOT || !$("#acx")) return; if (e.touches.length >= 3) shotCover(3000);
    TY0 = e.touches.length === 1 ? e.touches[0].clientY : -1;
  }, { passive: true, capture: true });
  document.addEventListener("touchmove", function (e) {
    if (!SHOT || TY0 < 0 || !$("#acx") || e.touches.length !== 1) return; var dy = e.touches[0].clientY - TY0, H = window.innerHeight || 0;
    if ((TY0 <= 28 && dy > 24) || (TY0 >= H - 28 && dy < -24)) { shotCover(4000); TY0 = -1; }
  }, { passive: true, capture: true });
  document.addEventListener("keydown", function (e) {
    if (!SHOT || !$("#acx")) return; var k = e.key;
    if (k === "PrintScreen" || k === "Snapshot" || (e.metaKey && e.shiftKey && /^[345]$/.test(k)) || (e.metaKey && e.shiftKey && /^s$/i.test(k)) || ((e.ctrlKey || e.metaKey) && /^[ps]$/i.test(k))) { shotCover(2500); try { navigator.clipboard.writeText(" "); } catch (x) {} e.preventDefault(); }
  }, true);
  document.addEventListener("keyup", function (e) { if (SHOT && $("#acx") && (e.key === "PrintScreen" || e.key === "Snapshot")) { shotCover(2500); try { navigator.clipboard.writeText(" "); } catch (x) {} } }, true);
  ["contextmenu", "copy", "cut", "dragstart"].forEach(function (ev) { document.addEventListener(ev, function (e) { if (SHOT && $("#acx") && $("#acx").contains(e.target) && !(e.target.closest && e.target.closest("input,textarea"))) e.preventDefault(); }, true); });

  function kl(w) { return w && w.k === "auto" ? "🤖 অটো (আপত্তিকর শব্দ)" : "👮 অ্যাডমিন"; } // কে দিয়েছে (পাবলিক: শুধু অটো/অ্যাডমিন, অ্যাডমিনের ইমেইল নয়)

  // ---------- 🛡️ অ্যাডমিন মোড (SQL: supabase-restrict-v2.sql) ----------
  // অ্যাডমিন একই ব্রাউজারে admin.html-এ লগইন থাকলে (টোকেন localStorage "mc2_adm_x"-এ admin.html রাখে) চ্যাটে বার্তার মেনুতে "🛡️ অ্যাডমিন" বোতাম আসে:
  // বার্তা ও ইউজার দেখে Restriction / সতর্ক / ব্যান / বার্তা সরানো / চলমান Restriction-এর সময় কমানো-বাড়ানো-বন্ধ। সব অনুমতি সার্ভারে mc2_is_admin() দিয়ে যাচাই হয়; এখানে শুধু বোতাম দেখানো।
  var RSON = true, RSPRIV = false; // Restriction সিস্টেম চালু কিনা (অ্যাডমিন সেটিং; বন্ধ থাকলে চ্যাটে কিছু দেখায় না)
  var SHL = [], SHLAST = 0, SHT = 0, SHB2 = false, SHGO = 0; // 📸 স্ক্রীনশট লগ (শুধু অ্যাডমিন মোডে ভরে; SQL: supabase-screenshot-log.sql)
  var ADM = false, ADMT = 0, ADUR = [["১৫ মিনিট", 15], ["১ ঘণ্টা", 60], ["৬ ঘণ্টা", 360], ["২৪ ঘণ্টা", 1440], ["৩ দিন", 4320], ["৭ দিন", 10080], ["৩০ দিন", 43200]];
  function admGet() { try { return JSON.parse(localStorage.getItem("mc2_adm_x") || "null"); } catch (e) { return null; } }
  function admPut(s) { try { if (s) localStorage.setItem("mc2_adm_x", JSON.stringify(s)); else localStorage.removeItem("mc2_adm_x"); } catch (e) {} }
  function admRefresh() {
    var cur = admGet(); if (!cur || !cur.refresh_token) return Promise.reject(new Error("auth"));
    return fetch(base + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: { apikey: C.key, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: cur.refresh_token }) })
      .then(function (r) { if (!r.ok) throw new Error("auth"); return r.json(); }).then(function (s) { admPut(s); return s; });
  }
  function arpc(n, a, retry) {
    var s = admGet(); if (!s || !s.access_token) return Promise.reject(new Error("auth"));
    return fetch(base + "/rest/v1/rpc/" + n, { method: "POST", headers: { apikey: C.key, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json" }, body: JSON.stringify(a || {}) }).then(function (r) {
      if (r.status === 401 && !retry) return admRefresh().then(function () { return arpc(n, a, true); });
      if (!r.ok) return r.text().then(function (t) { throw new Error(t.slice(0, 160)); });
      return r.json().catch(function () { return null; });
    });
  }
  function admInit() {
    if (Date.now() - ADMT < 60000) return; ADMT = Date.now();
    if (!admGet()) { ADM = false; return; }
    arpc("mc2_is_admin").then(function (ok) { ADM = ok === true; }).catch(function () { ADM = false; });
  }
  function admDlg(title, o) { // সময় (ঐচ্ছিক) + কারণ — Promise: { minutes, reason } বা বাতিলে null
    return new Promise(function (ok) {
      var Z = document.createElement("div"); Z.className = "sh0"; Z.id = "acAd";
      var sty = 'style="width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid rgba(128,128,128,.45);font:inherit;background:inherit;color:inherit;margin-top:6px"';
      Z.innerHTML = '<div class="sh"><b>' + esc(title) + "</b>" + (o.sub ? '<div class="sm2">' + esc(o.sub) + "</div>" : "") +
        (o.dur ? '<label>⏳ সময়কাল<select id="acAd1" ' + sty + ">" + o.dur.map(function (d) { return '<option value="' + d[1] + '">' + esc(d[0]) + "</option>"; }).join("") + '<option value="c">✏️ কাস্টম (মিনিট)</option></select></label><input id="acAd2" type="number" min="1" max="525600" inputmode="numeric" placeholder="কত মিনিট? (১ – ৫২৫৬০০)" hidden ' + sty + ">" : "") +
        '<input id="acAd3" maxlength="300" placeholder="' + esc(o.label || "কারণ") + '" ' + sty + '><div class="sm2" id="acAd4" style="color:#d93025"></div><button type="button" data-ok>✅ নিশ্চিত করুন</button><button type="button" data-x>বাতিল</button></div>';
      var q = function (s) { return Z.querySelector(s); }, done = function (v) { Z.remove(); ok(v); };
      if (o.dur) q("#acAd1").onchange = function () { q("#acAd2").hidden = this.value !== "c"; };
      Z.onclick = function (e) {
        if (e.target === Z || e.target.closest("[data-x]")) return done(null);
        if (!e.target.closest("[data-ok]")) return;
        var r = q("#acAd3").value.trim(), mn = null, min = o.min == null ? 3 : o.min;
        if (r.length < min) { q("#acAd4").textContent = "অন্তত " + bd(min) + " অক্ষরে লিখুন।"; return; }
        if (o.dur) { var v = q("#acAd1").value; if (v !== "0") { mn = v === "c" ? Math.floor(+q("#acAd2").value) : +v; if (!(mn >= 1 && mn <= 525600)) { q("#acAd4").textContent = "সময় ১ – ৫২৫৬০০ মিনিটের মধ্যে দিন।"; return; } } }
        done({ minutes: mn, reason: r });
      };
      $("#acx").appendChild(Z);
    });
  }
  function admMenu(id) {
    var m = find(id), x = MET[id] || {}; if (!m) return;
    arpc("fa_admin_msg_target", { p_msg: id }).then(function (T) {
      if (!T) return toast("বার্তার তথ্য পাওয়া যায়নি।");
      var nick = T.nick || x.n || m.nick, Z = document.createElement("div"); Z.className = "sh0"; Z.id = "acAm";
      var act = (T.active || []).map(function (r) {
        return '<div class="rsw">⚠️ ' + esc(r.reason) + "<small>" + kl(r) + " · বাকি " + left(+r.e) + '</small><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><button type="button" data-ra="shorten" data-id="' + r.id + '">⏱ সময় কমাও</button><button type="button" data-ra="extend" data-id="' + r.id + '">⏱ সময় বাড়াও</button><button type="button" class="dg" data-ra="end" data-id="' + r.id + '" data-k="' + esc(r.k) + '">🔓 বন্ধ করো</button></div></div>';
      }).join("");
      Z.innerHTML = '<div class="sh"><b>🛡️ অ্যাডমিন — ' + esc(nick) + '</b><div class="rsw">' + esc(String(m.body || (isF(m) ? "📎 " + lab(m) : "")).slice(0, 160)) + "</div>" +
        (T.locked ? '<div class="sm2">🔒 এই ইউজার লকড (' + (T.lock_e ? "বাকি " + left(+T.lock_e) : "স্থায়ী") + ").</div>" : "") + (act ? "<b>চলমান Restriction</b>" + act : '<div class="sm2">এখন কোনো চলমান Restriction নেই।</div>') +
        '<button type="button" data-aa="rs">⚠️ Restriction দিন</button><button type="button" data-aa="wn">📣 সতর্ক করুন</button><button type="button" class="dg" data-aa="bn">⛔ ব্যান</button><button type="button" class="dg" data-aa="rm">🗑 এই বার্তা সরান</button><button type="button" data-x>বন্ধ করুন</button></div>';
      var after = function (t) { Z.remove(); toast(t); rtNudge(); rsLoad(); load("new"); }, fail = function (er) { toast("হয়নি: " + (er && er.message ? er.message : er)); };
      Z.onclick = function (e) {
        if (e.target === Z || e.target.closest("[data-x]")) return Z.remove();
        var ra = e.target.closest("[data-ra]"), aa = e.target.closest("[data-aa]");
        if (ra) {
          var rid = +ra.dataset.id, a = ra.dataset.ra;
          if (a === "end") {
            if (!confirm("এই Restriction এখনই বন্ধ করবেন?")) return;
            var fg = ra.dataset.k === "auto";
            return arpc("fa_restriction_adjust", { p_id: rid, p_action: "end", p_forgive: fg }).then(function () { after("🔓 Restriction বন্ধ করা হয়েছে।"); }).catch(fail);
          }
          return admDlg(a === "extend" ? "⏱ সময় বাড়ান" : "⏱ সময় কমান", { dur: ADUR, label: "লগের জন্য নোট (ঐচ্ছিক)", min: 0 }).then(function (d) {
            if (!d) return; return arpc("fa_restriction_adjust", { p_id: rid, p_action: a, p_minutes: d.minutes, p_note: d.reason }).then(function (r) { after(r && r.ended ? "🔓 সময় শেষ — Restriction বন্ধ হয়েছে।" : "✅ সময় বদলানো হয়েছে।"); });
          }).catch(fail);
        }
        if (!aa) return; var k = aa.dataset.aa;
        if (k === "rs") return admDlg("⚠️ Restriction — " + nick, { dur: ADUR, label: "⚠️ ওয়ার্নিং লিখুন (ইউজার ও সবাই দেখবে)" }).then(function (d) {
          if (d) return arpc("fa_restrict", { p_voter: T.voter, p_uid: x.u || "", p_nick: nick, p_reason: d.reason, p_minutes: d.minutes }).then(function () { after("✅ Restriction দেওয়া হয়েছে।"); });
        }).catch(fail);
        if (k === "wn") return admDlg("📣 সতর্কবার্তা — " + nick, { label: "সতর্কবার্তা (ইউজার দেখবে)" }).then(function (d) {
          if (d) return arpc("mc2_ac_admin_warn", { p_voter: T.voter, p_reason: d.reason, p_msg: id }).then(function () { after("✅ সতর্ক করা হয়েছে।"); });
        }).catch(fail);
        if (k === "bn") return admDlg("⛔ ব্যান — " + nick, { dur: ADUR.concat([["স্থায়ী (৩টি বৈধ রিপোর্ট + যাচাই লাগবে)", 0]]), label: "📝 কারণ (ইউজারকে দেখানো হতে পারে)" }).then(function (d) {
          if (d) return arpc("mc2_ac_admin_sanction", { p_voter: T.voter, p_kind: "ban", p_minutes: d.minutes || null, p_reason: d.reason }).then(function () { after("⛔ ব্যান করা হয়েছে।"); });
        }).catch(fail);
        if (k === "rm") {
          return admDlg("🗑 বার্তা সরান — " + nick, { sub: "সরালে সবার স্ক্রিনে “🛡️ অ্যাডমিন এই বার্তাটি সরিয়েছেন” দেখাবে। নোট লিখলে সেটাও তার নিচে সবাই দেখবে; ফাঁকা রাখলে শুধু ঐ লাইনটা থাকবে।", label: "📝 অ্যাডমিন নোট (ঐচ্ছিক — সবাই দেখবে)", min: 0 }).then(function (d) {
            if (!d) return;
            return arpc("mc2_ac_admin_remove", { p_msg: id, p_reason: d.reason || null }).then(function (r) {
              var s = admGet(); if (r && r.file && s) return fetch(base + "/storage/v1/object/mc2-chat/" + String(r.file).split("/").map(encodeURIComponent).join("/"), { method: "DELETE", headers: { apikey: C.key, Authorization: "Bearer " + s.access_token } }).catch(function () {});
            }).then(function () { after("🗑 বার্তা সরানো হয়েছে।"); });
          }).catch(fail);
        }
      };
      $("#acx").appendChild(Z);
    }).catch(function (er) { ADM = false; toast("অ্যাডমিন সেশন পাওয়া যায়নি — admin.html-এ আবার লগইন করুন। (" + (er && er.message ? String(er.message).slice(0, 60) : "") + ")"); });
  }

  function rsAct(w) { return w && w.e > Date.now(); }
  function rsGet(k) { return k === "me" ? RS.m : RS.p[k]; }
  function rsKey(x, own) { // বাবলের লেখক Restricted কিনা: পাবলিক uid দিয়ে মেলে; নিজের হলে নিজের তালিকা দিয়েও
    var k = x && x.u; if (k && (RS.p[k] || []).some(rsAct)) return k;
    if (own && RS.m.some(rsAct)) return "me"; return "";
  }
  function rsPrune() {
    var ch = false, f = function (L) { var n = (L || []).filter(rsAct); if (n.length !== (L || []).length) ch = true; return n; };
    Object.keys(RS.p).forEach(function (k) { var n = f(RS.p[k]); if (n.length) RS.p[k] = n; else delete RS.p[k]; });
    RS.m = f(RS.m); if (ch) { RS.sg = ""; RSV++; } return ch;
  }
  function rsLoad() {
    if (!ON) return; admInit();
    rpc("fa_rs", { p_voter: vid() }).then(function (r) {
      if (!r || typeof r !== "object" || !$("#acx")) return;
      if (Date.now() - BADT > 300000) { BADT = Date.now(); rpc("fa_bad", {}).then(function (L) { BAD = (Array.isArray(L) ? L : []).map(nbad).filter(function (w) { return w.length >= 2; }); RSV++; render(false); }).catch(function () {}); }
      var nl = r.lk ? { r: String(r.lk.r || ""), e: +r.lk.e || 0 } : null, ns = !!r.shot, lch = JSON.stringify(nl) !== JSON.stringify(LK ? { r: LK.r, e: LK.e } : null); if (nl) nl.x = nl.e ? nl.e - ((+r.now || Date.now()) - Date.now()) : 0; LK = nl; if (ns !== SHOT) { SHOT = ns; applyShot(); }
      if (lch) { applyLock(); applyMe(); }
      var on = r.on !== false, pv = r.vis === "private"; if (on !== RSON || pv !== RSPRIV) { RSON = on; RSPRIV = pv; RS.sg = ""; RSV++; }
      var sg = JSON.stringify([r.p, r.m, on, pv]); if (sg === RS.sg) return;
      var off = (+r.now || Date.now()) - Date.now(), adj = function (w) { return { r: String(w.r || ""), c: +w.c - off, e: +w.e - off, k: String(w.k || "") }; }, P = {};
      (r.p || []).forEach(function (g) { if (g && g.u) P[g.u] = (g.w || []).map(adj); });
      RS = { p: P, m: (r.m || []).map(adj), sg: sg }; RSV++; applyRs(); render(false);
    }).catch(function () {}); // SQL (supabase-restrict.sql) না চালালে কিছু হয় না
  }
  function rsStart() {
    clearInterval(RST); rsLoad(); var n = 0;
    RST = setInterval(function () { if (!$("#acx")) { clearInterval(RST); RST = null; return; } if (document.hidden) return; n++; if (LK && LK.x && LK.x <= Date.now()) { applyLock(); applyMe(); } var ch = rsPrune(); if (n % 2 === 0) rsLoad(); else { applyRs(); if (ch) render(false); } }, 10000);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && $("#acx")) rsLoad(); });
  function applyRs() {
    var b = $("#acRsB"); if (!b) return; var L = RS.m.filter(rsAct);
    b.hidden = !L.length; if (!L.length) { b.innerHTML = ""; return; }
    b.innerHTML = "<b>⛔ আপনি এখন Restricted — আপনার ওয়ার্নিং:</b>" + L.map(function (w) { return '<div class="rsw">⚠️ ' + esc(w.r) + "<small>" + kl(w) + " · বাকি " + left(w.e) + " · " + tm(w.e) + " পর্যন্ত</small></div>"; }).join("") + '<div class="sm2">নিয়ম ভাঙলে ব্যান হতে পারে। সময় শেষ হলে এই চিহ্ন নিজে চলে যাবে।</div>';
  }
  function rsPop(k) { // সেটিং "সবাই": ⛔ চাপলে সবাই কারণ/বাকি সময়/কে দিয়েছে দেখে। সেটিং "private": শুধু ওই ইউজার নিজে আর অ্যাডমিন। (আসল আপত্তিকর মেসেজ সবসময় লুকানো)
    if (!RSPRIV) return rsView(k, (rsGet(k) || []).filter(rsAct));
    var own = k === "me"; if (!own && RS.m.some(rsAct)) Object.keys(MET).forEach(function (i) { var q = MET[i]; if (q && q.o && q.u === k) own = true; });
    if (own) return rsView("me", RS.m.filter(rsAct));
    if (ADM) return arpc("fa_admin_restrictions", { p_active_only: true }).then(function (L) {
      rsView(k, (L || []).filter(function (r) { return r.uid === k; }).map(function (r) { return { r: r.reason, c: r.c, e: r.e, k: r.k }; }).filter(rsAct));
    }).catch(function () { toast("লোড হয়নি — অ্যাডমিন লগইন/SQL দেখুন।"); });
    toast("ওয়ার্নিংয়ের কারণ শুধু ওই ইউজার নিজে আর অ্যাডমিন দেখতে পারে।");
  }
  function rsView(k, W) {
    if (!W.length) return toast("এখন কোনো ওয়ার্নিং নেই।");
    var nm = "আপনি"; if (k !== "me") { MSGS.some(function (m) { var x = MET[m.id] || {}; if (x.u === k) { nm = x.n || m.nick; return true; } }); if (nm === "আপনি") nm = "এই ইউজার"; }
    pop('<div style="text-align:center;font-size:42px;line-height:1.1">⛔</div><b style="text-align:center;font-size:17px;color:#d93025">' + esc(nm) + ' — Restricted</b><div class="sm2" style="text-align:center">' + (RSPRIV ? "শুধু এই ইউজার আর অ্যাডমিন এটা দেখতে পারে।" : "এই ওয়ার্নিং সবাই দেখতে পারে (আসল মেসেজ লুকানো থাকে)।") + '</div>' +
      W.map(function (w) { return '<div class="rsw"><b>⚠️ ' + esc(w.r) + '</b><small>👤 দিয়েছে: <b>' + kl(w) + '</b></small><small>⏳ বাকি: <b>' + left(w.e) + '</b> (' + tm(w.e) + ' পর্যন্ত)</small><small>দেওয়া হয়েছে: ' + tm(w.c) + "</small></div>"; }).join(""));
  }
  function report(id, m, x) {
    var Z = document.createElement("div"); Z.className = "sh0"; Z.id = "acRep";
    Z.innerHTML = '<div class="sh"><b>🚩 রিপোর্ট করুন — ' + esc(x.n || m.nick) + '</b><div class="sm2">কারণ বাছুন। মিথ্যা বা বারবার রিপোর্ট করলে আপনার ওপরও ব্যবস্থা হতে পারে।</div>' +
      RR.map(function (r) { return '<label class="rr"><input type="radio" name="acRr" value="' + r[0] + '"> ' + r[1] + "</label>"; }).join("") +
      '<input id="acRn" maxlength="200" placeholder="সংক্ষেপে লিখুন (ঐচ্ছিক)"><button type="button" data-go>রিপোর্ট পাঠান</button><button type="button" data-x>বাতিল</button></div>';
    Z.onclick = function (e) {
      if (e.target === Z || e.target.closest("[data-x]")) return Z.remove();
      var go = e.target.closest("[data-go]"); if (!go) return; var c = Z.querySelector("input[name=acRr]:checked"); if (!c) return toast("একটা কারণ বাছুন।"); go.disabled = true;
      rpc("mc2_ac_report", { p_msg: id, p_voter: vid(), p_reason: c.value, p_note: $("#acRn").value.trim() || null }).then(function (r) {
        Z.remove(); toast(r === 1 ? "রিপোর্ট পাঠানো হয়েছে। ধন্যবাদ।" : r === -6 ? "আপনি এই বার্তা আগেই রিপোর্ট করেছেন।" : r === -2 ? "নিজের বার্তা রিপোর্ট করা যায় না।" : r === -4 ? "অনেক রিপোর্ট করেছেন — পরে চেষ্টা করুন।" : r === -3 ? "এখন রিপোর্ট করা সম্ভব নয়।" : r === 0 ? "বার্তাটি আর নেই।" : "রিপোর্ট পাঠানো যায়নি।");
      }).catch(function () { go.disabled = false; toast("রিপোর্ট যায়নি — SQL (supabase-moderation.sql) চালানো আছে কি?"); });
    };
    $("#acx").appendChild(Z);
  }

  // ---------- লাইভ: টাইপিং, Join/Leave (supabase-live-board.sql) ----------
  function typing() { var i = $("#acI"); return !!i && !i.disabled && Date.now() - TYP < 3500 && i.value.trim() !== ""; }
  // ===== Realtime "নাড়া" (২০২৬-১০-২২) — মেসেজ সঙ্গে সঙ্গে দেখাতে =====
  // কেউ মেসেজ পাঠালে/রিঅ্যাক্ট/মুছলে ঘরের সবাইকে খুব ছোট একটা সংকেত (বিষয়বস্তু ছাড়া) যায়; সবাই সঙ্গে সঙ্গে আগের নিয়মে (load) নতুন মেসেজ আনে।
  // তাই পাসওয়ার্ড/ব্যান/লুকানো মেসেজের নিয়ম আগের মতোই সার্ভারে থাকে। ওয়েবসকেট না চললে (RT.ok=false) আগের ২/৪ সেকেন্ডের পোলিংই চলে।
  var RT = { ws: null, ok: false, topic: "", sid: 0, hb: null, rc: null, ref: 0, tries: 0, last: 0, pend: null, busy: false, send: null, mt: 0, lt: 0 };
  function rtStop() { clearInterval(RT.hb); clearTimeout(RT.rc); clearTimeout(RT.pend); RT.ok = false; RT.sid = 0; RT.send = null; var w = RT.ws; RT.ws = null; if (w) { try { w.onclose = null; w.close(); } catch (e) {} } }
  function rtPull() {
    if (!$("#acM")) return; clearTimeout(RT.pend);
    RT.pend = setTimeout(function () { // একসঙ্গে অনেক নাড়া এলেও প্রতি ০.৭ সেকেন্ডে সর্বোচ্চ ১বার আনে; আর সবাই একই মুহূর্তে না ছুটে ০–০.৩ সেকেন্ড এলোমেলো দেরি
      if (!$("#acM")) return; if (RT.busy) return rtPull();
      RT.busy = true; RT.last = Date.now(); Promise.resolve(load("new")).catch(function () {}).then(function () { RT.busy = false; });
    }, Math.max(0, RT.last + 700 - Date.now()) + Math.random() * 300);
  }
  function rtNudge() { try { if (RT.ok && RT.send) RT.send({ topic: RT.topic, event: "broadcast", payload: { type: "broadcast", event: "n", payload: { t: Date.now() } }, ref: String(++RT.ref) }); } catch (e) {} }
  function rtStart(sid) {
    rtStop(); if (!ON || !window.WebSocket) return; RT.sid = sid; RT.topic = "realtime:mcac-" + sid;
    var w; try { w = new WebSocket(base.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(C.key) + "&vsn=1.0.0"); } catch (e) { return; }
    RT.ws = w; var tp = RT.topic;
    var send = function (o) { try { if (w.readyState === 1) w.send(JSON.stringify(o)); } catch (e) {} };
    RT.send = send;
    w.onopen = function () {
      send({ topic: tp, event: "phx_join", payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, private: false }, access_token: C.key }, ref: String(++RT.ref), join_ref: "1" });
      clearInterval(RT.hb); RT.hb = setInterval(function () { if (!$("#acM") || RT.sid !== sid) return rtStop(); send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(++RT.ref) }); }, 25000);
    };
    w.onmessage = function (m) {
      var d; try { d = JSON.parse(m.data); } catch (e) { return; } if (!d || d.topic !== tp) return;
      if (d.event === "phx_reply") { if (d.payload && d.payload.status === "ok") { if (!RT.ok) { RT.ok = true; RT.tries = 0; rtPull(); } } else RT.ok = false; }
      else if (d.event === "phx_error" || d.event === "phx_close") RT.ok = false;
      else if (d.event === "broadcast" && d.payload && d.payload.event === "n") rtPull();
      else if (d.event === "broadcast" && d.payload && d.payload.event === "l") { // কেউ নিজে বের হয়েছে (ক্লিক করে বা সাইট বন্ধ করে)
        var lp = d.payload.payload || {}, ln = String(lp.n || "").slice(0, 40); if (!ln || (CUR && ln === CUR.n)) return;
        var nw = Date.now(); if (EVS.some(function (x) { return x.k === "leave" && x.n === ln && nw - x.t < 8000; })) return;
        EVS = EVS.concat([{ id: "l" + nw + ln, k: "leave", n: ln, t: nw, o: false }]).slice(-50); render(false);
      }
    };
    w.onclose = function () {
      RT.ok = false; if (RT.ws !== w) return; RT.ws = null; RT.send = null; if (!$("#acM") || RT.sid !== sid) return;
      RT.rc = setTimeout(function () { if ($("#acM") && RT.sid === sid) rtStart(sid); }, Math.min(30000, 2000 * Math.pow(2, Math.min(RT.tries++, 4))));
    };
  }
  function live() {
    if (!CUR || LB || !$("#acM")) return; LB = true; LT = Date.now(); shotLoad();
    rpc("mc2_ac_live", { p_session: +CUR.s, p_voter: vid(), p_nick: CUR.n, p_typing: typing(), p_after: EVLAST }).then(function (r) {
      var t = $("#acTy"); if (!r || r.err) { if (t) t.hidden = true; return; }
      var add = (r.ev || []).filter(function (e) { return !e.o && e.k !== "leave" && !EVS.some(function (x) { return x.id === e.id; }); });
      EVLAST = Math.max(EVLAST, r.last || 0); if (add.length) { EVS = EVS.concat(add).slice(-50); render(false); }
      if (t) { var n = r.ty || []; t.hidden = !n.length; if (n.length) t.textContent = "✍️ " + n.join(", ") + " টাইপ করছে…"; var tn = Date.now(), pl = 0; n.forEach(function (x) { if (x && x !== (CUR && CUR.n) && (!TYS[x] || tn - TYS[x] > 10000)) { TYS[x] = tn; pl = 1; } }); if (pl) tick(); /* part63: কেউ টাইপ শুরু করলে ছোট শব্দ (একই জন ১০ সেকেন্ডে একবার) */ }
    }).catch(function () {}).then(function () { LB = false; });
  }
  function leaveRoom() {
    try { if (window.faBub) window.faBub.unmount(); } catch (e) {}
    if (!CUR || !$("#acM")) return; clearInterval(LV);
    try { if (RT.ok && RT.send) RT.send({ topic: RT.topic, event: "broadcast", payload: { type: "broadcast", event: "l", payload: { n: CUR.n, t: Date.now() } }, ref: String(++RT.ref) }); } catch (e) {}
    rtStop();
    try { fetch(base + "/rest/v1/rpc/mc2_ac_leave", { method: "POST", keepalive: true, headers: H(), body: JSON.stringify({ p_session: +CUR.s, p_voter: vid() }) }).catch(function () {}); } catch (e) {}
  }
  // ফাইল টাইপ ও MB অ্যাডমিন থেকে বদলায় (mc2_ac_ftypes); না এলে কোডের ডিফল্ট FT-ই চলে
  function loadFT() { rpc("mc2_ac_ftypes", {}).then(function (r) { if (!r || typeof r !== "object" || Array.isArray(r)) return; Object.keys(FT).forEach(function (k) { delete FT[k]; }); Object.keys(r).forEach(function (k) { if (Array.isArray(r[k])) FT[k] = r[k]; }); ACCEPT = Object.keys(FT).map(function (e) { return "." + e; }).join(","); var f = $("#acFl"); if (f) f.setAttribute("accept", ACCEPT); }).catch(function () {}); }
  loadFT(); document.addEventListener("visibilitychange", function () { if (!document.hidden) loadFT(); });
  window.addEventListener("pagehide", function (e) { if (e && e.persisted) return; leaveRoom(); });

  function sync() { if (location.hash === "#anon") { if (MINZ) return restore(); if (!$("#acx")) gate(); } else if (!MINZ) close(); }
  // Friend Adda: ল্যান্ডিং পেইজ থেকে সরাসরি রুমে ঢোকার API (আগের gate()-এর enter() যা করত তাই)
  window.__fa = { ON: ON, api: api, rpc: rpc, vid: vid, saved: function () { return LS.get("mc2_ac_p", {}); },
    enter: function (d, s, n, dn, sn, au) { BUBMS = au ? 2000 : 4000; sn = String(sn || "").replace(/^(Session\s*)2023\s*$/i, function (m, a) { return a + "2023-24"; }); CUR = { d: d, s: s, n: n, dn: dn, sn: sn }; LS.set("mc2_ac_p", { d: d, s: s, n: n, dn: dn, sn: sn }); try { if (n) rpc("fa_name_log", { p_voter: vid(), p_nick: String(n) }).catch(function () {}); } catch (e) {} if (window.mcPresencePing) window.mcPresencePing(); room(); if (location.hash !== "#anon") location.hash = "anon"; } };
  window.addEventListener("hashchange", function (e) { var h = String(e.oldURL || "").split("#")[1]; if (h && h !== "anon") PH = h; sync(); }); sync();
})();
