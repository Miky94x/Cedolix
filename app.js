const $ = (s) => document.querySelector(s);
const def = {
  set: {
    hire: "",
    wh: 40,
    patrono: "",
  },
  days: {},
  pay: [],
};
let S = JSON.parse(JSON.stringify(def)),
  blocked = false,
  warned = false;
let dbp = null;
const idb = () =>
    dbp ||
    (dbp = new Promise((res, rej) => {
      const r = indexedDB.open("oreLavoroPdf", 2);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("pdf")) d.createObjectStore("pdf");
        if (!d.objectStoreNames.contains("state")) d.createObjectStore("state");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => {
        dbp = null;
        rej(r.error);
      };
    })),
  idbDo = async (mode, f, store = "pdf") => {
    const db = await idb();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode),
        q = f(t.objectStore(store));
      t.oncomplete = () => res(q && q.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  },
  pdfPut = (id, buf) => idbDo("readwrite", (o) => o.put(buf, id)),
  pdfGet = (id) => idbDo("readonly", (o) => o.get(id)),
  pdfDel = (id) => idbDo("readwrite", (o) => o.delete(id)),
  stGet = () => idbDo("readonly", (o) => o.get("S"), "state"),
  stPut = (v) => idbDo("readwrite", (o) => o.put(v, "S"), "state");
