(function () {
  "use strict";
  var $ = function (i) { return document.getElementById(i); };
  var ITEMS = [["How it works", "#how"], ["Vault search", "#vault"], ["Agents", "#agents"], ["Sign a PDF", "#sign"], ["Compare contracts", "#compare"], ["Risk lab", "#lab"], ["Security", "#security"], ["FAQ", "#faq"], ["Builder", "#builder"], ["Ask Seal", "chat"], ["Email Nikhil", "mailto:sriramojunikhil66@gmail.com"], ["GitHub", "https://github.com/Nikhil-creat"]];
  var pal = $("pal"), pq = $("pq"), pl = $("pl");
  function render(q) {
    q = (q || "").toLowerCase(); pl.innerHTML = "";
    ITEMS.filter(function (i) { return i[0].toLowerCase().indexOf(q) > -1; }).forEach(function (i) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = i[0]; b.onclick = function () { go(i[1]); }; pl.appendChild(b);
    });
  }
  function go(t) {
    closeP();
    if (t === "chat") $("fab").click();
    else if (t.charAt(0) === "#") document.querySelector(t).scrollIntoView();
    else if (t.indexOf("mailto:") === 0) location.href = t;
    else window.open(t, "_blank", "noopener");
  }
  function openP() { pal.hidden = false; pq.value = ""; render(""); pq.focus(); }
  function closeP() { pal.hidden = true; }
  $("menub").onclick = openP;
  pal.onclick = function (e) { if (e.target === pal) closeP(); };
  pq.oninput = function () { render(pq.value); };
  pq.onkeydown = function (e) { if (e.key === "Enter") { var f = pl.querySelector("button"); if (f) f.click(); } };
  document.addEventListener("keydown", function (e) {
    var t = e.target.tagName;
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t))) { e.preventDefault(); openP(); }
    else if (e.key === "Escape") closeP();
  });
})();
