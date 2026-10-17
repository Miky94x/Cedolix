const $ = (s) => document.querySelector(s);
async function boot() {
  try {
    const raw = await kvGet("state");
    if (raw) S = JSON.parse(raw);
  } catch (e) {
    ro = true;
    S = JSON.parse(JSON.stringify(def));
    banner(
      "Impossibile leggere i dati salvati: il salvataggio è disattivato per non sovrascriverli. Riavvia l'app o ripristina un backup.",
    );
  }
  if (norm()) save();
  applyTema();
  render();
  if (!ro && !S.set.whOk) askWh();
  autoReread();
  try {
    if (navigator.storage && navigator.storage.persist)
      navigator.storage.persist();
  } catch (e) {
    warn(e);
  }
}
let tab = "h",
  cur = new Date();
cur.setDate(1);
let keep = 0;
function render() {
  const sy = window.scrollY;
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.classList.toggle("on", b.dataset.t === tab));
  $("#app").innerHTML = { h: vHome, m: vCal, f: vFerie, p: vPay2, s: vSet }[
    tab
  ]();
  ({ h: bHome, m: bCal, f: () => {}, p: bPay2, s: bSet })[tab]();
  window.scrollTo(0, keep ? sy : 0);
  keep = 0;
}
function vFerie() {
  const f = ferie(),
    l = f.l;
  if (!l || f.ore == null)
    return `<div class="card"><p style="color:var(--mu)">Carica una busta paga: ferie, permessi ed ex-festività vengono letti direttamente dal cedolino.</p></div>`;
  const row = (lab, val, cls, sub) =>
      `<div class="fr ${cls || ""}"><div>${lab}${sub ? `<small>${sub}</small>` : ""}</div><b>${val}</b></div>`,
    mese = perLab(l.per, "ultima busta"),
    dal = "secondo la busta di " + mese,
    dopo = f.lim
      ? " · dopo il " + f.lim.slice(8) + "/" + f.lim.slice(5, 7)
      : "",
    ore = (v) => (v == null ? "—" : fmt(v) + " ore"),
    god = (v) => (v == null ? "—" : (v ? "-" : "") + fmt(Math.abs(v)) + " ore"),
    sum = (a, b) => (a == null && b == null ? null : (a || 0) + (b || 0)),
    pAP = sum(l.exAP, l.permAP),
    pMat = sum(l.exMat, l.permMat),
    pGod = sum(l.exGodAnno, l.permGodAnno);
  return `<div class="hero"><small>Ancora da usare</small><div class="big">${f.sett == null ? "—" : fmt1(f.sett) + " settimane"}</div><small>${fmt(f.gg)} giorni · ${fmtH(f.ore)} in totale<br>(ferie + permessi + ex-festività)</small></div>
<div class="card"><h3 class="fh">Ferie</h3>
${row("Residuo AP", ore(l.ferieAP))}
${row("Maturato", ore(l.ferieMat))}
${row("Goduto", god(l.ferieGodAnno))}
${row("Saldo", ore(f.fer), "tt", dal)}
${f.usati ? row("Segnate dopo la busta", "-" + fmtH(f.uo), "", f.usati + (f.usati === 1 ? " giorno" : " giorni") + dopo) : ""}</div>
<div class="card"><h3 class="fh">Permessi ed ex-festività</h3>
${row("Residuo AP", ore(pAP))}
${row("Maturato", ore(pMat))}
${row("Goduto", god(pGod))}
${row("Saldo", ore(f.pe), "tt", dal)}
${f.usatiP ? row("Segnati dopo la busta", "-" + fmtH(f.up), "", f.usatiP + (f.usatiP === 1 ? " giorno" : " giorni") + dopo) : ""}</div>`;
}
function vSet() {
  const s = S.set,
    yy = new Date().getFullYear(),
    sp = s.patroni[yy],
    bd = s.lastBackup ? new Date(s.lastBackup) : null,
    old = !bd || isNaN(bd) || Date.now() - bd > 30 * 864e5;
  return `<h2>Impostazioni</h2><div class="set">
<div class="sec">Contratto</div>
<div class="card"><div class="fr"><div>Ore settimanali<small>Da contratto, base per ore previste e ferie</small></div><input type="number" step="0.25" inputmode="decimal" id="wh" value="${s.wh}"></div>
<div class="fr"><div>Data di assunzione<small>${s.hire ? "Letta dalla busta paga" : "Verrà letta dalla prima busta caricata"}</small></div><b>${s.hire ? esc(dIt(s.hire)) : "—"}</b></div></div>
<div class="sec">Calendario</div>
<div class="card"><div class="fr"><div>Santo patrono ${yy}<small>Ogni anno ha la sua data</small></div><input type="date" id="pa" value="${sp ? yy + "-" + sp : ""}"></div></div>
<div class="sec">Aspetto</div>
<div class="card"><button type="button" class="tpk" id="tc"><span>Colore tema<small>Tocca per cambiarlo</small></span><i id="tsw" style="background:${s.tema || "#831fca"}"></i></button><button class="b s wide" id="tr">Ripristina colore</button></div>
<button class="b wide" id="sv">Salva impostazioni</button><p id="ms" class="msg"></p>
<div class="sec">Dati</div>
<div class="card"><div class="fr"><div>Ultimo backup<small>Dati e PDF delle buste in un file ZIP</small></div><b id="bl" class="${old ? "neg" : "pos"}" style="font-size:14px">${fdt(s.lastBackup)}</b></div>
<div class="grid" style="margin-top:10px"><button class="b" id="bk">Esporta backup</button><button class="b s" id="rs">Ripristina</button></div>
<button class="b s wide" id="rr" style="margin-top:8px">Rileggi buste dai PDF</button>
<button class="b s wide" id="tp" style="margin-top:8px">Importa timbrature (PDF)</button>
<p class="note">Ripristinando, tutti i dati attuali vengono sostituiti.</p><p id="bm" style="margin:8px 0 0"></p></div></div>
<div class="card ver">Cedolix V${V}</div>`;
}
function colorModal(init, onChange) {
  const cl = (v) => Math.max(0, Math.min(1, v)),
    toRgb = (h, s, v) => {
      const c = v * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = v - c,
        [r, g, b] = [
          [c, x, 0],
          [x, c, 0],
          [0, c, x],
          [0, x, c],
          [x, 0, c],
          [c, 0, x],
        ][Math.min(5, Math.floor(h / 60))];
      return [r + m, g + m, b + m];
    },
    toHex = (h, s, v) =>
      "#" +
      toRgb(h, s, v)
        .map((x) =>
          Math.round(x * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join(""),
    toHsv = (hex) => {
      const [r, g, b] = [1, 3, 5].map(
          (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
        ),
        mx = Math.max(r, g, b),
        d = mx - Math.min(r, g, b);
      let h = 0;
      if (d)
        h =
          mx === r
            ? ((g - b) / d + 6) % 6
            : mx === g
              ? (b - r) / d + 2
              : (r - g) / d + 4;
      return [h * 60, mx ? d / mx : 0, mx];
    };
  let [H, Sa, V] = toHsv(init);
  modal(
    `<h3>Colore tema</h3><div class="cps" id="cs"><i id="ck"></i></div><div class="chh" id="ch"><i id="chk"></i></div><div class="row" style="margin:16px 0"><i class="cpv" id="cp"></i><input id="cx" maxlength="7" autocapitalize="off" autocomplete="off" spellcheck="false" style="flex:1;min-width:0"></div><div class="row"><button class="b" id="cok">Fine</button></div>`,
    (m, close) => {
      const q = (i) => m.querySelector(i),
        upd = (skipInput) => {
          const hex = toHex(H, Sa, V);
          q("#cs").style.background =
            `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${toHex(H, 1, 1)})`;
          q("#ck").style.left = Sa * 100 + "%";
          q("#ck").style.top = (1 - V) * 100 + "%";
          q("#chk").style.left = (H / 360) * 100 + "%";
          q("#cp").style.background = hex;
          if (!skipInput) q("#cx").value = hex;
          onChange(hex);
        },
        drag = (el, fn) => {
          const mv = (e) => {
            const r = el.getBoundingClientRect();
            fn(
              cl((e.clientX - r.left) / r.width),
              cl((e.clientY - r.top) / r.height),
            );
            upd();
          };
          el.onpointerdown = (e) => {
            el.setPointerCapture(e.pointerId);
            mv(e);
            el.onpointermove = mv;
          };
          el.onpointerup = el.onpointercancel = () => (el.onpointermove = null);
        };
      drag(q("#cs"), (x, y) => {
        Sa = x;
        V = 1 - y;
      });
      drag(q("#ch"), (x) => {
        H = Math.min(359.99, x * 360);
      });
      q("#cx").oninput = (e) => {
        let v = e.target.value.trim();
        if (v[0] !== "#") v = "#" + v;
        if (/^#[0-9a-f]{6}$/i.test(v)) {
          [H, Sa, V] = toHsv(v);
          upd(true);
        }
      };
      q("#cok").onclick = close;
      upd();
    },
  );
}
function applyTema() {
  const c = S.set.tema,
    r = document.documentElement.style,
    k = ["--ac", "--hero", "--on", "--onh"];
  if (c && /^#[0-9a-f]{6}$/i.test(c)) {
    const v = [1, 3, 5].map((i) => {
        const x = parseInt(c.slice(i, i + 2), 16) / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      }),
      L = 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2],
      on = L > 0.4 ? "#000" : "#fff";
    r.setProperty("--ac", c);
    r.setProperty("--hero", c);
    r.setProperty("--on", on);
    r.setProperty("--onh", on);
  } else {
    k.forEach((p) => r.removeProperty(p));
  }
}
const bmsg = (t, bad) => {
  const e = $("#bm");
  if (e) {
    e.textContent = t;
    e.style.color = bad ? "#dc2626" : "var(--ac)";
  }
};
const fdt = (s) => {
  if (!s) return "mai";
  const d = new Date(s);
  return isNaN(d)
    ? "mai"
    : d.toLocaleDateString("it-IT") +
        " " +
        d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
};
async function doBackup() {
  if (typeof JSZip === "undefined")
    return bmsg("Libreria ZIP non disponibile (serve la connessione).", 1);
  bmsg("Creazione backup…");
  try {
    const now = new Date(),
      z = new JSZip(),
      fo = z.folder("pdf");
    let n = 0;
    z.file(
      "dati.json",
      JSON.stringify(
        { app: "Cedolix", versione: V, data: now.toISOString(), stato: S },
        null,
        1,
      ),
    );
    for (const p of S.pay) {
      if (!p.pdf) continue;
      try {
        const b = await pdfGet(p.id);
        if (b) {
          fo.file((p.per || "senza-periodo") + "_" + p.id + ".pdf", b);
          n++;
        }
      } catch (e) {
    warn(e);
  }
    }
    const blob = await z.generateAsync({
        type: "blob",
        compression: "DEFLATE",
      }),
      name = "cedolix-backup-" + iso(now) + ".zip",
      file = new File([blob], name, { type: "application/zip" });
    let done = false;
    if (
      matchMedia("(pointer:coarse)").matches &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({ files: [file] });
        done = true;
      } catch (e) {
        if (e.name === "AbortError") return bmsg("");
      }
    }
    if (!done) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    }
    S.set.lastBackup = now.toISOString();
    save();
    const l = $("#bl");
    if (l) {
      l.textContent = fdt(S.set.lastBackup);
      l.className = "pos";
    }
    bmsg("Backup creato ✓ (" + S.pay.length + " buste, " + n + " PDF)");
  } catch (e) {
    bmsg("Errore nella creazione del backup.", 1);
  }
}
let rereading = false;
async function rereadAll() {
  const L = S.pay.filter((p) => p.pdf),
    r = { ok: 0, ch: 0, ko: 0, nopdf: S.pay.length - L.length };
  if (rereading || !L.length) return r;
  rereading = true;
  try {
    r.snap = JSON.stringify(S);
    for (const p of L) {
      try {
        const buf = await pdfGet(p.id);
        if (!buf) {
          r.ko++;
          continue;
        }
        const R = parse2(await readPdf2(buf)),
          man = p.man || [];
        let c = false;
        for (const [k] of FD) {
          if (k === "per" || man.includes(k)) continue;
          const v = R[k];
          if (v == null || v === "") continue;
          if (p[k] !== v) {
            p[k] = v;
            c = true;
          }
        }
        if (R.voci && JSON.stringify(p.voci) !== JSON.stringify(R.voci)) {
          p.voci = R.voci;
          c = true;
        }
        r.ok++;
        if (c) r.ch++;
      } catch (e) {
        r.ko++;
      }
    }
    if (r.ok) {
      save();
      if (tab !== "s") {
        keep = 1;
        render();
      }
    }
  } finally {
    rereading = false;
  }
  return r;
}
function annullaReread(snap) {
  S = JSON.parse(snap);
  norm();
  S.set.parseV = PV;
  save();
  keep = 1;
  render();
}
async function autoReread() {
  if (ro || S.set.parseV === PV) return;
  if (!S.pay.some((p) => p.pdf)) {
    S.set.parseV = PV;
    save();
    return;
  }
  if (typeof pdfjsLib === "undefined") return;
  const r = await rereadAll();
  if (r.ok) {
    S.set.parseV = PV;
    save();
    if (r.ch)
      toast(
        "Buste aggiornate con la nuova lettura (" + r.ch + ").",
        "Annulla",
        () => annullaReread(r.snap),
      );
  }
}
function askReread() {
  const n = S.pay.filter((p) => p.pdf).length;
  if (typeof pdfjsLib === "undefined")
    return bmsg("Libreria PDF non disponibile (serve la connessione).", 1);
  if (!n) return bmsg("Nessun PDF conservato da rileggere.", 1);
  confirmBox(
    "Rileggere le buste?",
    `Verranno rilette <b>${n}</b> buste dai PDF salvati. I valori letti sostituiscono quelli salvati, tranne i campi che hai corretto a mano al momento del caricamento. Se vuoi essere al sicuro, esporta prima un backup.`,
    "Rileggi",
    async () => {
      bmsg("Rilettura in corso…");
      const r = await rereadAll();
      bmsg(
        r.ok
          ? "Rilette " +
              r.ok +
              " buste, " +
              r.ch +
              " aggiornate ✓" +
              (r.ko ? " · " + r.ko + " non lette" : "") +
              (r.nopdf ? " · " + r.nopdf + " senza PDF" : "")
          : "Nessuna busta riletta.",
        !r.ok,
      );
      if (r.ok) {
        S.set.parseV = PV;
        save();
        if (r.ch)
          toast("Buste aggiornate.", "Annulla", () => annullaReread(r.snap));
      }
    },
  );
}
function parseTim(pg) {
  const txt = pg.map((p) => p.txt).join("\n"),
    re = /Giorno:\s*(\d{2})\/(\d{2})\/(\d{4})|\b(\d{2}):(\d{2})\s+(Entrata|Uscita)/gi,
    hm = (x) => {
      x = ((x % 1440) + 1440) % 1440;
      return String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0");
    },
    D = {};
  let k = null, open = null, bad = 0, m;
  while ((m = re.exec(txt))) {
    if (m[1]) { k = m[3] + "-" + m[2] + "-" + m[1]; continue; }
    if (!k) { bad++; continue; }
    const t = +m[4] * 60 + +m[5];
    if (/^e/i.test(m[6])) {
      if (open) bad++;
      open = { k, t };
    } else {
      const dd = open ? Math.round((pd(k) - pd(open.k)) / 864e5) : 9;
      if (!open || dd < 0 || dd > 1) { bad++; open = null; continue; }
      const tt = t + dd * 1440,
        a = Math.ceil((open.t - 5) / 15) * 15,
        b = Math.max(a, Math.floor(tt / 15) * 15);
      (D[open.k] = D[open.k] || []).push({
        a: hm(a), b: hm(b), p: 0, e: hm(open.t), u: hm(t),
      });
      open = null;
    }
  }
  if (open) bad++;
  return { D, bad };
}
function pickTim() {
  if (typeof pdfjsLib === "undefined")
    return bmsg("Libreria PDF non disponibile (serve la connessione).", 1);
  const i = document.createElement("input");
  i.type = "file";
  i.accept = "application/pdf";
  i.multiple = true;
  i.onchange = () => i.files.length && importTim([...i.files]);
  i.click();
}
async function importTim(files) {
  bmsg("Lettura timbrature…");
  try {
    const M = {};
    let bad = 0;
    for (const f of files) {
      const pg = await readPdf2(f);
      if (pg.map((p) => p.txt).join("").trim().length < 30)
        return bmsg("Nessun testo trovato: serve un PDF digitale.", 1);
      const r = parseTim(pg);
      bad += r.bad;
      for (const k in r.D) {
        const a = (M[k] = M[k] || []);
        r.D[k].forEach((t) => {
          if (!a.some((z) => z.e === t.e && z.u === t.u)) a.push(t);
        });
      }
    }
    const ks = Object.keys(M).sort();
    if (!ks.length) return bmsg("Nessuna timbratura trovata nel PDF.", 1);
    ks.forEach((k) => {
      M[k].sort((x, y) => (x.e < y.e ? -1 : x.e > y.e ? 1 : 0));
      (S.days[k] = S.days[k] || {}).tim = M[k];
    });
    save();
    bmsg(
      "Importati " + ks.length + " giorni (" + dIt(ks[0]) + " → " + dIt(ks[ks.length - 1]) + ") ✓" +
        (bad ? " · " + bad + " timbrature scartate (senza coppia)" : ""),
    );
  } catch (e) {
    bmsg("Errore nella lettura delle timbrature.", 1);
  }
}
function timTab(T, man) {
  const tm = (v) => +v.slice(0, 2) * 60 + +v.slice(3, 5),
    mi = (t) => {
      let m = tm(t.b) - tm(t.a);
      return m < 0 ? m + 1440 : m;
    },
    tot = T.reduce((z, t) => z + mi(t), 0),
    df = man != null ? tot / 60 - man : null;
  return `<h4 class="sh">Timbrato</h4><table class="tb"><thead><tr><th>Timbrata</th><th>Turno</th><th>Durata</th></tr></thead><tbody>${T.map((t) => `<tr><td>${t.e} – ${t.u}</td><td>${t.a} – ${t.b}</td><td><b>${fmtH(mi(t) / 60)}</b></td></tr>`).join("")}</tbody><tfoot><tr><td colspan="2">Totale</td><td><b>${fmtH(tot / 60)}</b></td></tr>${df != null ? `<tr><td colspan="2">Differenza col turno inserito</td><td><b class="${Math.abs(df) < 0.01 ? "pos" : "neg"}">${df > 0 ? "+" : ""}${fmtH(df)}</b></td></tr>` : ""}</tfoot></table>`;
}
function pickRestore() {
  const i = document.createElement("input");
  i.type = "file";
  i.accept = ".zip,application/zip";
  i.onchange = () => i.files[0] && doRestore(i.files[0]);
  i.click();
}
async function doRestore(f) {
  if (typeof JSZip === "undefined")
    return bmsg("Libreria ZIP non disponibile (serve la connessione).", 1);
  let z, D;
  try {
    z = await JSZip.loadAsync(f);
    D = JSON.parse(await z.file("dati.json").async("string")).stato;
    if (!D || !Array.isArray(D.pay) || typeof D.days !== "object" || !D.days)
      throw 0;
  } catch (e) {
    return bmsg("File non valido: non è un backup di Cedolix.", 1);
  }
  if ((D.v || 1) > SCHEMA)
    return bmsg(
      "Questo backup è stato creato da una versione più recente di Cedolix: aggiorna l'app prima di ripristinarlo.",
      1,
    );
  const files = z.file(/\.pdf$/i);
  confirmBox(
    "Ripristinare il backup?",
    `Il backup contiene <b>${D.pay.length}</b> buste e <b>${files.length}</b> PDF. Tutti i dati attuali verranno sostituiti. L'operazione non si può annullare.`,
    "Ripristina",
    async () => {
      try {
        bmsg("Ripristino in corso…");
        const pdfs = {};
        for (const e of files) {
          const m = e.name.match(/_(\d+)\.pdf$/i);
          if (m) pdfs[m[1]] = await e.async("arraybuffer");
        }
        await pdfClear();
        for (const p of D.pay) {
          if (pdfs[p.id]) {
            await pdfPut(p.id, pdfs[p.id]);
            p.pdf = true;
          } else delete p.pdf;
        }
        S = D;
        chkCache.clear();
        norm();
        await kvPut("state", JSON.stringify(S));
        ro = false;
        banner("");
        applyTema();
        keep = 0;
        render();
        bmsg("Ripristino completato ✓");
      } catch (e) {
        bmsg("Errore durante il ripristino.", 1);
      }
    },
  );
}
function askWh() {
  modal(
    `<h3>Quante ore a settimana lavori?</h3><p style="color:var(--mu);margin:0 0 16px">Inserisci le ore settimanali del tuo contratto: le trovi in busta paga o nel contratto di lavoro. Servono per calcolare ore previste, ferie e permessi.</p><input type="number" inputmode="decimal" step="0.25" min="1" max="60" id="aw" placeholder="es. 40" value="${S.set.wh || ""}" style="width:100%;font-size:24px;text-align:center;padding:12px"><p style="color:var(--mu);margin:12px 0 0;text-align:center">Potrai modificarle più avanti da Altro, in Impostazioni.</p><p id="awe" class="neg" style="margin:8px 0 0;min-height:1.3em"></p><div class="row" style="margin-top:12px"><button class="b" id="awo">Conferma</button></div>`,
    (m, close) => {
      m.parentElement.onclick = null;
      m.parentElement.classList.add("full");
      m.classList.add("full");
      const i = m.querySelector("#aw"),
        ok = () => {
          const v = parseFloat(String(i.value).replace(",", "."));
          if (!(v >= 1 && v <= 60)) {
            m.querySelector("#awe").textContent =
              "Inserisci un numero di ore tra 1 e 60.";
            return;
          }
          S.set.wh = v;
          S.set.whOk = true;
          save();
          close();
          render();
          if (window.cedInstall) setTimeout(window.cedInstall, 300);
        };
      m.querySelector("#awo").onclick = ok;
      i.onkeydown = (e) => {
        if (e.key === "Enter") ok();
      };
    },
  );
}
let msT;
function saveSet() {
  const s = S.set,
    yy = new Date().getFullYear();
  s.wh = +$("#wh").value || 0;
  if (s.wh) s.whOk = true;
  if ($("#pa").value) s.patroni[yy] = $("#pa").value.slice(5);
  else delete s.patroni[yy];
  save();
}
function setDirty() {
  if (tab !== "s" || !$("#wh")) return false;
  const s = S.set,
    yy = new Date().getFullYear();
  return (
    (+$("#wh").value || 0) !== (+s.wh || 0) ||
    ($("#pa").value ? $("#pa").value.slice(5) : "") !== (s.patroni[yy] || "")
  );
}
function askSave(go) {
  modal(
    `<h3>Salvare le modifiche?</h3><p style="color:var(--mu);margin:0 0 16px">Hai cambiato le impostazioni senza salvarle.</p><div class="row"><button class="b s" id="mc">Annulla</button><button class="b s" id="md">Scarta</button><button class="b" id="mo">Salva</button></div>`,
    (m, close) => {
      m.querySelector("#mc").onclick = close;
      m.querySelector("#md").onclick = () => {
        close();
        go();
      };
      m.querySelector("#mo").onclick = () => {
        saveSet();
        close();
        go();
      };
    },
  );
}
function bSet() {
  $("#tc").onclick = () =>
    colorModal(S.set.tema || "#831fca", (hex) => {
      S.set.tema = hex;
      applyTema();
      save();
      const w = $("#tsw");
      if (w) w.style.background = hex;
    });
  $("#tr").onclick = () => {
    delete S.set.tema;
    applyTema();
    save();
    $("#tsw").style.background = "#831fca";
  };
  $("#sv").onclick = () => {
    saveSet();
    $("#ms").textContent = "Salvato ✓";
    clearTimeout(msT);
    msT = setTimeout(() => {
      const e = $("#ms");
      if (e) e.textContent = "";
    }, 1500);
  };
  $("#bk").onclick = doBackup;
  $("#rs").onclick = pickRestore;
  $("#rr").onclick = askReread;
  $("#tp").onclick = pickTim;
}
const IC = {
  e: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  d: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  o: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};