const save = () => {
  if (blocked) return;
  stPut(S).catch(() => {
    if (!warned) {
      warned = true;
      alert("Impossibile salvare i dati sul dispositivo.");
    }
  });
};
function normalize() {
  S.set = { ...def.set, ...(S.set || {}) };
  S.days = S.days || {};
  S.pay = S.pay || [];
  const y = new Date().getFullYear();
  if (S.set.patrono && S.set.patronoY == null) S.set.patronoY = y;
  if (S.set.patrono && S.set.patronoY !== y) {
    S.set.patrono = "";
    delete S.set.patronoY;
    save();
  }
}
async function boot() {
  try {
    const v = await stGet();
    if (v && typeof v === "object") S = v;
  } catch (e) {
    blocked = true;
    alert("Impossibile leggere i dati salvati: le modifiche non verranno salvate. Riavvia l'app.");
  }
  normalize();
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) {}
  applyTema();
  render();
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
  if (/^\d\d-\d\d$/.test(S.set.patrono))
    h[y + "-" + S.set.patrono] = "Santo Patrono";
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
    const E = exp(d, h[yy]);
    e += E;
    if (h[yy][k]) hol++;
    if (x.t === "ferie" || x.t === "malattia" || x.t === "permesso") {
      fe += x.h != null && x.h !== "" ? +x.h : std();
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
    lim = l.per ? iso(new Date(y, m, 0)) : "";
  let usati = 0;
  for (const k in S.days) if (k > lim && S.days[k].t === "ferie") usati++;
  const d = std() || 8,
    fer = l.ferieSaldo || 0,
    pe = (l.permSaldo || 0) + (l.exSaldo || 0),
    ore = fer + pe - usati * d;
  return {
    l,
    ore,
    gg: ore / d,
    sett: wh() ? ore / wh() : null,
    usati,
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
${f.usati ? row("Segnate dopo la busta", "-" + f.usati + (f.usati === 1 ? " giorno" : " giorni")) : ""}</div>
<div class="card"><h3 class="fh">Permessi ed ex-festività</h3>
${row("Residuo AP", ore(pAP))}
${row("Maturato", ore(pMat))}
${row("Goduto", god(pGod))}
${row("Saldo", ore(f.pe), "tt", dal)}</div>`;
}
function vSet() {
  const s = S.set;
  return `<h2>Impostazioni</h2><div class="card set"><label>Ore settimanali da contratto</label><input type="number" step="0.25" id="wh" value="${s.wh}">
<label>Santo patrono</label><input type="date" id="pa" style="width:100%" value="${s.patrono ? new Date().getFullYear() + "-" + s.patrono : ""}">
<button type="button" class="tpk" id="tc"><span>Colore tema</span><i id="tsw" style="background:${s.tema || "#d00cca"}"></i></button>
<div class="hd"><span>Data di assunzione</span><b>${s.hire ? s.hire.split("-").reverse().join("/") : "verrà letta dalla prima busta paga caricata"}</b></div>
<div class="row" style="margin-top:14px"><button class="b s" id="tr">Ripristina colore</button><button class="b" id="sv">Salva</button></div><p id="ms" style="color:var(--ac);font-size:17px"></p></div>${bkCard()}<p style="text-align:center;color:var(--mu);font-size:15px;margin:8px 0 0">Cedolix V${V}</p>`;
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
const bad = (m) => Object.assign(new Error(m), { bk: 1 }),
  dLong = (d) =>
    d && !isNaN(d)
      ? d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
      : null,
  infoBox = (t, msg) =>
    modal(
      `<h3>${t}</h3><p style="color:var(--mu);margin:0 0 16px">${msg}</p><div class="row"><button class="b" id="mc">Ok</button></div>`,
      (m, close) => {
        m.querySelector("#mc").onclick = close;
      },
    );
function bkCard() {
  const u = S.set.ultimoBackup,
    t = dLong(u ? new Date(u) : null) || "mai effettuato";
  return `<div class="card set" style="margin-top:12px"><h3 class="fh" style="font-size:19px">Backup e ripristino</h3><div class="hd" style="margin-top:12px"><span>Ultimo backup</span><b>${t}</b></div><div class="row" style="margin-top:14px"><button class="b s" id="rs" style="flex:1">Ripristina</button><button class="b" id="bk" style="flex:1">Crea backup</button></div><p style="color:var(--mu);font-size:15px;margin:12px 0 0">Il file zip contiene tutti i dati e i PDF delle buste paga. Il ripristino sostituisce tutto ciò che è presente nell'app.</p></div>`;
}
function backupFlow() {
  modal(
    `<h3>Backup</h3><div id="bk1"><p style="color:var(--mu);text-align:center;margin:24px 0">Creazione del backup…</p></div>`,
    (m, close) => {
      (async () => {
        const box = m.querySelector("#bk1"),
          fail = (msg) => {
            box.innerHTML = `<p class="neg">${msg}</p><div class="row"><button class="b s" id="bc">Chiudi</button></div>`;
            box.querySelector("#bc").onclick = close;
          };
        if (typeof JSZip === "undefined")
          return fail("Libreria zip non disponibile: connettiti a internet e riprova.");
        try {
          const now = new Date().toISOString(),
            data = JSON.parse(JSON.stringify(S)),
            z = new JSZip(),
            ids = [];
          data.set.ultimoBackup = now;
          for (const p of S.pay)
            if (p.pdf) {
              let b = null;
              try {
                b = await pdfGet(p.id);
              } catch (e) {}
              if (b) {
                z.file("pdf/" + p.id + ".pdf", b);
                ids.push(p.id);
              }
            }
          data.pay.forEach((p) => {
            p.pdf = ids.includes(p.id);
          });
          z.file(
            "dati.json",
            JSON.stringify({ app: "Cedolix", schema: 1, versione: V, creato: now, pdf: ids, stato: data }, null, 1),
          );
          const blob = await z.generateAsync({ type: "blob", compression: "DEFLATE" }),
            name = "cedolix-backup-" + iso(new Date()) + ".zip",
            file = new File([blob], name, { type: "application/zip" });
          box.innerHTML = `<p style="color:var(--mu);margin:0 0 16px">File <b>${name}</b> · ${(blob.size / 1048576).toFixed(2).replace(".", ",")} MB<br>${S.pay.length} buste paga, ${ids.length} PDF.</p><div class="row"><button class="b s" id="bc">Chiudi</button><button class="b" id="bs">Salva file</button></div>`;
          box.querySelector("#bc").onclick = close;
          box.querySelector("#bs").onclick = async () => {
            let ok = false;
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({ files: [file], title: name });
                ok = true;
              } catch (e) {
                if (e && e.name === "AbortError") return;
              }
            }
            if (!ok) {
              const u = URL.createObjectURL(blob),
                a = document.createElement("a");
              a.href = u;
              a.download = name;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(u), 60000);
            }
            S.set.ultimoBackup = now;
            save();
            close();
            if (tab === "s") {
              keep = 1;
              render();
            }
          };
        } catch (e) {
          fail("Impossibile creare il backup.");
        }
      })();
    },
  );
}
async function readBackup(f) {
  if (typeof JSZip === "undefined")
    throw bad("Libreria zip non disponibile: connettiti a internet e riprova.");
  let z;
  try {
    z = await JSZip.loadAsync(f);
  } catch (e) {
    throw bad("Il file non è uno zip valido.");
  }
  const jf = z.file("dati.json");
  if (!jf) throw bad("Manca il file dati.json: non sembra un backup di Cedolix.");
  let j;
  try {
    j = JSON.parse(await jf.async("string"));
  } catch (e) {
    throw bad("Il file dati.json non è leggibile.");
  }
  if (!j || j.app !== "Cedolix") throw bad("Il file non è un backup di Cedolix.");
  if (j.schema !== 1) throw bad("Backup creato con una versione incompatibile dell'app.");
  const st = j.stato;
  if (
    !st ||
    typeof st !== "object" ||
    !st.set ||
    typeof st.set !== "object" ||
    !st.days ||
    typeof st.days !== "object" ||
    !Array.isArray(st.pay)
  )
    throw bad("I dati contenuti nel backup sono incompleti.");
  const pdfs = [];
  for (const p of st.pay)
    if (p.pdf) {
      const e = z.file("pdf/" + p.id + ".pdf");
      if (!e) throw bad("Nel backup manca il PDF della busta " + (p.per || "?") + ".");
      pdfs.push([p.id, await e.async("arraybuffer")]);
    }
  return { creato: j.creato, stato: st, pdfs };
}
async function replaceAll(st, pdfs) {
  const db = await idb();
  return new Promise((res, rej) => {
    const t = db.transaction(["pdf", "state"], "readwrite"),
      P = t.objectStore("pdf");
    P.clear();
    pdfs.forEach(([id, buf]) => P.put(buf, id));
    t.objectStore("state").put(st, "S");
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
function restoreFlow() {
  const i = document.createElement("input");
  i.type = "file";
  i.accept = ".zip,application/zip";
  i.onchange = async () => {
    const f = i.files[0];
    if (!f) return;
    let B;
    try {
      B = await readBackup(f);
    } catch (e) {
      return infoBox("Backup non valido", e && e.bk ? e.message : "Impossibile leggere il file.");
    }
    const dt = dLong(new Date(B.creato)) || "data sconosciuta";
    confirmBox(
      "Sostituire tutti i dati?",
      `Backup del <b>${dt}</b>: ${B.stato.pay.length} buste paga, ${Object.keys(B.stato.days).length} giorni registrati. I dati attuali dell'app verranno eliminati e sostituiti. L'operazione non si può annullare.`,
      "Sostituisci",
      async () => {
        try {
          await replaceAll(B.stato, B.pdfs);
        } catch (e) {
          return infoBox("Ripristino non riuscito", "I dati attuali non sono stati modificati.");
        }
        blocked = false;
        S = B.stato;
        normalize();
        applyTema();
        keep = 0;
        render();
        infoBox("Ripristino completato", "Tutti i dati e i PDF sono stati ripristinati.");
      },
    );
  };
  i.click();
}
function bSet() {
  $("#bk").onclick = backupFlow;
  $("#rs").onclick = restoreFlow;
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
    keep = 1;
    render();
  };
  $("#sv").onclick = () => {
    const s = S.set;
    s.wh = +$("#wh").value || 0;
    s.patrono = $("#pa").value ? $("#pa").value.slice(5) : "";
    if (s.patrono) s.patronoY = new Date().getFullYear();
    else delete s.patronoY;
    save();
    $("#ms").textContent = "Salvato ✓";
  };
}
const IC = {
  e: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  d: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
};
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1),
  tl = (T) =>
    T.map((t) => t.a + "–" + t.b + (t.p ? " (pausa " + t.p + "m)" : "")).join(
      " · ",
    );
function turniTab(T) {
  const tm = (v) => (v ? +v.slice(0, 2) * 60 + +v.slice(3, 5) : 0),
    mi = (t) => {
      let m = tm(t.b) - tm(t.a);
      if (m < 0) m += 1440;
      return Math.max(0, m - (+t.p || 0));
    },
    tot = T.reduce((z, t) => z + mi(t), 0);
  return `<table class="tt"><thead><tr><th>Turno</th><th>Entrata</th><th>Uscita</th><th>Pausa</th><th>Durata</th></tr></thead><tbody>${T.map((t, i) => `<tr><td>${i + 1}</td><td>${t.a}</td><td>${t.b}</td><td>${t.p ? t.p + " min" : "—"}</td><td><b>${fmtH(mi(t) / 60)}</b></td></tr>`).join("")}</tbody><tfoot><tr><td colspan="4">Totale</td><td><b>${fmtH(tot / 60)}</b></td></tr></tfoot></table>`;
}
function modal(html, mount) {
  const o = document.createElement("div");
  o.className = "ov";
  o.innerHTML = `<div class="sheet">${html}</div>`;
  const close = () => {
    o.remove();
    document.body.style.overflow = "";
  };
  o.onclick = (e) => {
    if (e.target === o) close();
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
function hoursModal(k) {
  const d = pd(k),
    x = S.days[k] || {},
    T = (x.turni || []).map((t) => ({ a: t.a, b: t.b, p: t.p || "" }));
  if (!T.length) T.push({ a: "", b: "", p: "" });
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
          `<div class="tr" data-i="${i}"><div class="tf"><label>Entrata</label><input type="time" data-f="a" value="${t.a}"></div><div class="tf"><label>Uscita</label><input type="time" data-f="b" value="${t.b}"></div><div class="tf"><label>Pausa (minuti)</label><input type="number" inputmode="numeric" min="0" step="5" data-f="p" placeholder="0" value="${t.p}"></div><div class="tf"><label>Durata</label><div class="row"><b class="td">${fmtH(mins(t) / 60)}</b>${T.length > 1 ? '<button class="b s" data-rm>✕</button>' : ""}</div></div></div>`,
      ).join("");
  const note =
    x.h && !x.turni && !x.t
      ? `<p style="color:var(--mu);font-size:13px;margin:0 0 10px">Questo giorno ha già ${fmtH(x.h)} registrate: salvando verranno sostituite dai turni.</p>`
      : "";
  modal(
    `<h3>Aggiungi turno · ${GF[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}</h3>${note}<div id="tl"></div><button class="b s" id="ta" style="width:100%">+ Aggiungi turno</button><div class="tot"><span>Totale ore</span><b id="tt"></b></div><p id="er" class="neg" style="margin:0 0 10px"></p><div class="row"><button class="b s" id="mc">Annulla</button><button class="b" id="ms">Salva</button></div>`,
    (m, close) => {
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
                ? String(v).split("-").reverse().join("/")
                : t === "n"
                  ? String(v)
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
    `<div class="row" style="margin-bottom:12px"><h3 style="margin:0">Dettaglio · ${lab}</h3><div class="ba"><button class="b" id="mc">Chiudi</button></div></div>${html || "<p style='color:var(--mu)'>Nessun dato salvato per questa busta.</p>"}`,
    (m, close) => {
      m.querySelector("#mc").onclick = close;
    },
  );
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
            `<div class='r'><div class='d'><b>${p.per ? cap(MESI[+p.per.slice(5, 7) - 1] || "?") : "Periodo ?"}</b><small>Netto ${p.netto ? fmt(p.netto) + " €" : "—"} · Lordo ${p.lordo ? fmt(p.lordo) + " €" : "—"} · Ore ${p.ore ? fmtH(p.ore) : "—"}</small></div><div class='ba'><button class='b s ey' data-det='${p.id}' aria-label='Dettaglio busta' title='Dettaglio'>${IC.d}</button><button class='b s ey' data-view='${p.id}' aria-label='Apri busta'${p.pdf ? "" : " style='opacity:.5'"}>${IC.e}</button><button class='b s' data-del='${p.id}' aria-label='Elimina'>✕</button></div></div>`,
        ).join("") +
        "</details>"
      );
    })
    .join("");
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
    f = ferie(),
    a = anz(S.set.hire),
    x = S.days[k] || {},
    E = std();
  const wk = st.w + st.fe,
    pct = st.e ? Math.min(100, Math.round((wk / st.e) * 100)) : 0,
    PP = period(pm.getFullYear(), pm.getMonth()),
    dm = (d) => d.getDate() + " " + MESI[d.getMonth()].slice(0, 3),
    hlab = "Ore di " + MESI[pm.getMonth()],
    hbig = fmtH(wk) + " / " + fmtH(st.e),
    hsub = "Periodo " + dm(PP.s) + " → " + dm(PP.e) + " · " + pct + "%";
  const nh = Object.entries({ ...H, ...holidays(y + 1) })
      .filter((e) => e[0] >= k)
      .sort()[0],
    lp = S.pay
      .slice()
      .sort((a, b) => (b.per || "").localeCompare(a.per || ""))[0];
  const stt =
    H[k] && !x.t
      ? "Festivo: " + H[k]
      : x.t
        ? x.t[0].toUpperCase() + x.t.slice(1)
        : x.h != null
          ? fmtH(x.h) + " registrate"
          : "Nessuna ora registrata";
  const nd = nh ? new Date(nh[0]) : null;
  return `<div class="hero"><small>${GG[n.getDay()]} ${n.getDate()} ${MESI[m]} ${y}</small><small style="display:block;margin-top:12px">${hlab}</small><div class="big">${hbig}</div><div class="bar"><i style="width:${pct}%"></i></div><small>${hsub}</small></div>
<div class="card"><div class="row"><b>Oggi</b><span style="color:var(--mu);text-align:right">${stt}</span></div>${x.turni && !x.t ? turniTab(x.turni) : ""}</div>
<div class="card"><div class="fr"><div>Ore di contratto</div><b style="color:var(--ac)">${wh() ? fmt(wh()) + " ore" : "—"}</b></div><div class="fr"><div>Data assunzione</div><b>${S.set.hire ? S.set.hire.split("-").reverse().join("/") : "—"}</b></div></div>
<div class="grid" style="margin-bottom:12px"><div class="k kc"><b>${f.sett == null ? "—" : fmt1(f.sett) + " sett."}</b><span>Ferie + permessi residui</span></div><div class="k kc"><b>${a ? a.y + " a " + a.m + " m" : "—"}</b><span>Anzianità</span></div><div class="k kc"><b>${nd ? nd.getDate() + " " + MESI[nd.getMonth()].slice(0, 3) : "—"}</b><span>Prossimo festivo${nh ? ": " + nh[1] : ""}</span></div><div class="k kc"><b>${lp && lp.netto ? fmt(lp.netto) + " €" : "—"}</b><span>Ultima busta${lp && lp.per ? " (" + lp.per + ")" : ""}</span></div></div>`;
}
function bHome() {}
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
    if (k === td) cl.push("td");
    if (k === sel) cl.push("sl");
    if (k < ps || k > pe) cl.push("out");
    c += `<button class="${cl.join(" ")}" data-d="${k}">${i}${k === td || z.h || z.t ? "<i></i>" : ""}</button>`;
  }
  const D = pd(sel),
    E = std(),
    x = S.days[sel] || {},
    t = pt && pt.k === sel ? pt.t : x.t || "",
    op = (v, l) =>
      `<option value="${v}"${t === v ? " selected" : ""}>${l}</option>`;
  return `<div class="row" style="margin-bottom:10px"><button class="b s" id="pv">‹</button><h2>${MESI[m]} ${y}</h2><button class="b s" id="nx">›</button></div>
<div class="card"><div class="cal">${["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((g) => `<div class="wd">${g}</div>`).join("")}${c}</div></div>
<div class="card"><b>Periodo di calcolo di ${MESI[m]}</b> <b class="neg" style="margin-left:6px">Importante!</b><div class="chips"><input type="date" id="ps" value="${ps}"><span>→</span><input type="date" id="pe" value="${pe}"></div></div>
<div class="card"><div class="row"><b>${GF[D.getDay()]} ${D.getDate()} ${MESI[D.getMonth()]}</b><small style="color:${H[sel] ? "#ef4444" : "var(--mu)"}">${H[sel] || ""}</small></div>
<div class="chips"><select id="dt">${op("", "Lavoro")}${op("ferie", "Ferie")}${op("permesso", "Permesso")}${op("malattia", "Malattia")}</select>${t === "" ? `<button class="b" id="da">+ Aggiungi turno</button>` : `<button class="b" id="di">Inserisci</button>`}<button class="b s" id="dc">Cancella</button></div>${x.turni && !x.t ? turniTab(x.turni) : ""}</div>
<div class="card"><div class="grid"><div class="k"><b>${fmtH(st.w + st.fe)}</b><span>Ore effettive (incl. assenze)</span></div><div class="k"><b>${fmtH(st.e)}</b><span>Ore previste</span></div><div class="k"><b class="${st.bal >= 0 ? "pos" : "neg"}">${st.bal > 0 ? "+" : ""}${fmtH(st.bal)}</b><span>Saldo mese</span></div><div class="k"><b>${st.ex} / ${st.hol}</b><span>Ferie / festivi nel mese</span></div></div></div>`;
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
      const x = (S.days[sel] = S.days[sel] || {});
      x.t = pt && pt.k === sel ? pt.t : x.t;
      x.h = undefined;
      delete x.turni;
      if (!x.h && !x.t) delete S.days[sel];
      pt = null;
      save();
      keep = 1;
      render();
    };
  if ($("#da")) $("#da").onclick = () => hoursModal(sel);
  $("#dc").onclick = () => {
    pt = null;
    delete S.days[sel];
    save();
    keep = 1;
    render();
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
  esc = (v) => String(v).replace(/'/g, "&#39;").replace(/</g, "&lt;");
async function readPdf2(f) {
  const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() })
      .promise,
    pg = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const c = await (await pdf.getPage(i)).getTextContent(),
      it = c.items
        .filter((t) => t.str.trim())
        .map((t) => ({
          s: t.str.trim(),
          x: t.transform[4],
          y: t.transform[5],
        })),
      L = [];
    it.slice()
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .forEach((t) => {
        const l = L[L.length - 1];
        if (l && Math.abs(l.y - t.y) <= 3) l.t.push(t);
        else L.push({ y: t.y, t: [t] });
      });
    pg.push({
      it,
      txt: L.map((l) =>
        l.t
          .sort((a, b) => a.x - b.x)
          .map((t) => t.s)
          .join(" "),
      ).join("\n"),
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
    m = t.match(
      /(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+,\d{2})\s+(\d+,\d{2})\s+(\d+)(?!\d)/,
    );
    if (m) {
      put("ggLav", +m[5]);
      put("ore", N(m[6]));
      put("straord", N(m[7]));
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
      if (rt == null) {
        mo = t.match(/Maggiorazione[^\n]*?(\d+)\s*%\s+(\d+,\d{3,})/i);
        if (mo) rt = N(mo[2]) / (mo[1] / 100);
      }
      if (rt) put("oraria", Math.round(rt * 10000) / 10000);
    }
    put("festOre", N(g(/Maggiorazione festivo[^\n]*?([\d.,]+)\s*ORE/i)));
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
  return R;
}
function vPay2() {
  const P = S.pay
      .slice()
      .sort((a, b) => (b.per || "").localeCompare(a.per || "")),
    a = anz(S.set.hire),
    l = P[0],
    n = P.filter((p) => p.netto),
    tot = n.reduce((s, p) => s + p.netto, 0),
    av = std() || 8,
    eur = (v) => (v == null ? "—" : fmt(v) + " €"),
    ore = (v) => (v == null ? "—" : fmt(v) + " ore"),
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
        : "periodo ?",
    pe =
      l && (l.permSaldo != null || l.exSaldo != null)
        ? (l.permSaldo || 0) + (l.exSaldo || 0)
        : null;
  return `${
    l
      ? `<div class="hero"><small>Ultima busta · ${mese}</small><div class="big">${eur(l.netto)}</div><small>Netto del mese</small></div>
<details class="card cl" data-c="det"${op("det")}><summary><h3 class="fh">Dettaglio ultima busta</h3></summary>
${row("Ore ordinarie", fmtH(l.ore))}
${row("Ore straordinarie", l.straord ? fmtH(l.straord) : "—")}
${row("Paga oraria base", hr ? fmt(hr) + " €/h" : "—", hn)}
${row("TFR accantonato al 31/12", eur(l.tfrFondo))}</details>
<details class="card cl" data-c="fp"${op("fp")}><summary><h3 class="fh">Ferie e permessi</h3></summary>
${row("Ferie residue", ore(l.ferieSaldo), l.ferieSaldo != null ? "≈ " + fmt(l.ferieSaldo / av) + " giorni" : "")}
${row("Permessi ed ex-festività", ore(pe))}</details>`
      : ""
  }
<div class="card"><h3 class="fh">Riepilogo</h3>
${row("Anzianità", a ? a.y + " a " + a.m + " m " + a.d + " g" : "—", a ? a.tot + " giorni" : "carica una busta")}
${row("Buste salvate", P.length)}
${row("Netto medio", n.length ? eur(tot / n.length) : "—")}
${row("Netto totale salvato", n.length ? eur(tot) : "—")}</div>
<button class="b" id="pu" style="width:100%;margin-bottom:12px">+ Carica busta paga</button>
${payList(P)}`;
}
const GR = [
  ["Periodo e contratto", ["per", "azienda", "hire", "liv", "qual", "pt"], 1],
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
    ],
    1,
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
            ea = (v) => esc(v).replace(/"/g, "&quot;"),
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
              `<div><label>${L[k]}</label><input data-p="${k}" class="${(k === "per" || k === "netto") && !has(k) ? "miss" : ""}" value="${has(k) ? (TXT.includes(k) ? ea(R[k]) : String(R[k]).replace(".", ",")) : ""}"></div>`,
            lab = R.per
              ? cap(MESI[+R.per.slice(5, 7) - 1] || "") +
                " " +
                R.per.slice(0, 4)
              : "periodo non trovato";
          u1.remove();
          u2.innerHTML =
            `<div class="k kc" style="margin-bottom:12px"><b>${lab}${R.netto != null ? " · " + fmt(R.netto) + " €" : ""}</b><span>Letti ${found} campi su ${FD.length}. Controlla i dati e correggi quelli vuoti o sbagliati prima di salvare.</span></div>` +
            G.map(
              ([t, K, o]) =>
                `<details${o ? " open" : ""}><summary>${t}</summary><div class="fg">${K.map(fld).join("")}</div></details>`,
            ).join("") +
            `<details><summary>Testo estratto</summary><pre>${esc(txt)}</pre></details>
<p id="uer" class="neg" style="margin:10px 0 0"></p>
<div class="stk"><div class="row"><button class="b s" id="uc">Annulla</button><button class="b" id="sp">Salva busta</button></div></div>`;
          u2.querySelector("#uc").onclick = close;
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
            if (!/^\d{4}-\d{2}$/.test(o.per || "")) {
              u2.querySelector("#uer").textContent =
                "Inserisci il periodo nel formato AAAA-MM (es. 2026-09).";
              return;
            }
            if (o.hire && !S.set.hire) S.set.hire = o.hire;
            S.pay
              .filter((p) => p.per && p.per === o.per)
              .forEach((p) => pdfDel(p.id).catch(() => {}));
            S.pay = S.pay.filter((p) => !(p.per && p.per === o.per));
            try {
              await pdfPut(o.id, await f.arrayBuffer());
              o.pdf = true;
            } catch (err) {}
            S.pay.push(o);
            save();
            close();
            render();
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
      tab = b.dataset.t;
      render();
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
})();
