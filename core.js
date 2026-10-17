
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
const fmt1 = (n) =>
    Number.isFinite(Number(n))
      ? (Math.round(Number(n) * 10) / 10).toLocaleString("it-IT", {
          maximumFractionDigits: 1,
        })
      : "—",
  fmt = (n) =>
    Number.isFinite(Number(n))
      ? (Math.round(Number(n) * 100) / 100).toLocaleString("it-IT", {
          maximumFractionDigits: 2,
        })
      : "—";
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
// ore di un giorno: quelle inserite a mano; se mancano, le timbrature (turni arrotondati)
const timH = (T) =>
    (T || []).reduce((z, t) => {
      let m = +t.b.slice(0, 2) * 60 + +t.b.slice(3, 5) - (+t.a.slice(0, 2) * 60 + +t.a.slice(3, 5));
      if (m < 0) m += 1440;
      return z + m;
    }, 0) / 60,
  dayH = (x) => (x && +x.h > 0 ? +x.h : timH(x && x.tim));
// periodo di conteggio automatico: da lunedì a domenica, finisce l'ultima domenica del mese
// e inizia il lunedì dopo l'ultima domenica del mese prima (es. ott 2026: 28/09 -> 25/10)
const lastSun = (y, m) => {
  const d = new Date(y, m + 1, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};
function periodAuto(y, m) {
  const s = lastSun(y, m - 1);
  s.setDate(s.getDate() + 1);
  return { s, e: lastSun(y, m) };
}
// date scelte a mano (S.per) hanno la precedenza sul calcolo automatico
function period(y, m) {
  const p = (S.per && S.per[y + "-" + String(m + 1).padStart(2, "0")]) || {},
    A = periodAuto(y, m),
    r = { s: p.s ? pd(p.s) : A.s, e: p.e ? pd(p.e) : A.e };
  return r.s > r.e ? A : r;
}
function monthStats(y, m) {
  const P = period(y, m),
    n = Math.round((P.e - P.s) / 864e5) + 1,
    h = {};
  let w = 0,
    e = 0,
    fe = 0,
    ex = 0,
    hol = 0,
    hf = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(P.s.getFullYear(), P.s.getMonth(), P.s.getDate() + i),
      k = iso(d),
      yy = d.getFullYear(),
      x = S.days[k] || {};
    h[yy] = h[yy] || holidays(yy);
    e += exp();
    if (h[yy][k]) hol++;
    if (x.t === "ferie" || x.t === "malattia" || x.t === "permesso") {
      fe += (x.t === "ferie" || x.t === "permesso") && x.h != null && x.h !== "" ? +x.h : std();
      if (x.t === "ferie") ex++;
    } else if (h[yy][k] && d.getDay() !== 0) {
      // festivo lun-sab: non lavorato vale ore settimanali / 6; se lavorato
      // (festività non goduta) le ore vere restano e si aggiunge un altro giorno
      fe += wh() / 6;
      hf += wh() / 6;
      w += dayH(x);
    } else w += dayH(x);
  }
  return { w, e, fe, ex, hol, hf, bal: w + fe - e };
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
      up += x.h != null && x.h !== "" ? +x.h : d;
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
  const a = /^\d{4}-\d\d-\d\d$/.test(s) ? pd(s) : new Date(s),
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
// versione del lettore PDF: alzala quando cambia parse2, le buste si rileggono da sole
const PV = 9;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const warn = (e) => console.warn("Cedolix:", e);
// AAAA-MM-GG -> GG/MM/AAAA
const dIt = (s) => String(s).split("-").reverse().join("/");
// AAAA-MM -> "Luglio 2025" (fb se il periodo manca)
const perLab = (per, fb = "") =>
  per ? cap(MESI[+per.slice(5, 7) - 1] || "?") + " " + per.slice(0, 4) : fb;
// controlli busta in cache: si ricalcolano solo dopo un salvataggio
const chkCache = new Map();
const checkC = (p) => {
  let v = chkCache.get(p.id);
  if (!v) chkCache.set(p.id, (v = checkBusta(p)));
  return v;
};
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
      add(
        l + " non letto",
        "Apri il PDF e controlla, oppure ricarica la busta",
      );
  });
  if (+p.ggLav > 31 || +p.ore > 350)
    add(
      "Valore fuori scala",
      "Giorni lavorati " +
        (p.ggLav ?? "—") +
        " · ore ordinarie " +
        (p.ore ?? "—"),
    );
  if (has(p.lordo) && has(p.tratt) && has(p.netto)) {
    const c = p.lordo - p.tratt,
      d = c - p.netto;
    if (Math.abs(d) > 1)
      add(
        "Competenze − trattenute ≠ netto",
        "competenze " +
          f(p.lordo) +
          " − trattenute " +
          f(p.tratt) +
          " = " +
          f(c) +
          " · netto in busta " +
          f(p.netto),
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
        "residuo AP " +
          f(ap) +
          " + maturato " +
          f(mat) +
          " − goduto " +
          f(god) +
          " = " +
          f(c) +
          " · saldo in busta " +
          f(sal),
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
        "ore × paga oraria × maggiorazioni = " +
          f(c) +
          " € · in busta " +
          f(p.straordImp) +
          " €",
        sg(d) + " €",
      );
  }
  if (p.voci && p.voci.some((v) => v.k)) {
    const sm = (k) =>
      r2(
        p.voci
          .filter((v) => v.k === k && !v.m)
          .reduce((z, v) => z + (v.i || 0), 0),
      );
    [
      ["C", "lordo", "Somma voci ≠ totale competenze"],
      ["T", "tratt", "Somma voci ≠ totale trattenute"],
    ].forEach(([k, f2, t]) => {
      if (has(p[f2]) && Math.abs(sm(k) - p[f2]) > 0.05)
        add(
          t,
          "voci lette " + f(sm(k)) + " · totale in busta " + f(p[f2]),
          sg(sm(k) - p[f2]) + " €",
        );
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
      add(
        "Part time diverso dalla busta di " + L,
        f(pv.pt) + "% → " + f(p.pt) + "%",
      );
    const cum = (nome, k, km) => {
      if (!has(p[k]) || (same && !has(pv[k]))) return;
      const base = same ? pv[k] : 0,
        g = p[km] || 0,
        d = base + g - p[k];
      if (Math.abs(d) > tol)
        add(
          nome + " godute da inizio anno non tornano",
          "busta di " +
            L +
            ": " +
            f(base) +
            " + godute nel mese " +
            f(g) +
            " = " +
            f(base + g) +
            " · in busta " +
            f(p[k]),
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
          add(
            n + ": residuo AP cambiato",
            L + " " + f(pv[ap]) + " → " + f(p[ap]) + " ore",
          );
        if (has(p[mat]) && has(pv[mat]) && p[mat] < pv[mat] - tol)
          add(
            n + ": maturato diminuito",
            L + " " + f(pv[mat]) + " → " + f(p[mat]) + " ore",
          );
      });
      [
        ["progImpInps", "Progressivo imponibile INPS"],
        ["progImpIrpef", "Progressivo imponibile IRPEF"],
        ["progIrpef", "IRPEF pagata da inizio anno"],
        ["tfrAnno", "TFR quota anno"],
      ].forEach(([k, l]) => {
        if (has(p[k]) && has(pv[k]) && p[k] < pv[k] - 0.01)
          add(
            l + " diminuito rispetto a " + L,
            f(pv[k]) + " → " + f(p[k]) + " €",
          );
      });
    }
  }
  return out;
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
    prog = D.st.e ? Math.min(1, ord / D.st.e) : 0,
    // paga mensile fissa (es. 26 giorni): non dipende dalle ore del periodo
    fisso = !!(l.retribGG && l.retrib > 0),
    po = r2(fisso ? l.retrib * prog : ord * hr),
    // ogni voce si arrotonda al centesimo prima di sommare, come in busta
    ps = r2(D.supp * hr * sp),
    pf = r2(D.fest * hr * fp),
    // altre competenze fisse della busta (es. indennità): maturano in proporzione alle ore previste
    base =
      l.retribGG && l.retrib > 0
        ? l.retrib
        : l.ore
          ? hr * (l.ore + (l.ferieGod || 0) + (l.exGod || 0))
          : null,
    paFull =
      base == null ? 0 : Math.max(0, l.lordo - base - (l.straordImp || 0)),
    pa = r2(paFull * prog),
    lordo = po + ps + pf + pa;
  const q = quinto(l),
    qd =
      q &&
      (!q.res ||
        mIdx(k) - mIdx(l.per) <= Math.ceil(q.res / q.rata - 0.001) - 1),
    qr = qd ? q.rata : 0,
    nettoPre = l.netto + (q ? q.rata : 0);
  return {
    l,
    hr,
    D,
    ord,
    po,
    ps,
    pf,
    pa,
    paFull,
    prog,
    fisso,
    sp,
    fp,
    lordo,
    qr,
    netto: (lordo * nettoPre) / l.lordo - qr,
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
function meseDati(y, m) {
  const P = period(y, m),
    st = monthStats(y, m),
    H = {},
    R = (v) => Math.round(v * 1e6) / 1e6;
  let fer = 0,
    perm = 0,
    fest = 0,
    supp = 0,
    cum = 0,
    cap = 0;
  for (let d = new Date(P.s); d <= P.e; d.setDate(d.getDate() + 1)) {
    const k = iso(d),
      x = S.days[k] || {},
      yy = d.getFullYear();
    H[yy] = H[yy] || holidays(yy);
    // il tetto settimanale (ore da contratto) riparte ogni lunedì; una settimana
    // tagliata dal periodo ha il tetto in proporzione ai giorni che contiene
    if (d.getDay() === 1 || +d === +P.s) {
      const n = Math.min(
        7 - ((d.getDay() + 6) % 7),
        Math.round((P.e - d) / 864e5) + 1,
      );
      cum = 0;
      cap = (wh() * n) / 7;
      // festivo non lavorato (lun-ven e domenica; il sabato no): abbassa il tetto
      // ordinario dell'intera settimana, anche se cade dopo i giorni lavorati
      for (let i = 0; i < n; i++) {
        const z = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i),
          zk = iso(z),
          zy = z.getFullYear(),
          zx = S.days[zk] || {};
        H[zy] = H[zy] || holidays(zy);
        if (H[zy][zk] && z.getDay() !== 6 && z.getDay() !== 0 && !zx.t && !dayH(zx)) cum += wh() / 6;
      }
    }
    const o = x.h != null && x.h !== "" ? +x.h : std();
    if (x.t === "ferie") {
      fer += o;
      cum += o;
    } else if (x.t === "permesso") {
      perm += o;
      cum += o;
    } else if (x.t === "malattia") cum += std();
    else {
      const h = dayH(x);
      if (h > 0) {
        // le ore oltre il tetto della settimana sono suppl./straord.; il festivo
        // si calcola solo sulle ore ordinarie (quelle già suppl. non lo prendono)
        const ord = Math.min(h, Math.max(0, cap - cum));
        supp += h - ord;
        cum += h;
        // il sabato festivo lavorato non prende la maggiorazione festivo (come in busta)
        // il santo patrono (festa locale) vale come giorno in più ma senza maggiorazione festivo
        if ((H[yy][k] && H[yy][k] !== "Santo Patrono" && d.getDay() !== 6) || d.getDay() === 0) fest += ord;
      }
    }
  }
  // suppl./straord.: ore effettive del periodo (assenze e festivi non lavorati inclusi)
  // oltre le ore previste; le settimane sotto le 30h compensano quelle sopra
  const suppP = Math.max(0, st.w + st.fe - st.e);
  return { st, fer: R(fer), perm: R(perm), fest: R(fest), supp: R(suppP) };
}
function bustaMese(y, m) {
  const k = y + "-" + String(m + 1).padStart(2, "0");
  return S.pay.find((q) => q.per === k) || null;
}
// ore godute nel mese: dalla voce della busta; se manca (alcune buste riportano solo i
// ratei), le ricavo dal "goduto da inizio anno" meno quello della busta del mese prima
function godMese(p, k) {
  if (p[k + "God"] != null && p[k + "God"] !== "") return +p[k + "God"];
  const a = p[k + "GodAnno"];
  if (a == null || a === "") return 0;
  const pv = p.per && S.pay.find((q) => q.per === perPrev(p.per)),
    same = pv && pv.per.slice(0, 4) === p.per.slice(0, 4),
    base = same && pv[k + "GodAnno"] != null ? +pv[k + "GodAnno"] : 0;
  return Math.max(0, a - base);
}
function checkMese(y, m) {
  const p = bustaMese(y, m);
  if (!p) return null;
  const D = meseDati(y, m);
  return [
    // paga mensile fissa: le ore ordinarie in busta sono quelle del mese fisso, non quelle
    // del periodo; le ore realmente dovute sono previste − assenze, più le suppl./straord.
    [
      "Ore lavorate",
      D.st.w + D.st.hf,
      p.retribGG && p.retrib > 0
        ? D.st.e - godMese(p, "ferie") - godMese(p, "ex") + (p.straord || 0)
        : (p.ore || 0) + (p.straord || 0),
    ],
    [
      "Ore suppl./straord. " + fmt1(p.suppPerc || 35) + "%",
      D.supp,
      p.straord || 0,
    ],
    ["Ore festive " + (p.festPerc || 30) + "%", D.fest, p.festOre || 0],
    ["Ferie godute", D.fer, godMese(p, "ferie")],
    ["Permessi", D.perm, godMese(p, "ex")],
  ].map(([lab, a, b]) => ({
    lab,
    a,
    b,
    diff: a - b,
    ok: Math.abs(a - b) <= 0.25,
  }));
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
  // Fallback testuale: alcuni PDF DIMAR non espongono la riga 003100
  // con una geometria di colonne affidabile, quindi parseVoci può saltarla.
  // Cerchiamo la dicitura nel testo completo estratto da PDF.js.
  const testoCompleto = pg
    .map((P) => P.txt || "")
    .join(" ")
    .replace(/\s+/g, " ");
  const mTerzi = testoCompleto.match(
    /Trattenuta\s+da\s+Terzi[\s\S]{0,80}?Residuo\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i,
  );
  if (mTerzi && !VC.some(isQ)) {
    VC.push({
      c: "003100",
      d: "Trattenuta da Terzi",
      q: null,
      u: "",
      r: N(mTerzi[1]),
      i: N(mTerzi[2]),
      k: "T",
      m: 0,
    });
  }
  if (VC.length) {
    R.voci = VC;
    const sum = (a) => a.reduce((z, v) => z + (v.i || 0), 0),
      ex = VC.filter(
        (v) =>
          v.k !== "T" &&
          !v.m &&
          /supplementar|straordinar|maggiorazione/i.test(v.d),
      ),
      qo = (re) =>
        VC.filter((v) => v.u === "ORE" && re.test(v.d)).reduce(
          (z, v) => z + (v.q || 0),
          0,
        );
    if (ex.length) put("straordImp", Math.round(sum(ex) * 100) / 100);
    if (qo(/supplementar|straordinar/i))
      put("straord", qo(/supplementar|straordinar/i));
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
      Z = [
        ["B", cB],
        ["R", cR],
        ["T", cT],
        ["C", cC],
      ];
    (P.ln || []).forEach((row) => {
      const t = [];
      row.forEach((it) => {
        // PDF.js a volte restituisce l'intera voce in un solo elemento
        // (es. "003100 Trattenuta da Terzi Residuo 28.420,00 245,00").
        // Tokenizziamo mantenendo una posizione X approssimata, così il codice
        // della voce e gli importi restano riconoscibili anche in quel caso.
        const re = /\S+/g;
        let m;
        while ((m = re.exec(it.s))) {
          const w = it.w || 0,
            f = m.index / Math.max(1, it.s.length),
            fw = m[0].length / Math.max(1, it.s.length);
          t.push({
            ...it,
            s: m[0],
            x: it.x + w * f,
            w: w * fw,
          });
        }
      });
      // scarta tutto ciò che precede il codice voce: asterischi e lettere
      // della scritta verticale nel margine (es. "Modello per procedure ZUCCHETTI")
      // finiscono sulla stessa riga e non vanno scambiati per il codice
      const CODE = /^(?:[A-Z]{1,3}\d{3,6}|\d{4,6})$/,
        ci = t.findIndex((it) => CODE.test(it.s.replace(/^\*+/, "")));
      if (ci < 0) return;
      t.splice(0, ci);
      if (t.length < 3) return;
      const code = t[0].s.replace(/^\*+/, "");

      // Alcuni cedolini (tra cui DIMAR) riportano la trattenuta da terzi
      // come una riga con gli importi "Residuo" e rata, senza una geometria
      // PDF affidabile per associare i numeri alle colonne.
      const rowText = t
        .map((it) => it.s)
        .join(" ")
        .replace(/\s+/g, " ");
      const terzi = rowText.match(
        /Trattenuta\s+da\s+Terzi\s+Residuo\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i,
      );
      if (terzi) {
        out.push({
          c: code,
          d: "Trattenuta da Terzi",
          q: null,
          u: "",
          r: N(terzi[1]),
          i: N(terzi[2]),
          k: "T",
          m: 0,
        });
        return;
      }

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
              z: Z.reduce((a, b) =>
                Math.abs(cx - b[1]) < Math.abs(cx - a[1]) ? b : a,
              )[0],
              m: par,
            });
          } else if (/^(ORE|GG|%)$/i.test(s) && V.length)
            V[V.length - 1].u = s.toUpperCase();
          else if (!V.length) D.push(s);
        }
        if (it.s.includes(")")) par = false;
      }
      const am = V.filter((v) => !v.u && (v.z === "T" || v.z === "C")).pop(),
        q = V.find((v) => v.u),
        r = V.find((v) => !v.u && (v.z === "B" || v.z === "R"));
      if (!am && !q) return;
      out.push({
        c: code,
        d: D.join(" ").replace(/\s*Residuo$/i, ""),
        q: q ? q.v : null,
        u: q ? q.u : "",
        r: r ? r.v : null,
        i: am ? am.v : null,
        k: am ? am.z : null,
        m: am && am.m ? 1 : 0,
      });
    });
  });
  return out;
}
const isQ = (v) =>
  v.k === "T" && /terzi|cessione|delegazion|pignorament|prestito/i.test(v.d);
const mIdx = (per) => +per.slice(0, 4) * 12 + +per.slice(5, 7) - 1;
function quinto(p) {
  const v = p && p.voci && p.voci.find(isQ);
  return v && v.i > 0 ? { rata: v.i, res: v.r > 0 ? v.r : null, d: v.d } : null;
}
function quintoStato() {
  const l = S.pay
      .filter((p) => p.per)
      .sort((a, b) => b.per.localeCompare(a.per))[0],
    q = quinto(l);
  if (!q) return null;
  const n = q.res ? Math.ceil(q.res / q.rata - 0.001) : null,
    t = new Date(),
    el = Math.max(0, t.getFullYear() * 12 + t.getMonth() - mIdx(l.per));
  return {
    l,
    q,
    n,
    left: n == null ? null : Math.max(0, n - el),
    fine: n == null ? null : mIdx(l.per) + n - 1,
    resOra: q.res == null ? null : Math.max(0, q.res - q.rata * el),
  };
}
const r2 = (x) => Math.round(x * 100) / 100;
