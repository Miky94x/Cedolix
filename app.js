const $ = (s) => document.querySelector(s);
const def = {
  set: {
    hire: "",
    wh: 0,
  },
  days: {},
  pay: [],
};
let S = JSON.parse(JSON.stringify(def));
function norm() {
  S.set = { ...def.set, ...S.set };
  S.days = S.days || {};
  S.pay = S.pay || [];
  let ch = false;
  if (!S.set.patroni || typeof S.set.patroni !== "object") {
    S.set.patroni = {};
    ch = true;
  }
  if ("patrono" in S.set) {
    // vecchio formato: una sola data -> la sposto nel suo anno
    if (/^\d\d-\d\d$/.test(S.set.patrono))
      S.set.patroni[S.set.patronoY || new Date().getFullYear()] = S.set.patrono;
    delete S.set.patrono;
    delete S.set.patronoY;
    ch = true;
  }
  // chi ha già dei dati ha già usato l'app: non gli richiedo le ore
  if (!S.set.whOk && (S.pay.length || Object.keys(S.days).length)) {
    S.set.whOk = true;
    ch = true;
  }
  return ch;
}
let ro = false;
function banner(msg) {
  let e = document.getElementById("sbn");
  if (!msg) return e && e.remove();
  if (!e) {
    e = document.createElement("div");
    e.id = "sbn";
    e.className = "sbn";
    document.body.appendChild(e);
  }
  e.textContent = msg;
}
const save = () => {
  if (ro) return;
  kvPut("state", JSON.stringify(S))
    .then(() => banner(""))
    .catch(() =>
      banner(
        "Salvataggio non riuscito: i dati rischiano di andare persi. Esporta subito un backup da Altro.",
      ),
    );
};
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
  } catch (e) {}
}
let tab = "h",
  cur = new Date();
cur.setDate(1);
const MESI = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];
const GG = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const iso = (d) =>
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");
const fmt1 = (n) => (Math.round(n * 10) / 10).toString().replace(".", ","),
  fmt = (n) => (Math.round(n * 100) / 100).toString().replace(".", ",");
const fmtH = (n) => {
  if (n == null || isNaN(n)) return "—";
  const t = Math.round(Math.abs(n) * 60),
    h = Math.floor(t / 60),
    m = t % 60;
  return (
    (n < 0 && t ? "−" : "") +
    (h || !m ? h + "h" : "") +
    (h && m ? " " : "") +
    (m ? m + "m" : "")
  );
};
function easter(y) {
  const a = y % 19,
    b = Math.floor(y / 100),
    c = y % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31),
    da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mo - 1, da);
}
function holidays(y) {
  const m = {
    "01-01": "Capodanno",
    "01-06": "Epifania",
    "04-25": "Liberazione",
    "05-01": "Festa Lavoro",
    "06-02": "Repubblica",
    "08-15": "Ferragosto",
    "11-01": "Ognissanti",
    "12-08": "Immacolata",
    "12-25": "Natale",
    "12-26": "S. Stefano",
  };
  const h = {};
  for (const k in m) h[y + "-" + k] = m[k];
  const p = easter(y);
  h[iso(p)] = "Pasqua";
  const q = new Date(p);
  q.setDate(q.getDate() + 1);
  h[iso(q)] = "Pasquetta";
  const sp = (S.set.patroni || {})[y];
  if (/^\d\d-\d\d$/.test(sp)) h[y + "-" + sp] = "Santo Patrono";
  return h;
}
const wh = () => +S.set.wh || 0,
  exp = () => wh() / 7,
  std = () => wh() / 5;
