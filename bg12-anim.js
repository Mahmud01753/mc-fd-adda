// M.C Master’s ADDA — ১২ নং ব্যাকগ্রাউন্ড (রাস্তা ও চাঁদ): ১০টা ডিজাইনের জীবন্ত এনিমেশন।
// জীবন্ত মাছ (সাঁতার, লাফ, ঢেউ), আকাশে পাখি (ডানা ঝাপটায়), রাস্তার ঠিক মাঝের দাগ ধরে ছোট গাড়ি।
// প্রতিটা মাছ/পাখি সাথে ছোট বাবল নিয়ে ঘোরে (ভেতরে ছোট M.C); গাড়ির পিছনে ভাসে ছোট বাবল, ভেতরে ছোট "M.C Master’s ADDA"।
// সাইটে: html.bg12 ক্লাস থাকলে নিজে চালু, না থাকলে বন্ধ। প্রিভিউ/অ্যাডমিন: window.BG12_MANUAL=true দিয়ে BG12.mount(header) ও BG12.set({...}) ব্যবহার করুন।
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg", IW = 1200, IH = 630, R = document.documentElement;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var f1 = function (n) { return n.toFixed(1); };
  var cl = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var hsl = function (h, s, l) { return "hsl(" + Math.round(((h % 360) + 360) % 360) + "," + s + "%," + l + "%)"; };

  // ====================== ১০টা ডিজাইন ======================
  var DES = [
    { id: 1, n: "ডিজাইন ১", t: "রিয়েল কই ও আবাবিল (ডিফল্ট)", ac: "#ff8a3d",
      fish: { c1: "#4d5a2b", c2: "#efd79b", fin: "#c9873a", eye: "#0c0c0c", shape: "koi", tail: "fork", real: 1, sheen: 1 },
      bird: { c: "#27406f", c2: "#1b2e55", belly: "#f1e2c8", throat: "#b9582c", beak: "#2a2018", shape: "real" },
      car: { b: ["#2f8f6b", "#d9822b", "#3d6fb5"], head: "#fff3c4", tail: "#ff3b30" },
      bub: { s: "#d6fff0", f: "rgba(214,255,240,.10)", tx: "#eafff7" }, glow: "#ffb25c", fx: "" },
    { id: 2, n: "ডিজাইন ২", t: "সোনালি কই", ac: "#ffb347",
      fish: { c1: "#fffaf0", c2: "#ff7a45", fin: "#ffd9a8", eye: "#2a1408", shape: "koi", tail: "ribbon", patch: "#e8342b", patch2: "#2b2b2b" },
      bird: { c: "#fff6dc", c2: "#e3b04b", beak: "#e8a33c", shape: "crane" },
      car: { b: ["#c9953a", "#e8c36a", "#a8742b"], head: "#fff0b8", tail: "#ff4a3a", rr: 10 },
      bub: { s: "#ffe7a3", f: "rgba(255,226,140,.12)", tx: "#fff3c8" }, glow: "#ffcf6b", fx: "sparkle", fxc: "#ffe08a" },
    { id: 3, n: "ডিজাইন ৩", t: "নিয়ন গ্লো", ac: "#22e6ff",
      fish: { c1: "#00f5d4", c2: "#7b2ff7", fin: "#ff3df2", eye: "#ffffff", shape: "slim", tail: "fan", neon: "#58fff0" },
      bird: { c: "#0a2434", c2: "#0a2434", beak: "#ff3df2", shape: "swallow", neon: "#7df9ff" },
      car: { b: ["#101c30", "#1d1236", "#0d2a2e"], neon: "#35f3ff", head: "#e6ffff", tail: "#ff2d95" },
      bub: { s: "#ff5cf0", f: "rgba(255,92,240,.10)", tx: "#c9fffb" }, glow: "#35f3ff", fx: "" },
    { id: 4, n: "ডিজাইন ৪", t: "ক্রিস্টাল আইস", ac: "#8fd8ff",
      fish: { c1: "#f0fdff", c2: "#63b9ff", fin: "#c6ecff", eye: "#0b2a46", shape: "slim", tail: "fan", ghost: 1 },
      bird: { c: "#ffffff", c2: "#a9dcff", beak: "#7cc4ff", shape: "swallow" },
      car: { b: ["#8fb3d1", "#b6d3ea", "#6e93b5"], head: "#f4fcff", tail: "#ff6b6b", rr: 8 },
      bub: { s: "#e4f6ff", f: "rgba(190,230,255,.14)", tx: "#f2fbff" }, glow: "#9fdcff", fx: "snow", fxc: "#ffffff" },
    { id: 5, n: "ডিজাইন ৫", t: "জোনাকি আলো", ac: "#c8ff5a",
      fish: { c1: "#f4ff9a", c2: "#4be07a", fin: "#a8ff72", eye: "#0b2a14", shape: "round", tail: "fan", spots: "#fffbb0" },
      bird: { c: "#ffe9a3", c2: "#ffb347", beak: "#ff9f43", shape: "puff", glowc: "#ffd36b" },
      car: { b: ["#e8a33c", "#c96b2a", "#d9c04a"], head: "#fffbd0", tail: "#ff7a3a", rr: 12 },
      bub: { s: "#f6ffa8", f: "rgba(246,255,168,.14)", tx: "#fdfff0" }, glow: "#d4ff63", fx: "fire", fxc: "#e7ff7a" },
    { id: 6, n: "ডিজাইন ৬", t: "কাগজের ওরিগামি", ac: "#ff6f61",
      fish: { c1: "#ffb199", c2: "#ff5a5f", fin: "#ffd0c2", eye: "#2a1010", shape: "poly", tail: "fork" },
      bird: { c: "#fff4ec", c2: "#ffb199", beak: "#ff6f61", shape: "crane", poly: 1 },
      car: { b: ["#e85a4f", "#f2b134", "#3f8fd2"], head: "#fff8e1", tail: "#d62828", poly: 1, rr: 2 },
      bub: { s: "#fff1e6", f: "rgba(255,241,230,.18)", tx: "#fff7f0", paper: 1 }, glow: "#ff9d8a", fx: "" },
    { id: 7, n: "ডিজাইন ৭", t: "কার্টুন কিউট", ac: "#ff8fc7",
      fish: { c1: "#c3f2ff", c2: "#48b8ff", fin: "#ffd45e", eye: "#17324a", shape: "chubby", tail: "fan", cute: 1 },
      bird: { c: "#fff7a8", c2: "#ffd24a", beak: "#ff9a3c", shape: "puff", cute: 1 },
      car: { b: ["#7fe3c4", "#ffb3d1", "#ffd77a"], head: "#ffffff", tail: "#ff6b8b", cute: 1 },
      bub: { s: "#ffe0f0", f: "rgba(255,224,240,.16)", tx: "#fff2f9" }, glow: "#ffb6dc", fx: "heart", fxc: "#ff8fc7" },
    { id: 8, n: "ডিজাইন ৮", t: "রংধনু জেলি", ac: "#b57bff",
      fish: { c1: "#ff9bd2", c2: "#7ad7ff", fin: "#ffe27a", eye: "#1a1030", shape: "round", tail: "ribbon", hue: 1 },
      bird: { c: "#ffd1f0", c2: "#9fe3ff", beak: "#ffe27a", shape: "swallow", hue: 1 },
      car: { b: ["#b57bff", "#ff7bc8", "#5bd0ff"], head: "#fff7d6", tail: "#ff4f9a", rr: 10 },
      bub: { s: "#ffffff", f: "rgba(255,255,255,.08)", tx: "#ffffff", iri: 1 }, glow: "#d79bff", fx: "sparkle", fxc: "#ffffff" },
    { id: 9, n: "ডিজাইন ৯", t: "সিলভার মুনলাইট", ac: "#cfe0ee",
      fish: { c1: "#fbfdff", c2: "#8fa6bb", fin: "#d5e2ee", eye: "#0e1a24", shape: "slim", tail: "fan", sheen: 1 },
      bird: { c: "#f4f8fb", c2: "#aebfce", beak: "#dbe6ef", shape: "crane" },
      car: { b: ["#8fa3b5", "#6f8398", "#aab9c7"], head: "#ffffff", tail: "#ff5a5a", rr: 9 },
      bub: { s: "#e9f1f8", f: "rgba(233,241,248,.10)", tx: "#f5fafd" }, glow: "#dbe9f5", fx: "sparkle", fxc: "#f2f8ff" },
    { id: 10, n: "ডিজাইন ১০", t: "গোলাপি পাপড়ি", ac: "#ff5c8a",
      fish: { c1: "#ffd3e0", c2: "#ff4f86", fin: "#ff9fbd", eye: "#3a0f1e", shape: "round", tail: "ribbon", spots: "#fff0f5" },
      bird: { c: "#ffe3ec", c2: "#ff9fbd", beak: "#ff6f9a", shape: "swallow" },
      car: { b: ["#d94f7a", "#f08aa8", "#b83a66"], head: "#fff0f5", tail: "#ff2f6b", rr: 10 },
      bub: { s: "#ffc2d6", f: "rgba(255,194,214,.14)", tx: "#fff0f5" }, glow: "#ff8fb1", fx: "petal", fxc: "#ff9fbd" }
  ];

  var BU = { s: "#e4f6ff", f: "rgba(190,230,255,.14)", tx: "#f2fbff" };
  DES.push(
    { id: 11, n: "ডিজাইন ১১", t: "ইলিশ ও কবুতর (রিয়েল)", ac: "#9fc3d9", fish: { c1: "#587f9c", c2: "#f4f8fb", fin: "#b9ccd8", eye: "#101820", shape: "slim", tail: "fork", real: 1, sheen: 1 }, bird: { c: "#ffffff", c2: "#c9d3da", beak: "#d89a9a", shape: "puff", sc: 1.2 }, car: { b: ["#7d96a8", "#a9bccb", "#5f7a8e"], head: "#ffffff", tail: "#ff5a5a", rr: 9 }, bub: BU, glow: "#cfe6f5", fx: "" },
    { id: 12, n: "ডিজাইন ১২", t: "মাছরাঙা ও কই (রিয়েল)", ac: "#1e8fe6", fish: { c1: "#5e3f17", c2: "#efbd5e", fin: "#a9702a", eye: "#101010", shape: "round", tail: "fan", real: 1, spots: "#2e1c0a" }, bird: { c: "#1e8fe6", c2: "#0a5aa8", belly: "#ff8c2e", beak: "#1b1b1b", shape: "king", sc: 1.25 }, car: { b: ["#1e8fe6", "#ff8c2e", "#0a5aa8"], head: "#fff3c4", tail: "#ff4a3a" }, bub: BU, glow: "#6fc3ff", fx: "" },
    { id: 13, n: "ডিজাইন ১৩", t: "দোয়েল ও রুই (রিয়েল)", ac: "#c9d36a", fish: { c1: "#66722f", c2: "#f1ead0", fin: "#c9a24a", eye: "#101010", shape: "koi", tail: "fan", real: 1, sheen: 1 }, bird: { c: "#141414", c2: "#ffffff", beak: "#444444", shape: "doel", sc: 1.3 }, car: { b: ["#2f3a2a", "#8a9a3c", "#c9a24a"], head: "#fff8d0", tail: "#ff4a3a" }, bub: BU, glow: "#e6efa0", fx: "" },
    { id: 14, n: "ডিজাইন ১৪", t: "ঈগল ও ট্রাউট (রিয়েল)", ac: "#f2b705", fish: { c1: "#5f7560", c2: "#f7ece6", fin: "#9fb0a0", eye: "#101010", shape: "slim", tail: "fork", real: 1, stripe: "#ff6f8a" }, bird: { c: "#5a3a1c", c2: "#3d2610", beak: "#f2b705", shape: "eagle", sc: 1.5 }, car: { b: ["#5a3a1c", "#8a5a2c", "#3d6a52"], head: "#fff3c4", tail: "#ff4a3a" }, bub: BU, glow: "#ffe08a", fx: "" }
  );

  var CFG = { bsz: 1.7, words: "M.C, ADDA, MASTER’S", bsize: 2, tsize: 1, hue: 0, t1: "M.C", tb: "m.c", t2a: "M.C", t2b: "Master’s ADDA", design: 1, size: 1, speed: 1, fish: 5, birds: 6, cars: 2, bubbles: true, text: true, fx: true, dir: "toward" };
  var host = null, svg = null, hdr = null, raf = 0, last = 0, T = 0, W = {}, TH = DES[0], forced = false, mounted = false;
  var reduce = false; /* part62: ফোনে "অ্যানিমেশন কমানো" অন থাকলেও মাছ/পাখি/গাড়ি দেখাবে (আগে এতে পুরো এনিমেশন বন্ধ হয়ে যেত) */

  // ====================== রাস্তার মাঝের দাগ (ছবি থেকে মাপা) ======================
  var LANE = [[304, 834], [312, 846], [322, 860], [335, 871], [351, 882], [371, 886], [393, 881], [418, 866], [445, 839], [474, 803], [505, 762], [537, 720], [572, 685], [608, 664], [645, 652], [720, 640]];
  var LM = (function () { var m = [], n = LANE.length, i; for (i = 0; i < n; i++) { var a = LANE[Math.max(0, i - 1)], b = LANE[Math.min(n - 1, i + 1)]; m.push((b[1] - a[1]) / (b[0] - a[0])); } return m; })();
  function laneX(y) {
    var n = LANE.length; if (y <= LANE[0][0]) return LANE[0][1]; if (y >= LANE[n - 1][0]) return LANE[n - 1][1];
    for (var i = 1; i < n; i++) if (y <= LANE[i][0]) {
      var a = LANE[i - 1], b = LANE[i], h = b[0] - a[0], t = (y - a[0]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * h * LM[i - 1] + (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * h * LM[i];
    }
    return LANE[n - 1][1];
  }
  function carS(y) { return cl((y - 303) * 0.0023, 0.012, 1) * CFG.size; }

  // ====================== ছোট সহায়ক ======================
  function G(parent, html) { var g = document.createElementNS(NS, "g"); if (html) g.innerHTML = html; parent.appendChild(g); return g; }
  function smooth(p, closed) {
    var m = p.length, i, s, a, b;
    if (m < 3) return "";
    var mid = function (u, v) { return [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2]; };
    a = mid(p[m - 1], p[0]); s = "M" + f1(a[0]) + "," + f1(a[1]);
    for (i = 0; i < m; i++) { b = mid(p[i], p[(i + 1) % m]); s += "Q" + f1(p[i][0]) + "," + f1(p[i][1]) + " " + f1(b[0]) + "," + f1(b[1]); }
    return s + "Z";
  }
  function poly(p) { var s = "M", i; for (i = 0; i < p.length; i++) s += (i ? "L" : "") + f1(p[i][0]) + "," + f1(p[i][1]); return s + "Z"; }

  // ====================== মাছের গঠন (নাক +x, ল্যাজ −x; ১০০ একক লম্বা) ======================
  var HH = { round: 19, slim: 13, koi: 14, chubby: 25, poly: 18 };
  function half(s, H) { return H * (0.9 * Math.sin(Math.PI * Math.pow(s, 0.62)) * (1 - 0.3 * s) + 0.14 * s); }
  function spineY(s, F) { return F.A * Math.pow(s, 1.3) * Math.sin(F.w * F.t - 3.4 * s + F.ph); }
  function band(F, a, b, k, part, sharp) {
    var n = Math.max(3, Math.round((sharp ? 6 : 13) * (b - a))), top = [], bot = [], i, s, y, h;
    for (i = 0; i <= n; i++) { s = a + (b - a) * i / n; y = spineY(s, F); h = half(s, F.H) * k; top.push([50 - 90 * s, y - h * (part === "lower" ? 0 : 1)]); bot.push([50 - 90 * s, y + h * (part === "upper" ? 0 : 1)]); }
    var pts = top.concat(bot.reverse()); return sharp ? poly(pts) : smooth(pts);
  }
  var TAILP = {
    fork: "M0,0 L-30,-19 Q-21,0 -30,19 Z",
    fan: "M0,0 Q-12,-24 -32,-17 Q-24,0 -32,17 Q-12,24 0,0 Z",
    ribbon: "M0,0 Q-18,-16 -42,-7 Q-60,-1 -82,-13 Q-64,6 -44,11 Q-20,16 0,0 Z"
  };

  function buildFish(parent, d, n) {
    var F = TH.fish, id = "b12f" + n, H = HH[F.shape] || 19;
    var k = d.L / 100 * (F.shape === "chubby" ? 1.05 : 1);
    var g = G(parent, '<g class="fb"><ellipse class="gw" cx="0" cy="0" rx="70" ry="38" fill="url(#b12gl)" opacity="' + (F.neon || F.spots || F.sheen ? ".55" : ".0") + '"/><path class="tl"/><path class="df"/><path class="bd" fill="url(#' + id + ')"/><path class="sc" fill="url(#b12sc)" opacity="0"/><path class="b1"/><path class="b2"/><path class="pf"/><path class="bl" fill="#fff6d8" opacity="0"/><path class="gs" fill="#fff" opacity=".28"/><path class="ln" fill="none" stroke="#000" stroke-opacity=".28" stroke-width=".9"/><path class="gl" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="1.3" stroke-linecap="round"/><path class="tr" fill="none" stroke="#000" stroke-opacity=".28" stroke-width=".8"/><g class="ey"></g></g>');
    var o = {
      g: g, k: k, body: g.querySelector(".fb"), tl: g.querySelector(".tl"), df: g.querySelector(".df"), bd: g.querySelector(".bd"), sc: g.querySelector(".sc"), b1: g.querySelector(".b1"), b2: g.querySelector(".b2"),
      pf: g.querySelector(".pf"), gs: g.querySelector(".gs"), bl: g.querySelector(".bl"), ln: g.querySelector(".ln"), gl: g.querySelector(".gl"), tr: g.querySelector(".tr"), ey: g.querySelector(".ey"), gw: g.querySelector(".gw"),
      id: id, F: { H: H, A: 9, w: 7.5, t: rnd(0, 9), ph: rnd(0, 6) }, hue0: rnd(0, 360),
      x0: d.x0, x1: d.x1, by: d.y, x: rnd(d.x0, d.x1), y: d.y, dir: Math.random() < .5 ? 1 : -1, sp: rnd(14, 26), mode: "swim",
      nj: rnd(1.5 + n * .7, 4 + n), nt: rnd(3, 8), vx: 0, vy: 0, ang: 0, em: rnd(.5, 2)
    };
    o.tl.setAttribute("d", TAILP[F.tail]); o.tl.setAttribute("fill", F.fin); o.tl.setAttribute("opacity", F.ghost ? ".75" : ".92");
    o.df.setAttribute("fill", F.fin); o.df.setAttribute("opacity", F.ghost ? ".7" : ".9");
    o.pf.setAttribute("d", "M0,0 Q-9,9 -21,5 Q-10,-2 0,0Z"); o.pf.setAttribute("fill", F.fin); o.pf.setAttribute("opacity", ".85");
    if (F.neon) { o.bd.setAttribute("stroke", F.neon); o.bd.setAttribute("stroke-width", "2.2"); o.tl.setAttribute("stroke", F.neon); o.tl.setAttribute("stroke-width", "1.6"); o.df.setAttribute("stroke", F.neon); o.df.setAttribute("stroke-width", "1.4"); o.bd.setAttribute("fill-opacity", ".82"); }
    if (F.ghost) o.bd.setAttribute("fill-opacity", ".88");
    var big = F.cute ? 5.6 : 3.8;
    o.ey.innerHTML = '<circle r="' + big + '" fill="#fff"/><circle cx="' + f1(big * .22) + '" r="' + f1(big * .52) + '" fill="' + F.eye + '"/>' + (F.cute ? '<circle cx="2" cy="-1.6" r="1.5" fill="#fff"/><ellipse cx="-6" cy="' + f1(big + 3) + '" rx="4" ry="2.4" fill="#ff7aa8" opacity=".55"/>' : '<circle cx="1.6" cy="-1" r=".9" fill="#fff"/>');
    if (F.real) {
      o.ey.innerHTML = '<circle r="4.6" fill="#1a1208"/><circle r="3.9" fill="#e6c25a"/><circle cx=".5" r="2.3" fill="#0a0a0a"/><circle cx="1.4" cy="-1.2" r=".95" fill="#fff"/>';
      ["tl", "df", "pf"].forEach(function (q) { o[q].setAttribute("stroke", "rgba(60,30,0,.45)"); o[q].setAttribute("stroke-width", ".8"); });
    }
    if (F.patch) { o.b1.setAttribute("fill", F.patch); o.b1.setAttribute("opacity", ".9"); o.b2.setAttribute("fill", F.patch2); o.b2.setAttribute("opacity", ".75"); }
    if (F.spots) { o.b1.setAttribute("fill", F.spots); o.b1.setAttribute("opacity", ".7"); }
    if (F.shape === "poly") { o.b1.setAttribute("fill", "#000"); o.b1.setAttribute("opacity", ".2"); o.b2.setAttribute("fill", "#fff"); o.b2.setAttribute("opacity", ".22"); }
    if (F.stripe) { o.b1.setAttribute("fill", F.stripe); o.b1.setAttribute("opacity", ".6"); }
    if (F.sheen) { o.b1.setAttribute("fill", "#fff"); o.b1.setAttribute("opacity", ".35"); }
    return o;
  }

  function drawFish(o, a, tailAng, jump) {
    var F = o.F, Fs = TH.fish, sharp = Fs.shape === "poly", n = sharp ? 6 : 13;
    F.A = jump ? 12 : 8 + Math.sin(o.em) * 2; F.w = jump ? 16 : 7.5;
    var bdd = band(F, 0, 1, 1, "full", sharp); o.bd.setAttribute("d", bdd); o.sc.setAttribute("d", bdd); o.sc.setAttribute("opacity", Fs.real ? ".6" : "0");
    if (Fs.shape === "poly") { o.b1.setAttribute("d", band(F, 0, 1, 1, "lower", true)); o.b2.setAttribute("d", band(F, 0, .5, 1, "upper", true)); }
    else if (Fs.patch) { o.b1.setAttribute("d", band(F, .22, .5, .72, "full")); o.b2.setAttribute("d", band(F, .62, .82, .6, "full")); }
    else if (Fs.spots) { o.b1.setAttribute("d", band(F, .3, .38, .5, "full") + band(F, .5, .58, .45, "full") + band(F, .68, .74, .38, "full")); }
    else if (Fs.sheen) { o.b1.setAttribute("d", band(F, .05, .6, .38, "upper")); }
    else if (Fs.stripe) { o.b1.setAttribute("d", band(F, .12, .92, .2, "full")); }
    // পিঠের পাখনা
    var s1 = .26, s2 = .6, sm = .42, y1 = spineY(s1, F) - half(s1, F.H), y2 = spineY(s2, F) - half(s2, F.H), ym = spineY(sm, F) - half(sm, F.H);
    var hf = F.H * (Fs.shape === "koi" ? .8 : 1.05) * (1 + .18 * Math.sin(F.t * 5 + F.ph));
    o.df.setAttribute("d", "M" + f1(50 - 90 * s1) + "," + f1(y1) + " Q" + f1(50 - 90 * sm) + "," + f1(ym - hf * 2) + " " + f1(50 - 90 * s2) + "," + f1(y2) + "Z");
    // ল্যাজ
    var ty = spineY(1, F), tyb = spineY(.88, F), slope = Math.atan2(ty - tyb, -10.8) * 57.3 + 180;
    var wag = Math.sin(F.w * F.t - 3.4 - .7 + F.ph) * (jump ? 22 : 15);
    o.tl.setAttribute("transform", "translate(-40 " + f1(ty) + ") rotate(" + f1(wag - (slope > 180 ? slope - 360 : slope) * 0 + (ty - tyb) * 1.4) + ")");
    // বুকের পাখনা (ঝাপটায়)
    var py = spineY(.3, F) + F.H * .3;
    o.pf.setAttribute("transform", "translate(" + f1(50 - 90 * .3) + " " + f1(py) + ") rotate(" + f1(18 + Math.sin(F.t * 6 + F.ph) * 16) + ")");
    // চোখ ও আভা
    var ex = 50 - 90 * .13, ey = spineY(.13, F) - F.H * .16;
    o.ey.setAttribute("transform", "translate(" + f1(ex) + " " + f1(ey) + ")");
    o.gs.setAttribute("d", band(F, .12, .55, .3, "upper").replace(/Z$/, "Z"));
    if (Fs.real) {
      o.bl.setAttribute("d", band(F, .1, .92, .5, "lower")); o.bl.setAttribute("opacity", ".34");
      var gx = 50 - 90 * .2, gy0 = spineY(.2, F);
      o.gl.setAttribute("d", "M" + f1(gx) + "," + f1(gy0 - F.H * .6) + " Q" + f1(gx - 6) + "," + f1(gy0) + " " + f1(gx) + "," + f1(gy0 + F.H * .62));
      var lp = "", li, ls; for (li = 0; li <= 8; li++) { ls = .24 + .62 * li / 8; lp += (li ? "L" : "M") + f1(50 - 90 * ls) + "," + f1(spineY(ls, F) - F.H * .05); }
      o.ln.setAttribute("d", lp);
      if (Fs.tail === "fork") { o.tr.setAttribute("d", "M0,0 L-30,-19 M0,0 L-31,-10 M0,0 L-32,0 M0,0 L-31,10 M0,0 L-30,19"); o.tr.setAttribute("transform", o.tl.getAttribute("transform")); }
    }
    if (Fs.hue) {
      var h = o.hue0 + T * 40; o.stA.setAttribute("stop-color", hsl(h, 90, 78)); o.stB.setAttribute("stop-color", hsl(h + 70, 85, 62));
      o.tl.setAttribute("fill", hsl(h + 140, 90, 72)); o.df.setAttribute("fill", hsl(h + 140, 90, 72)); o.pf.setAttribute("fill", hsl(h + 140, 90, 72));
    }
  }

  // ====================== পাখির গঠন (পাশ থেকে, নাক +x) ======================
  function buildBird(parent, p) {
    var B = TH.bird, c = B.c, c2 = B.c2;
    var neon = B.neon, st = neon ? ' stroke="' + neon + '" stroke-width="1.3"' : "";
    var glow = '<circle class="gw" r="26" fill="url(#b12gl)" opacity="' + (neon || B.glowc ? ".6" : "0") + '"/>';
    var html = glow;
    if (B.shape === "real") html += realBird(B, c, c2);
    else if (B.shape === "swallow") html += '<path class="wf" fill="' + c2 + '"' + st + '/><path d="M-9,0 L-22,-4 L-17,0 L-22,4 Z" fill="' + c2 + '"' + st + '/><ellipse rx="11" ry="3.8" fill="' + c + '"' + st + '/><circle cx="11" cy="-1.6" r="3.5" fill="' + c + '"' + st + '/><path d="M14,-2.4 L20,-.9 L14,.1 Z" fill="' + B.beak + '"/><circle cx="12.4" cy="-2.3" r=".9" fill="#10201c"/><path class="wn" fill="' + c + '"' + st + '/>';
    else if (B.shape === "king") html += '<path class="wf" fill="' + c2 + '"/><path d="M-8,0 L-17,-1 L-15,2.5 Z" fill="' + c2 + '"/><ellipse rx="9" ry="6" fill="' + B.belly + '"/><ellipse cx="-1" cy="-2" rx="8" ry="3.6" fill="' + c + '"/><circle cx="8" cy="-3" r="5" fill="' + c + '"/><path d="M5,-1 Q8,2 11,-1 Z" fill="#fff" opacity=".8"/><path d="M12,-3.6 L24,-2.6 L12,-1.4 Z" fill="' + B.beak + '"/><circle cx="9.6" cy="-4" r="1" fill="#10201c"/><path class="wn" fill="' + c + '" stroke="' + c2 + '" stroke-width=".8"/>';
    else if (B.shape === "doel") html += '<path class="wf" fill="' + c + '"/><path d="M-9,-1 L-27,-7 L-26,-3 L-9,2 Z" fill="' + c + '"/><ellipse rx="10.5" ry="5.5" fill="' + c2 + '"/><path d="M-10,-1 Q0,-7.5 10,-3 Q4,1 -10,1 Z" fill="' + c + '"/><circle cx="10" cy="-3.4" r="4.4" fill="' + c + '"/><path d="M13.5,-3.4 L18,-2.6 L13.5,-1.8 Z" fill="' + B.beak + '"/><circle cx="11" cy="-4.4" r=".9" fill="#fff"/><path class="wn" fill="' + c + '" stroke="' + c2 + '" stroke-width="1"/>';
    else if (B.shape === "eagle") html += '<path class="wf" fill="' + c2 + '"/><path d="M-9,-1 L-21,-3 L-21,3 L-9,2 Z" fill="#f4f4f4"/><ellipse rx="12" ry="5.2" fill="' + c + '"/><circle cx="12" cy="-2.6" r="4.4" fill="#fff"/><path d="M15,-3.4 Q22,-3.6 20.5,0.4 Q18,-.4 15,-1 Z" fill="' + B.beak + '"/><circle cx="13.4" cy="-3.4" r="1" fill="#2b1a10"/><path class="wn" fill="' + c + '" stroke="' + c2 + '" stroke-width=".8"/>';
    else if (B.shape === "puff") html += '<path class="wf" fill="' + c2 + '"/><ellipse rx="10" ry="8" fill="' + c + '"/><circle cx="7.5" cy="-4" r="5.4" fill="' + c + '"/><path d="M12,-4.6 L17,-3.4 L12,-2.4 Z" fill="' + B.beak + '"/><circle cx="9.4" cy="-4.8" r="' + (B.cute ? "1.6" : "1.1") + '" fill="#2b1a10"/>' + (B.cute ? '<ellipse cx="6" cy="-1.6" rx="2.2" ry="1.3" fill="#ff8fa8" opacity=".6"/>' : "") + '<path d="M-9,0 L-17,-2 L-15,1 L-17,4 Z" fill="' + c2 + '"/><path class="wn" fill="' + c + '" stroke="' + c2 + '" stroke-width=".8"/>';
    else html += '<path class="wf" fill="' + c2 + '"/><path d="M-9,1 L-24,3 M-9,2 L-24,6" stroke="' + c2 + '" stroke-width="1.2" fill="none"/><ellipse rx="11" ry="3" fill="' + c + '"/><path d="M8,-1 Q13,-7 17,-6" stroke="' + c + '" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="18" cy="-6.4" r="2.3" fill="' + c + '"/><path d="M19.8,-6.6 L26,-5.8 L19.8,-5.6 Z" fill="' + B.beak + '"/><path class="wn" fill="' + c + '" stroke="' + c2 + '" stroke-width=".8"/>';
    var g = G(parent, html + '<g class="lg" opacity="0"><path d="M1,3 L-5.4,10.7 M4.5,2.5 L-1.9,10.2" stroke="#3a2a1c" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M-5.4,10.7 l-1.8,.6 M-5.4,10.7 l.4,1.3 M-1.9,10.2 l-1.8,.6 M-1.9,10.2 l.4,1.3" stroke="#3a2a1c" stroke-width=".7" fill="none"/></g>');
    return { g: g, lg: g.querySelector(".lg"), wf: g.querySelector(".wf"), wn: g.querySelector(".wn"), ph: rnd(0, 6), fr: rnd(8, 11), ox: 0, oy: 0 };
  }
  function wingPath(p, x0, amp, wide) {
    if (TH.bird.shape === "real") return wingReal(p, amp);
    var tipY = -2 - amp * p, tipX = -11 - 3 * p, c1y = tipY * .45 - 5 * wide;
    if (TH.bird.poly) return "M4,-2 L" + f1(-4) + "," + f1(c1y) + " L" + f1(tipX) + "," + f1(tipY) + " L-3,1.5 Z";
    return "M4,-2 Q-4," + f1(c1y) + " " + f1(tipX) + "," + f1(tipY) + " Q-3," + f1(tipY * .3 + 1) + " -4,1.5 Z";
  }

  // ====================== বাবল ======================
  function mkBub(parent, r, lines) {
    r *= CFG.bsize;
    var B = TH.bub, o = document.createElementNS(NS, "g");
    var fill = B.iri ? "url(#b12iri)" : B.f;
    var s = '<circle r="' + r + '" fill="' + fill + '" stroke="' + B.s + '" stroke-width="' + (B.paper ? 1.6 : 1.1) + '" stroke-opacity=".9"/>';
    s += '<ellipse cx="' + f1(-r * .38) + '" cy="' + f1(-r * .42) + '" rx="' + f1(r * .26) + '" ry="' + f1(r * .13) + '" fill="#fff" opacity=".8" transform="rotate(-35 ' + f1(-r * .38) + ' ' + f1(-r * .42) + ')"/>';
    s += '<path d="M' + f1(r * .55) + ',' + f1(r * .45) + ' A' + f1(r * .72) + ',' + f1(r * .72) + ' 0 0 1 ' + f1(-r * .1) + ',' + f1(r * .72) + '" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="' + f1(Math.max(.8, r * .06)) + '" stroke-linecap="round"/>';
    if (B.paper) s += '<path d="M' + f1(-r * .7) + ',' + f1(r * .2) + ' L' + f1(r * .7) + ',' + f1(-r * .2) + '" stroke="' + B.s + '" stroke-opacity=".55" stroke-width=".8"/>';
    var tx = "";
    if (lines) for (var i = 0; i < lines.length; i++) { var L = lines[i]; tx += '<text y="' + f1(r * L.y) + '" text-anchor="middle" font-size="' + f1(r * L.f * CFG.tsize) + '" font-weight="800" font-family="system-ui,Arial,sans-serif" fill="' + B.tx + '" stroke="rgba(0,25,35,.55)" stroke-width="' + f1(Math.max(.5, r * L.f * .1)) + '" paint-order="stroke" stroke-linejoin="round">' + L.t + '</text>'; }
    o.innerHTML = s + (tx ? '<g class="bt">' + tx + '</g>' : "");
    parent.appendChild(o);
    return { g: o, bt: o.querySelector(".bt"), r: r, x: 0, y: 0, ph: rnd(0, 6), init: false, tOn: true };
  }
  var ex = function (t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
  var T1 = function (t) { t = String(t); return t ? [{ t: ex(t), y: .27, f: Math.min(.8, 2.8 / t.length) }] : null; };
  var wc = 0, wd = function (n) { var a = String(CFG.words).split(",").map(function (x) { return x.trim(); }).filter(Boolean); return a.length ? a[n % a.length] : ""; };
  var T2 = function () { return [{ t: ex(CFG.t2a), y: -.04, f: .46 }, { t: ex(CFG.t2b), y: .34, f: .205 }]; };

  function follow(b, tx, ty, dt, sx, sy) {
    if (!b.init) { b.x = tx; b.y = ty; b.init = true; }
    var q = Math.min(1, dt * 3.2); b.x += (tx - b.x) * q; b.y += (ty - b.y) * q;
    var wob = Math.sin(T * 3 + b.ph) * .07;
    b.g.setAttribute("transform", "translate(" + f1(b.x) + " " + f1(b.y) + ") scale(" + f1((1 + wob) * sx) + " " + f1((1 - wob) * (sy || sx)) + ")");
    b.g.setAttribute("opacity", CFG.bubbles ? 1 : 0);
    if (b.bt) { var on = CFG.text; if (on !== b.tOn) { b.tOn = on; b.bt.setAttribute("display", on ? "inline" : "none"); } }
  }

  // ====================== গাড়ি ======================
  function carSVG(col, front) {
    var C = TH.car, neon = C.neon, rr = C.cute ? 20 : (C.rr || 7), st = neon ? ' stroke="' + neon + '" stroke-width="2.2"' : "";
    var cab = C.cute ? '<path d="M-56,-60 Q-54,-102 0,-102 Q54,-102 56,-60 Z" fill="' + col + '"' + st + '/><path d="M-56,-60 Q-54,-102 0,-102 Q54,-102 56,-60 Z" fill="#000" opacity=".12"/><path d="M-46,-64 Q-45,-94 0,-94 Q45,-94 46,-64 Z" fill="url(#b12win)"/>'
      : '<path d="M-58,-60 L-47,-94 L47,-94 L58,-60 Z" fill="' + col + '"' + st + '/><path d="M-58,-60 L-47,-94 L47,-94 L58,-60 Z" fill="#000" opacity=".2"/><path d="M-49,-63 L-41,-89 L41,-89 L49,-63 Z" fill="url(#b12win)"/>';
    var s = '<ellipse cx="0" cy="-1" rx="74" ry="6" fill="#000" opacity=".5"/>';
    if (front) s += '<ellipse cx="0" cy="30" rx="86" ry="22" fill="url(#b12bm)"/>'; else s += '<ellipse cx="0" cy="-3" rx="84" ry="8" fill="url(#b12tl)" opacity=".5"/>';
    s += '<rect x="-68" y="-15" width="17" height="15" rx="3" fill="#0b0f10"/><rect x="51" y="-15" width="17" height="15" rx="3" fill="#0b0f10"/>' + cab;
    s += '<rect x="-75" y="-62" width="150" height="50" rx="' + rr + '" fill="' + col + '"' + st + '/><rect x="-75" y="-62" width="150" height="50" rx="' + rr + '" fill="#000" opacity=".15"/><rect x="-68" y="-58" width="136" height="5" rx="2.5" fill="#fff" opacity=".2"/>';
    if (C.poly) s += '<path d="M-75,-62 L0,-37 L75,-62 L75,-12 L0,-37 L-75,-12 Z" fill="#fff" opacity=".1"/>';
    s += '<rect x="-75" y="-20" width="150" height="8" rx="3" fill="#1a1f21"' + (neon ? ' stroke="' + neon + '" stroke-width="1"' : "") + '/>';
    if (front) s += '<rect x="-26" y="-48" width="52" height="16" rx="4" fill="#0e1417"/><path d="M-20,-44 H20 M-20,-40 H20 M-20,-36 H20" stroke="#3c4a50" stroke-width="1.4"/><circle cx="-52" cy="-44" r="21" fill="url(#b12hl)"/><circle cx="52" cy="-44" r="21" fill="url(#b12hl)"/><circle cx="-52" cy="-44" r="9" fill="' + C.head + '"/><circle cx="52" cy="-44" r="9" fill="' + C.head + '"/>';
    else s += '<rect x="-72" y="-54" width="18" height="9" rx="2" fill="' + C.tail + '"/><rect x="54" y="-54" width="18" height="9" rx="2" fill="' + C.tail + '"/><circle cx="-63" cy="-50" r="17" fill="url(#b12tl)"/><circle cx="63" cy="-50" r="17" fill="url(#b12tl)"/>';
    s += '<rect x="-15" y="-34" width="30" height="12" rx="2" fill="#f4efd6"/><text x="0" y="-25" text-anchor="middle" font-size="8.5" font-weight="800" font-family="system-ui,Arial,sans-serif" fill="#0f3d28">M.C</text>';
    return s;
  }

  
  function vSVG(type, col, front) {
    if (type === "car") return carSVG(col, front);
    var C = TH.car, w = "url(#b12win)", s = '<ellipse cx="0" cy="-1" rx="' + (type === "bike" ? 34 : 82) + '" ry="6" fill="#000" opacity=".5"/>', L = function (x, y, r) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#b12hl)"/><circle cx="' + x + '" cy="' + y + '" r="' + r * .43 + '" fill="' + C.head + '"/>'; };
    var T = function (x, y, ww, h) { return '<rect x="' + x + '" y="' + y + '" width="' + ww + '" height="' + h + '" rx="2" fill="' + C.tail + '"/><circle cx="' + (x + ww / 2) + '" cy="' + (y + h / 2) + '" r="14" fill="url(#b12tl)"/>'; };
    if (front) s += '<ellipse cx="0" cy="30" rx="86" ry="22" fill="url(#b12bm)"/>';
    if (type === "truck") {
      s += '<rect x="-72" y="-17" width="18" height="17" rx="3" fill="#0b0f10"/><rect x="54" y="-17" width="18" height="17" rx="3" fill="#0b0f10"/>';
      if (front) s += '<rect x="-74" y="-140" width="148" height="68" rx="4" fill="#e9edef"/><rect x="-74" y="-110" width="148" height="9" fill="' + col + '"/><rect x="-62" y="-86" width="124" height="74" rx="9" fill="' + col + '"/><rect x="-62" y="-86" width="124" height="74" rx="9" fill="#000" opacity=".15"/><rect x="-50" y="-78" width="100" height="30" rx="5" fill="' + w + '"/><rect x="-30" y="-40" width="60" height="18" rx="3" fill="#0e1417"/><path d="M-24,-36 H24 M-24,-31 H24" stroke="#3c4a50" stroke-width="1.4"/>' + L(-48, -28, 18) + L(48, -28, 18) + '<rect x="-68" y="-14" width="136" height="9" rx="3" fill="#222"/>';
      else s += '<rect x="-74" y="-138" width="148" height="122" rx="4" fill="#e9edef"/><rect x="-74" y="-138" width="148" height="122" rx="4" fill="#000" opacity=".1"/><path d="M0,-138 V-16" stroke="#9aa5ab" stroke-width="2"/><rect x="-74" y="-100" width="148" height="12" fill="' + col + '"/>' + T(-72, -48, 16, 12) + T(56, -48, 16, 12) + '<rect x="-70" y="-14" width="140" height="9" rx="3" fill="#222"/>';
    } else if (type === "bus") {
      s += '<rect x="-68" y="-17" width="18" height="17" rx="3" fill="#0b0f10"/><rect x="50" y="-17" width="18" height="17" rx="3" fill="#0b0f10"/><rect x="-72" y="-128" width="144" height="116" rx="12" fill="' + col + '"/><rect x="-72" y="-128" width="144" height="116" rx="12" fill="#000" opacity=".12"/>';
      if (front) s += '<rect x="-60" y="-116" width="120" height="48" rx="6" fill="' + w + '"/><rect x="-38" y="-122" width="76" height="12" rx="3" fill="#f4efd6"/><text x="0" y="-112.5" text-anchor="middle" font-size="9" font-weight="800" font-family="system-ui,Arial,sans-serif" fill="#0f3d28">M.C ADDA</text>' + L(-50, -42, 16) + L(50, -42, 16) + '<rect x="-24" y="-36" width="48" height="14" rx="3" fill="#0e1417"/>';
      else s += '<rect x="-56" y="-112" width="112" height="34" rx="5" fill="' + w + '"/><rect x="-30" y="-70" width="60" height="9" rx="2" fill="#f4efd6"/>' + T(-68, -44, 16, 12) + T(52, -44, 16, 12);
    } else {
      s += '<rect x="-5" y="-38" width="10" height="38" rx="5" fill="#111"/><rect x="-28" y="-76" width="56" height="6" rx="3" fill="#222"/><ellipse cx="0" cy="-52" rx="14" ry="16" fill="' + col + '"/><rect x="-17" y="-118" width="34" height="50" rx="14" fill="#233a4a"/><rect x="-26" y="-108" width="10" height="34" rx="5" fill="#233a4a"/><rect x="16" y="-108" width="10" height="34" rx="5" fill="#233a4a"/><circle cx="0" cy="-130" r="14" fill="' + col + '"/>';
      s += front ? L(0, -62, 11) + '<path d="M-10,-132 H10 V-124 H-10 Z" fill="#10181c" opacity=".8"/>' : T(-6, -62, 12, 8);
    }
    return s;
  }
  var VT = ["car", "car", "car", "truck", "truck", "bike", "bike", "bike", "bus"], vPick = function () { return VT[Math.floor(Math.random() * VT.length)]; };

  // ====================== দৃশ্য গড়া ======================
  var FZ = [{ x0: 290, x1: 520, y: 358, L: 52 }, { x0: 330, x1: 540, y: 392, L: 72 }, { x0: 605, x1: 690, y: 350, L: 40 }, { x0: 945, x1: 1060, y: 362, L: 34 }, { x0: 310, x1: 440, y: 436, L: 80 }, { x0: 600, x1: 715, y: 396, L: 46 }];

  function defs() {
    var Fs = TH.fish, i, s = '<defs>';
    s += '<linearGradient id="b12win" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#27414b"/><stop offset="1" stop-color="#0f1c22"/></linearGradient>';
    s += '<radialGradient id="b12tl"><stop offset="0" stop-color="' + TH.car.tail + '" stop-opacity=".9"/><stop offset="1" stop-color="' + TH.car.tail + '" stop-opacity="0"/></radialGradient>';
    s += '<radialGradient id="b12hl"><stop offset="0" stop-color="' + TH.car.head + '" stop-opacity=".95"/><stop offset=".45" stop-color="' + TH.car.head + '" stop-opacity=".35"/><stop offset="1" stop-color="' + TH.car.head + '" stop-opacity="0"/></radialGradient>';
    s += '<radialGradient id="b12bm"><stop offset="0" stop-color="' + TH.car.head + '" stop-opacity=".42"/><stop offset="1" stop-color="' + TH.car.head + '" stop-opacity="0"/></radialGradient>';
    s += '<pattern id="b12sc" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0,4 Q2,0 4,4 Q6,0 8,4 M-4,8 Q-2,4 0,8 Q2,4 4,8 Q6,4 8,8 Q10,4 12,8" fill="none" stroke="#000" stroke-opacity=".3" stroke-width=".7"/></pattern>';
    s += '<radialGradient id="b12gl"><stop offset="0" stop-color="' + TH.glow + '" stop-opacity=".75"/><stop offset="1" stop-color="' + TH.glow + '" stop-opacity="0"/></radialGradient>';
    s += '<radialGradient id="b12fire"><stop offset="0" stop-color="' + (TH.fxc || "#fff") + '" stop-opacity="1"/><stop offset=".35" stop-color="' + (TH.fxc || "#fff") + '" stop-opacity=".45"/><stop offset="1" stop-color="' + (TH.fxc || "#fff") + '" stop-opacity="0"/></radialGradient>';
    s += '<radialGradient id="b12iri" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffffff" stop-opacity=".28"/><stop offset=".45" stop-color="#7fe0ff" stop-opacity=".16"/><stop offset=".75" stop-color="#ff9be0" stop-opacity=".2"/><stop offset="1" stop-color="#ffe98a" stop-opacity=".26"/></radialGradient>';
    for (i = 0; i < 8; i++) s += '<linearGradient id="b12f' + i + '" x1="0" y1="0" x2="0" y2="1"><stop class="sa" offset="0" stop-color="' + Fs.c1 + '"/><stop class="sb" offset="1" stop-color="' + Fs.c2 + '"/></linearGradient>';
    return s + '</defs>';
  }

  function build() {
    TH = DES[cl(CFG.design, 1, DES.length) - 1];
    svg.innerHTML = defs();
    var gRip = G(svg), gRise = G(svg), gFish = G(svg), gDrop = G(svg), gFx = G(svg), gCar = G(svg), gBr = G(svg), gSky = G(svg), gBub = G(svg);
    W = { ripples: [], drops: [], rise: [], fish: [], cars: [], flocks: [], fx: [], bub: gBub, rt: 0, gf: gFish, gs: gSky };
    var i, j; wc = 0;
    for (i = 0; i < 12; i++) { var e = document.createElementNS(NS, "ellipse"); e.setAttribute("fill", "none"); e.setAttribute("stroke", "#d6fff0"); e.setAttribute("stroke-width", "1.4"); e.setAttribute("opacity", "0"); gRip.appendChild(e); W.ripples.push({ e: e, t: 9, x: 0, y: 0, k: 1 }); }
    for (i = 0; i < 20; i++) { var c = document.createElementNS(NS, "circle"); c.setAttribute("r", "1.9"); c.setAttribute("fill", "#e8fff7"); c.setAttribute("opacity", "0"); gDrop.appendChild(c); W.drops.push({ e: c, life: 0, x: 0, y: 0, vx: 0, vy: 0 }); }
    for (i = 0; i < 12; i++) { var q = document.createElementNS(NS, "circle"); q.setAttribute("fill", "none"); q.setAttribute("stroke", TH.bub.s); q.setAttribute("stroke-width", "1"); q.setAttribute("opacity", "0"); gRise.appendChild(q); W.rise.push({ e: q, life: 0, x: 0, y: 0, r: 2, ph: 0 }); }
    branch(gBr);
    // মাছ
    for (i = 0; i < Math.min(CFG.fish, FZ.length); i++) {
      var f = buildFish(gFish, FZ[i], i);
      f.stA = svg.querySelector("#" + f.id + " .sa"); f.stB = svg.querySelector("#" + f.id + " .sb");
      var rb = 6.5 + 9 * f.k;
      f.word = wd(i); f.bb1 = mkBub(gBub, rb, T1(f.word)); f.bb2 = mkBub(gBub, rb * .42, null); f.bb3 = mkBub(gBub, rb * .3, null); f.bb3.ph += 2;
      f.oa = rnd(0, 6);
      W.fish.push(f);
    }
    // গাড়ি (ছোট থেকে শুরু; বাবল পিছনে ভাসে)
    for (i = 0; i < CFG.cars; i++) {
      var front = CFG.dir === "toward", col = TH.car.b[i % TH.car.b.length];
      var vt = vPick(), g = G(gCar, vSVG(vt, col, front)); g.setAttribute("opacity", "0");
      var car = { g: g, front: front, z: front ? (i === 0 ? 3.2 : 40) : (i === 0 ? 1.7 : .5), wait: i * 3, vt: vt, bub: [], k: .27 + Math.random() * .03, bob: rnd(0, 6) };
      car.bub.push({ b: mkBub(gBub, 7, null), lag: .22, ph: 0.5 }, { b: mkBub(gBub, 10, null), lag: .5, ph: 2 }, { b: mkBub(gBub, 14, null), lag: .85, ph: 4 }, { b: mkBub(gBub, 31, T2()), lag: 1.4, ph: 1 });
      car.zmin = front ? .96 : .96; car.zmax = 29;
      if (!front) car.z = i === 0 ? 1.7 : .93;
      W.cars.push(car);
    }
    // পাখি
    var fl = [{ n: Math.ceil(CFG.birds * .6), dir: 1, y: 92, sp: 52, x: 160, wait: 0 }, { n: Math.floor(CFG.birds * .4), dir: -1, y: 168, sp: 44, x: 1000, wait: 5 }];
    fl.forEach(function (f0) {
      if (f0.n < 1) return;
      var fo = { dir: f0.dir, y: f0.y, sp: f0.sp, x: f0.x, wait: f0.wait, birds: [] };
      for (j = 0; j < f0.n; j++) {
        var b = buildBird(gSky), side = j === 0 ? 0 : (j % 2 ? -1 : 1), row = Math.ceil(j / 2);
        b.ox = -58 * row; b.oy = side * 24 * row; b.word = wd(wc++ + 3); b.bub = mkBub(gBub, 8.5, T1(b.word)); b.oa = rnd(0, 6);
        if (TH.bird.hue) { b.hue = rnd(0, 360); }
        fo.birds.push(b);
      }
      W.flocks.push(fo);
    });
    // বিশেষ প্রভাব (পাপড়ি/তুষার/জোনাকি/ঝিলিক/হৃদয়)
    if (TH.fx) {
      var N = TH.fx === "fire" ? 16 : 14;
      for (i = 0; i < N; i++) {
        var e2 = document.createElementNS(NS, TH.fx === "snow" || TH.fx === "fire" ? "circle" : "path"), fc = TH.fxc || "#fff";
        if (TH.fx === "petal") { e2.setAttribute("d", "M0,0 Q5,-6 11,0 Q5,6 0,0Z"); e2.setAttribute("fill", fc); e2.setAttribute("opacity", ".85"); }
        else if (TH.fx === "snow") { e2.setAttribute("r", f1(rnd(1.1, 2.3))); e2.setAttribute("fill", "#fff"); }
        else if (TH.fx === "fire") { e2.setAttribute("r", "7"); e2.setAttribute("fill", "url(#b12fire)"); }
        else if (TH.fx === "heart") { e2.setAttribute("d", "M0,3.5 C-7,-2 -3.5,-7 0,-3.5 C3.5,-7 7,-2 0,3.5Z"); e2.setAttribute("fill", fc); }
        else { e2.setAttribute("d", "M0,-6 L1.4,-1.4 L6,0 L1.4,1.4 L0,6 L-1.4,1.4 L-6,0 L-1.4,-1.4Z"); e2.setAttribute("fill", fc); }
        gFx.appendChild(e2);
        W.fx.push({ e: e2, x: rnd(0, IW), y: rnd(20, IH), vx: rnd(-8, 14), vy: rnd(10, 28), ph: rnd(0, 6), life: rnd(0, 4), sc: rnd(.7, 1.3) });
      }
    }
    layout(); tint();
  }
  function tint() { if (!W.gf) return; var v = CFG.hue ? "hue-rotate(" + CFG.hue + "deg)" : ""; W.gf.style.filter = v; W.gs.style.filter = v; }

  function layout() {
    if (!host || !host.parentNode) return;
    var h = host.parentNode, w = h.clientWidth, hh = h.clientHeight; if (!w || !hh) return;
    var s = Math.max(w / IW, hh / IH), sw = IW * s, sh = IH * s;
    svg.style.width = f1(sw) + "px"; svg.style.height = f1(sh) + "px";
    svg.style.left = f1((w - sw) * 0.5) + "px"; svg.style.top = f1((hh - sh) * 0.38) + "px";
  }

  // ====================== চলা ======================
  function ripple(x, y, k) { for (var i = 0; i < W.ripples.length; i++) { var r = W.ripples[i]; if (r.t >= 1.5) { r.t = 0; r.x = x; r.y = y; r.k = k; return; } } }
  function splash(x, y, k, n) { for (var i = 0; i < W.drops.length && n > 0; i++) { var d = W.drops[i]; if (d.life <= 0) { d.life = rnd(.45, .8); d.x = x + rnd(-6, 6) * k; d.y = y; d.vx = rnd(-42, 42); d.vy = -rnd(70, 150); n--; } } }
  function riseBub(x, y, k) { for (var i = 0; i < W.rise.length; i++) { var r = W.rise[i]; if (r.life <= 0) { r.life = rnd(1.4, 2.4); r.x = x; r.y = y; r.r = rnd(1.4, 3) * Math.max(.8, k * 1.6); r.ph = rnd(0, 6); return; } } }

  function updFish(f, dt) {
    f.F.t += dt; f.em += dt * .6; var a = 0, op = .96, k = f.k * CFG.size * FMUL, sw = f.mode === "swim";
    if (sw) {
      f.x += f.dir * f.sp * dt;
      if (f.x > f.x1) { f.x = f.x1; f.dir = -1; } else if (f.x < f.x0) { f.x = f.x0; f.dir = 1; }
      f.nt -= dt; if (f.nt <= 0) { f.nt = rnd(3, 8); f.sp = rnd(10, 30); if (Math.random() < .3) f.dir = -f.dir; }
      f.y = f.by + Math.sin(f.F.t * 1.7 + f.F.ph) * 2.6; a = Math.sin(f.F.t * 2.4 + f.F.ph) * 5;
      f.nj -= dt; f.rb = (f.rb || 0) - dt; if (f.rb <= 0) { f.rb = rnd(.9, 2.4); riseBub(f.x + f.dir * 30 * k, f.y - 4, k); }
      if (f.nj <= 0) { f.mode = "jump"; f.vx = f.dir * rnd(55, 95); f.vy = -(f.big ? rnd(330, 390) : rnd(230, 295)); f.big = false; f.y = f.by; ripple(f.x, f.by, f.k * FMUL); splash(f.x, f.by, f.k * FMUL, 6); }
    }
    if (f.mode === "jump") {
      op = 1; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 520 * dt;
      if (f.x > f.x1 + 25) { f.x = f.x1 + 25; f.vx = -Math.abs(f.vx); f.dir = -1; } else if (f.x < f.x0 - 25) { f.x = f.x0 - 25; f.vx = Math.abs(f.vx); f.dir = 1; }
      a = Math.atan2(f.vy, Math.abs(f.vx)) * 57.3;
      if (f.vy > 0 && f.y >= f.by) { f.y = f.by; f.mode = "swim"; f.nj = rnd(2.6, 6.5); f.sp = rnd(14, 26); ripple(f.x, f.by, f.k * FMUL); splash(f.x, f.by, f.k * FMUL, 5); }
    }
    drawFish(f, a, 0, f.mode === "jump");
    f.g.setAttribute("transform", "translate(" + f1(f.x) + " " + f1(f.y) + ") scale(" + (k).toFixed(3) + ")");
    f.g.setAttribute("opacity", op);
    f.body.setAttribute("transform", "scale(" + f.dir + " 1) rotate(" + f1(a) + ")");
    // বাবল: মাছের সাথে ঘোরে
    f.oa += dt * (f.mode === "jump" ? 3.2 : 1.3);
    var rb = 6.5 + 9 * f.k, S = CFG.size, ca = Math.cos(f.oa), sa = Math.sin(f.oa);
    follow(f.bb1, f.x + (f.dir * 20 + ca * 30) * k * 1.0 * (f.k > .5 ? 1 : 1.25), f.y - 16 * k - 10 + sa * 14 * k, dt, S);
    follow(f.bb2, f.x - f.dir * 12 * k + Math.cos(f.oa * 1.4 + 2) * 26 * k, f.y - 22 * k - 6 + Math.sin(f.oa * 1.2 + 1) * 12 * k, dt, S);
    follow(f.bb3, f.x + Math.cos(f.oa * .8 + 4) * 36 * k, f.y - 8 * k - 12 + Math.sin(f.oa * 1.7) * 10 * k, dt, S);
  }

  function updWater(dt) {
    W.ripples.forEach(function (r) {
      if (r.t >= 1.5) return; r.t += dt; var p = r.t / 1.5, rx = (4 + p * 44) * r.k * 1.1 * CFG.size;
      r.e.setAttribute("cx", f1(r.x)); r.e.setAttribute("cy", f1(r.y + 3)); r.e.setAttribute("rx", f1(rx)); r.e.setAttribute("ry", f1(rx * .27)); r.e.setAttribute("opacity", p >= 1 ? 0 : (.75 * (1 - p)).toFixed(2));
    });
    W.drops.forEach(function (d) {
      if (d.life <= 0) return; d.life -= dt; if (d.life <= 0) { d.e.setAttribute("opacity", 0); return; }
      d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 430 * dt;
      d.e.setAttribute("cx", f1(d.x)); d.e.setAttribute("cy", f1(d.y)); d.e.setAttribute("opacity", Math.min(1, d.life * 2.2).toFixed(2));
    });
    W.rise.forEach(function (r) {
      if (r.life <= 0) return; r.life -= dt; if (r.life <= 0 || !CFG.bubbles) { r.life = 0; r.e.setAttribute("opacity", 0); return; }
      r.y -= 16 * dt; r.x += Math.sin(T * 3 + r.ph) * 6 * dt;
      r.e.setAttribute("cx", f1(r.x)); r.e.setAttribute("cy", f1(r.y)); r.e.setAttribute("r", f1(r.r * CFG.size)); r.e.setAttribute("opacity", Math.min(.8, r.life * .8).toFixed(2));
    });
  }

  function updBirds(f, dt) {
    var S = CFG.size;
    if (f.wait > 0) { f.wait -= dt; f.birds.forEach(function (b) { if (b.ind) { indBird(b, dt); return; } b.vis = false; b.g.setAttribute("opacity", 0); b.bub.g.setAttribute("opacity", 0); }); return; }
    f.x += f.dir * f.sp * dt;
    if ((f.dir > 0 && f.x > IW + 200) || (f.dir < 0 && f.x < -200)) { f.wait = rnd(2, 6); f.dir = Math.random() < .5 ? 1 : -1; f.x = f.dir > 0 ? -140 : IW + 140; f.y = rnd(55, 200); f.sp = rnd(40, 66); f.birds.forEach(function (b) { b.hold = false; b.bub.init = false; }); return; }
    f.birds.forEach(function (b) {
      if (b.hold) { b.vis = false; b.g.setAttribute("opacity", 0); b.bub.g.setAttribute("opacity", 0); return; }
      if (b.ind) { indBird(b, dt); return; }
      b.ph += dt * b.fr; var p = Math.sin(b.ph), bx = f.x + b.ox * f.dir, by = f.y + b.oy + Math.sin(T * 1.6 + b.fr) * 3 - p * 1.6;
      b.wn.setAttribute("d", wingPath(p, 0, 15, 1)); b.wf.setAttribute("d", wingPath(Math.sin(b.ph - .7), 0, 12, 1));
      b.g.setAttribute("transform", "translate(" + f1(bx) + " " + f1(by) + ") scale(" + f1(f.dir * 1.05 * S * CFG.bsz * (TH.bird.sc || 1)) + " " + f1(1.05 * S * CFG.bsz * (TH.bird.sc || 1)) + ") rotate(" + f1(-p * 3) + ")");
      b.g.setAttribute("opacity", 1); b.vis = true; b.cx = bx; b.cy = by; b.cdir = f.dir;
      if (b.lg) b.lg.setAttribute("opacity", 0);
      if (TH.bird.hue) { b.hue += dt * 50; var c = hsl(b.hue, 90, 82), c2 = hsl(b.hue + 80, 85, 70); b.wn.setAttribute("fill", c); b.wf.setAttribute("fill", c2); }
      b.oa += dt * 1.6;
      follow(b.bub, bx - f.dir * 4 + Math.cos(b.oa) * 26 * S, by + 22 * S * CFG.bsz + Math.sin(b.oa * 1.3) * 10 * S, dt, S);
    });
  }

  function updCar(c, dt) {
    var d = c.front ? -1 : 1, i, maxLag = c.bub[c.bub.length - 1].lag;
    if (c.wait > 0) { c.wait -= dt; c.g.setAttribute("opacity", 0); c.bub.forEach(function (o) { o.b.g.setAttribute("opacity", 0); o.b.init = false; }); return; }
    c.z *= Math.exp(d * c.k * dt * 1);
    var y = 300 + 345 / c.z;
    var gone = c.front ? (c.z * Math.exp(c.k * maxLag) < c.zmin) : (y < 316 && true);
    if (c.front ? (c.z < c.zmin * Math.exp(-c.k * maxLag)) : (c.z > c.zmax * 1.2)) {
      c.z = c.front ? 29 : .93; c.wait = rnd(.4, 2.6); c.vt = vPick(); c.g.innerHTML = vSVG(c.vt, TH.car.b[Math.floor(Math.random() * TH.car.b.length)], c.front); c.g.setAttribute("opacity", 0); c.bub.forEach(function (o) { o.b.g.setAttribute("opacity", 0); o.b.init = false; }); return;
    }
    var s = carS(y), x = laneX(y), sl = (laneX(y + 3) - laneX(y - 3)) / 6, fade = cl((y - 308) / 18, 0, 1) * cl((690 - y) / 25, 0, 1);
    c.bob += dt * 9;
    c.g.setAttribute("transform", "translate(" + f1(x) + " " + f1(y + Math.sin(c.bob) * .5 * s * 2) + ") scale(" + s.toFixed(3) + ") rotate(" + f1(cl(-sl * 4, -3.5, 3.5)) + ")");
    c.g.setAttribute("opacity", y > 650 ? cl((690 - y) / 40, 0, 1).toFixed(2) : fade.toFixed(2));
    c.bub.forEach(function (o) {
      var zb = c.z * Math.exp(-d * c.k * o.lag), yb = 300 + 345 / zb;
      if (zb > 30 || zb < .9 || yb < 306 || yb > 680) { o.b.g.setAttribute("opacity", 0); o.b.init = false; return; }
      var sb = carS(yb), wob = Math.sin(T * 1.8 + o.ph) * 9 * sb * (1 + o.lag), rise = (Math.sin(T * 1.3 + o.ph * 1.7) * 5 + o.lag * 6) * sb;
      follow(o.b, laneX(yb) + wob, yb - rise - 12 * sb, dt, sb);
      o.b.g.setAttribute("opacity", CFG.bubbles ? (cl((yb - 308) / 16, 0, 1) * cl((690 - yb) / 25, 0, 1) * .95).toFixed(2) : 0);
    });
  }

  function updFx(dt) {
    var t = TH.fx; if (!t) return;
    W.fx.forEach(function (p) {
      if (!CFG.fx) { p.e.setAttribute("opacity", 0); return; }
      var tr;
      p.life += dt;
      if (t === "petal" || t === "snow") {
        p.y += p.vy * dt * (t === "snow" ? .6 : 1); p.x += (p.vx + Math.sin(T * 1.3 + p.ph) * 14) * dt;
        if (p.y > IH + 12 || p.x > IW + 20 || p.x < -20) { p.y = -12; p.x = rnd(0, IW); }
        tr = "translate(" + f1(p.x) + " " + f1(p.y) + ") rotate(" + f1(T * 60 + p.ph * 50) + ") scale(" + f1(p.sc * CFG.size) + " " + f1(p.sc * CFG.size * (.6 + .4 * Math.sin(T * 2 + p.ph))) + ")";
        if (t === "snow") p.e.setAttribute("cx", f1(p.x)), p.e.setAttribute("cy", f1(p.y)); else p.e.setAttribute("transform", tr);
      } else if (t === "fire") {
        p.x += Math.sin(T * .7 + p.ph) * 12 * dt + p.vx * dt * .3; p.y += Math.cos(T * .6 + p.ph * 1.3) * 9 * dt;
        if (p.x < 0) p.x = IW; if (p.x > IW) p.x = 0; p.y = cl(p.y, 320, 610);
        p.e.setAttribute("cx", f1(p.x)); p.e.setAttribute("cy", f1(p.y)); p.e.setAttribute("opacity", (.15 + .85 * Math.max(0, Math.sin(T * 1.6 + p.ph * 3))).toFixed(2));
      } else if (t === "heart") {
        p.y -= 18 * dt; p.x += Math.sin(T * 1.5 + p.ph) * 10 * dt;
        if (p.y < 330) { p.y = rnd(520, 610); p.x = rnd(40, IW - 40); }
        p.e.setAttribute("transform", "translate(" + f1(p.x) + " " + f1(p.y) + ") scale(" + f1(p.sc * CFG.size) + ")"); p.e.setAttribute("opacity", cl((p.y - 330) / 60, 0, .85).toFixed(2));
      } else {
        var ph = (p.life % 3.2) / 3.2, sc = Math.sin(ph * Math.PI);
        if (ph < .02 && !p.re) { p.re = 1; p.x = rnd(30, IW - 30); p.y = rnd(30, 560); } if (ph > .1) p.re = 0;
        p.e.setAttribute("transform", "translate(" + f1(p.x) + " " + f1(p.y) + ") scale(" + f1(sc * p.sc * CFG.size) + ") rotate(" + f1(ph * 90) + ")"); p.e.setAttribute("opacity", (sc * .95).toFixed(2));
      }
    });
  }

  // চ্যাট খোলা থাকলে (হোম ঢাকা) অ্যানিমেশন থামে — টাইপ আটকানো কমাতে; চ্যাট বন্ধ হলে আবার চলে
  var pzT = 0;
  function chatShown() { var e = document.getElementById("acx"); return !!e && e.style.display !== "none"; } // b9: মিনিমাইজে #acx লুকানো থাকে (display:none) — তখন চ্যাট "খোলা" নয়
  function pzResume() { pzT = 0; if (mounted && !raf) { if (chatShown()) { pzT = setTimeout(pzResume, 200); return; } last = 0; raf = requestAnimationFrame(tick); } }
  function tick(ts) {
    if (chatShown()) { raf = 0; if (!pzT) pzT = setTimeout(pzResume, 200); return; }
    var dt = last ? Math.min(.05, (ts - last) / 1000) : .016; last = ts; dt *= CFG.speed; T += dt;
    W.fish.forEach(function (f) { updFish(f, dt); });
    updWater(dt);
    updFx(dt);
    W.flocks.forEach(function (f) { updBirds(f, dt); });
    handTick();
    W.cars.forEach(function (c) { updCar(c, dt); });
    raf = requestAnimationFrame(tick);
  }

  // ====================== চালু/বন্ধ ও কনফিগ ======================
  var st = null;
  function css() {
    if (st) return; st = document.createElement("style");
    st.textContent = "html.bg12 header{position:relative;isolation:isolate}#bg12fx{position:absolute;left:0;top:0;right:0;bottom:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:-1}#bg12fx svg{position:absolute;display:block;max-width:none}";
    document.head.appendChild(st);
  }
  function mount(header, opts) {
    css(); if (host) unmount();
    hdr = header; forced = !!(opts && opts.force);
    if (forced) { header.style.position = "relative"; header.style.isolation = "isolate"; }
    host = document.createElement("div"); host.id = "bg12fx"; host.setAttribute("aria-hidden", "true");
    svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 " + IW + " " + IH); svg.setAttribute("preserveAspectRatio", "none");
    host.appendChild(svg); header.insertBefore(host, header.firstChild);
    build(); mounted = true; bindPtr();
    if (!raf && (forced || !reduce)) { last = 0; raf = requestAnimationFrame(tick); }
  }
  function unmount() {
    unbindPtr();
    if (raf) cancelAnimationFrame(raf); raf = 0; last = 0;
    if (pzT) { clearTimeout(pzT); pzT = 0; }
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null; svg = null; W = {}; mounted = false;
  }
  function set(p) {
    var rebuild = false, k;
    for (k in p) { if (!p.hasOwnProperty(k)) continue; if (k === "bsize" && +p[k] === 3) p[k] = 2; /* part61: পুরোনো ডিফল্ট ৩ → ২ */ if (CFG[k] !== p[k]) { if (k === "design" || /^(words|t1|tb|t2a|t2b|bsize|tsize)$/.test(k) || k === "fish" || k === "birds" || k === "cars" || k === "dir") rebuild = true; CFG[k] = p[k]; } }
    if (rebuild && host) { build(); } else tint();
  }


  // ====================== রিয়েল আবাবিল (পাশ থেকে, নাক +x) ======================
  function realBird(B, c, c2) {
    return '<path class="wf" fill="' + c2 + '"/>' +
      '<path d="M-9,-1 L-31,-6.5 L-25,-.6 L-31,5.4 L-9,2 Z" fill="' + c2 + '"/><path d="M-12,0 L-27,-4.2 M-12,.6 L-27,3.2" stroke="#0b1530" stroke-opacity=".38" stroke-width=".6" fill="none"/>' +
      '<path d="M-10,0 Q-6,-5.6 4,-5.2 Q12,-4.8 14.5,-1.2 Q13.5,3.4 5,5.2 Q-4,6.2 -10,2 Z" fill="' + c + '"/>' +
      '<path d="M-7,2.4 Q2,6.6 12.5,1.8 Q8,5.4 0,5.8 Q-5,5.6 -7,2.4 Z" fill="' + B.belly + '"/>' +
      '<circle cx="11" cy="-2.7" r="4.3" fill="' + c + '"/><ellipse cx="12.2" cy="-.5" rx="3.1" ry="2.2" fill="' + B.throat + '"/>' +
      '<path d="M14.6,-3.1 L19.4,-1.9 L14.8,-.8 Z" fill="' + B.beak + '"/><circle cx="12.4" cy="-3.7" r=".95" fill="#080808"/><circle cx="12.7" cy="-4" r=".3" fill="#fff"/>' +
      '<path class="wn" fill="' + c2 + '" stroke="#0b1530" stroke-opacity=".4" stroke-width=".5"/>';
  }
  function wingReal(p, amp) {
    var ty = -2 - amp * p, tx = -13 - 3 * p, cy = ty * .45 - 6, d = "M4,-2 Q-3," + f1(cy) + " " + f1(tx) + "," + f1(ty), i, u, x, y;
    for (i = 1; i <= 4; i++) { u = i / 5; x = tx + (-3 - tx) * u; y = ty + (1.5 - ty) * u; d += " L" + f1(x - 1.6) + "," + f1(y + 1.9) + " L" + f1(x + .4) + "," + f1(y - .6); }
    return d + " L-3,1.5 Z";
  }

  // ====================== ডাল, ট্যাপ/হাত: M.C জুম, মাছ লাফ, পাখি ডাকে-পালায়-ফেরে-বসে ======================
  var FMUL = 2.25, BR = { a: [1250, 128], b: [1040, 150], c: [820, 172] };
  function bz(t) { var u = 1 - t; return [u * u * BR.a[0] + 2 * u * t * BR.b[0] + t * t * BR.c[0], u * u * BR.a[1] + 2 * u * t * BR.b[1] + t * t * BR.c[1]]; }
  var PERCH = bz(.8);
  function branch(g) {
    var d = "M" + BR.a + " Q" + BR.b + " " + BR.c, lv = "", i, q = [[960, 120], [880, 184], [1100, 100], [1050, 132], [1180, 118]];
    for (i = 0; i < q.length; i++) lv += '<ellipse cx="' + q[i][0] + '" cy="' + q[i][1] + '" rx="15" ry="6" fill="#0d2c1e" opacity=".92" transform="rotate(' + (-30 + i * 25) + ' ' + q[i][0] + ' ' + q[i][1] + ')"/><ellipse cx="' + (q[i][0] + 9) + '" cy="' + (q[i][1] - 7) + '" rx="12" ry="5" fill="#15402b" opacity=".9" transform="rotate(' + (20 + i * 17) + ' ' + (q[i][0] + 9) + ' ' + (q[i][1] - 7) + ')"/>';
    g.innerHTML = '<path d="' + d + '" fill="none" stroke="#150e09" stroke-width="13" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="#4a3520" stroke-width="3.5" stroke-linecap="round" opacity=".55" transform="translate(0,-3.2)"/>' +
      '<path d="M1010,148 Q985,128 960,120 M930,162 Q915,178 880,184 M1130,137 Q1120,112 1100,100 M1075,142 Q1060,132 1050,132 M1215,124 Q1195,118 1180,118" fill="none" stroke="#150e09" stroke-width="5" stroke-linecap="round"/>' + lv;
  }

  // part67: মাছ/পাখির শব্দ — অ্যাডমিন সুইচ + নিজের mp3 (লিংক/পথ, শুরু–শেষ সেকেন্ডে কাটা)। না বাছলে নিচের কৃত্রিম শব্দ।
  var SND = { fo: true, bo: true, ho: true, hs: 3, f: "", b: "", h: "", lib: [] }, SA = {}, lastClip = 0;
  function okSrc(u) { return typeof u === "string" && u.length < 400 && (/^https:\/\/[^\s"'\\()]+$/.test(u) || (/^[\w\-.\/]+\.(mp3|ogg|wav|m4a|aac|webm)$/i.test(u) && u.indexOf("..") < 0 && u[0] !== "/")); }
  function sndSet(o) {
    if (!o || typeof o !== "object") return; var L = [], i, x, s0, e0;
    if (Array.isArray(o.lib)) for (i = 0; i < o.lib.length && L.length < 30; i++) { x = o.lib[i]; if (!x || !okSrc(x.u)) continue; s0 = Math.max(0, Math.min(3600, +x.s || 0)); e0 = Math.max(0, Math.min(7200, +x.e || 0)); if (!(e0 > s0)) e0 = s0 + 2; L.push({ id: String(x.id || i).slice(0, 12), n: String(x.n || "").slice(0, 30), u: x.u, s: s0, e: e0 }); }
    SND = { fo: o.fo !== false, bo: o.bo !== false, ho: o.ho !== false, hs: Math.max(1, Math.min(5, +o.hs || 3)), f: String(o.fid || ""), b: String(o.bid || ""), h: String(o.hid || ""), lib: L }; SA = {};
    ["f", "b", "h"].forEach(function (k) { var it = clipOf(k); if (it) clipAudio(it); });
  }
  function clipOf(k) { var id = k === "f" ? SND.f : k === "h" ? SND.h : SND.b, i; if (!id) return null; for (i = 0; i < SND.lib.length; i++) if (SND.lib[i].id === id) return SND.lib[i]; return null; }
  function clipAudio(it) { var a = SA[it.id]; if (!a || a._u !== it.u) { a = new Audio(); a.preload = "auto"; a._u = it.u; a.src = it.u; SA[it.id] = a; } return a; }
  function playClip(it, onFail, fresh, cap) { // it = {u,s,e}; fresh = অ্যাডমিন প্রিভিউ (ক্যাশ ছাড়া নতুন প্লেয়ার, বন্ধ করার জন্য ফেরত দেয়)
    var a; try {
      a = fresh ? new Audio(it.u) : clipAudio(it); if (fresh) a.preload = "auto"; clearTimeout(a._t); var bad = false;
      var fail = function () { if (!bad) { bad = true; if (onFail) onFail(); } };
      a.onerror = fail;
      var go = function () { try { a.currentTime = it.s; } catch (e) {} var pr = a.play(); if (pr && pr.catch) pr.catch(fail); a._p = true; a._t = setTimeout(function () { a._p = false; a._b = 0; try { a.pause(); } catch (e) {} if (fresh && a._end) a._end(); }, Math.max(100, Math.min(cap ? cap * 1000 : 1e9, (it.e - it.s) * 1000))); };
      if (a.readyState >= 1) go(); else a.addEventListener("loadedmetadata", function h() { a.removeEventListener("loadedmetadata", h); go(); });
    } catch (e) { if (onFail) onFail(); }
    return a;
  }
  try { var sv0 = JSON.parse(localStorage.getItem("bg12snd") || "null"); if (sv0) sndSet(sv0); } catch (e) {}

  // part68: হোমে ঢুকলে প্রতিবার ৩ সেকেন্ডের সকালের পাখির ডাক (অ্যাডমিনে অন/অফ; নিজের mp3 বাছলে সেটার কাটা অংশ)। ব্রাউজার ট্যাপ ছাড়া শব্দ আটকালে প্রথম ট্যাপ/ক্লিকেই বাজে।
  var E3 = 0;
  function chirp3(force, sec) { // sec সেকেন্ড ধরে কিচিরমিচির (১–৩৬০০); লম্বা হলে ৩ সেকেন্ড পরপর কিস্তিতে সাজায়
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
      if (!AC) AC = new C(); if (AC.state === "suspended") AC.resume(); if (AC.state !== "running" && !force) return false;
      sec = Math.max(1, Math.min(5, +sec || 3)); var tok = ++E3, t0 = AC.currentTime + .05, fade = Math.min(1, sec * .3), next = 0;
      var phrase = function (off) {
        var n = 2 + Math.floor(Math.random() * 3), f0 = 2400 + Math.random() * 1800, vol = .09 * Math.min(1, Math.max(.05, (sec - off) / fade)), j, k, o, g;
        for (j = 0; j < n; j++) {
          k = t0 + off + j * .075; o = AC.createOscillator(); g = AC.createGain(); o.type = "sine";
          o.frequency.setValueAtTime(f0 * (1 + j * .06), k); o.frequency.exponentialRampToValueAtTime(f0 * (1.5 + Math.random() * .4), k + .05); o.frequency.exponentialRampToValueAtTime(f0 * .9, k + .08);
          g.gain.setValueAtTime(.0001, k); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), k + .01); g.gain.exponentialRampToValueAtTime(.0001, k + .085);
          o.connect(g); g.connect(AC.destination); o.start(k); o.stop(k + .09);
        }
      };
      var chunk = function () {
        if (tok !== E3) return; var lim = Math.max(0, AC.currentTime - t0) + 6;
        while (next < sec - .3 && next < lim) { phrase(next); next += .19 + Math.random() * .06; }
        if (next < sec - .3) setTimeout(chunk, 3000);
      };
      chunk(); return true;
    } catch (e) { return false; }
  }
  // part91: হোমের ঢোকার শব্দ (কিচিরমিচির/mp3) চ্যাটে ঢুকলে, অন্য পেইজে গেলে বা ট্যাব/অ্যাপ ব্যাকগ্রাউন্ডে গেলে সঙ্গে সঙ্গে থামে (আগে কিছুই থামাত না — লম্বা সময় দেওয়া থাকলে চ্যাটেও বাজতেই থাকত)
  function inChat() { return location.hash === "#anon" || !!document.getElementById("acx"); }
  function stopEntrySnd() { E3++; try { Object.keys(SA).forEach(function (k) { var a = SA[k]; if (a) { clearTimeout(a._t); a._p = false; try { a.pause(); } catch (e) {} } }); } catch (e) {} }
  if (!window.BG12_MANUAL) {
    window.addEventListener("hashchange", function () { if (location.hash !== "" && location.hash !== "#home") stopEntrySnd(); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stopEntrySnd(); });
    window.addEventListener("pagehide", stopEntrySnd);
  }
  var EDONE = false;
  // মালিকের নির্দেশ (part92): ঢোকার শব্দ প্রথম ক্লিক/ট্যাপে শুরু, সর্বোচ্চ ৫ সেকেন্ড, তারপর নিজে অফ; পেইজ লোডে একবারই (হোমে ফিরলেও আর নয়); চ্যাট/অন্য পেইজে গেলে বাজে না। পাখি/মাছে ট্যাপের শব্দ আগের মতোই।
  function entryOnce() {
    if (EDONE || window.BG12_MANUAL) return; EDONE = true; if (!SND.ho || inChat()) return;
    var evs = ["pointerdown", "touchend", "click", "keydown"], h0 = location.hash;
    var h = function () {
      evs.forEach(function (e) { document.removeEventListener(e, h, true); });
      if (inChat() || document.hidden || location.hash !== h0) return;
      var it = clipOf("h"), bad = false;
      if (it) playClip(it, function () { if (!bad) { bad = true; chirp3(true, SND.hs); } }, false, 5); else chirp3(true, SND.hs);
    };
    evs.forEach(function (e) { document.addEventListener(e, h, true); });
  }
  // b9: ক্লিক-শব্দ — প্রতিবার ক্লিকে শুরু থেকে নতুন করে বাজে, কিন্তু প্রথম ক্লিক থেকে মোট ৩ সেকেন্ডের বেশি নয় (৩/১০ বার ক্লিকেও ৩ সেকেন্ডে থামে); থামার পর ক্লিকে নতুন ৩ সেকেন্ড
  var CLICK_MAX = 3;
  function clickClip(it, onFail) {
    var a0 = SA[it.id], nw = Date.now(), b0 = a0 && a0._p && a0._b ? a0._b : nw, rem = CLICK_MAX - (nw - b0) / 1000;
    if (rem < .15) { b0 = nw; rem = CLICK_MAX; }
    var a = playClip(it, onFail, false, rem); a._b = b0;
  }
  function chirp() { if (!SND.bo) return; var it = clipOf("b"); if (it) { var nw = Date.now(); if (nw - lastClip < 250) return; lastClip = nw; clickClip(it, chirp0); return; } chirp0(); }
  function splashSnd() { if (!SND.fo) return; var it = clipOf("f"); if (it) { var nw = Date.now(); if (nw - lastClip < 250) return; lastClip = nw; clickClip(it, splash0); return; } splash0(); }

  var AC = null, lastChirp = 0;
  function chirp0() {
    try {
      var nw = Date.now(); if (nw - lastChirp < 350) return; lastChirp = nw;
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      if (!AC) AC = new C(); if (AC.state === "suspended") AC.resume();
      var t0 = AC.currentTime, n = 3 + Math.floor(Math.random() * 3), i, o, g, t, f0;
      for (i = 0; i < n; i++) {
        t = t0 + i * .12 + Math.random() * .02; f0 = 2700 + Math.random() * 1300; o = AC.createOscillator(); g = AC.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * (1.55 + Math.random() * .4), t + .06); o.frequency.exponentialRampToValueAtTime(f0 * .88, t + .1);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + .11);
        o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .12);
      }
    } catch (e) {}
  }

  // part65: মাছে ট্যাপ করলে পানিতে ঝপাৎ-ছলাৎ শব্দ (ব্রাউজারেই বানানো; দরজার শব্দের সুইচের সাথে সম্পর্ক নেই — সব সময় চালু)
  var lastSplash = 0;
  function splash0() {
    try {
      var nw = Date.now(); if (nw - lastSplash < 300) return; lastSplash = nw;
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      if (!AC) AC = new C(); if (AC.state === "suspended") AC.resume();
      var t = AC.currentTime, len = Math.floor(AC.sampleRate * .35), buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0), i;
      for (i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      var ns = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain();
      ns.buffer = buf; bp.type = "bandpass"; bp.frequency.setValueAtTime(1800, t); bp.frequency.exponentialRampToValueAtTime(500, t + .3); bp.Q.value = .9;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.32, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .34);
      ns.connect(bp); bp.connect(g); g.connect(AC.destination); ns.start(t); ns.stop(t + .36);
      var n = 2 + Math.floor(Math.random() * 2), o, g2, tt, f0;
      for (i = 0; i < n; i++) {
        tt = t + .04 + i * .09 + Math.random() * .03; f0 = 260 + Math.random() * 160; o = AC.createOscillator(); g2 = AC.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(f0, tt); o.frequency.exponentialRampToValueAtTime(f0 * 2.3, tt + .09);
        g2.gain.setValueAtTime(.0001, tt); g2.gain.exponentialRampToValueAtTime(.2, tt + .01); g2.gain.exponentialRampToValueAtTime(.0001, tt + .12);
        o.connect(g2); g2.connect(AC.destination); o.start(tt); o.stop(tt + .13);
      }
    } catch (e) {}
  }

  var zoomN = 0, tapN = 0;
  // part60: ট্যাপে বাবল-লেখা — M.C → ADDA → MASTER’S ক্রমে একেকবার একেকটা; ছোট থেকে বড় হতে হতে বাবলের মতো দুলে ওপরে উঠে ফুটে যায়
  function nextWord() { var a = String(CFG.words).split(",").map(function (x) { return x.trim(); }).filter(Boolean); return a.length ? a[tapN++ % a.length] : ""; }
  function zoomText(txt, cx, cy) {
    if (!txt || zoomN > 5 || !document.body || !el0().animate) return;
    var vw = window.innerWidth, vh = window.innerHeight, B = TH.bub || {}, tx = B.tx || "#fff", gl = TH.glow || "#fff", D0 = Math.round(Math.max(96, Math.min(150, vw * .34))), n = String(txt), d = document.createElement("div");
    var fs = Math.round(Math.min(D0 * .4, D0 * .86 / Math.max(1.6, n.length * .62))), sw = (Math.random() < .5 ? -1 : 1) * vw * .07;
    d.textContent = n; zoomN++;
    d.style.cssText = "position:fixed;left:" + cx + "px;top:" + cy + "px;width:" + D0 + "px;height:" + D0 + "px;z-index:99999;pointer-events:none;box-sizing:border-box;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;" +
      "font:900 " + fs + "px/1 system-ui,Arial,sans-serif;color:" + tx + ";white-space:nowrap;letter-spacing:.5px;text-shadow:0 2px 0 rgba(0,25,35,.65);" +
      "border:2px solid " + (B.s || "#e4f6ff") + ";background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.7) 0 6%,rgba(255,255,255,0) 7%),radial-gradient(circle at 50% 50%," + (B.f || "rgba(190,230,255,.16)") + " 55%,rgba(255,255,255,.22) 100%);" +
      "box-shadow:0 0 22px " + gl + ",inset 0 0 18px rgba(255,255,255,.25);will-change:transform,opacity";
    document.body.appendChild(d);
    var T0 = "translate(-50%,-50%) ", up = vh * .62, a = d.animate([
      { transform: T0 + "translate(0px,0px) scale(.2)", opacity: 0, offset: 0 },
      { transform: T0 + "translate(" + sw * .2 + "px," + (-up * .06) + "px) scale(1)", opacity: 1, offset: .12 },
      { transform: T0 + "translate(" + sw + "px," + (-up * .34) + "px) scale(1.8)", opacity: 1, offset: .45 },
      { transform: T0 + "translate(" + (-sw * .8) + "px," + (-up * .7) + "px) scale(2.5)", opacity: .95, offset: .8 },
      { transform: T0 + "translate(" + (sw * .3) + "px," + (-up) + "px) scale(3)", opacity: 0, offset: 1 }
    ], { duration: 2800, easing: "cubic-bezier(.3,.1,.5,1)" });
    var done = function () { zoomN--; if (d.parentNode) d.parentNode.removeChild(d); };
    a.onfinish = done; a.oncancel = done;
  }
  function el0() { return document.documentElement; }

  function toImg(cx, cy) { var r = svg.getBoundingClientRect(), s = r.width / IW; return { x: (cx - r.left) / s, y: (cy - r.top) / s, s: s }; }
  function bSc() { return 1.05 * CFG.size * CFG.bsz * (TH.bird.sc || 1); }

  function birdTap(b, px, py, snd) {
    if (b.ind && (b.st === "flee" || b.st === "gone" || b.st === "back")) { if (b.st !== "back") return; }
    if (!b.ind) { b.ind = true; b.mx = b.cx; b.my = b.cy; b.fd = b.cdir || 1; }
    var dx = b.mx - px, sg = dx >= 0 ? 1 : -1; if (Math.abs(dx) < 6) sg = b.fd || 1;
    b.st = "flee"; b.vx = sg * rnd(640, 840); b.vy = -rnd(90, 210); b.fd = sg; b.t = 0; b.cd = 1.2; if (snd) chirp(); // part66: ডাক শুধু আসল ক্লিক/ট্যাপে; হোভার/ডালে বসায় নয়
  }
  function hideB(b) { b.vis = false; b.g.setAttribute("opacity", 0); b.bub.g.setAttribute("opacity", 0); }
  function indBird(b, dt) {
    var S = CFG.size, sc = bSc(), rot = 0, p, perch = false, u, e, py = PERCH[1] - 6.5 - 11.7 * sc;
    b.t += dt; if (b.cd > 0) b.cd -= dt;
    if (b.st === "flee") {
      b.mx += b.vx * dt; b.my += b.vy * dt; b.ph += dt * 27; rot = cl(b.vy * .05, -14, 14) * b.fd * 0;
      if (b.mx > IW + 220 || b.mx < -220 || b.my < -140) { b.st = "gone"; b.t = 0; b.wait = rnd(2.4, 4.2); }
    } else if (b.st === "gone") {
      hideB(b); if (b.t > b.wait) { b.st = "back"; b.t = 0; b.sx = IW + 190; b.sy = rnd(20, 80); b.fd = -1; b.ph = 0; }
      return;
    } else if (b.st === "back") {
      u = Math.min(1, b.t / 2.5); e = 1 - Math.pow(1 - u, 2.3);
      b.mx = b.sx + (PERCH[0] - b.sx) * e; b.my = b.sy + (py - b.sy) * e - Math.sin(u * Math.PI) * 34; b.ph += dt * (25 - 12 * u);
      rot = -u * u * 36;
      if (u >= 1) { b.st = "perch"; b.t = 0; b.pt = rnd(18, 28); }
    } else if (b.st === "perch") {
      b.mx = PERCH[0]; b.my = py; perch = true; b.fd = -1; rot = -40 + Math.sin(T * 2.2 + b.ph) * 2.2;
      if (b.t > b.pt) { b.st = "leave"; b.t = 0; b.vx = -rnd(150, 230); b.vy = -rnd(30, 70); b.ph = 0; }
    } else if (b.st === "leave") {
      b.fd = -1; b.mx += b.vx * dt; b.my += b.vy * dt; b.vx -= 60 * dt; b.ph += dt * 15;
      if (b.mx < -200 || b.my < -140) { b.ind = false; b.hold = true; b.st = ""; hideB(b); return; }
    }
    b.cx = b.mx; b.cy = b.my; b.cdir = b.fd; b.vis = true;
    if (perch) { var tw = Math.max(0, Math.sin(T * .9 + b.ph * 3)); p = -1 + (tw > .96 ? Math.sin(T * 40) * .5 : 0); }
    else p = Math.sin(b.ph);
    b.wn.setAttribute("d", wingPath(p, 0, 15, 1)); b.wf.setAttribute("d", wingPath(perch ? p : Math.sin(b.ph - .7), 0, 12, 1));
    b.g.setAttribute("transform", "translate(" + f1(b.mx) + " " + f1(b.my) + ") scale(" + f1(b.fd * sc) + " " + f1(sc) + ") rotate(" + f1(rot) + ")");
    b.g.setAttribute("opacity", 1); if (b.lg) b.lg.setAttribute("opacity", perch ? 1 : 0);
    b.oa += dt * 1.6;
    follow(b.bub, b.mx - b.fd * 6 + Math.cos(b.oa) * 20 * S, b.my + (perch ? -30 * sc : 22 * sc) + Math.sin(b.oa * 1.3) * 8 * S, dt, S);
  }

  // ---- ট্যাপ / হাত (পয়েন্টার) ----
  var PT = { x: 0, y: 0, t: 0, on: false }, bound = false;
  function inHdr(cx, cy) { if (!hdr) return false; var r = hdr.getBoundingClientRect(); return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom; }
  function hits(cx, cy, hov) {
    var q = toImg(cx, cy), out = [], mn = hov ? 0 : 14;
    W.fish.forEach(function (f) { var r = Math.max(30, 48 * f.k * CFG.size * FMUL * q.s) + mn, d = Math.hypot((q.x - f.x) * q.s, (q.y - f.y) * q.s); if (d < r) out.push({ d: d / r, f: f }); });
    (W.flocks || []).forEach(function (fo) { fo.birds.forEach(function (b) { if (!b.vis) return; var r = Math.max(30, 26 * bSc() * q.s) + mn, d = Math.hypot((q.x - b.cx) * q.s, (q.y - b.cy) * q.s); if (d < r) out.push({ d: d / r, b: b }); }); });
    out.sort(function (a, c) { return a.d - c.d; }); return { list: out, q: q };
  }
  function onDown(e) {
    if (!svg || !W.fish) return; var t = e.target;
    if (t && t.closest && t.closest("a,button,input,select,textarea,label,[role=button],[contenteditable]")) return;
    if (!inHdr(e.clientX, e.clientY)) return;
    var h = hits(e.clientX, e.clientY, false), o = h.list[0];
    if (o) { if (o.f) { splashSnd(); if (o.f.mode === "swim") { o.f.nj = 0; o.f.big = true; } } else birdTap(o.b, h.q.x, h.q.y, true); } // মাছ লাফায়, পাখি ডেকে পালায় — আগের মতোই
    zoomText(nextWord(), e.clientX, e.clientY); // মাছ/পাখি/খালি জায়গা — যেখানেই ট্যাপ, বাবল-লেখা ওঠে
  }
  function onMove(e) { PT.x = e.clientX; PT.y = e.clientY; PT.t = Date.now(); PT.on = true; }
  function handTick() {
    if (!PT.on || !svg || !W.fish) return; if (Date.now() - PT.t > 700) { PT.on = false; return; }
    if (!inHdr(PT.x, PT.y)) return; var h = hits(PT.x, PT.y, true);
    h.list.forEach(function (o) {
      if (o.b) { if (!(o.b.cd > 0)) birdTap(o.b, h.q.x, h.q.y); }
      else if (o.f.mode === "swim" && !(o.f.hc > T)) { o.f.nj = 0; o.f.big = true; o.f.hc = T + 3; }
    });
  }
  function bindPtr() {
    if (bound || !hdr) return; bound = true;
    hdr.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
  }
  function unbindPtr() {
    if (!bound) return; bound = false;
    if (hdr) hdr.removeEventListener("pointerdown", onDown);
    document.removeEventListener("pointermove", onMove);
  }

  window.BG12 = { demoEntry: function (sec) { return chirp3(true, sec); }, stopEntry: function () { stopEntrySnd(); }, playClip: playClip, okSrc: okSrc, designs: DES, cfg: CFG, mount: mount, unmount: unmount, set: set, relayout: layout, isMounted: function () { return mounted; } };

  // ====================== সাইটের জন্য নিজে চালু/বন্ধ ======================
  if (!window.BG12_MANUAL) {
    try { var saved = window.BG12CFG || JSON.parse(localStorage.getItem("bg12cfg") || "null"); if (saved) for (var kk in saved) if (CFG.hasOwnProperty(kk)) CFG[kk] = saved[kk]; } catch (e) {}
    var sync = function () {
      var header = document.querySelector("header");
      if (R.classList.contains("bg12") && header && !reduce) { if (!host) mount(header); layout(); }
      else if (host || raf) unmount();
    };
    var remote = function () {
      var M = window.MC_CFG; if (!M || !M.url || !window.fetch) { entryOnce(); return; }
      fetch(String(M.url).replace(/\/$/, "") + "/rest/v1/mc2_bg12_cfg?id=eq.1&select=cfg,door", { headers: { apikey: M.key, Authorization: "Bearer " + M.key } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var dd = d && d[0] && d[0].door; if (dd && typeof dd === "object") { var sn = dd.snd && typeof dd.snd === "object" ? dd.snd : { fo: true, bo: true, lib: [] }; try { localStorage.setItem("bg12snd", JSON.stringify(sn)); } catch (e) {} sndSet(sn); }
        var c = d && d[0] && d[0].cfg; if (!c || typeof c !== "object") return; var o = {}, k;
        for (k in c) if (CFG.hasOwnProperty(k) && typeof c[k] === typeof CFG[k]) o[k] = c[k];
        try { localStorage.setItem("bg12cfg", JSON.stringify(o)); } catch (e) {} set(o);
      }).catch(function () {}).then(entryOnce);
    };
    var init = function () {
      sync(); remote();
      try { new MutationObserver(sync).observe(R, { attributes: true, attributeFilter: ["class"] }); } catch (e) {}
      window.addEventListener("resize", layout);
      var h = document.querySelector("header");
      if (h && window.ResizeObserver) { try { new ResizeObserver(layout).observe(h); } catch (e) {} }
      document.addEventListener("visibilitychange", function () { last = 0; });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  } else {
    window.addEventListener("resize", layout);
    document.addEventListener("visibilitychange", function () { last = 0; });
  }
})();