function turniTab(T) {
  const tm = (v) => (v ? +v.slice(0, 2) * 60 + +v.slice(3, 5) : 0),
    mi = (t) => {
      let m = tm(t.b) - tm(t.a);
      if (m < 0) m += 1440;
      return Math.max(0, m - (+t.p || 0));
    },
    tot = T.reduce((z, t) => z + mi(t), 0);
  return `<table class="tb"><thead><tr><th>Turno</th><th>Entrata</th><th>Uscita</th><th>Pausa</th><th>Durata</th></tr></thead><tbody>${T.map((t, i) => `<tr><td>${i + 1}</td><td>${t.a}</td><td>${t.b}</td><td>${t.p ? t.p + " min" : "—"}</td><td><b>${fmtH(mi(t) / 60)}</b></td></tr>`).join("")}</tbody><tfoot><tr><td colspan="4">Totale</td><td><b>${fmtH(tot / 60)}</b></td></tr></tfoot></table>`;
}
function modal(html, mount) {
  const o = document.createElement("div");
  o.className = "ov";
  o.innerHTML = `<div class="sheet">${html}</div>`;
  const close = () => {
    o.remove();
    if (!document.querySelector(".ov")) document.body.style.overflow = "";
  };
  o.onclick = (e) => {
    if (e.target !== o) return;
    const sh = o.querySelector(".sheet");
    if (sh.dirty && sh.dirty())
      confirmBox(
        "Scartare le modifiche?",
        "Hai modifiche non salvate: se chiudi andranno perse.",
        "Scarta",
        close,
      );
    else close();
  };
  document.body.appendChild(o);
  document.body.style.overflow = "hidden";
  mount(o.querySelector(".sheet"), close);
}
function confirmBox(title, msg, ok, cb) {
  modal(
    `<h3>${title}</h3><p style="color:var(--mu);margin:0 0 16px">${msg}</p><div class="row"><button class="b s" id="mc">Annulla</button><button class="b dng" id="mo">${ok}</button></div>`,
    (m, close) => {
      m.querySelector("#mc").onclick = close;
      m.querySelector("#mo").onclick = () => {
        close();
        cb();
      };
    },
  );
}
let toastT;
function toast(msg, label, fn) {
  let e = document.getElementById("ts");
  if (!e) {
    e = document.createElement("div");
    e.id = "ts";
    e.className = "ts";
    document.body.appendChild(e);
  }
  clearTimeout(toastT);
  e.innerHTML =
    `<span>${esc(msg)}</span>` +
    (label ? `<button class="b">${esc(label)}</button>` : "");
  e.style.display = "flex";
  const hide = () => {
    e.style.display = "none";
  };
  if (label)
    e.querySelector("button").onclick = () => {
      hide();
      fn();
    };
  toastT = setTimeout(hide, 6000);
}
function avvisoOre() {
  modal(
    `<h3>Ore settimanali mancanti</h3><p style="color:var(--mu);margin:0 0 16px">Le ore settimanali da contratto sono a 0: ferie, permessi e malattia verrebbero segnati con 0 ore. Imposta prima le ore in Altro.</p><div class="row"><button class="b s" id="mc">Chiudi</button><button class="b" id="mo">Vai alle impostazioni</button></div>`,
    (m, close) => {
      m.querySelector("#mc").onclick = close;
      m.querySelector("#mo").onclick = () => {
        close();
        tab = "s";
        render();
      };
    },
  );
}
function hoursModal(k) {
  const d = pd(k),
    x = S.days[k] || {},
    T = (x.turni || []).map((t) => ({ a: t.a, b: t.b, p: t.p || "" }));
  if (!T.length) T.push({ a: "", b: "", p: "" });
  const init = JSON.stringify(T);
  const tm = (v) => (v ? +v.slice(0, 2) * 60 + +v.slice(3, 5) : null),
    mins = (t) => {
      const a = tm(t.a),
        b = tm(t.b);
      if (a == null || b == null) return 0;
      let m = b - a;
      if (m < 0) m += 1440;
      return Math.max(0, m - (+t.p || 0));
    },
    tot = () => T.reduce((z, t) => z + mins(t), 0),
    rows = () =>
      T.map(
        (t, i) =>
          `<div class="tr" data-i="${i}"><div class="th"><span>Turno ${i + 1}</span>${T.length > 1 ? '<button class="b s" data-rm aria-label="Rimuovi turno">✕</button>' : ""}</div><div class="tf"><label>Entrata</label><input type="time" data-f="a" value="${t.a}"></div><div class="tf"><label>Uscita</label><input type="time" data-f="b" value="${t.b}"></div><div class="tf"><label>Pausa (minuti)</label><input type="number" inputmode="numeric" min="0" step="5" data-f="p" placeholder="0" value="${t.p}"></div><div class="tf"><label>Durata</label><b class="td">${fmtH(mins(t) / 60)}</b></div></div>`,
      ).join("");
  const note =
    x.h && !x.turni && !x.t
      ? `<p style="color:var(--mu);font-size:13px;margin:0 0 10px">Questo giorno ha già ${fmtH(x.h)} registrate: salvando verranno sostituite dai turni.</p>`
      : "";
  modal(
    `<h3>Aggiungi turno · ${GF[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}</h3>${note}<div id="tl"></div><button class="b s" id="ta" style="width:100%">+ Aggiungi turno</button><div class="tot"><span>Totale ore</span><b id="tt"></b></div><p id="er" class="neg" style="margin:0 0 10px"></p><div class="row"><button class="b s" id="mc">Annulla</button><button class="b" id="ms">Salva</button></div>`,
    (m, close) => {
      m.dirty = () => JSON.stringify(T) !== init;
      const L = m.querySelector("#tl"),
        upd = () => {
          m.querySelector("#tt").textContent = fmtH(tot() / 60);
          L.querySelectorAll(".tr").forEach((r, i) => {
            r.querySelector(".td").textContent = fmtH(mins(T[i]) / 60);
          });
        },
        draw = () => {
          L.innerHTML = rows();
          upd();
        };
      L.oninput = (e) => {
        const r = e.target.closest(".tr");
        if (!r || !e.target.dataset.f) return;
        T[+r.dataset.i][e.target.dataset.f] = e.target.value;
        upd();
      };
      L.onclick = (e) => {
        const b = e.target.closest("[data-rm]");
        if (!b) return;
        T.splice(+b.closest(".tr").dataset.i, 1);
        draw();
      };
      m.querySelector("#ta").onclick = () => {
        T.push({ a: "", b: "", p: "" });
        draw();
      };
      m.querySelector("#mc").onclick = close;
      m.querySelector("#ms").onclick = () => {
        const V = T.filter((t) => t.a && t.b);
        if (!V.length) {
          m.querySelector("#er").textContent =
            "Inserisci almeno un turno con entrata e uscita.";
          return;
        }
        const y = (S.days[k] = S.days[k] || {});
        delete y.t;
        y.h = Math.round((V.reduce((z, t) => z + mins(t), 0) / 60) * 1e4) / 1e4;
        y.turni = V.map((t) => ({ a: t.a, b: t.b, p: +t.p || 0 }));
        save();
        keep = 1;
        close();
        render();
      };
      draw();
    },
  );
}
async function viewPdf(id) {
  const p = S.pay.find((q) => q.id == id);
  if (!p) return;
  const lab = perLab(p.per, "Busta paga");
  let buf = null;
  if (p.pdf)
    try {
      buf = await pdfGet(p.id);
    } catch (e) {
    warn(e);
  }
  if (!buf)
    return modal(
      `<h3>${lab}</h3><p style="color:var(--mu);margin:0 0 16px">Il PDF di questa busta non è stato conservato (è stata salvata prima di questa funzione). Ricarica il PDF dello stesso mese: i dati verranno aggiornati e il file resterà disponibile.</p><div class="row"><button class="b" id="mc">Ok</button></div>`,
      (m, close) => {
        m.querySelector("#mc").onclick = close;
      },
    );
  modal(
    `<div class="mh"><h3>${lab}</h3><div class="ba"><button type="button" class="ib" id="po" aria-label="Apri in una nuova scheda" title="Apri">${IC.o}</button><button type="button" class="ib" id="mc" aria-label="Chiudi" title="Chiudi">${IC.x}</button></div></div><div class="pv" id="pv">Caricamento…</div>`,
    async (m, close) => {
      m.classList.add("big");
      m.querySelector("#mc").onclick = close;
      m.querySelector("#po").onclick = () =>
        window.open(
          URL.createObjectURL(new Blob([buf], { type: "application/pdf" })),
          "_blank",
        );
      const box = m.querySelector("#pv");
      try {
        const pdf = await pdfjsLib.getDocument({
            data: new Uint8Array(buf.slice(0)),
          }).promise,
          w = box.clientWidth || 320,
          dpr = Math.min(2, window.devicePixelRatio || 1);
        box.textContent = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const pg = await pdf.getPage(i),
            v0 = pg.getViewport({ scale: 1 }),
            v = pg.getViewport({ scale: (w / v0.width) * dpr * 1.5 }),
            c = document.createElement("canvas");
          c.width = v.width;
          c.height = v.height;
          box.appendChild(c);
          await pg.render({ canvasContext: c.getContext("2d"), viewport: v })
            .promise;
        }
      } catch (e) {
        box.textContent = "Impossibile mostrare il PDF.";
      }
    },
  );
}
const DET = [
  [
    "Busta",
    [
      ["azienda", "Azienda", "t"],
      ["liv", "Livello", "t"],
      ["qual", "Qualifica", "t"],
      ["pt", "Part time", "%"],
      ["hire", "Data assunzione", "d"],
    ],
  ],
  [
    "Retribuzione",
    [
      ["lordo", "Totale competenze", "e"],
      ["tratt", "Totale trattenute", "e"],
      ["netto", "Netto del mese", "e"],
      ["oraria", "Paga oraria base", "eh"],
      ["ore", "Ore ordinarie lavorate", "o"],
      ["straord", "Ore suppl./straord.", "o"],
      ["straordImp", "Importo straord./suppl.", "e"],
      ["ggLav", "Giorni lavorati", "n"],
      ["festOre", "Ore festivo lavorate", "o"],
      ["suppPerc", "Maggiorazione suppl./straord.", "%"],
      ["festPerc", "Maggiorazione festivo", "%"],
      ["retrib", "Retribuzione mensile fissa", "e"],
      ["retribGG", "Giorni retribuiti", "n"],
    ],
  ],
  [
    "Ferie",
    [
      ["ferieGod", "Godute nel mese", "o"],
      ["ferieAP", "Residuo AP", "o"],
      ["ferieMat", "Maturate", "o"],
      ["ferieGodAnno", "Godute da inizio anno", "o"],
      ["ferieSaldo", "Saldo", "o"],
    ],
  ],
  [
    "Permessi ed ex-festività",
    [
      ["exGod", "Godute nel mese", "o"],
      ["exAP", "Ex-festività residuo AP", "o"],
      ["exMat", "Ex-festività maturate", "o"],
      ["exGodAnno", "Ex-festività godute da inizio anno", "o"],
      ["exSaldo", "Ex-festività saldo", "o"],
      ["permAP", "Permessi residuo AP", "o"],
      ["permMat", "Permessi maturati", "o"],
      ["permGodAnno", "Permessi goduti da inizio anno", "o"],
      ["permSaldo", "Permessi saldo", "o"],
    ],
  ],
  [
    "TFR",
    [
      ["tfrFondo", "Fondo al 31/12", "e"],
      ["tfrQuota", "Quota del mese", "e"],
      ["tfrAnno", "Quota anno", "e"],
    ],
  ],
  [
    "Imposte",
    [
      ["impIrpef", "Imponibile IRPEF mese", "e"],
      ["irpef", "Ritenute IRPEF mese", "e"],
      ["progImpInps", "Progressivo imponibile INPS", "e"],
      ["progImpIrpef", "Progressivo imponibile IRPEF", "e"],
      ["progIrpef", "IRPEF pagata da inizio anno", "e"],
    ],
  ],
];
function detPay(id) {
  const p = S.pay.find((q) => q.id == id);
  if (!p) return;
  const lab = perLab(p.per, "Busta paga"),
    fv = (v, t) =>
      t === "e"
        ? fmt(v) + " €"
        : t === "eh"
          ? fmt(v) + " €/h"
          : t === "o"
            ? fmt(v) + " ore"
            : t === "%"
              ? fmt(v) + "%"
              : t === "d"
                ? esc(dIt(String(v)))
                : t === "n"
                  ? esc(v)
                  : esc(v),
    html = DET.map(([tit, F]) => {
      const R = F.filter(([k]) => p[k] != null && p[k] !== "")
        .map(
          ([k, l, t]) =>
            `<div class="fr"><div>${l}</div><b style="white-space:normal;text-align:right">${fv(p[k], t)}</b></div>`,
        )
        .join("");
      return R ? `<div class="card"><h3 class="fh">${tit}</h3>${R}</div>` : "";
    }).join("");
  modal(
    `<div class="mh st"><h3>Dettaglio · ${lab}</h3><div class="ba"><button type="button" class="ib" id="mc" aria-label="Chiudi" title="Chiudi">${IC.x}</button></div></div>${simCard(p)}${chkHtml(p)}${html || "<p style='color:var(--mu)'>Nessun dato salvato per questa busta.</p>"}${vociHtml(p)}`,
    (m, close) => {
      m.querySelector("#mc").onclick = close;
    },
  );
}
function chkHtml(p) {
  const R = checkBusta(p);
  if (!R.length) return "";
  return `<div class="card"><h3 class="fh neg">Da controllare (${R.length})</h3>${R.map((x) => `<div class="fr"><div>${esc(x.t)}${x.d ? `<small>${esc(x.d)}</small>` : ""}</div>${x.v ? `<b class="neg">${esc(x.v)}</b>` : ""}</div>`).join("")}<p style="color:var(--mu);font-size:13px;margin:8px 0 0">Può essere un errore di lettura del PDF e non della busta: controlla i valori qui sotto, oppure ricarica il PDF.</p></div>`;
}
const opn = new Set(),
  openAttr = (k) => (opn.has(k) ? " open" : "");