function period(y, m) {
  const p = (S.per && S.per[y + "-" + String(m + 1).padStart(2, "0")]) || {},
    ds = new Date(y, m, 1),
    de = new Date(y, m + 1, 0),
    r = { s: p.s ? pd(p.s) : ds, e: p.e ? pd(p.e) : de };
  return r.s > r.e ? { s: ds, e: de } : r;
}
function monthStats(y, m) {
  const P = period(y, m),
    n = Math.round((P.e - P.s) / 864e5) + 1,
    h = {};
  let w = 0,
    e = 0,
    fe = 0,
    ex = 0,
    hol = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(P.s.getFullYear(), P.s.getMonth(), P.s.getDate() + i),
      k = iso(d),
      yy = d.getFullYear(),
      x = S.days[k] || {};
    h[yy] = h[yy] || holidays(yy);
    e += exp();
    if (h[yy][k]) hol++;
    if (x.t === "ferie" || x.t === "malattia" || x.t === "permesso") {
      fe += x.t === "ferie" && x.h != null && x.h !== "" ? +x.h : std();
      if (x.t === "ferie") ex++;
    } else if (x.h) w += +x.h;
  }
  return { w, e, fe, ex, hol, bal: w + fe - e };
}
function ferie() {
  const l = S.pay
    .slice()
    .sort((a, b) => (b.per || "").localeCompare(a.per || ""))[0];
  if (!l || (l.ferieSaldo == null && l.permSaldo == null && l.exSaldo == null))
    return { l, ore: null, gg: null, usati: 0 };
  const [y, m] = (l.per || "0-0").split("-").map(Number),
    lim = l.per ? iso(period(y, m - 1).e) : "";
  let usati = 0,
    uo = 0,
    usatiP = 0,
    up = 0;
  const d = std() || 8;
  for (const k in S.days) {
    if (k <= lim) continue;
    const x = S.days[k];
    if (x.t === "ferie") {
      usati++;
      uo += x.h != null && x.h !== "" ? +x.h : d;
    } else if (x.t === "permesso") {
      usatiP++;
      up += d;
    }
  }
  const fer = l.ferieSaldo || 0,
    pe = (l.permSaldo || 0) + (l.exSaldo || 0),
    ore = fer + pe - uo - up;
  return {
    l,
    ore,
    gg: ore / d,
    sett: wh() ? ore / wh() : null,
    usati,
    uo,
    usatiP,
    up,
    lim,
    fer,
    pe,
  };
}
function anz(s) {
  if (!s) return null;
  const a = new Date(s),
    b = new Date();
  if (isNaN(a)) return null;
  let y = b.getFullYear() - a.getFullYear(),
    m = b.getMonth() - a.getMonth(),
    d = b.getDate() - a.getDate();
  if (d < 0) {
    m--;
    d += new Date(b.getFullYear(), b.getMonth(), 0).getDate();
  }
  if (m < 0) {
    y--;
    m += 12;
  }
  return { y, m, d, tot: Math.floor((b - a) / 864e5) };
}
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
    mese = l.per
      ? cap(MESI[+l.per.slice(5, 7) - 1] || "") + " " + l.per.slice(0, 4)
      : "ultima busta",
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
<div class="fr"><div>Data di assunzione<small>${s.hire ? "Letta dalla busta paga" : "Verrà letta dalla prima busta caricata"}</small></div><b>${s.hire ? esc(s.hire.split("-").reverse().join("/")) : "—"}</b></div></div>
<div class="sec">Calendario</div>
<div class="card"><div class="fr"><div>Santo patrono ${yy}<small>Ogni anno ha la sua data</small></div><input type="date" id="pa" value="${sp ? yy + "-" + sp : ""}"></div></div>
<div class="sec">Aspetto</div>
<div class="card"><button type="button" class="tpk" id="tc"><span>Colore tema<small>Tocca per cambiarlo</small></span><i id="tsw" style="background:${s.tema || "#d00cca"}"></i></button><button class="b s wide" id="tr">Ripristina colore</button></div>
<button class="b wide" id="sv">Salva impostazioni</button><p id="ms" class="msg"></p>
<div class="sec">Dati</div>
<div class="card"><div class="fr"><div>Ultimo backup<small>Dati e PDF delle buste in un file ZIP</small></div><b id="bl" class="${old ? "neg" : "pos"}" style="font-size:14px">${fdt(s.lastBackup)}</b></div>
<div class="grid" style="margin-top:10px"><button class="b" id="bk">Esporta backup</button><button class="b s" id="rs">Ripristina</button></div>
<button class="b s wide" id="rr" style="margin-top:8px">Rileggi buste dai PDF</button>
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
      } catch (e) {}
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
// versione del lettore PDF: alzala quando cambia parse2, le buste si rileggono da sole
const PV = 4;
let rereading = false;
async function rereadAll() {
  const L = S.pay.filter((p) => p.pdf),
    r = { ok: 0, ch: 0, ko: 0, nopdf: S.pay.length - L.length };
  if (rereading || !L.length) return r;
  rereading = true;
  try {
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
    if (r.ch) toast("Buste aggiornate con la nuova lettura (" + r.ch + ").");
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
          ? "Rilette " + r.ok + " buste, " + r.ch + " aggiornate ✓" +
              (r.ko ? " · " + r.ko + " non lette" : "") +
              (r.nopdf ? " · " + r.nopdf + " senza PDF" : "")
          : "Nessuna busta riletta.",
        !r.ok,
      );
      if (r.ok) {
        S.set.parseV = PV;
        save();
      }
    },
  );
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
    colorModal(S.set.tema || "#d00cca", (hex) => {
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
    $("#tsw").style.background = "#d00cca";
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
}
const IC = {
  e: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  d: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
};
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
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
let dbp;
const idb = () =>
    dbp ||
    (dbp = new Promise((res, rej) => {
      const r = indexedDB.open("oreLavoroPdf", 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        ["pdf", "kv"].forEach((n) => {
          if (!d.objectStoreNames.contains(n)) d.createObjectStore(n);
        });
      };
      r.onsuccess = () => {
        r.result.onversionchange = () => r.result.close();
        res(r.result);
      };
      r.onerror = () => {
        dbp = null;
        rej(r.error);
      };
    })),
  idbDo = async (st, mode, f) => {
    const db = await idb();
    return new Promise((res, rej) => {
      const t = db.transaction(st, mode),
        q = f(t.objectStore(st));
      t.oncomplete = () => res(q && q.result);
      t.onerror = t.onabort = () => rej(t.error);
    });
  },
  pdfPut = (id, buf) => idbDo("pdf", "readwrite", (o) => o.put(buf, id)),
  pdfGet = (id) => idbDo("pdf", "readonly", (o) => o.get(id)),
  pdfDel = (id) => idbDo("pdf", "readwrite", (o) => o.delete(id)),
  pdfClear = () => idbDo("pdf", "readwrite", (o) => o.clear()),
  kvPut = (k, v) => idbDo("kv", "readwrite", (o) => o.put(v, k)),
  kvGet = (k) => idbDo("kv", "readonly", (o) => o.get(k));
async function viewPdf(id) {
  const p = S.pay.find((q) => q.id == id);
  if (!p) return;
  const lab = p.per
    ? cap(MESI[+p.per.slice(5, 7) - 1] || "") + " " + p.per.slice(0, 4)
    : "Busta paga";
  let buf = null;
  if (p.pdf)
    try {
      buf = await pdfGet(p.id);
    } catch (e) {}
  if (!buf)
    return modal(
      `<h3>${lab}</h3><p style="color:var(--mu);margin:0 0 16px">Il PDF di questa busta non è stato conservato (è stata salvata prima di questa funzione). Ricarica il PDF dello stesso mese: i dati verranno aggiornati e il file resterà disponibile.</p><div class="row"><button class="b" id="mc">Ok</button></div>`,
      (m, close) => {
        m.querySelector("#mc").onclick = close;
      },
    );
  modal(
    `<div class="row" style="margin-bottom:12px"><h3 style="margin:0">${lab}</h3><div class="ba"><button class="b s" id="po">Apri</button><button class="b" id="mc">Chiudi</button></div></div><div class="pv" id="pv">Caricamento…</div>`,
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
  const lab = p.per
      ? cap(MESI[+p.per.slice(5, 7) - 1] || "") + " " + p.per.slice(0, 4)
      : "Busta paga",
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
                ? esc(String(v).split("-").reverse().join("/"))
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
    `<div class="row" style="margin-bottom:12px"><h3 style="margin:0">Dettaglio · ${lab}</h3><div class="ba"><button class="b" id="mc">Chiudi</button></div></div>${simCard(p)}${chkHtml(p)}${html || "<p style='color:var(--mu)'>Nessun dato salvato per questa busta.</p>"}${vociHtml(p)}`,
    (m, close) => {
      m.querySelector("#mc").onclick = close;
    },
  );
}
const perLab = (per) =>
  cap(MESI[+per.slice(5, 7) - 1] || "?") + " " + per.slice(0, 4);
const perPrev = (per) => {
  const y = +per.slice(0, 4),
    m = +per.slice(5, 7);
  return m === 1 ? y - 1 + "-12" : y + "-" + String(m - 1).padStart(2, "0");
};
// controlli di coerenza: dentro la busta e con quella del mese prima
function checkBusta(p) {
  const out = [],
    has = (v) => v != null && v !== "",
    f = (v) => fmt(v),
    sg = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v)),
    tol = 0.06,
    add = (t, d, v) => out.push({ t, d, v });
  [
    ["netto", "Netto del mese"],
    ["lordo", "Totale competenze"],
    ["tratt", "Totale trattenute"],
    ["ore", "Ore ordinarie lavorate"],
  ].forEach(([k, l]) => {
    if (!has(p[k]))
      add(l + " non letto", "Apri il PDF e controlla, oppure ricarica la busta");
  });
  if (+p.ggLav > 31 || +p.ore > 350)
    add("Valore fuori scala", "Giorni lavorati " + (p.ggLav ?? "—") + " · ore ordinarie " + (p.ore ?? "—"));
  if (has(p.lordo) && has(p.tratt) && has(p.netto)) {
    const c = p.lordo - p.tratt,
      d = c - p.netto;
    if (Math.abs(d) > 1)
      add(
        "Competenze − trattenute ≠ netto",
        "competenze " + f(p.lordo) + " − trattenute " + f(p.tratt) + " = " + f(c) + " · netto in busta " + f(p.netto),
        sg(d) + " €",
      );
  }
  const rat = (nome, ap, mat, god, sal) => {
    if (![ap, mat, god, sal].every(has)) return;
    const c = ap + mat - god,
      d = c - sal;
    if (Math.abs(d) > tol)
      add(
        nome + ": il saldo non torna",
        "residuo AP " + f(ap) + " + maturato " + f(mat) + " − goduto " + f(god) + " = " + f(c) + " · saldo in busta " + f(sal),
        sg(d) + " ore",
      );
  };
  rat("Ferie", p.ferieAP, p.ferieMat, p.ferieGodAnno, p.ferieSaldo);
  rat("Ex-festività", p.exAP, p.exMat, p.exGodAnno, p.exSaldo);
  rat("Permessi", p.permAP, p.permMat, p.permGodAnno, p.permSaldo);
  if ([p.straord, p.oraria, p.straordImp, p.suppPerc].every(has)) {
    const sp = 1 + p.suppPerc / 100,
      fp = (has(p.festPerc) ? p.festPerc : 30) / 100,
      c = p.straord * p.oraria * sp + (p.festOre || 0) * p.oraria * fp,
      d = c - p.straordImp;
    if (Math.abs(d) > 0.15)
      add(
        "Importo straordinari e maggiorazioni non torna",
        "ore × paga oraria × maggiorazioni = " + f(c) + " € · in busta " + f(p.straordImp) + " €",
        sg(d) + " €",
      );
  }
  if (p.voci && p.voci.some((v) => v.k)) {
    const sm = (k) => r2(p.voci.filter((v) => v.k === k && !v.m).reduce((z, v) => z + (v.i || 0), 0));
    [["C", "lordo", "Somma voci ≠ totale competenze"], ["T", "tratt", "Somma voci ≠ totale trattenute"]].forEach(([k, f2, t]) => {
      if (has(p[f2]) && Math.abs(sm(k) - p[f2]) > 0.05)
        add(t, "voci lette " + f(sm(k)) + " · totale in busta " + f(p[f2]), sg(sm(k) - p[f2]) + " €");
    });
  }
  const pv = p.per && S.pay.find((q) => q.per === perPrev(p.per));
  if (pv) {
    const L = perLab(pv.per),
      same = pv.per.slice(0, 4) === p.per.slice(0, 4);
    [
      ["azienda", "Azienda"],
      ["hire", "Data di assunzione"],
      ["liv", "Livello"],
      ["qual", "Qualifica"],
    ].forEach(([k, l]) => {
      if (has(p[k]) && has(pv[k]) && String(p[k]) !== String(pv[k]))
        add(l + " diverso dalla busta di " + L, pv[k] + " → " + p[k]);
    });
    if (has(p.pt) && has(pv.pt) && Math.abs(p.pt - pv.pt) > 0.01)
      add("Part time diverso dalla busta di " + L, f(pv.pt) + "% → " + f(p.pt) + "%");
    const cum = (nome, k, km) => {
      if (!has(p[k]) || (same && !has(pv[k]))) return;
      const base = same ? pv[k] : 0,
        g = p[km] || 0,
        d = base + g - p[k];
      if (Math.abs(d) > tol)
        add(
          nome + " godute da inizio anno non tornano",
          "busta di " + L + ": " + f(base) + " + godute nel mese " + f(g) + " = " + f(base + g) + " · in busta " + f(p[k]),
          sg(d) + " ore",
        );
    };
    cum("Ferie", "ferieGodAnno", "ferieGod");
    cum("Ex-festività", "exGodAnno", "exGod");
    if (same) {
      [
        ["Ferie", "ferieAP", "ferieMat"],
        ["Ex-festività", "exAP", "exMat"],
      ].forEach(([n, ap, mat]) => {
        if (has(p[ap]) && has(pv[ap]) && Math.abs(p[ap] - pv[ap]) > tol)
          add(n + ": residuo AP cambiato", L + " " + f(pv[ap]) + " → " + f(p[ap]) + " ore");
        if (has(p[mat]) && has(pv[mat]) && p[mat] < pv[mat] - tol)
          add(n + ": maturato diminuito", L + " " + f(pv[mat]) + " → " + f(p[mat]) + " ore");
      });
      [
        ["progImpInps", "Progressivo imponibile INPS"],
        ["progImpIrpef", "Progressivo imponibile IRPEF"],
        ["progIrpef", "IRPEF pagata da inizio anno"],
        ["tfrAnno", "TFR quota anno"],
      ].forEach(([k, l]) => {
        if (has(p[k]) && has(pv[k]) && p[k] < pv[k] - 0.01)
          add(l + " diminuito rispetto a " + L, f(pv[k]) + " → " + f(p[k]) + " €");
      });
    }
  }
  return out;
}
function chkHtml(p) {
  const R = checkBusta(p);
  if (!R.length) return "";
  return `<div class="card"><h3 class="fh neg">Da controllare (${R.length})</h3>${R.map((x) => `<div class="fr"><div>${esc(x.t)}${x.d ? `<small>${esc(x.d)}</small>` : ""}</div>${x.v ? `<b class="neg">${esc(x.v)}</b>` : ""}</div>`).join("")}<p style="color:var(--mu);font-size:13px;margin:8px 0 0">Può essere un errore di lettura del PDF e non della busta: controlla i valori qui sotto, oppure ricarica il PDF.</p></div>`;
}
const opn = new Set(),
  op = (k) => (opn.has(k) ? " open" : "");
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
        `<details class='card cl' data-c='y${y}'${op("y" + y)}><summary><span><b>${/^\d{4}$/.test(y) ? "Buste paga " + y : y}</b><small style='color:var(--mu);display:block'>${L.length} ${L.length === 1 ? "busta" : "buste"}${tot ? " · netto " + fmt(tot) + " €" : ""}</small></span></summary>` +
        L.map(
          (p) =>
            `<div class='r'><div class='d'><b>${p.per ? cap(MESI[+p.per.slice(5, 7) - 1] || "?") : "Periodo ?"}</b><small>Netto ${p.netto ? fmt(p.netto) + " €" : "—"} · Lordo ${p.lordo ? fmt(p.lordo) + " €" : "—"} · Ore ${p.ore ? fmtH(p.ore) : "—"}</small></div><div class='ba'>${checkBusta(p).length ? `<button class='b dng ey ex' data-det='${p.id}' aria-label='Dettaglio busta: ci sono controlli da verificare' title='Controlli da verificare'>!</button>` : `<button class='b s ey' data-det='${p.id}' aria-label='Dettaglio busta' title='Dettaglio'>${IC.d}</button>`}<button class='b s ey' data-view='${p.id}' aria-label='Apri busta'${p.pdf ? "" : " style='opacity:.5'"}>${IC.e}</button><button class='b s' data-del='${p.id}' aria-label='Elimina'>✕</button></div></div>`,
        ).join("") +
        "</details>"
      );
    })
    .join("");
}
function simOre(y, m) {
  const k = y + "-" + String(m + 1).padStart(2, "0"),
    L = S.pay
      .filter((p) => p.per && p.lordo && p.netto)
      .sort((a, b) => b.per.localeCompare(a.per)),
    l = L.find((p) => p.per <= k) || L[0];
  if (!l) return null;
  const hr =
    l.oraria ||
    (l.ore
      ? (l.lordo - (l.straordImp || 0)) /
        (l.ore + (l.ferieGod || 0) + (l.exGod || 0))
      : 0);
  if (!hr) return null;
  const D = meseDati(y, m),
    sp = 1 + (l.suppPerc || 35) / 100,
    fp = (l.festPerc || 30) / 100,
    // parte da 0 e cresce con le ore segnate; ordinarie fino alle ore previste del periodo
    ord = Math.max(0, D.st.w + D.st.fe - D.supp),
    po = ord * hr,
    ps = D.supp * hr * sp,
    pf = D.fest * hr * fp,
    // altre competenze fisse della busta (es. indennità): maturano in proporzione alle ore previste
    base = l.retribGG && l.retrib > 0 ? l.retrib : l.ore ? hr * (l.ore + (l.ferieGod || 0) + (l.exGod || 0)) : null,
    paFull = base == null ? 0 : Math.max(0, l.lordo - base - (l.straordImp || 0)),
    prog = D.st.e ? Math.min(1, (D.st.w + D.st.fe) / D.st.e) : 0,
    pa = paFull * prog,
    lordo = po + ps + pf + pa;
  return { l, hr, D, ord, po, ps, pf, pa, paFull, prog, sp, fp, lordo, netto: (lordo * l.netto) / l.lordo };
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
  const nd = nh ? new Date(nh[0]) : null;
  return `<div class="hero"><small>${GG[n.getDay()]} ${n.getDate()} ${MESI[m]} ${y}</small><small style="display:block;margin-top:12px">${hlab}</small><div class="big fit">${hbig}</div><div class="bar"><i style="width:${pct}%"></i></div><small>${hsub}</small></div>
${vBk()}
<div class="card"><div class="row"><b>Oggi</b><span style="color:var(--mu);text-align:right">${stt}</span></div>${x.turni && !x.t ? turniTab(x.turni) : ""}</div>
<div class="card"><div class="fr" id="goc" style="cursor:pointer"><div>Ore di contratto</div><b style="color:var(--ac)">${wh() ? fmt(wh()) + " ore" : "—"}</b></div><div class="fr"><div>Data assunzione</div><b>${S.set.hire ? esc(S.set.hire.split("-").reverse().join("/")) : "—"}</b></div><div class="grid" style="margin-top:10px"><div class="k"><b>${a ? a.y + " a " + a.m + " m " + a.d + " g" : "—"}</b><span>Anzianità</span></div><div class="k"><b>${nd ? nd.getDate() + " " + MESI[nd.getMonth()].slice(0, 3) : "—"}</b><span>Prossimo festivo${nh ? ": " + nh[1] : ""}</span></div></div></div>
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
const pd = (s) => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8)),
  GF = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
  ];
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
    c += `<button class="${cl.join(" ")}" data-d="${k}">${i}${k === td || z.h || z.t ? "<i></i>" : ""}</button>`;
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
<div class="dact"><select id="dt">${op("", "Lavoro")}${op("ferie", "Ferie")}${op("permesso", "Permesso")}${op("malattia", "Malattia")}</select><button class="b" id="${t === "" ? "da" : "di"}">${lab}</button><button class="b s" id="dc">Cancella</button></div>${x.turni && !x.t ? turniTab(x.turni) : ""}</div>
<div class="card"><div class="grid"><div class="k"><b>${fmtH(st.w + st.fe)}</b><span>Ore effettive (incl. assenze)</span></div><div class="k"><b>${fmtH(st.e)}</b><span>Ore previste</span></div><div class="k"><b class="${st.bal >= 0 ? "pos" : "neg"}">${st.bal > 0 ? "+" : ""}${fmtH(st.bal)}</b><span>Saldo mese</span></div><div class="k"><b>${st.ex} / ${st.hol}</b><span>Ferie / festivi nel mese</span></div></div></div>${vBustaMese(y, m)}`;
}
function meseDati(y, m) {
  const P = period(y, m),
    st = monthStats(y, m),
    H = {};
  let fer = 0,
    perm = 0,
    fest = 0;
  for (let d = new Date(P.s); d <= P.e; d.setDate(d.getDate() + 1)) {
    const k = iso(d),
      x = S.days[k] || {},
      yy = d.getFullYear();
    H[yy] = H[yy] || holidays(yy);
    const o = x.h != null && x.h !== "" ? +x.h : std();
    if (x.t === "ferie") fer += o;
    else if (x.t === "permesso") perm += o;
    else if (x.h > 0 && (H[yy][k] || d.getDay() === 0)) fest += +x.h;
  }
  return { st, fer, perm, fest, supp: Math.max(0, st.bal) };
}
function bustaMese(y, m) {
  const k = y + "-" + String(m + 1).padStart(2, "0");
  return S.pay.find((q) => q.per === k) || null;
}
function checkMese(y, m) {
  const p = bustaMese(y, m);
  if (!p) return null;
  const D = meseDati(y, m);
  return [
    ["Ore lavorate", D.st.w, (p.ore || 0) + (p.straord || 0)],
    ["Ore suppl./straord. " + fmt1(p.suppPerc || 35) + "%", D.supp, p.straord || 0],
    ["Ore festive " + (p.festPerc || 30) + "%", D.fest, p.festOre || 0],
    ["Ferie godute", D.fer, p.ferieGod || 0],
    ["Permessi", D.perm, p.exGod || 0],
  ].map(([lab, a, b]) => ({ lab, a, b, diff: a - b, ok: Math.abs(a - b) <= 0.25 }));
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
            (fe ? " · " + fe + (fe === 1 ? " festivo escluso" : " festivi esclusi") : "");
        };
      m.dirty = () => A.value !== k0 || B.value !== k0;
      A.onchange = B.onchange = upd;
      m.querySelector("#mc").onclick = close;
      m.querySelector("#ms").onclick = () => {
        const P = cur();
        for (const k in P) S.days[k] = { t: "ferie", h: P[k] };
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
      if (!x.h && !x.t) delete S.days[k];
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
    const what = x.t
      ? cap(x.t)
      : x.h
        ? fmtH(x.h) + " registrate"
        : "turni";
    confirmBox(
      "Cancellare il giorno?",
      `Stai per cancellare <b>${GF[D.getDay()]} ${D.getDate()} ${MESI[D.getMonth()]}</b> (${what}). L'operazione non si può annullare.`,
      "Cancella",
      () => {
        delete S.days[k];
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
const num = (s) =>
  s == null ? null : parseFloat(String(s).replace(/\./g, "").replace(",", "."));
const FD = [
    ["per", "Periodo (AAAA-MM)"],
    ["azienda", "Azienda"],
    ["hire", "Data assunzione (AAAA-MM-GG)"],
    ["liv", "Livello"],
    ["qual", "Qualifica"],
    ["pt", "Part time %"],
    ["lordo", "Totale competenze €"],
    ["tratt", "Totale trattenute €"],
    ["netto", "Netto del mese €"],
    ["ore", "Ore ordinarie lavorate"],
    ["straord", "Ore suppl./straord."],
    ["straordImp", "Importo straord./suppl. € (da escludere)"],
    ["oraria", "Paga oraria base €/h"],
    ["ggLav", "Giorni lavorati"],
    ["festOre", "Ore festivo lavorate"],
    ["suppPerc", "Maggiorazione suppl./straord. %"],
    ["festPerc", "Maggiorazione festivo %"],
    ["retrib", "Retribuzione mensile fissa €"],
    ["retribGG", "Giorni retribuiti (paga a giorni)"],
    ["ferieGod", "Ferie godute nel mese (ore)"],
    ["exGod", "Perm./ex-fest. godute nel mese (ore)"],
    ["ferieAP", "Ferie residuo AP (ore)"],
    ["ferieMat", "Ferie maturate (ore)"],
    ["ferieGodAnno", "Ferie godute da inizio anno (ore)"],
    ["ferieSaldo", "Ferie saldo (ore)"],
    ["exAP", "Ex-festività residuo AP (ore)"],
    ["exMat", "Ex-festività maturate (ore)"],
    ["exGodAnno", "Ex-festività godute da inizio anno (ore)"],
    ["exSaldo", "Ex-festività saldo (ore)"],
    ["permAP", "Permessi residuo AP (ore)"],
    ["permMat", "Permessi maturati (ore)"],
    ["permGodAnno", "Permessi goduti da inizio anno (ore)"],
    ["permSaldo", "Permessi saldo (ore)"],
    ["tfrFondo", "TFR fondo al 31/12 €"],
    ["tfrQuota", "Quota TFR del mese €"],
    ["tfrAnno", "TFR quota anno €"],
    ["impIrpef", "Imponibile IRPEF mese €"],
    ["irpef", "Ritenute IRPEF mese €"],
    ["progImpInps", "Progr. imponibile INPS €"],
    ["progImpIrpef", "Progr. imponibile IRPEF €"],
    ["progIrpef", "IRPEF pagata da inizio anno €"],
  ],
  TXT = ["per", "azienda", "hire", "liv", "qual"];
const mn = (s) => s.replace(/\s+/g, "").toLowerCase(),
  money = /^-?[\d.]+,\d{2}\s*€?$/,
  N = (v) => (v == null || v === "" ? null : num(v)),
  esc = (v) =>
    String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
async function readPdf2(f) {
  const buf = f.arrayBuffer ? await f.arrayBuffer() : f.slice(0),
    pdf = await pdfjsLib.getDocument({ data: buf }).promise,
    pg = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const c = await (await pdf.getPage(i)).getTextContent(),
      it = c.items
        .filter((t) => t.str.trim())
        .map((t) => ({
          s: t.str.trim(),
          x: t.transform[4],
          y: t.transform[5],
          w: t.width,
        })),
      L = [];
    it.slice()
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .forEach((t) => {
        const l = L[L.length - 1];
        if (l && Math.abs(l.y - t.y) <= 3) l.t.push(t);
        else L.push({ y: t.y, t: [t] });
      });
    L.forEach((l) => l.t.sort((a, b) => a.x - b.x));
    pg.push({
      it,
      ln: L.map((l) => l.t),
      txt: L.map((l) => l.t.map((t) => t.s).join(" ")).join("\n"),
    });
  }
  return pg;
}
function near(P, lab, dir) {
  for (const l of P.it.filter((t) => mn(t.s).includes(lab))) {
    const c = P.it
      .filter(
        (t) =>
          money.test(t.s) &&
          (dir === "r"
            ? t.x > l.x + 5 && Math.abs(t.y - l.y) < 9
            : t.y < l.y && l.y - t.y < 45 && Math.abs(t.x - l.x) < 130),
      )
      .sort((a, b) =>
        dir === "r"
          ? a.x - b.x
          : b.y - a.y || Math.abs(a.x - l.x) - Math.abs(b.x - l.x),
      );
    if (c.length) return c[0].s;
  }
}
function parse2(pg) {
  const R = {},
    put = (k, v) => {
      if (R[k] == null || R[k] === "") R[k] = v;
    };
  pg.forEach((P) => {
    const t = P.txt,
      g = (r, i = 1) => {
        const m = t.match(r);
        return m ? m[i] : undefined;
      };
    let m;
    put("netto", N(near(P, "nettodelmese", "b") || g(/([\d.]+,\d{2})\s*€/)));
    put(
      "lordo",
      N(
        near(P, "totalecompetenze", "r") ||
          g(/TOTALE\s+COMPETENZE\s+([\d.]+,\d{2})/i),
      ),
    );
    put(
      "tratt",
      N(
        near(P, "totaletrattenute", "r") ||
          g(/TOTALE\s+TRATTENUTE\s+([\d.]+,\d{2})/i),
      ),
    );
    m = t.match(
      /(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i,
    );
    if (m)
      put(
        "per",
        m[2] +
          "-" +
          String(MESI.indexOf(m[1].toLowerCase()) + 1).padStart(2, "0"),
      );
    put(
      "azienda",
      g(
        /^([A-Z][A-Z0-9 .&'-]*?\s(?:S\.?P\.?A\.?|S\.?R\.?L\.?|S\.?N\.?C\.?|S\.?A\.?S\.?))(?=\s|$)/m,
      ),
    );
    m = t.match(/(\d{2}-\d{2}-\d{4})\s+(\d{2}-\d{2}-\d{4})/);
    if (m) put("hire", m[2].split("-").reverse().join("-"));
    put("liv", g(/(\d+)\s*°?\s*Livello/i));
    put("qual", g(/\s([A-Z]{2,5})\s+\d+\s*Livello/));
    put("pt", N((g(/Part\s*Time\s*([\d.,]+)\s*%/i) || "").replace(".", ",")));
    // le colonne vuote (es. ore INPS) cambiano da busta a busta:
    // i giorni lavorati sono l'ultimo intero prima delle ore ordinarie
    m = t.match(
      /(?:\d+\s+){1,}(\d+)\s+(\d+,\d{2})\s+(\d+,\d{2})\s+(\d+)(?!\d)/,
    );
    if (m) {
      put("ggLav", +m[1]);
      put("ore", N(m[2]));
      put("straord", N(m[3]));
    }
    put(
      "oraria",
      N(g(/(?:paga|retribuzione)\s+oraria[^\d\n]{0,25}([\d.]+,\d{2,4})/i)),
    );
    put("exGod", N(g(/Perm\.?\s*Ex-?\s*Fest\.?\s*Goduti\s+([\d.,]+)\s*ORE/i)));
    {
      let si = 0;
      t.split("\n").forEach((L) => {
        if (!/supplementar|straordinar|maggiorazione/i.test(L)) return;
        const ms = [
          ...L.matchAll(/(?<![\d,.])(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}(?!\d)/g),
        ];
        if (ms.length) si += N(ms[ms.length - 1][0]);
      });
      if (si) put("straordImp", Math.round(si * 100) / 100);
      let mo = t.match(
          /(?:Supplementare|Straordinari\w*)\s+(\d+)\s*%\s+(\d+,\d{3,})/i,
        ),
        rt = mo ? N(mo[2]) / (1 + mo[1] / 100) : null;
      {
        // più righe (es. Straordinario 30% e Supplementare 35%): percentuale media pesata sulle ore
        let so = 0,
          sp = 0;
        for (const x of t.matchAll(
          /(?:Supplementare|Straordinari\w*)\s+(\d+)\s*%\s+(\d+,\d{3,})\s+([\d.]+,\d+)\s*ORE/gi,
        )) {
          const o = N(x[3]);
          so += o;
          sp += o * +x[1];
        }
        if (so > 0) put("suppPerc", Math.round((sp / so) * 1e4) / 1e4);
        else if (mo) put("suppPerc", +mo[1]);
      }
      if (rt == null) {
        mo = t.match(/Maggiorazione[^\n]*?(\d+)\s*%\s+(\d+,\d{3,})/i);
        if (mo) rt = N(mo[2]) / (mo[1] / 100);
      }
      if (rt) put("oraria", Math.round(rt * 10000) / 10000);
    }
    put("festOre", N(g(/Maggiorazione festivo[^\n]*?([\d.,]+)\s*ORE/i)));
    put("festPerc", N(g(/Maggiorazione festivo\s+(\d+)\s*%/i)));
    // paga mensile a giorni (es. "Retribuzione ... 26,00000 GG  1.660,08")
    m = t.match(
      /Z00001\s+Retribuzione\s+[\d.]+,\d+\s+(\d+(?:,\d+)?)\s*GG\s+([\d.]+,\d{2})/i,
    );
    if (m) {
      put("retribGG", N(m[1]));
      put("retrib", N(m[2]));
    }
    put("ferieGod", N(g(/Ferie godute\s+([\d.,]+)\s*ORE/i)));
    put("impIrpef", N(g(/Imponibile IRPEF\s+([\d.]+,\d{2})/i)));
    put("irpef", N(g(/Ritenute IRPEF\s+([\d.]+,\d{2})/i)));
    m = t.match(/\bFerie((?:\s+[\d.,]+){3,4})\s*ORE/);
    if (m) {
      const v = m[1].trim().split(/\s+/).map(N);
      put("ferieAP", v[0]);
      put("ferieMat", v[1]);
      put("ferieGodAnno", v.length === 4 ? v[2] : 0);
      put("ferieSaldo", v[v.length - 1]);
    }
    const bal = (mm, p) => {
      const v = mm[1].trim().split(/\s+/).map(N);
      put(p + "Saldo", v[v.length - 1]);
      if (v.length >= 3) {
        put(p + "AP", v[0]);
        put(p + "Mat", v[1]);
        put(p + "GodAnno", v.length === 4 ? v[2] : 0);
      }
    };
    m = t.match(/Perm\.?\s*Ex-?\s*Fs((?:\s+[\d.,]+){3,4})\s*ORE/i);
    if (m) bal(m, "ex");
    m = t.match(/\bPermessi((?:\s+[\d.,]+){1,4})\s*ORE/i);
    if (m) bal(m, "perm");
    put("tfrFondo", N(near(P, "f.do31/12", "b")));
    put("tfrQuota", N(g(/Quota T\.F\.R\.\s+([\d.]+,\d{2})/)));
    put("tfrAnno", N(near(P, "quotaanno", "b")));
    put("progImpInps", N(near(P, "imp.inps", "b")));
    put("progImpIrpef", N(near(P, "imp.irpef", "b")));
    put("progIrpef", N(near(P, "irpefpagata", "b")));
  });
  const VC = parseVoci(pg);
  if (VC.length) {
    R.voci = VC;
    const sum = (a) => a.reduce((z, v) => z + (v.i || 0), 0),
      ex = VC.filter((v) => v.k !== "T" && !v.m && /supplementar|straordinar|maggiorazione/i.test(v.d)),
      qo = (re) => VC.filter((v) => v.u === "ORE" && re.test(v.d)).reduce((z, v) => z + (v.q || 0), 0);
    if (ex.length) put("straordImp", Math.round(sum(ex) * 100) / 100);
    if (qo(/supplementar|straordinar/i)) put("straord", qo(/supplementar|straordinar/i));
    if (qo(/festiv/i)) put("festOre", qo(/festiv/i));
  }
  return R;
}
// legge ogni riga-voce: codice, descrizione, quantita (ORE/GG), base, importo, colonna (C competenze / T trattenute)
function parseVoci(pg) {
  const out = [];
  pg.forEach((P) => {
    const hc = (k) => {
        const h = (P.it || []).find((t) => mn(t.s).startsWith(k));
        return h ? h.x + (h.w || 0) / 2 : null;
      },
      cT = hc("trattenute"),
      cC = hc("competenze");
    if (cT == null || cC == null) return;
    const d = cC - cT,
      cR = hc("riferimento") ?? cT - d,
      cB = hc("importobase") ?? cR - d,
      Z = [["B", cB], ["R", cR], ["T", cT], ["C", cC]];
    (P.ln || []).forEach((row) => {
      const t = row.slice();
      while (t.length && /^\*+$/.test(t[0].s)) t.shift();
      if (t.length < 3) return;
      const code = t[0].s.replace(/^\*+/, "");
      if (!/^[A-Z]{0,2}\d{4,6}$/.test(code)) return;
      const D = [],
        V = [];
      let par = false;
      for (const it of t.slice(1)) {
        if (it.s.includes("(")) par = true;
        const s = it.s.replace(/[()]/g, "").trim();
        if (s) {
          if (/^-?[\d.]+,\d+\s*(ORE|GG|%)?$/i.test(s)) {
            const cx = it.x + (it.w || 0) / 2;
            V.push({
              v: N(s.replace(/[^\d.,-]/g, "")),
              u: (s.match(/ORE|GG|%/i) || [""])[0].toUpperCase(),
              z: Z.reduce((a, b) => (Math.abs(cx - b[1]) < Math.abs(cx - a[1]) ? b : a))[0],
              m: par,
            });
          } else if (/^(ORE|GG|%)$/i.test(s) && V.length) V[V.length - 1].u = s.toUpperCase();
          else if (!V.length) D.push(s);
        }
        if (it.s.includes(")")) par = false;
      }
      const am = V.filter((v) => !v.u && (v.z === "T" || v.z === "C")).pop(),
        q = V.find((v) => v.u),
        r = V.find((v) => !v.u && (v.z === "B" || v.z === "R"));
      if (!am && !q) return;
      out.push({ c: code, d: D.join(" "), q: q ? q.v : null, u: q ? q.u : "", r: r ? r.v : null, i: am ? am.v : null, k: am ? am.z : null, m: am && am.m ? 1 : 0 });
    });
  });
  return out;
}
const r2 = (x) => Math.round(x * 100) / 100;
function simCard(p) {
  const s = p.sim;
  if (!s) return "";
  const R = [["Lordo", s.lordo, p.lordo], ["Netto", s.netto, p.netto], ["Extra (suppl./straord. + festivo)", s.extra, p.straordImp]]
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
  return `<details class="card cl"><summary><h3 class="fh">Voci della busta (${V.length})</h3></summary>${V.map((v) => `<div class="fr"><div>${esc(v.d)}<small>${esc(v.c)}${v.q != null ? " · " + fmt(v.q) + " " + v.u : ""}${v.r != null ? " · base " + fmt(v.r) : ""}${v.k === "T" ? " · trattenuta" : ""}${v.m ? " · informativa, fuori dai totali" : ""}</small></div><b>${v.i != null ? fmt(v.i) + " €" : "—"}</b></div>`).join("")}</details>`;
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
      l && l.per
        ? cap(MESI[+l.per.slice(5, 7) - 1] || "") + " " + l.per.slice(0, 4)
        : "periodo ?";
  return `${
    l
      ? `<div class="hero"><small>Ultima busta · ${mese}</small><div class="big">${eur(l.netto)}</div><small>Netto del mese</small></div>
<details class="card cl" data-c="det"${op("det")}><summary><h3 class="fh">Dettaglio ultima busta</h3></summary>
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
${(() => { const q = P.filter((p) => p.sim && p.netto); return q.length ? row("Scostamento medio simulazione (netto)", fmt1(q.reduce((z, p) => z + Math.abs(p.sim.netto - p.netto) / p.netto * 100, 0) / q.length) + "%", q.length + (q.length === 1 ? " busta confrontata" : " buste confrontate")) : ""; })()}</div>
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
            lab = R.per
              ? cap(MESI[+R.per.slice(5, 7) - 1] || "") +
                " " +
                R.per.slice(0, 4)
              : "periodo non trovato";
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
              .forEach((p) => pdfDel(p.id).catch(() => {}));
            S.pay = S.pay.filter((p) => !(p.per && p.per === o.per));
            {
              const sm = simOre(+o.per.slice(0, 4), +o.per.slice(5, 7) - 1);
              if (sm) o.sim = { base: sm.l.per, lordo: r2(sm.lordo), netto: r2(sm.netto), extra: r2(sm.ps + sm.pf), hr: sm.hr };
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
          lab =
            p && p.per
              ? cap(MESI[+p.per.slice(5, 7) - 1] || "") +
                " " +
                p.per.slice(0, 4)
              : "senza periodo";
        confirmBox(
          "Eliminare la busta paga?",
          `Stai per eliminare la busta di <b>${lab}</b>. L'operazione non si può annullare.`,
          "Elimina",
          () => {
            if (p) pdfDel(p.id).catch(() => {});
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
      } catch (e) {}
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
