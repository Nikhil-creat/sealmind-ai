(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /* ---------- Vault: client-side TF-IDF semantic-style retrieval ---------- */
  var DOCS = [
    { n: "NDA, Acme Corp", t: "Confidential Information excludes information already public. Either party may terminate this NDA with 30 days written notice. No termination penalty applies. Confidentiality obligations survive for 5 years after termination." },
    { n: "NDA, Northwind", t: "Recipient shall not disclose Confidential Information. Intellectual property in disclosed materials remains with the disclosing party. Upon termination all materials must be returned or destroyed within 14 days." },
    { n: "MSA, Globex", t: "Supplier liability is capped at fees paid in the prior 12 months. Intellectual property created for the Client is assigned to the Client on payment. Termination for convenience requires 60 days notice and a penalty of one month of fees." },
    { n: "Employment, R. Patel", t: "Salary is paid monthly. Inventions made during employment belong to the Company. Either party may terminate with 90 days notice. A non-solicit applies for 12 months." },
    { n: "SaaS Order, Initech", t: "Subscription auto-renews for 12 months unless cancelled 30 days before renewal. Customer data is processed under GDPR and the Supplier acts as processor. Late payments accrue 1.5% monthly interest." },
    { n: "Lease, Warehouse 4", t: "Tenant pays rent quarterly. Early termination penalty equals six months of rent. Landlord may enter the premises with 24 hours notice. Subleasing requires written consent." }
  ];
  var STOP = /^(the|and|for|with|that|this|are|was|any|all|may|shall|from|into|per|show|me|of|to|in|a|on|or|is|be|by|an|as|at|it|clauses|clause|related)$/;
  function tok(s) { return (s.toLowerCase().match(/[a-z0-9%]+/g) || []).filter(function (w) { return w.length > 2 && !STOP.test(w); }); }
  var df = {}, N = DOCS.length;
  DOCS.forEach(function (d) { d.k = tok(d.t); new Set(d.k).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
  function vec(words) { var v = {}; words.forEach(function (w) { v[w] = (v[w] || 0) + 1; }); Object.keys(v).forEach(function (w) { v[w] *= Math.log((N + 1) / ((df[w] || 0) + 1)) + 1; }); return v; }
  function cos(a, b) { var d = 0, na = 0, nb = 0, k; for (k in a) { na += a[k] * a[k]; if (b[k]) d += a[k] * b[k]; } for (k in b) nb += b[k] * b[k]; return na && nb ? d / Math.sqrt(na * nb) : 0; }
  function rank(q) { var qv = vec(tok(q)); return DOCS.map(function (d) { return { d: d, s: cos(qv, vec(d.k)) }; }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3); }
  if (typeof module !== "undefined") { module.exports = { rank: rank }; return; }
  var lastHits = [];
  function search() {
    var q = $("vq").value.trim(), out = $("vres"); if (!q) return;
    lastHits = rank(q); var qs = tok(q);
    out.innerHTML = lastHits.length ? lastHits.map(function (h) {
      var t = esc(h.d.t); qs.forEach(function (w) { t = t.replace(new RegExp("(" + w.replace(/[^a-z0-9]/g, "") + ")", "gi"), "<mark>$1</mark>"); });
      return '<div class="hit"><b>' + esc(h.d.n) + '</b> <span class="small">match ' + Math.round(h.s * 100) + "%</span><br>" + t + "</div>";
    }).join("") : '<p class="small">No matching clauses. Try "termination penalty" or "intellectual property".</p>';
    $("vai").hidden = !lastHits.length; $("vans").textContent = "";
  }
  $("vgo").onclick = search; $("vq").onkeydown = function (e) { if (e.key === "Enter") search(); };
  $("vai").onclick = function () {
    var h = { "Content-Type": "application/json" }; try { var k = sessionStorage.getItem("sm_key"); if (k) h["x-user-key"] = k; } catch (e) {}
    var ctx = lastHits.map(function (x) { return x.d.n + ": " + x.d.t; }).join("\n");
    $("vans").textContent = "Thinking…";
    fetch("/api/chat", { method: "POST", headers: h, body: JSON.stringify({ messages: [{ role: "user", content: "Using only these contract excerpts, answer: " + $("vq").value + "\n\n" + ctx }] }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Request failed"); return j; }); })
      .then(function (j) { $("vans").textContent = j.reply + "  [" + j.provider + " · " + j.model + "]"; })
      .catch(function (e) { $("vans").textContent = "AI unavailable: " + e.message; });
  };
  /* ---------- Pipeline canvas ---------- */
  var cv = $("pipe"), cx = cv.getContext("2d"), sel = 0, W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), t0 = 0;
  var ST = [["Upload", "PDF up to 50 MB and 250 pages is stored encrypted (AES-256) and hashed with SHA-256."], ["CNN scan", "A vision model classifies the layout, suggests signature fields and flags altered fonts or pixels."], ["Embed", "Text is chunked and embedded into pgvector so every clause becomes searchable."], ["Agents", "Agents route the file to the right owner, compare it with your playbook and chase signers."], ["Seal", "Signatures, audit trail and hash are bound into the PDF so any later change shows."]];
  function size() { var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function nx(i) { return 40 + (W - 80) * i / 4; }
  function draw(ts) {
    cx.clearRect(0, 0, W, H); var y = H / 2 - 10, ink = "#0d0c0b", t = (ts - t0) / 1000;
    cx.strokeStyle = "rgba(13,12,11,.18)"; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(nx(0), y); cx.lineTo(nx(4), y); cx.stroke();
    for (var p = 0; p < 4; p++) { var f = (t * 0.35 + p / 4) % 1, px = nx(0) + (nx(4) - nx(0)) * f; cx.fillStyle = ink; cx.globalAlpha = 0.7; cx.beginPath(); cx.arc(px, y, 3, 0, 7); cx.fill(); cx.globalAlpha = 1; }
    ST.forEach(function (s, i) {
      var on = i === sel, r = on ? 17 : 13; cx.beginPath(); cx.arc(nx(i), y, r, 0, 7); cx.fillStyle = on ? ink : "#f2f0ec"; cx.fill(); cx.strokeStyle = ink; cx.stroke();
      cx.fillStyle = on ? "#fff" : ink; cx.font = "500 12px 'Inter Tight',sans-serif"; cx.textAlign = "center"; cx.fillText(i + 1, nx(i), y + 4);
      cx.fillStyle = ink; cx.font = (on ? "500 " : "400 ") + (W < 420 ? 11 : 13) + "px 'Inter Tight',sans-serif"; cx.fillText(s[0], nx(i), y + 42);
    });
  }
  var vis = true, lastT = 0, still = matchMedia("(prefers-reduced-motion:reduce)").matches;
  if (window.IntersectionObserver) new IntersectionObserver(function (e) { vis = e[0].isIntersecting; }).observe(cv);
  function loop(ts) { if (still) { draw(ts); return; } if (vis && !document.hidden && ts - lastT > 33) { lastT = ts; draw(ts); } requestAnimationFrame(loop); }
  function pick(i) { sel = i; $("pdesc").textContent = ST[i][1]; draw(performance.now()); }
  cv.onclick = function (e) { var r = cv.getBoundingClientRect(), x = e.clientX - r.left, b = 0; for (var i = 1; i < 5; i++) if (Math.abs(nx(i) - x) < Math.abs(nx(b) - x)) b = i; pick(b); };
  size(); t0 = performance.now(); pick(0); requestAnimationFrame(loop); window.addEventListener("resize", function () { size(); draw(performance.now()); });
  /* ---------- Agent routing demo ---------- */
  var SAMPLES = ["Mutual NDA between Acme and Northwind. Confidential information must be returned within 14 days of termination.", "Invoice and payment terms: net 15, late payments accrue interest. Supplier liability is unlimited. Auto-renews for 36 months.", "Employment offer with monthly salary, 90 day notice and a non-solicit for 24 months."];
  $("aggo").onclick = function () {
    var t = SAMPLES[+$("agsel").value], out = $("agout"), L = t.toLowerCase(), steps = [];
    var dept = /nda|confidential/.test(L) ? "Legal" : /invoice|payment/.test(L) ? "Finance" : /employment|salary/.test(L) ? "HR" : "Operations";
    var kind = /nda/.test(L) ? "NDA" : /invoice/.test(L) ? "Invoice / services agreement" : /employment/.test(L) ? "Employment contract" : "General agreement";
    steps.push("Classifier: detected " + kind + ".", "Router: sent to " + dept + " head for review.");
    var flags = []; if (/unlimited/.test(L)) flags.push("Unlimited liability. Redline: cap at 12 months of fees."); if (/auto-?renew/.test(L)) flags.push("Auto-renewal of 36 months. Redline: 12 months, 30 day notice."); if (/24 months/.test(L)) flags.push("Non-solicit of 24 months. Redline: 12 months."); if (/14 days/.test(L)) flags.push("Return window 14 days. Within playbook.");
    steps.push(flags.length ? "Playbook check: " + flags.length + " finding(s)." : "Playbook check: no deviations."); flags.forEach(function (f) { steps.push("Redline: " + f); });
    steps.push("Follow-up: reminder day 2, second reminder day 5, escalation to manager day 7.");
    out.innerHTML = ""; steps.forEach(function (s, i) { setTimeout(function () { var d = document.createElement("div"); d.textContent = s; out.appendChild(d); }, i * 450); });
  };
})();