function payList(P) {
  if (!P.length) return "";
  const g = {};
  P.forEach((p) => {
    const y = (p.per || "").slice(0, 4) || "Senza periodo";
    (g[y] = g[y] || []).push(p);
  });
  return Object.keys(g)
    .sort((a, b) => isNaN(a) - isNaN(b) || b - a)
    .map((y) => {
      const L = g[y],
        tot = L.reduce((z, p) => z + (p.netto || 0), 0);
      return (
        `<details class='card cl' data-c='y${y}'${openAttr("y" + y)}><summary><span><b>${/^\d{4}$/.test(y) ? "Buste paga " + y : y}</b><small style='color:var(--mu);display:block'>${L.length} ${L.length === 1 ? "busta" : "buste"}${tot ? " · netto " + fmt(tot) + " €" : ""}</small></span></summary>` +
        L.map(
          (p) =>
            `<div class='r'><div class='d'><b>${p.per ? cap(MESI[+p.per.slice(5, 7) - 1] || "?") : "Periodo ?"}</b><small>Netto ${p.netto ? fmt(p.netto) + " €" : "—"} · Lordo ${p.lordo ? fmt(p.lordo) + " €" : "—"} · Ore ${p.ore ? fmtH(p.ore) : "—"}</small></div><div class='ba'>${checkC(p).length ? `<button class='b dng ey ex' data-det='${p.id}' aria-label='Dettaglio busta: ci sono controlli da verificare' title='Controlli da verificare'>!</button>` : `<button class='b s ey' data-det='${p.id}' aria-label='Dettaglio busta' title='Dettaglio'>${IC.d}</button>`}<button class='b s ey' data-view='${p.id}' aria-label='Apri busta'${p.pdf ? "" : " style='opacity:.5'"}>${IC.e}</button><button class='b s' data-del='${p.id}' aria-label='Elimina'>✕</button></div></div>`,
        ).join("") +
        "</details>"
      );
    })
    .join("");
}
function vSim(pm, PP, dm) {
  const s = simOre(pm.getFullYear(), pm.getMonth()),
    eur = (v) => fmt(v) + " €",
    r = (lab, val, sub, cls) =>
      `<div class="fr ${cls || ""}"><div>${lab}${sub ? `<small>${sub}</small>` : ""}</div><b>${val}</b></div>`,
    tit = `<h3 class="fh">Simulazione stipendio</h3><small style="color:var(--mu)">${cap(MESI[pm.getMonth()])} · periodo ${dm(PP.s)} → ${dm(PP.e)}</small>`;
  if (!s)
    return `<div class="card">${tit}<p style="color:var(--mu);margin:10px 0 0">Carica una busta paga per calcolare la paga oraria.</p></div>`;
  return `<div class="card">${tit}
${r("Ore ordinarie", eur(s.po), fmtH(s.ord) + " su " + fmtH(s.D.st.e) + " previste × " + fmt(s.hr) + " €/h")}
${r("Suppl./straord. " + fmt1((s.sp - 1) * 100) + "%", eur(s.ps), fmtH(s.D.supp) + " × " + fmt(s.hr * s.sp) + " €/h")}
${r("Maggiorazione festivo " + Math.round(s.fp * 100) + "%", eur(s.pf), fmtH(s.D.fest) + " × " + fmt(s.hr * s.fp) + " €/h")}
${s.paFull > 0 ? r("Altre competenze fisse", eur(s.pa), "come nella busta di " + s.l.per + " · " + Math.round(s.prog * 100) + "% del mese") : ""}
${r("Lordo stimato", eur(s.lordo), "", "tt")}
${s.qr ? r("Cessione del quinto", "− " + eur(s.qr), "rata ancora dovuta, già tolta dal netto") : ""}
${r("Netto stimato", "≈ " + eur(s.netto), "stesso rapporto netto/lordo della busta di " + s.l.per, "tt")}</div>`;
}
function vBk() {
  if (!S.pay.length && !Object.keys(S.days).length) return "";
  const t = S.set.lastBackup ? new Date(S.set.lastBackup) : null,
    g = t && !isNaN(t) ? Math.floor((Date.now() - t) / 864e5) : null;
  if (g != null && g < 30) return "";
  return `<div class="card"><div class="row"><div><b>Fai un backup</b><small style="display:block;color:var(--mu)">${g == null ? "Non hai ancora esportato nessun backup." : "Ultimo backup " + g + " giorni fa."}</small></div><button class="b" id="gob">Vai</button></div></div>`;
}
function vHome() {
  const n = new Date(),
    y = n.getFullYear(),
    m = n.getMonth(),
    k = iso(n),
    H = holidays(y),
    pm =
      [-1, 0, 1]
        .map((o) => new Date(y, m + o, 1))
        .find((d) => {
          const P = period(d.getFullYear(), d.getMonth());
          return n >= P.s && n < new Date(+P.e + 864e5);
        }) || new Date(y, m, 1),
    st = monthStats(pm.getFullYear(), pm.getMonth()),
    a = anz(S.set.hire),
    x = S.days[k] || {};
  const wk = st.w + st.fe,
    pct = st.e ? Math.min(100, Math.round((wk / st.e) * 100)) : 0,
    PP = period(pm.getFullYear(), pm.getMonth()),
    dm = (d) => d.getDate() + " " + MESI[d.getMonth()].slice(0, 3),
    hlab = "Ore di " + MESI[pm.getMonth()],
    hbig = fmtH(wk) + " / " + fmtH(st.e),
    hsub = "Periodo " + dm(PP.s) + " → " + dm(PP.e) + " · " + pct + "%";
  const nh = Object.entries({ ...H, ...holidays(y + 1) })
    .filter((e) => e[0] >= k)
    .sort()[0];
  const stt =
    H[k] && !x.t
      ? "Festivo: " + H[k]
      : x.t
        ? x.t[0].toUpperCase() + x.t.slice(1)
        : x.h != null
          ? fmtH(x.h) + " registrate"
          : "Nessuna ora registrata";
  const nd = nh ? pd(nh[0]) : null;
  return `<div class="hero"><small>${GG[n.getDay()]} ${n.getDate()} ${MESI[m]} ${y}</small><small style="display:block;margin-top:12px">${hlab}</small><div class="big fit">${hbig}</div><div class="bar"><i style="width:${pct}%"></i></div><small>${hsub}</small></div>
${vBk()}
<div class="card"><div class="row"><b>Oggi</b><span style="color:var(--mu);text-align:right">${stt}</span></div>${x.turni && !x.t ? turniTab(x.turni) : ""}</div>
<div class="card"><div class="fr" id="goc" style="cursor:pointer"><div>Ore di contratto</div><b style="color:var(--ac)">${wh() ? fmt(wh()) + " ore" : "—"}</b></div><div class="fr"><div>Data assunzione</div><b>${S.set.hire ? esc(dIt(S.set.hire)) : "—"}</b></div><div class="grid" style="margin-top:10px"><div class="k"><b>${a ? a.y + " a " + a.m + " m " + a.d + " g" : "—"}</b><span>Anzianità</span></div><div class="k"><b>${nd ? nd.getDate() + " " + MESI[nd.getMonth()].slice(0, 3) : "—"}</b><span>Prossimo festivo${nh ? ": " + nh[1] : ""}</span></div></div></div>
${vQuinto()}
${vSim(pm, PP, dm)}`;
}
function fitBig() {
  document.querySelectorAll(".big.fit").forEach((e) => {
    e.style.fontSize = "";
    let f = parseFloat(getComputedStyle(e).fontSize);
    while (e.scrollWidth > e.clientWidth && f > 12) {
      f -= 1;
      e.style.fontSize = f + "px";
    }
  });
}
window.addEventListener("resize", fitBig);
function bHome() {
  fitBig();
  if ($("#gob"))
    $("#gob").onclick = () => {
      tab = "s";
      render();
    };
  $("#goc").onclick = () => {
    tab = "s";
    render();
  };
}
let sel = iso(new Date()),
  pt = null;
