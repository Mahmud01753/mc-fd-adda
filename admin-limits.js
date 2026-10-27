// অ্যাডমিন: "⏱ লিমিট" — চ্যাটের গতি/সংখ্যার লিমিট নিজের হাতে (ডিফল্টে সব বন্ধ = আনলিমিটেড, আগের মতোই)।
// সাধারণ লিমিট + IP-ভিত্তিক আলাদা নিয়ম + কোন IP থেকে কত বার্তা + আটকানোর হিসাব।
// SQL: sql/RUN-NOW-LIMITS-STORAGE-BADWORDS.sql (একবার চালাতে হবে)। admin.js-এর আগে লোড হয়।
(function () {
  var M = function () { return window.MCA; };
  window.MCA_TABS = (window.MCA_TABS || []).concat([["lim", "⏱ লিমিট"]]);
  var WIN = 60, RULES = [], DEF = { gap_sec: 2, dup_sec: 20, dev_min: 20, ip_min: 60, ip_hr: 0, file_min: 5, file_hr: 30 };
  var FIELDS = [
    ["gap_sec", "দুই বার্তার মাঝের বিরতি", "সেকেন্ড", "একই ডিভাইস থেকে এক বার্তার পর এত সেকেন্ড না গেলে পরেরটা যাবে না"],
    ["dup_sec", "একই লেখা আবার পাঠানো", "সেকেন্ড", "একই লেখা এত সেকেন্ডের মধ্যে আবার পাঠানো যাবে না"],
    ["dev_min", "ডিভাইস প্রতি মিনিটে সর্বোচ্চ বার্তা", "টি", "একটা ডিভাইস থেকে এক মিনিটে সর্বোচ্চ কয়টা"],
    ["ip_min", "IP প্রতি মিনিটে সর্বোচ্চ বার্তা", "টি", "একই IP থেকে (সব ডিভাইস মিলিয়ে) এক মিনিটে সর্বোচ্চ কয়টা। মোবাইল নেটওয়ার্কে অনেকের IP এক হয়, তাই বেশি রাখুন"],
    ["ip_hr", "IP প্রতি ঘণ্টায় সর্বোচ্চ বার্তা", "টি", "একই IP থেকে এক ঘণ্টায় সর্বোচ্চ কয়টা"],
    ["file_min", "ডিভাইস প্রতি মিনিটে সর্বোচ্চ ফাইল", "টি", "একটা ডিভাইস থেকে এক মিনিটে সর্বোচ্চ কয়টা ফাইল"],
    ["file_hr", "ডিভাইস প্রতি ঘণ্টায় সর্বোচ্চ ফাইল", "টি", "একটা ডিভাইস থেকে এক ঘণ্টায় সর্বোচ্চ কয়টা ফাইল"]
  ];
  // ভাগ ৩: প্রতিটা লিমিটের আলাদা অন/অফ — অফ = ০ = সীমা নেই; অন করলে আগের মান ফেরে (মান এই ব্রাউজারে মনে রাখা হয়)
  var FALL = { gap_sec: 2, dup_sec: 20, dev_min: 20, ip_min: 60, ip_hr: 300, file_min: 5, file_hr: 30 }, MEMK = "fa_lim_mem", LMSG = "";
  var memGet = function () { try { return JSON.parse(localStorage.getItem(MEMK) || "{}") || {}; } catch (e) { return {}; } };
  var memSet = function (o) { try { localStorage.setItem(MEMK, JSON.stringify(o)); } catch (e) {} };
  var KIND = { gap: "বিরতি", dup: "একই লেখা", dev: "ডিভাইস সীমা", ip: "IP সীমা", file: "ফাইল সীমা", ip_block: "ব্লক করা IP" };
  var WINS = [[10, "১০ মিনিট"], [60, "১ ঘণ্টা"], [360, "৬ ঘণ্টা"], [1440, "২৪ ঘণ্টা"], [10080, "৭ দিন"]];
  var bn = function (n) { return String(n).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); };

  function view() {
    var $ = M().$, esc = M().esc, rpc = M().rpc, tm = M().tm;
    return Promise.all([rpc("fa_lim_get"), rpc("fa_lim_ips", { p_mins: WIN })]).then(function (res) {
      var g = res[0] || {}, ips = res[1] || [], cfg = g.cfg || DEF, on = !!g.on, hits = g.hits || [];
      RULES = g.rules || [];

      var mem = memGet(); FIELDS.forEach(function (f) { if (+cfg[f[0]] > 0) mem[f[0]] = +cfg[f[0]]; }); memSet(mem);
      var inputs = FIELDS.map(function (f) {
        var v = +cfg[f[0]] || 0, fo = v > 0;
        return "<div class='it lmf' style='border:1px solid var(--bd);border-radius:12px;padding:10px;gap:6px'><div style='display:flex;justify-content:space-between;gap:8px;align-items:center'><b>" + f[1] + " <span class='sm'>(" + f[2] + ")</span></b>" +
          "<button type='button' class='lmt s " + (fo ? "" : "l") + "' data-f='" + f[0] + "' style='white-space:nowrap;flex:none' role='switch' aria-checked='" + fo + "'>" + (fo ? "🟢 অন" : "⚪ অফ") + "</button></div>" +
          "<input type='number' min='0' max='999999' step='1' inputmode='numeric' id='lm_" + f[0] + "' value='" + esc(v) + "'><span class='sm'>" + f[3] + " · অফ = ০ = সীমা নেই</span></div>";
      }).join("");

      var rules = RULES.length ? RULES.map(function (r, i) {
        var st = r.blocked ? "<span class='tag' style='background:var(--red);color:#fff'>⛔ ব্লক</span>" :
          "<span class='tag'>মিনিটে: " + (r.per_min == null ? "সাধারণ" : r.per_min === 0 ? "আনলিমিটেড" : bn(r.per_min)) + "</span><span class='tag'>ঘণ্টায়: " + (r.per_hr == null ? "সাধারণ" : r.per_hr === 0 ? "আনলিমিটেড" : bn(r.per_hr)) + "</span>";
        return "<div class='it'><div><b>" + esc(r.addr) + "</b> " + st + (r.note ? " <span class='sm'>— " + esc(r.note) + "</span>" : "") + "</div>" +
          "<div class='act'><button class='l s' type='button' data-a='edit' data-i='" + i + "'>✎ বদলান</button><button class='d s' type='button' data-a='del' data-i='" + i + "'>🗑 মুছুন</button></div></div>";
      }).join("") : "<p class='sm'>কোনো IP-নিয়ম নেই — সবার জন্য সাধারণ নিয়ম।</p>";

      var ipl = ips.length ? ips.map(function (x) {
        return "<div class='it'><div><b>" + esc(x.ip) + "</b> <span class='tag'>" + bn(x.msgs) + "টি বার্তা</span><span class='tag'>" + bn(x.devs) + "টি ডিভাইস</span>" + (x.rule ? "<span class='tag'>📌 নিয়ম আছে</span>" : "") + "</div>" +
          "<div class='sm'>শেষ: " + esc(tm(x.last)) + "</div>" +
          "<div class='act'><button class='l s' type='button' data-a='mk' data-ip='" + esc(x.ip) + "'>＋ এই IP-র নিয়ম দিন</button></div></div>";
      }).join("") : "<p class='sm'>এই সময়ে কোনো বার্তা নেই।</p>";

      var byDay = {};
      hits.forEach(function (h) { var d = String(h.day); (byDay[d] = byDay[d] || []).push((KIND[h.kind] || h.kind) + ": " + bn(h.n)); });
      var hl = Object.keys(byDay).sort().reverse().map(function (d) { return "<div class='it'><b>" + esc(d) + "</b><div class='sm'>" + esc(byDay[d].join(" · ")) + "</div></div>"; }).join("") || "<p class='sm'>শেষ ৭ দিনে লিমিটে কিছু আটকায়নি।</p>";

      $("#view").innerHTML =
        "<h2>⏱ চ্যাট লিমিট</h2>" +
        "<div class='it'><div style='display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap'><b>অবস্থা</b>" +
        "<button id='lmBig' type='button' role='switch' aria-checked='" + on + "' style='min-width:210px;padding:12px 18px;font-size:17px;border-radius:999px;background:" + (on ? "var(--g)" : "var(--card)") + ";color:" + (on ? "#fff" : "var(--fg)") + ";border:2px solid " + (on ? "var(--g)" : "var(--bd)") + "'>" + (on ? "🟢 চালু — লিমিট কাজ করছে" : "⚪ বন্ধ — আনলিমিটেড") + "</button></div>" +
        "<div class='act'><button id='lmOnB' type='button' class='" + (on ? "l" : "") + "'>✅ চালু করুন</button><button id='lmOffB' type='button' class='" + (on ? "d" : "l") + "'>⛔ বন্ধ করুন</button><button id='lmNone' type='button' class='l'>♾ কোনো লিমিট নেই (সব অফ)</button></div>" +
        "<div class='sm'>বন্ধ (⚪) = আনলিমিটেড: নিচের কোনো মান কাজ করে না, সবাই যত খুশি, যত দ্রুত খুশি পাঠাতে পারবে। চালু (🟢) করলে শুধু বার্তা ও ফাইল পাঠানোর ওপর এই সীমা বসে; যে লিমিটের পাশে ⚪ অফ বা ০ আছে সেটার সীমা নেই। “কোনো লিমিট নেই” সব ঘর অফ (০) করে সেভ করে।</div><p class='sm lmMsgC' style='color:var(--g);font-weight:700;margin:6px 0 0'></p></div>" +
        "<h2 style='margin-top:14px'>সাধারণ লিমিট</h2><div class='row' style='align-items:stretch;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))'>" + inputs + "</div>" +
        "<div class='act' style='margin-top:8px'><button id='lmSave' type='button'>💾 সেভ</button><button id='lmDef' type='button' class='l'>↺ সাধারণ মান বসান</button></div>" +
        "<p class='sm'>“সাধারণ মান বসান” শুধু ঘরগুলো ভরে (বিরতি ২ সে., একই লেখা ২০ সে., ডিভাইস ২০/মিনিট, IP ৬০/মিনিট, ফাইল ৫/মিনিট ও ৩০/ঘণ্টা); সেভ করলে তবে থাকে।</p>" +
        "<h2 style='margin-top:14px'>🌐 IP-ভিত্তিক নিয়ম</h2>" +
        "<div class='it'><div class='row'><label>IP<input id='ruIp' placeholder='যেমন 103.12.34.56' autocomplete='off'></label>" +
        "<label>মিনিটে কয়টা<input id='ruMin' type='number' min='0' inputmode='numeric' placeholder='ফাঁকা = সাধারণ'></label>" +
        "<label>ঘণ্টায় কয়টা<input id='ruHr' type='number' min='0' inputmode='numeric' placeholder='ফাঁকা = সাধারণ'></label>" +
        "<label>নোট<input id='ruNote' maxlength='120' placeholder='যেমন: কলেজের ওয়াইফাই'></label></div>" +
        "<label style='display:flex;gap:8px;align-items:center'><input id='ruBl' type='checkbox' style='width:auto'> ⛔ এই IP থেকে পাঠানো পুরো বন্ধ (ব্লক)</label>" +
        "<div class='act'><button id='ruSave' type='button'>💾 নিয়ম সেভ</button></div>" +
        "<div class='sm'>ফাঁকা = সাধারণ লিমিট। ০ = এই IP আনলিমিটেড। সংখ্যা = এই IP থেকে (সব ডিভাইস মিলিয়ে) সর্বোচ্চ এত। IP-নিয়ম সুইচ বন্ধ থাকলেও কাজ করে।</div></div>" +
        "<div id='ruList'>" + rules + "</div>" +
        "<h2 style='margin-top:14px'>📊 কোন IP থেকে কত বার্তা</h2>" +
        "<label>সময়<select id='lmW'>" + WINS.map(function (w) { return "<option value='" + w[0] + "'" + (w[0] === WIN ? " selected" : "") + ">শেষ " + w[1] + "</option>"; }).join("") + "</select></label>" +
        "<div id='ipList'>" + ipl + "</div><p class='sm'>সর্বোচ্চ ৫০টা IP, বেশি বার্তা আগে। চ্যাটের পুরোনো বার্তা মুছে গেলে তার হিসাবও থাকে না।</p>" +
        "<h2 style='margin-top:14px'>🚧 লিমিটে আটকানো (শেষ ৭ দিন)</h2>" + hl +
        "<p class='sm'>শুধু বার্তা/ফাইল পাঠানো সার্ভারে গোনা ও আটকানো যায়। বার্তা পড়া/রিফ্রেশের কল ডাটাবেস আটকাতে পারে না — ওটা Supabase ড্যাশবোর্ডের সীমা।</p>" +
        "<p class='sm lmMsgC' id='lmMsg' style='color:var(--g);font-weight:700'></p>";

      var val = function (id) { return $("#" + id).value.trim(); };
      var num = function (id) { var v = val(id); return v === "" ? null : (/^\d{1,6}$/.test(v) ? +v : NaN); };
      var say = function (t) { [].forEach.call(document.querySelectorAll(".lmMsgC"), function (e) { e.textContent = t; }); };
      var collect = function (en) {
        var o = { on: en }, bad = false;
        FIELDS.forEach(function (f) { var n = num("lm_" + f[0]); if (n == null || isNaN(n)) bad = true; else o[f[0]] = n; });
        return bad ? null : o;
      };
      var stamp = function () { var d = new Date(); try { return d.toLocaleTimeString("bn-BD"); } catch (e) { return d.toTimeString().slice(0, 8); } };
      var save = function (en, what) {
        var o = collect(en);
        if (!o) { alert("সব ঘরে ০ বা তার বেশি সংখ্যা দিন।"); return; }
        var mm = memGet(); FIELDS.forEach(function (f) { if (o[f[0]] > 0) mm[f[0]] = o[f[0]]; }); memSet(mm);
        say("⏳ সেভ হচ্ছে…");
        return rpc("fa_lim_set", { p: o }).then(function () { LMSG = "✅ সেভ হয়েছে (" + stamp() + ") — " + (what || (en ? "লিমিট চালু আছে" : "লিমিট বন্ধ, আনলিমিটেড")); return view(); }).catch(function (e) { say(""); M().fail(e); });
      };
      var sync = function (f) { var i = $("#lm_" + f), b = $("[data-f='" + f + "']"), fo = +i.value > 0; b.textContent = fo ? "🟢 অন" : "⚪ অফ"; b.classList.toggle("l", !fo); b.setAttribute("aria-checked", fo); };
      var fill = function (a, pm, ph, bl, note) {
        $("#ruIp").value = a || ""; $("#ruMin").value = pm == null ? "" : pm; $("#ruHr").value = ph == null ? "" : ph; $("#ruBl").checked = !!bl; $("#ruNote").value = note || "";
        $("#ruIp").scrollIntoView({ behavior: "smooth", block: "center" }); $("#ruIp").focus();
      };

      $("#lmW").onchange = function () { WIN = +this.value || 60; view(); };
      FIELDS.forEach(function (f) { $("#lm_" + f[0]).oninput = function () { sync(f[0]); }; });
      if (LMSG) { say(LMSG); LMSG = ""; }
      $("#view").onclick = function (e) {
        var b = e.target.closest ? e.target.closest("button") : null; if (!b) return;
        var id = b.id, a = b.dataset.a;
        if (id === "lmBig") save(!on);
        else if (id === "lmOnB") { if (on) say("লিমিট আগে থেকেই চালু আছে।"); else save(true); }
        else if (id === "lmOffB") { if (!on) say("লিমিট আগে থেকেই বন্ধ (আনলিমিটেড)।"); else save(false); }
        else if (id === "lmNone") {
          if (!confirm("সব লিমিট অফ (০) করে সেভ করবেন? তারপর কোনো সীমা থাকবে না।")) return;
          var mm = memGet(); FIELDS.forEach(function (f) { var v = +$("#lm_" + f[0]).value; if (v > 0) mm[f[0]] = v; $("#lm_" + f[0]).value = 0; }); memSet(mm);
          save(on, "সব লিমিট অফ (০) — এখন কোনো সীমা নেই");
        }
        else if (b.classList.contains("lmt")) {
          var fk = b.dataset.f, inp = $("#lm_" + fk), mem2 = memGet();
          if (+inp.value > 0) { mem2[fk] = +inp.value; memSet(mem2); inp.value = 0; }
          else inp.value = mem2[fk] > 0 ? mem2[fk] : FALL[fk];
          sync(fk); say("বদল হয়েছে — 💾 সেভ চাপলে তবে থাকবে।");
        }
        else if (id === "lmSave") save(on);
        else if (id === "lmDef") { FIELDS.forEach(function (f) { $("#lm_" + f[0]).value = DEF[f[0]]; sync(f[0]); }); say("মান বসানো হয়েছে — সেভ চাপুন।"); }
        else if (id === "ruSave") {
          var ip = val("ruIp"), pm = num("ruMin"), ph = num("ruHr");
          if (!ip || /[\s,]/.test(ip) || ip.length < 3) { alert("সঠিক একটা IP দিন।"); return; }
          if (Number.isNaN(pm) || Number.isNaN(ph)) { alert("সংখ্যা ঠিক নয়।"); return; }
          rpc("fa_lim_rule_set", { p_ip: ip, p_per_min: pm, p_per_hr: ph, p_blocked: $("#ruBl").checked, p_note: val("ruNote") }).then(function () { return view(); }).catch(M().fail);
        }
        else if (a === "edit") { var r = RULES[+b.dataset.i]; if (r) fill(r.addr, r.per_min, r.per_hr, r.blocked, r.note); }
        else if (a === "del") { var d = RULES[+b.dataset.i]; if (d && confirm(d.addr + " — এই IP-র নিয়ম মুছবেন?")) rpc("fa_lim_rule_del", { p_ip: d.addr }).then(function () { return view(); }).catch(M().fail); }
        else if (a === "mk") fill(b.dataset.ip, null, null, false, "");
      };
    }).catch(function (e) {
      var t = e && e.message ? e.message : String(e);
      $("#view").innerHTML = "<h2>⏱ চ্যাট লিমিট</h2><p class='warn'>লোড হয়নি: " + esc(t) + "</p><p class='sm'>" +
        (/fa_lim_|404|PGRST202|42883/.test(t) ? "সার্ভারে লিমিটের ফাংশন নেই। sql/RUN-NOW-LIMITS-STORAGE-BADWORDS.sql একবার Supabase SQL Editor-এ চালান, তারপর রিফ্রেশ করুন।" : "আবার চেষ্টা করুন।") + "</p>";
    });
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { lim: view });
})();
