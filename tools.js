(function () {
  "use strict";
  /* ---------- Word diff (pure) ---------- */
  function wdiff(a, b) {
    var A = a.trim().split(/\s+/).slice(0, 1200), B = b.trim().split(/\s+/).slice(0, 1200), n = A.length, m = B.length, i, j, L = [];
    for (i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { out.push(["=", A[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push(["-", A[i++]]); else out.push(["+", B[j++]]); }
    while (i < n) out.push(["-", A[i++]]); while (j < m) out.push(["+", B[j++]]);
    return out;
  }
  if (typeof module !== "undefined") { module.exports = { wdiff: wdiff }; return; }
  var $ = function (id) { return document.getElementById(id); };
  function hdr() { var h = { "Content-Type": "application/json" }; try { var k = sessionStorage.getItem("sm_key"); if (k) h["x-user-key"] = k; } catch (e) {} return h; }
  /* ---------- Compare ---------- */
  var changes = "";
  $("cgo").onclick = function () {
    var d = wdiff($("ca").value, $("cb").value), box = $("cout"), rem = [], add = []; box.textContent = "";
    d.forEach(function (x) {
      var el = x[0] === "=" ? document.createTextNode(x[1] + " ") : document.createElement(x[0] === "-" ? "del" : "ins");
      if (x[0] !== "=") { el.textContent = x[1]; (x[0] === "-" ? rem : add).push(x[1]); box.appendChild(el); box.appendChild(document.createTextNode(" ")); } else box.appendChild(el);
    });
    changes = "Removed: " + rem.join(" ") + "\nAdded: " + add.join(" "); $("cai").hidden = !(rem.length || add.length);
    if (!rem.length && !add.length) box.textContent = "No differences.";
  };
  $("cai").onclick = function () {
    $("cans").textContent = "Thinking…";
    fetch("/api/chat", { method: "POST", headers: hdr(), body: JSON.stringify({ messages: [{ role: "user", content: "Two contract versions differ as follows. In under 120 words, say what changed in plain English and which changes favour which party.\n\n" + changes.slice(0, 2500) }] }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Request failed"); return j; }); })
      .then(function (j) { $("cans").textContent = j.reply + "  [" + j.provider + " · " + j.model + "]"; })
      .catch(function (e) { $("cans").textContent = "AI unavailable: " + e.message; });
  };
  /* ---------- Libraries (pinned, loaded only when needed) ---------- */
  var CDN = "https://cdnjs.cloudflare.com/ajax/libs/", PDFJS = CDN + "pdf.js/3.11.174/pdf.min.js", WORKER = CDN + "pdf.js/3.11.174/pdf.worker.min.js", PDFLIB = CDN + "pdf-lib/1.17.1/pdf-lib.min.js", cache = {};
  function load(src) { return cache[src] || (cache[src] = new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { delete cache[src]; no(new Error("Could not load PDF library (offline?)")); }; document.head.appendChild(s); })); }
  function pdfjs() { return load(PDFJS).then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER; return window.pdfjsLib; }); }
  function sha(b) { return crypto.subtle.digest("SHA-256", b).then(function (h) { return [].map.call(new Uint8Array(h), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }); }
  function dl(bytes, name, type) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes], { type: type })); a.download = name; a.click(); }
  // Used by the Risk lab upload: real text extraction from PDFs (max 250 pages, 50 MB).
  window.smPdfText = function (file) {
    if (file.size > 50 * 1024 * 1024) return Promise.reject(new Error("Over 50 MB"));
    return Promise.all([pdfjs(), file.arrayBuffer()]).then(function (r) { return r[0].getDocument({ data: r[1] }).promise; }).then(function (doc) {
      if (doc.numPages > 250) throw new Error("Over 250 pages");
      var n = Math.min(doc.numPages, 20), jobs = []; for (var i = 1; i <= n; i++) jobs.push(doc.getPage(i).then(function (p) { return p.getTextContent(); }).then(function (c) { return c.items.map(function (t) { return t.str; }).join(" "); }));
      return Promise.all(jobs).then(function (t) { return t.join("\n\n"); });
    });
  };
  /* ---------- Sign a PDF ---------- */
  var sg = $("sig"), sx = sg.getContext("2d"), pg = $("pg"), px = pg.getContext("2d"), drawing = false, hasSig = false, pdfBytes = null, base = null, pos = null, fname = "document.pdf";
  sx.lineWidth = 3; sx.lineCap = "round"; sx.strokeStyle = "#0d0c0b";
  function st(t) { $("sst").textContent = t; }
  function pt(e) { var r = sg.getBoundingClientRect(); return [(e.clientX - r.left) * sg.width / r.width, (e.clientY - r.top) * sg.height / r.height]; }
  function upd() { $("seal").disabled = !(pdfBytes && pos && hasSig); }
  function preview() {
    if (!base) return; px.putImageData(base, 0, 0);
    if (pos && hasSig) { var w = pg.width * 0.28, h = w * sg.height / sg.width; px.drawImage(sg, pos[0] * pg.width - w / 2, pos[1] * pg.height - h / 2, w, h); }
  }
  sg.onpointerdown = function (e) { drawing = true; var p = pt(e); sx.beginPath(); sx.moveTo(p[0], p[1]); sg.setPointerCapture(e.pointerId); };
  sg.onpointermove = function (e) { if (!drawing) return; var p = pt(e); sx.lineTo(p[0], p[1]); sx.stroke(); hasSig = true; };
  sg.onpointerup = sg.onpointercancel = function () { drawing = false; preview(); upd(); };
  $("clr").onclick = function () { sx.clearRect(0, 0, sg.width, sg.height); hasSig = false; preview(); upd(); };
  pg.onclick = function (e) { if (!base) return; var r = pg.getBoundingClientRect(); pos = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; preview(); upd(); };
  function show(bytes) {
    pdfBytes = bytes; pos = null; st("Rendering…");
    return pdfjs().then(function (L) { return L.getDocument({ data: bytes.slice() }).promise; }).then(function (d) { return d.getPage(1); }).then(function (page) {
      var v1 = page.getViewport({ scale: 1 }), v = page.getViewport({ scale: Math.min(2, 760 / v1.width) }); pg.width = v.width; pg.height = v.height;
      return page.render({ canvasContext: px, viewport: v }).promise;
    }).then(function () { base = px.getImageData(0, 0, pg.width, pg.height); st("Draw a signature, then tap the page where it goes."); upd(); })
      .catch(function (e) { st("Could not open PDF: " + e.message); });
  }
  $("pdf").onchange = function () {
    var f = this.files[0]; if (!f) return; if (f.size > 50 * 1024 * 1024) { st("File is over 50 MB."); return; }
    fname = f.name; f.arrayBuffer().then(function (b) { return show(new Uint8Array(b)); });
  };
  $("sample").onclick = function () {
    st("Building sample…"); fname = "sample-agreement.pdf";
    load(PDFLIB).then(function () { return PDFLib.PDFDocument.create(); }).then(function (doc) {
      return doc.embedFont(PDFLib.StandardFonts.Helvetica).then(function (f) {
        var p = doc.addPage([595, 842]), L = ["SERVICES AGREEMENT (SAMPLE)", "", "This sample agreement is between Acme Ltd and the Client.", "The Supplier shall deliver the services within 30 days.", "Fees are payable within 15 days of invoice.", "Either party may terminate with 60 days written notice.", "", "Signed: ______________________     Date: ____________"];
        L.forEach(function (t, i) { p.drawText(t, { x: 50, y: 780 - i * 26, size: i ? 12 : 16, font: f }); }); return doc.save();
      });
    }).then(show).catch(function (e) { st(e.message); });
  };
  $("seal").onclick = function () {
    st("Sealing…");
    load(PDFLIB).then(function () {
      var P = PDFLib, orig, now = new Date().toISOString();
      return sha(pdfBytes).then(function (h) { orig = h; return P.PDFDocument.load(pdfBytes); }).then(function (doc) {
        var page = doc.getPage(0), s = page.getSize(), w = s.width * 0.28, h = w * sg.height / sg.width;
        return doc.embedPng(sg.toDataURL("image/png")).then(function (png) {
          page.drawImage(png, { x: pos[0] * s.width - w / 2, y: s.height - pos[1] * s.height - h / 2, width: w, height: h });
          return doc.embedFont(P.StandardFonts.Helvetica);
        }).then(function (f) {
          page.drawText("Signed with SealMind AI | " + now + " | original SHA-256 " + orig.slice(0, 24) + "...", { x: 24, y: 14, size: 7, font: f, color: P.rgb(0.3, 0.3, 0.3) });
          doc.setSubject("Signed with SealMind AI"); doc.setKeywords(["sealmind", "sha256:" + orig, "signed:" + now]); return doc.save();
        });
      }).then(function (out) {
        return sha(out).then(function (sh) {
          dl(out, fname.replace(/\.pdf$/i, "") + "-signed.pdf", "application/pdf");
          return P.PDFDocument.create().then(function (c) {
            return c.embedFont(P.StandardFonts.Helvetica).then(function (f) {
              var p = c.addPage([595, 420]), L = ["SEALMIND AI - SIGNING CERTIFICATE", "", "Issued: " + now, "Time zone: " + Intl.DateTimeFormat().resolvedOptions().timeZone, "File: " + fname, "Original SHA-256:", orig, "Signed SHA-256:", sh, "Device: " + navigator.userAgent.slice(0, 80), "", "Computed locally in the browser. Any later change to the signed file changes its hash."];
              L.forEach(function (t, i) { p.drawText(t, { x: 40, y: 380 - i * 24, size: i ? (t.length > 60 ? 8 : 10) : 14, font: f }); }); return c.save();
            });
          }).then(function (cert) { setTimeout(function () { dl(cert, "sealmind-certificate.pdf", "application/pdf"); }, 600); st("Done. Signed PDF and certificate downloaded."); });
        });
      });
    }).catch(function (e) { st("Failed: " + e.message); });
  };
})();