function vCal() {
  const y = cur.getFullYear(),
    m = cur.getMonth(),
    H = holidays(y),
    P = period(y, m),
    ps = iso(P.s),
    pe = iso(P.e),
    n = new Date(y, m + 1, 0).getDate(),
    st = monthStats(y, m),
    td = iso(new Date()),
    ym = iso(cur).slice(0, 7);
  if (sel.slice(0, 7) !== ym) sel = td.slice(0, 7) === ym ? td : iso(cur);
  let c = "<div></div>".repeat((cur.getDay() + 6) % 7);
  for (let i = 1; i <= n; i++) {
    const d = new Date(y, m, i),
      k = iso(d),
      z = S.days[k] || {},
      cl = ["dy"];
    if (H[k] || d.getDay() === 0) cl.push("ho");
    if (k === td) cl.push("now");
    if (k === sel) cl.push("sl");
    if (k < ps || k > pe) cl.push("out");
    const mk = k === td || z.h || z.t;
    if (mk && z.tim) cl.push("two");
    c += `<button class="${cl.join(" ")}" data-d="${k}">${i}${mk ? "<i></i>" : ""}${z.tim ? "<em></em>" : ""}</button>`;
  }
  const D = pd(sel),
    x = S.days[sel] || {},
    t = pt && pt.k === sel ? pt.t : x.t || "",
    op = (v, l) =>
      `<option value="${v}"${t === v ? " selected" : ""}>${l}</option>`,
    hh = x.t === "ferie" && x.h != null && x.h !== "" ? +x.h : std(),
    stt = x.t
      ? cap(x.t) + " · " + fmtH(hh)
      : x.h
        ? fmtH(x.h) + " registrate"
        : "Nessuna ora registrata",
    lab = {
      "": "+ Aggiungi turno",
      ferie: "+ Inserisci ferie",
      permesso: "Segna permesso",
      malattia: "Segna malattia",
    }[t];
  return `<div class="row" style="margin-bottom:10px"><button class="b s" id="pv">‹</button><h2>${MESI[m]} ${y}</h2><button class="b s" id="nx">›</button></div>
<div class="card"><div class="cal">${["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((g) => `<div class="wd">${g}</div>`).join("")}${c}</div></div>
<div class="card"><div class="row"><b>Periodo di calcolo</b><b class="neg">Importante!</b></div><div class="fg"><div><label>Dal</label><input type="date" id="ps" value="${ps}"></div><div><label>Al</label><input type="date" id="pe" value="${pe}"></div></div></div>
<div class="card"><div class="row" style="align-items:flex-start"><div><b>${GF[D.getDay()]} ${D.getDate()} ${MESI[D.getMonth()]}</b><small style="display:block;color:var(--mu);margin-top:2px">${stt}</small></div><small style="color:#ef4444;text-align:right">${H[sel] || ""}</small></div>
<div class="dact"><select id="dt">${op("", "Lavoro")}${op("ferie", "Ferie")}${op("permesso", "Permesso")}${op("malattia", "Malattia")}</select><button class="b" id="${t === "" ? "da" : "di"}">${lab}</button><button class="b s" id="dc">Cancella</button></div>${x.turni && !x.t ? '<h4 class="sh">Turno inserito</h4>' + turniTab(x.turni) : ""}${x.tim ? timTab(x.tim, x.turni && !x.t ? x.h : null) : ""}</div>
<div class="card"><div class="grid"><div class="k"><b>${fmtH(st.w + st.fe)}</b><span>Ore effettive (incl. assenze)</span></div><div class="k"><b>${fmtH(st.e)}</b><span>Ore previste</span></div><div class="k"><b class="${st.bal >= 0 ? "pos" : "neg"}">${st.bal > 0 ? "+" : ""}${fmtH(st.bal)}</b><span>Saldo mese</span></div><div class="k"><b>${st.ex} / ${st.hol}</b><span>Ferie / festivi nel mese</span></div></div></div>${vBustaMese(y, m)}`;
}
function vBustaMese(y, m) {
  const ck = checkMese(y, m);
  if (!ck) return "";
  const bad = ck.filter((x) => !x.ok),
    f = (v) => fmtH(v);
  return `<div class="card"><h3 class="fh">Confronto con la busta</h3>${
    bad.length
      ? bad
          .map(
            (x) =>
              `<div class="fr"><div>${x.lab}<small>app ${f(x.a)} · busta ${f(x.b)}</small></div><b class="neg">${x.diff > 0 ? "+" : ""}${f(x.diff)}</b></div>`,
          )
          .join("")
      : `<div class="fr"><div>Tutto coincide con la busta</div><b class="pos">✓</b></div>`
  }</div>`;
}

