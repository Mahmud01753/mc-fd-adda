// অ্যাডমিন: "💬 চ্যাট বাবল" ট্যাব — চ্যাটের তালা-ফোল্ডারের একই সেটিং (স্ট্রিপের গতি/ডিজাইন, বাবলের অক্ষর-সময়-সাউন্ড-জায়গা, ১১ অ্যানিমেশন + র‍্যান্ডম,
// ইমোজি বৃষ্টি, ইউজার সুইচ, স্প্যাম লিমিট, ইউজার ধরে বন্ধ/লিমিট, বিশেষ বাবল, জরুরি অফ, কে-কাকে-কী লগ)। সব কাজ bubble.js-এর faBub.panel()-এ। SQL: sql/SQL-20-NAME-BUBBLES.sql (একবার)।
(function () {
  window.MCA_TABS = (window.MCA_TABS || []).concat([["bub", "💬 চ্যাট বাবল"]]);
  function view() {
    var m = window.MCA;
    m.$("#view").innerHTML = "<h2>💬 চ্যাট বাবল (নামে ক্লিক · নাম ছাড়া বাবল · অনলাইন স্ট্রিপ)</h2><div class='sm'>প্রতিটা বদল নিজে নিজে সেভ হয়। চ্যাটের ভেতরে স্ট্রিপের নিচে বাম কোনার 🔒-তেও (অ্যাডমিন লগইন থাকলে) এই একই সেটিং আছে। ‘নামে ক্লিক’ ও ‘নাম ছাড়া বাবল’ সুইচ শুরুতে চালু — সবাই সবাইকে (নিজেকেও) বাবল দিতে পারে; চাইলে এখান থেকে বন্ধ করুন।</div><div id='bubHost' style='margin-top:8px'></div>";
    if (!window.faBub) { m.$("#bubHost").textContent = "bubble.js লোড হয়নি।"; return Promise.resolve(); }
    window.faBub.panel(m.$("#bubHost"), { rpc: m.rpc, session: function () { return 0; } });
    return Promise.resolve();
  }
  window.MCA_VIEWS = Object.assign(window.MCA_VIEWS || {}, { bub: view });
})();
