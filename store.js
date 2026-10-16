
const SCHEMA = 2;
const def = {
  v: SCHEMA,
  set: {
    hire: "",
    wh: 0,
  },
  days: {},
  pay: [],
};
let S = JSON.parse(JSON.stringify(def));
// migrazioni: una funzione per versione dello schema, eseguite in ordine
const MIGRAZIONI = {
  2() {
    if ("patrono" in S.set) {
      // vecchio formato: una sola data -> la sposto nel suo anno
      if (/^\d\d-\d\d$/.test(S.set.patrono))
        S.set.patroni[S.set.patronoY || new Date().getFullYear()] =
          S.set.patrono;
      delete S.set.patrono;
      delete S.set.patronoY;
    }
    // chi ha già dei dati ha già usato l'app: non gli richiedo le ore
    if (!S.set.whOk && (S.pay.length || Object.keys(S.days).length))
      S.set.whOk = true;
  },
};
function norm() {
  S.set = { ...def.set, ...S.set };
  S.days = S.days || {};
  S.pay = S.pay || [];
  let ch = false;
  if (!S.set.patroni || typeof S.set.patroni !== "object") {
    S.set.patroni = {};
    ch = true;
  }
  for (let v = (S.v || 1) + 1; v <= SCHEMA; v++) {
    if (MIGRAZIONI[v]) MIGRAZIONI[v]();
    S.v = v;
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
  chkCache.clear();
  kvPut("state", JSON.stringify(S))
    .then(() => banner(""))
    .catch(() =>
      banner(
        "Salvataggio non riuscito: i dati rischiano di andare persi. Esporta subito un backup da Altro.",
      ),
    );
};
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