function ferieModal(k0) {
  const rng = (a, b) => {
      const o = [],
        d = pd(a),
        e = pd(b);
      for (; d <= e && o.length < 400; d.setDate(d.getDate() + 1))
        o.push(iso(d));
      return o;
    },
    plan = (a, b) => {
      const days = rng(a, b),
        out = {},
        H = {};
      for (let i = 0; i < days.length; i += 7) {
        const ch = days.slice(i, i + 7).filter((k) => {
          const y = +k.slice(0, 4);
          H[y] = H[y] || holidays(y);
          return !H[y][k];
        });
        if (!ch.length) continue;
        const h =
          Math.round((Math.min(wh(), ch.length * std()) / ch.length) * 1e4) /
          1e4;
        ch.forEach((k) => (out[k] = h));
      }
      return out;
    };
  modal(
    `<h3>Inserisci ferie</h3><div class="fg"><div><label>Dal</label><input type="date" id="fa" value="${k0}"></div><div><label>Al</label><input type="date" id="fb" value="${k0}"></div></div><div class="tot"><div><span>Ferie da scalare</span><small id="fd" style="display:block;color:var(--mu);margin-top:2px"></small></div><b id="ft"></b></div><p style="color:var(--mu);font-size:13px;margin:0 0 14px">Ogni 7 giorni consecutivi si scalano al massimo le ore settimanali; per meno giorni, ore settimanali ÷ 5 al giorno. I festivi non vengono segnati.</p><div class="row"><button class="b s" id="mc">Annulla</button><button class="b" id="ms">Salva</button></div>`,
    (m, close) => {
      const A = m.querySelector("#fa"),
        B = m.querySelector("#fb"),
        cur = () => {
          if (!A.value) A.value = k0;
          if (!B.value || B.value < A.value) B.value = A.value;
          return plan(A.value, B.value);
        },
        upd = () => {
          const P = cur(),
            ks = Object.keys(P),
            t = ks.reduce((z, k) => z + P[k], 0);
          m.querySelector("#ft").textContent = fmtH(t);
          const fe = rng(A.value, B.value).length - ks.length;
          m.querySelector("#fd").textContent =
            ks.length +
            (ks.length === 1 ? " giorno" : " giorni") +
            (fe
              ? " · " +
                fe +
                (fe === 1 ? " festivo escluso" : " festivi esclusi")
              : "");
        };
      m.dirty = () => A.value !== k0 || B.value !== k0;
      A.onchange = B.onchange = upd;
      m.querySelector("#mc").onclick = close;
      m.querySelector("#ms").onclick = () => {
        const P = cur();
        for (const k in P) {
          const o = { t: "ferie", h: P[k] },
            tm = (S.days[k] || {}).tim;
          if (tm) o.tim = tm;
          S.days[k] = o;
        }
        pt = null;
        save();
        keep = 1;
        close();
        render();
      };
      upd();
    },
  );
}
function bCal() {
  $("#pv").onclick = () => {
    cur.setMonth(cur.getMonth() - 1);
    render();
  };
  $("#nx").onclick = () => {
    cur.setMonth(cur.getMonth() + 1);
    render();
  };
  document.querySelectorAll("[data-d]").forEach(
    (b) =>
      (b.onclick = () => {
        sel = b.dataset.d;
        pt = null;
        keep = 1;
        render();
      }),
  );
  $("#dt").onchange = (e) => {
    pt = { k: sel, t: e.target.value };
    keep = 1;
    render();
  };
  if ($("#di"))
    $("#di").onclick = () => {
      if (!wh()) return avvisoOre();
      if ((pt && pt.k === sel ? pt.t : (S.days[sel] || {}).t) === "ferie")
        return ferieModal(sel);
      const k = sel,
        nt = pt && pt.k === k ? pt.t : null,
        x = (S.days[k] = S.days[k] || {});
      if (nt != null) x.t = nt;
      x.h = undefined;
      delete x.turni;
      if (!x.h && !x.t && !x.tim) delete S.days[k];
      pt = null;
      save();
      keep = 1;
      render();
    };
  if ($("#da")) $("#da").onclick = () => hoursModal(sel);
  $("#dc").onclick = () => {
    const k = sel,
      x = S.days[k],
      D = pd(k);
    pt = null;
    if (!x || (!x.t && !x.h && !x.turni)) {
      keep = 1;
      return render();
    }
    const what = x.t ? cap(x.t) : x.h ? fmtH(x.h) + " registrate" : "turni";
    confirmBox(
      "Cancellare il giorno?",
      `Stai per cancellare <b>${GF[D.getDay()]} ${D.getDate()} ${MESI[D.getMonth()]}</b> (${what}). L'operazione non si può annullare.`,
      "Cancella",
      () => {
        const tim = (S.days[k] || {}).tim;
        delete S.days[k];
        if (tim) S.days[k] = { tim };
        save();
        keep = 1;
        render();
      },
    );
  };
  const K = iso(cur).slice(0, 7),
    sp = (f, v) => {
      S.per = S.per || {};
      const p = (S.per[K] = S.per[K] || {});
      p[f] = v || undefined;
      save();
      keep = 1;
      render();
    };
  $("#ps").onchange = (e) => sp("s", e.target.value);
  $("#pe").onchange = (e) => sp("e", e.target.value);
}
function vQuinto() {
  const s = quintoStato();
  if (!s) return "";
  const eur = (v) => fmt(v) + " €",
    fl =
      s.fine == null
        ? "—"
        : cap(MESI[s.fine % 12]) + " " + Math.floor(s.fine / 12);
  return `<div class="card"><h3 class="fh">Cessione del quinto</h3><div class="grid" style="margin-top:8px"><div class="k"><b>${s.left == null ? "—" : s.left}</b><span>Rate ancora da pagare</span></div><div class="k"><b>${fl}</b><span>Ultima rata</span></div><div class="k"><b>${eur(s.q.rata)}</b><span>Rata mensile</span></div><div class="k"><b>${s.resOra == null ? "—" : eur(s.resOra)}</b><span>Residuo stimato</span></div></div><small style="display:block;color:var(--mu);margin-top:10px">Stima dalla busta di ${perLab(s.l.per)}.</small></div>`;
}
function simCard(p) {
  const s = p.sim;
  if (!s) return "";
  const R = [
    ["Lordo", s.lordo, p.lordo],
    ["Netto", s.netto, p.netto],
    ["Extra (suppl./straord. + festivo)", s.extra, p.straordImp],
  ]
    .filter((x) => x[2] != null)
    .map(([l, a, b]) => {
      const d = b - a,
        pc = b ? Math.abs(d / b) * 100 : 0;
      return `<div class="fr"><div>${l}<small>stimato ${fmt(a)} € · reale ${fmt(b)} €${b ? " · " + fmt1(pc) + "%" : ""}</small></div><b class="${pc > 2 ? "neg" : "pos"}">${d > 0 ? "+" : ""}${fmt(d)} €</b></div>`;
    })
    .join("");
  return `<div class="card"><h3 class="fh">Simulato contro reale</h3><small style="color:var(--mu)">Stima fatta al caricamento, sulla base della busta di ${perLab(s.base)}. Differenza = reale − stimato.</small>${R}</div>`;
}
function vociHtml(p) {
  const V = p.voci;
  if (!V || !V.length) return "";
  return `<details class="card cl"><summary><h3 class="fh">Voci della busta (${V.length})</h3></summary>${V.map((v) => `<div class="fr"><div>${esc(v.d)}<small>${esc(v.c)}${v.q != null ? " · " + fmt(v.q) + " " + v.u : ""}${v.r != null ? " · base " + fmt(v.r) : ""}${v.k === "T" ? " · trattenuta" : ""}${v.m ? " · informativa, fuori dai totali" : ""}${isQ(v) ? " · cessione del quinto" : ""}</small></div><b>${v.i != null ? fmt(v.i) + " €" : "—"}</b></div>`).join("")}</details>`;
}
function vPay2() {
  const P = S.pay
      .slice()
      .sort((a, b) => (b.per || "").localeCompare(a.per || "")),
    a = anz(S.set.hire),
    l = P[0],
    n = P.filter((p) => p.netto),
    tot = n.reduce((s, p) => s + p.netto, 0),
    eur = (v) => (v == null ? "—" : fmt(v) + " €"),
    row = (lab, val, sub) =>
      `<div class="fr"><div>${lab}${sub ? `<small>${sub}</small>` : ""}</div><b>${val}</b></div>`,
    hr =
      l &&
      (l.oraria ||
        (l.lordo && l.ore
          ? (l.lordo - (l.straordImp || 0)) /
            (l.ore + (l.ferieGod || 0) + (l.exGod || 0))
          : null)),
    hn = !l
      ? ""
      : l.oraria
        ? "dalla tariffa in busta"
        : l.straord && !l.straordImp
          ? "inserisci importo straordinari"
          : "(lordo − straord.) ÷ ore pagate",
    mese =
      perLab(l && l.per, "periodo ?");
  return `${
    l
      ? `<div class="hero"><small>Ultima busta · ${mese}</small><div class="big">${eur(l.netto)}</div><small>Netto del mese</small></div>
<details class="card cl" data-c="det"${openAttr("det")}><summary><h3 class="fh">Dettaglio ultima busta</h3></summary>
${row("Ore ordinarie", fmtH(l.ore))}
${row("Ore straordinarie", l.straord ? fmtH(l.straord) : "—")}
${row("Paga oraria base", hr ? fmt(hr) + " €/h" : "—", hn)}
${row("TFR accantonato al 31/12", eur(l.tfrFondo))}</details>`
      : ""
  }
<div class="card"><h3 class="fh">Riepilogo</h3>
${row("Anzianità", a ? a.y + " a " + a.m + " m " + a.d + " g" : "—", a ? a.tot + " giorni" : "carica una busta")}
${row("Buste salvate", P.length)}
${row("Netto medio", n.length ? eur(tot / n.length) : "—")}
${row("Netto totale salvato", n.length ? eur(tot) : "—")}
${(() => {
  const q = P.filter((p) => p.sim && p.netto);
  return q.length
    ? row(
        "Scostamento medio simulazione (netto)",
        fmt1(
          q.reduce(
            (z, p) => z + (Math.abs(p.sim.netto - p.netto) / p.netto) * 100,
            0,
          ) / q.length,
        ) + "%",
        q.length +
          (q.length === 1 ? " busta confrontata" : " buste confrontate"),
      )
    : "";
})()}</div>
<button class="b" id="pu" style="width:100%;margin-bottom:12px">+ Carica busta paga</button>
${payList(P)}`;
}
const GR = [
  ["Periodo e contratto", ["per", "azienda", "hire", "liv", "qual", "pt"]],
  [
    "Retribuzione",
    [
      "lordo",
      "tratt",
      "netto",
      "ore",
      "straord",
      "straordImp",
      "oraria",
      "ggLav",
      "festOre",
      "suppPerc",
      "festPerc",
      "retrib",
      "retribGG",
    ],
  ],
  ["Ferie", ["ferieGod", "ferieAP", "ferieMat", "ferieGodAnno", "ferieSaldo"]],
  [
    "Permessi ed ex-festività",
    [
      "exGod",
      "exAP",
      "exMat",
      "exGodAnno",
      "exSaldo",
      "permAP",
      "permMat",
      "permGodAnno",
      "permSaldo",
    ],
  ],
  ["TFR", ["tfrFondo", "tfrQuota", "tfrAnno"]],
  [
    "Imposte",
    ["impIrpef", "irpef", "progImpInps", "progImpIrpef", "progIrpef"],
  ],
];
function uploadModal(f) {
  modal(
    `<h3 style="margin:0 0 14px">Carica busta paga</h3>
<div id="up1"><p style="color:var(--mu);text-align:center;margin:24px 0">Lettura di <b>${esc(f.name)}</b>…</p></div><div id="up2"></div>`,
    (m, close) => {
      let ed = false;
      m.dirty = () => ed;
      (async () => {
        const u1 = m.querySelector("#up1"),
          u2 = m.querySelector("#up2"),
          fail = (msg) => {
            u1.innerHTML = `<p class="neg">${msg}</p><div class="row"><button class="b s" id="mc2">Chiudi</button></div>`;
            u1.querySelector("#mc2").onclick = close;
          };
        try {
          const pg = await readPdf2(f),
            txt = pg.map((p) => p.txt).join("\n");
          if (txt.trim().length < 30)
            return fail(
              "Nessun testo trovato: il PDF sembra una scansione. Serve un PDF digitale.",
            );
          const R = parse2(pg),
            L = Object.fromEntries(FD),
            has = (k) => R[k] != null && R[k] !== "",
            found = FD.filter(([k]) => has(k)).length,
            used = GR.flatMap((g) => g[1]),
            G = GR.concat(
              FD.map((x) => x[0]).filter((k) => !used.includes(k)).length
                ? [
                    [
                      "Altro",
                      FD.map((x) => x[0]).filter((k) => !used.includes(k)),
                    ],
                  ]
                : [],
            ),
            fld = (k) =>
              `<div><label>${L[k]}</label><input data-p="${k}" class="${(k === "per" || k === "netto") && !has(k) ? "miss" : ""}" value="${has(k) ? (TXT.includes(k) ? esc(R[k]) : String(R[k]).replace(".", ",")) : ""}"></div>`,
            lab = perLab(R.per, "periodo non trovato");
          u1.remove();
          u2.innerHTML =
            `<div class="k kc" style="margin-bottom:12px"><b>${lab}${R.netto != null ? " · " + fmt(R.netto) + " €" : ""}</b><span>Letti ${found} campi su ${FD.length}. Controlla i dati e correggi quelli vuoti o sbagliati prima di salvare.</span></div>` +
            G.map(
              ([t, K]) =>
                `<details><summary>${t}</summary><div class="fg">${K.map(fld).join("")}</div></details>`,
            ).join("") +
            `<details><summary>Testo estratto</summary><pre>${esc(txt)}</pre></details>
<p id="uer" class="neg" style="margin:10px 0 0"></p>
<div class="stk"><div class="row"><button class="b s" id="uc">Annulla</button><button class="b" id="sp">Salva busta</button></div></div>`;
          u2.querySelector("#uc").onclick = close;
          u2.oninput = () => (ed = true);
          u2.querySelector("#sp").onclick = async () => {
            const o = { id: Date.now() };
            u2.querySelectorAll("[data-p]").forEach((i) => {
              const k = i.dataset.p,
                v = i.value.trim();
              o[k] = TXT.includes(k)
                ? v
                : v === ""
                  ? null
                  : v.includes(",")
                    ? num(v)
                    : parseFloat(v);
            });
            // campi che l'utente ha corretto a mano: la rilettura automatica non li tocca
            o.man = FD.map((x) => x[0]).filter((k) => {
              if (k === "per") return false;
              const a = has(k) ? R[k] : null,
                b = o[k] === "" || o[k] == null ? null : o[k];
              if (a == null || b == null) return a != b;
              return TXT.includes(k)
                ? String(a) !== String(b)
                : Math.abs(a - b) > 1e-9;
            });
            if (!/^\d{4}-\d{2}$/.test(o.per || "")) {
              u2.querySelector("#uer").textContent =
                "Inserisci il periodo nel formato AAAA-MM (es. 2026-09).";
              const pi = u2.querySelector('[data-p="per"]');
              pi.closest("details").open = true;
              pi.scrollIntoView({ block: "center" });
              return;
            }
            if (o.hire && !S.set.hire) S.set.hire = o.hire;
            if (R.voci) o.voci = R.voci;
            S.pay
              .filter((p) => p.per && p.per === o.per)
              .forEach((p) => pdfDel(p.id).catch(warn));
            S.pay = S.pay.filter((p) => !(p.per && p.per === o.per));
            {
              const sm = simOre(+o.per.slice(0, 4), +o.per.slice(5, 7) - 1);
              if (sm)
                o.sim = {
                  base: sm.l.per,
                  lordo: r2(sm.lordo),
                  netto: r2(sm.netto),
                  extra: r2(sm.ps + sm.pf),
                  hr: sm.hr,
                };
            }
            let pf = false;
            try {
              await pdfPut(o.id, await f.arrayBuffer());
              o.pdf = true;
            } catch (err) {
              pf = true;
            }
            S.pay.push(o);
            save();
            close();
            render();
            if (pf) toast("Busta salvata, ma il PDF non è stato conservato.");
          };
        } catch (err) {
          fail("Errore nella lettura del PDF.");
        }
      })();
    },
  );
}
function bPay2() {
  document.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = () => {
        const p = S.pay.find((q) => q.id == b.dataset.del),
          lab = perLab(p && p.per, "senza periodo");
        confirmBox(
          "Eliminare la busta paga?",
          `Stai per eliminare la busta di <b>${lab}</b>. L'operazione non si può annullare.`,
          "Elimina",
          () => {
            if (p) pdfDel(p.id).catch(warn);
            S.pay = S.pay.filter((q) => q.id != b.dataset.del);
            save();
            render();
          },
        );
      }),
  );
  document
    .querySelectorAll("[data-det]")
    .forEach((b) => (b.onclick = () => detPay(b.dataset.det)));
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => (b.onclick = () => viewPdf(b.dataset.view)));
  document
    .querySelectorAll("details.cl")
    .forEach(
      (d) =>
        (d.ontoggle = () =>
          d.open ? opn.add(d.dataset.c) : opn.delete(d.dataset.c)),
    );
  $("#pu").onclick = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "application/pdf";
    i.onchange = () => i.files[0] && uploadModal(i.files[0]);
    i.click();
  };
}
document.querySelectorAll("nav button").forEach(
  (b) =>
    (b.onclick = () => {
      const go = () => {
        tab = b.dataset.t;
        render();
      };
      if (b.dataset.t !== tab && setDirty()) return askSave(go);
      go();
    }),
);
boot();
(function () {
  const K = "oreInstallAsk",
    g = (k) => {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    st = (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
    warn(e);
  }
    },
    standalone = () =>
      (window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true,
    ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!/^https?:/.test(location.protocol) || standalone()) return;
  let dp = null,
    closeM = null;
  const logo =
      '<img src="icon-192.png" alt="Cedolix" width="64" height="64" style="border-radius:16px;display:block;margin:0 auto 12px">',
    share =
      '<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-5px;fill:none;stroke:var(--ac);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round" aria-hidden="true"><path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    full = (m) => {
      m.parentElement.onclick = null;
      m.parentElement.classList.add("full");
      m.classList.add("full");
    },
    show = () => {
      const t = iso(new Date());
      if (g(K) === t || document.querySelector(".ov") || standalone()) return;
      if (!dp && !ios) return;
      st(K, t);
      if (dp)
        modal(
          `${logo}<h3 style="text-align:center">Installa Cedolix</h3><p style="color:var(--mu);margin:0 0 16px;text-align:center;font-size:16px">Aggiungi l'app alla schermata Home: si apre a schermo intero e funziona anche senza connessione.</p><div class="row"><button class="b s" id="ni">Non ora</button><button class="b" id="yi">Installa</button></div>`,
          (m, close) => {
            closeM = close;
            full(m);
            m.querySelector("#ni").onclick = close;
            m.querySelector("#yi").onclick = () => {
              const p = dp;
              dp = null;
              close();
              p.prompt();
            };
          },
        );
      else
        modal(
          `${logo}<h3 style="text-align:center">Installa Cedolix</h3><p style="color:var(--mu);margin:0 0 12px;text-align:center;font-size:16px">Su iPhone e iPad si installa da Safari:</p><ol style="margin:0 0 16px;padding-left:22px;font-size:16px;line-height:1.7"><li>Tocca il tasto Condividi ${share} nella barra di Safari</li><li>Scorri e tocca <b>Aggiungi alla schermata Home</b></li><li>Tocca <b>Aggiungi</b></li></ol><div class="row"><button class="b" id="ni">Ho capito</button></div>`,
          (m, close) => {
            closeM = close;
            full(m);
            m.querySelector("#ni").onclick = close;
          },
        );
    };
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    dp = e;
    setTimeout(show, 800);
  });
  window.addEventListener("appinstalled", () => {
    dp = null;
    if (closeM) closeM();
  });
  if (ios) setTimeout(show, 1200);
  window.cedInstall = show;
})();
