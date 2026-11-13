(function () {
  "use strict";
  // 1920x1080, 10.04s, 241 frames, all-intra: every frame is a keyframe, so a scroll scrub lands on any exact frame instantly.
  var VIDEO_URL = "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/45567745-d826-44a2-a5ce-7ef670944e60.mp4";
  var $ = function (id) { return document.getElementById(id); };
  function hdr() { var h = { "Content-Type": "application/json" }; try { var k = sessionStorage.getItem("sm_key"); if (k) h["x-user-key"] = k; } catch (e) {} return h; }
  var clip = $("clip"), boot = $("boot"), bootBar = $("bootBar"), bootPct = $("bootPct"), meter = $("meter"), track = $("track"), hint = $("hint");
  var panels = [].slice.call(document.querySelectorAll("[data-panel]"));
  // Dead zones between cues keep two panels from being readable at once.
  var CUES = [[0, 0, 0.15, 0.23], [0.3, 0.38, 0.5, 0.58], [0.66, 0.74, 0.86, 0.94]];
  var DRIFT = 22, progress = 0, seekTo = 0, seekAt = 0, duration = 0, ready = false, started = false, attached = false;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function ramp(p, a, b) { return b <= a ? (p >= b ? 1 : 0) : smooth(clamp((p - a) / (b - a), 0, 1)); }
  function readScroll() {
    var max = track.offsetHeight - window.innerHeight;
    progress = max > 0 ? clamp(window.pageYOffset / max, 0, 1) : 0;
    if (duration) seekTo = progress * duration;
  }
  function paint() {
    meter.style.transform = "scaleX(" + clamp(window.pageYOffset / Math.max(1, document.documentElement.scrollHeight - window.innerHeight), 0, 1) + ")";
    hint.style.opacity = progress >= 0.98 ? 0 : 1;
    panels.forEach(function (el, i) {
      var c = CUES[i], enter = ramp(progress, c[0], c[1]), leave = ramp(progress, c[2], c[3]);
      var o = enter * (1 - leave), y = (1 - enter) * DRIFT - leave * DRIFT;
      el.style.opacity = o; el.style.transform = "translate3d(0," + y + "px,0)"; el.style.pointerEvents = o > 0.6 ? "auto" : "none";
    });
  }
  function frame() {
    if (ready && duration) {
      var gap = seekTo - seekAt;
      if (Math.abs(gap) > 0.0008) {
        seekAt += gap * 0.115; // easing turns a jumpy scrub into a smooth one
        if (clip.readyState >= 2 && !clip.seeking) { try { clip.currentTime = seekAt; } catch (e) {} }
      }
    }
    paint(); requestAnimationFrame(frame);
  }
  function setProgress(f) { bootBar.style.transform = "scaleX(" + f + ")"; bootPct.textContent = "LOADING " + Math.round(f * 100) + "%"; }
  function start() { if (started) return; started = true; ready = true; boot.classList.add("done"); readScroll(); seekAt = seekTo; }
  function attach(src) {
    if (attached) return; attached = true;
    clip.addEventListener("loadedmetadata", function () { duration = clip.duration || 0; clip.pause(); readScroll(); seekAt = seekTo; try { clip.currentTime = seekAt; } catch (e) {} });
    clip.addEventListener("loadeddata", start); clip.addEventListener("canplaythrough", start); clip.addEventListener("error", start);
    clip.src = src; clip.load(); setTimeout(start, 12000); // a stalled decode never strands the page behind the preloader
  }
  // Buffer the mp4 as a blob first: seeking inside a blob is near instant, range requests over the network are a slideshow.
  function preload() {
    var ctl = window.AbortController ? new AbortController() : null;
    var bail = setTimeout(function () { if (!attached) { if (ctl) ctl.abort(); setProgress(1); attach(VIDEO_URL); } }, 15000);
    fetch(VIDEO_URL, ctl ? { signal: ctl.signal } : {}).then(function (res) {
      if (!res.ok || !res.body) throw new Error("bad response");
      var total = +res.headers.get("content-length") || 0, got = 0, chunks = [], rd = res.body.getReader();
      return (function pump() {
        return rd.read().then(function (r) {
          if (r.done) return new Blob(chunks, { type: "video/mp4" });
          chunks.push(r.value); got += r.value.length; setProgress(total ? got / total : Math.min(got / 11e6, 0.95)); return pump();
        });
      })();
    }).then(function (blob) { clearTimeout(bail); setProgress(1); attach(URL.createObjectURL(blob)); })
      .catch(function () { clearTimeout(bail); setProgress(1); attach(VIDEO_URL); });
  }
  // iOS will not paint a frame from a video that was never played: nudge once, pause at once.
  function unlock() { var p = clip.play(); if (p && p.then) p.then(function () { clip.pause(); }).catch(function () {}); else clip.pause(); }
  ["touchstart", "pointerdown", "wheel", "keydown"].forEach(function (ev) { window.addEventListener(ev, unlock, { once: true, passive: true }); });

  var lastRes = null;
  /* ---------- Risk lab ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function localScan(t) { // offline fallback when the API is not deployed
    var rules = [[/without notice|at any time/i, "Termination", "high", "One side can exit instantly."], [/penalt/i, "Penalty", "high", "Large exit costs."], [/unlimited/i, "Liability", "high", "Uncapped exposure."], [/auto-?renew/i, "Auto-renewal", "medium", "Locks you in unless cancelled early."], [/assign/i, "IP assignment", "medium", "Check what IP transfers."]];
    var cl = rules.filter(function (r) { return r[0].test(t); }).map(function (r) { return { title: r[1], risk: r[2], note: r[3] }; });
    return { risk_score: Math.min(95, 20 + cl.length * 18), summary: "Offline keyword scan (deploy the API for full AI analysis).", clauses: cl, obligations: [], suggested_redline: "", provider: "local" };
  }
  function render(d) { lastRes = d; $("cert").disabled = false;
    var h = '<div class="score">' + esc(d.risk_score) + '<span class="small"> / 100 risk · ' + esc(d.provider) + (d.model ? " · " + esc(d.model) : "") + "</span></div><p style='margin:10px 0'>" + esc(d.summary) + "</p>";
    (d.clauses || []).forEach(function (c) { h += '<div class="clause"><span class="tag ' + esc(c.risk) + '">' + esc(c.risk) + "</span><b>" + esc(c.title) + "</b><br>" + esc(c.note) + "</div>"; });
    if (d.obligations && d.obligations.length) h += '<div class="clause"><b>Obligations</b><br>' + d.obligations.map(esc).join("<br>") + "</div>";
    if (d.suggested_redline) h += '<div class="clause"><b>Suggested redline</b><br>' + esc(d.suggested_redline) + "</div>";
    $("out").innerHTML = h;
  }
  $("go").onclick = function () {
    var t = $("src").value, stat = $("stat"); stat.textContent = "Analyzing…";
    fetch("/api/analyze", { method: "POST", headers: hdr(), body: JSON.stringify({ text: t }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Request failed"); return j; }); })
      .then(function (d) { render(d); stat.textContent = ""; })
      .catch(function (e) { render(localScan(t)); stat.textContent = "AI unavailable (" + e.message + "). Showing offline scan."; });
  };
  $("hash").onclick = function () {
    var buf = new TextEncoder().encode($("src").value);
    crypto.subtle.digest("SHA-256", buf).then(function (h) {
      var hex = [].map.call(new Uint8Array(h), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      $("out").innerHTML = "<b>SHA-256 seal</b><p class='small' style='word-break:break-all;margin-top:8px'>" + hex + "</p><p class='small' style='margin-top:8px'>Computed in your browser at " + new Date().toISOString() + ". Change one character and the hash changes completely.</p>";
    });
  };

  /* ---------- Seal chatbot, key auto-detect, selection, files ---------- */
  var chat = $("chat"), log = $("log"), hist = [], selText = "", selT, fileMeta = null;
  function hexOf(h) { return [].map.call(new Uint8Array(h), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); }
  function openChat(o) { var s = chat.classList.toggle("open", o); $("fab").setAttribute("aria-expanded", s); if (s) $("ci").focus(); }
  $("fab").onclick = function () { openChat(); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") openChat(false); });
  function add(cls, txt) { var d = document.createElement("div"); d.className = "m " + cls; d.textContent = txt; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function send(v) {
    add("u", v.length > 220 ? v.slice(0, 220) + "…" : v); hist.push({ role: "user", content: v }); var w = add("a", "…");
    fetch("/api/chat", { method: "POST", headers: hdr(), body: JSON.stringify({ messages: hist }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Request failed"); return j; }); })
      .then(function (j) { w.textContent = j.reply; hist.push({ role: "assistant", content: j.reply }); $("prov").textContent = j.provider + " · " + j.model; })
      .catch(function (er) { hist.pop(); w.textContent = "I can't reach the AI: " + er.message; });
  }
  $("cf").onsubmit = function (e) { e.preventDefault(); var i = $("ci"), v = i.value.trim(); if (v) { i.value = ""; send(v); } };
  $("chips").onclick = function (e) { var b = e.target.closest("button[data-q]"); if (!b) return; openChat(true); send(b.getAttribute("data-q") + "\n\n" + (selText || $("src").value).slice(0, 1500)); };
  // Key auto-detect: the prefix identifies the provider, the server then auto-selects the best live model.
  var uk = $("ukey"), kd = $("kdet");
  function det(k) { return k.indexOf("gsk_") === 0 ? "Groq" : k.indexOf("AIza") === 0 ? "Gemini" : ""; }
  try { uk.value = sessionStorage.getItem("sm_key") || ""; } catch (e) {}
  function kshow() { var d = det(uk.value.trim()); kd.textContent = uk.value ? (d ? "Detected " + d + ". Model is auto-selected. Kept in this tab only." : "Key format not recognised.") : "Using server keys."; }
  uk.oninput = function () { var k = uk.value.trim(); try { if (k && det(k)) sessionStorage.setItem("sm_key", k); else sessionStorage.removeItem("sm_key"); } catch (e) {} kshow(); };
  kshow(); $("keyb").onclick = function () { var b = $("keybox"); b.hidden = !b.hidden; };
  fetch("/api/health").then(function (r) { return r.json(); }).then(function (j) { var p = j.providers && j.providers[0]; if (p && p.model) $("prov").textContent = p.provider + " · " + p.model; }).catch(function () {});
  // Highlight any text on the page (or in the contract box) and ask Seal about it.
  document.addEventListener("selectionchange", function () {
    clearTimeout(selT);
    selT = setTimeout(function () {
      var s = window.getSelection(), t = s ? s.toString().trim() : "", ta = $("src");
      if (document.activeElement === ta) t = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
      if (t.length >= 15 && !(s && s.anchorNode && chat.contains(s.anchorNode))) { selText = t.slice(0, 1200); $("sel").hidden = false; setTimeout(function () { $("sel").hidden = true; }, 9000); }
    }, 250);
  });
  $("sel").onclick = function () { openChat(true); send("Explain this in plain English and flag any risk:\n\n" + selText); this.hidden = true; };
  // Files: SHA-256 of any file up to 50 MB; text files also load into the analyzer.
  $("file").onchange = function () {
    var f = this.files[0]; if (!f) return;
    if (f.size > 50 * 1024 * 1024) { $("out").textContent = "File is over the 50 MB limit."; return; }
    var isText = /^text\//.test(f.type) || /\.(txt|md)$/i.test(f.name);
    f.arrayBuffer().then(function (buf) { return crypto.subtle.digest("SHA-256", buf); }).then(function (h) {
      var hex = hexOf(h); fileMeta = { name: f.name, size: f.size, sha256: hex };
      $("out").innerHTML = "<b>" + esc(f.name) + "</b><p class='small' style='word-break:break-all;margin-top:8px'>SHA-256: " + hex + "</p><p class='small' style='margin-top:8px'>" + (isText ? "Text loaded. Press Analyze risk." : "PDF text extraction belongs to the full backend. Paste the clause text to analyze.") + "</p>";
      $("cert").disabled = false;
    });
    if (isText) f.text().then(function (t) { $("src").value = t.slice(0, 6000); });
  };
  $("cert").onclick = function () {
    crypto.subtle.digest("SHA-256", new TextEncoder().encode($("src").value)).then(function (h) {
      var c = { issuer: "SealMind AI", algorithm: "SHA-256", document: fileMeta, text_sha256: hexOf(h), analysis: lastRes, issued_at: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, user_agent: navigator.userAgent };
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2)], { type: "application/json" })); a.download = "sealmind-certificate.json"; a.click();
    });
  };

  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", readScroll);
  readScroll(); paint(); preload(); requestAnimationFrame(frame);
})();
