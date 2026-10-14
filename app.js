const LS='oreLavoroV1',$=s=>document.querySelector(s);
const def={set:{hire:'',week:[0,8,8,8,8,8,0],ferieAnno:26,ferieOld:0,ferieGia:0,patrono:''},days:{},pay:[]};
let S;try{S=JSON.parse(localStorage.getItem(LS))||def}catch(e){S=def}
S.set={...def.set,...S.set};
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}};
let tab='h',cur=new Date();cur.setDate(1);
const MESI=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
const GG=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fmt=n=>(Math.round(n*100)/100).toString().replace('.',',');
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=(h+l-7*m+114)%31+1;return new Date(y,mo-1,da)}
function holidays(y){const m={'01-01':'Capodanno','01-06':'Epifania','04-25':'Liberazione','05-01':'Festa Lavoro','06-02':'Repubblica','08-15':'Ferragosto','11-01':'Ognissanti','12-08':'Immacolata','12-25':'Natale','12-26':'S. Stefano'};
const h={};for(const k in m)h[y+'-'+k]=m[k];const p=easter(y);h[iso(p)]='Pasqua';const q=new Date(p);q.setDate(q.getDate()+1);h[iso(q)]='Pasquetta';
if(/^\d\d-\d\d$/.test(S.set.patrono))h[y+'-'+S.set.patrono]='Santo Patrono';return h}
const exp=(d,h)=>h[iso(d)]?0:(+S.set.week[d.getDay()]||0);
function period(y,m){const p=(S.per&&S.per[y+'-'+String(m+1).padStart(2,'0')])||{},r={s:p.s?pd(p.s):new Date(y,m,1),e:p.e?pd(p.e):new Date(y,m+1,0)};return r.s>r.e?{s:new Date(y,m,1),e:new Date(y,m+1,0)}:r}
function monthStats(y,m){const P=period(y,m),n=Math.round((P.e-P.s)/864e5)+1,h={};let w=0,e=0,fe=0,ex=0,hol=0;
for(let i=0;i<n;i++){const d=new Date(P.s.getFullYear(),P.s.getMonth(),P.s.getDate()+i),k=iso(d),yy=d.getFullYear(),x=S.days[k]||{};h[yy]=h[yy]||holidays(yy);const E=exp(d,h[yy]);e+=E;if(h[yy][k])hol++;
if(x.t==='ferie'||x.t==='malattia'||x.t==='permesso'){fe+=E;if(x.t==='ferie')ex++}else if(x.h)w+=+x.h}
return{w,e,fe,ex,hol,bal:w+fe-e}}
function ferie(y){let used=S.set.ferieGia*1;for(const k in S.days)if(k.startsWith(y+'-')&&S.days[k].t==='ferie')used++;
const uo=Math.min(S.set.ferieOld,used),un=used-uo;return{used,uo,un,oldLeft:S.set.ferieOld-uo,newLeft:S.set.ferieAnno-un,tot:S.set.ferieAnno-un+S.set.ferieOld-uo}}
function anz(s){if(!s)return null;const a=new Date(s),b=new Date();if(isNaN(a))return null;let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),d=b.getDate()-a.getDate();
if(d<0){m--;d+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(m<0){y--;m+=12}return{y,m,d,tot:Math.floor((b-a)/864e5)}}
let keep=0;function render(){const sy=window.scrollY;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
$('#app').innerHTML=({h:vHome,m:vCal,f:vFerie,p:vPay2,s:vSet})[tab]();({h:bHome,m:bCal,f:()=>{},p:bPay2,s:bSet})[tab]();window.scrollTo(0,keep?sy:0);keep=0}
function vMese(){const y=cur.getFullYear(),m=cur.getMonth(),h=holidays(y),n=new Date(y,m+1,0).getDate(),st=monthStats(y,m);let rows='';
for(let i=1;i<=n;i++){const d=new Date(y,m,i),k=iso(d),x=S.days[k]||{},E=exp(d,h),we=d.getDay()%6===0;
rows+=`<div class="r ${h[k]?'ho':we?'we':''}"><div class="d"><b>${GG[d.getDay()]} ${i}</b><small>${h[k]||'previste '+fmt(E)+' h'}</small></div>
<select data-k="${k}" data-f="t"><option value="">Lavoro</option><option value="ferie"${x.t==='ferie'?' selected':''}>Ferie</option><option value="permesso"${x.t==='permesso'?' selected':''}>Permesso</option><option value="malattia"${x.t==='malattia'?' selected':''}>Malattia</option></select>
<input type="number" step="0.25" min="0" max="24" data-k="${k}" data-f="h" placeholder="${fmt(E)}" value="${x.h??''}"></div>`}
return`<div class="row"><button class="b s" id="pv">‹</button><h2>${MESI[m]} ${y}</h2><button class="b s" id="nx">›</button></div>
<div class="card"><div class="grid"><div class="k"><b>${fmt(st.w+st.fe)} h</b><span>Ore effettive (incl. assenze)</span></div><div class="k"><b>${fmt(st.e)} h</b><span>Ore previste</span></div>
<div class="k"><b class="${st.bal>=0?'pos':'neg'}">${st.bal>0?'+':''}${fmt(st.bal)} h</b><span>Saldo mese</span></div><div class="k"><b>${st.ex} / ${st.hol}</b><span>Ferie / festivi nel mese</span></div></div>
<small style="color:var(--mu)">Inizio: 1 ${MESI[m]} · Fine: ${n} ${MESI[m]}</small></div><div class="card">${rows}</div>`}
function bMese(){$('#pv').onclick=()=>{cur.setMonth(cur.getMonth()-1);render()};$('#nx').onclick=()=>{cur.setMonth(cur.getMonth()+1);render()};
document.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{const k=el.dataset.k,x=S.days[k]=S.days[k]||{};
if(el.dataset.f==='h')x.h=el.value===''?undefined:+el.value;else x.t=el.value||undefined;if(!x.h&&!x.t)delete S.days[k];save();render()})}
function vFerie(){const y=new Date().getFullYear(),f=ferie(y);
return`<h2>Ferie ${y}</h2><div class="card"><div class="grid"><div class="k"><b>${fmt(f.tot)}</b><span>Giorni disponibili totali</span></div><div class="k"><b>${fmt(f.used)}</b><span>Usate quest'anno</span></div>
<div class="k"><b>${fmt(f.oldLeft)}</b><span>Residuo anni precedenti</span></div><div class="k"><b>${fmt(f.newLeft)}</b><span>Residuo anno corrente</span></div></div>
<p style="color:var(--mu);font-size:13px">Le ferie vecchie vengono consumate per prime. Modifica spettanze e residui in Impostazioni.</p></div>`}
function vSet(){const s=S.set;return`<h2>Impostazioni</h2><div class="card"><label>Data di assunzione</label><input type="date" id="hire" value="${s.hire}">
<label>Ore previste per giorno (Dom → Sab)</label><div class="wk">${GG.map((g,i)=>`<div>${g}<input type="number" step="0.25" data-w="${i}" value="${s.week[i]}"></div>`).join('')}</div>
<label>Ferie annue (giorni)</label><input type="number" id="fa" value="${s.ferieAnno}"><label>Ferie vecchie residue a inizio anno (giorni)</label><input type="number" id="fo" value="${s.ferieOld}">
<label>Ferie già usate quest'anno prima dell'app (giorni)</label><input type="number" id="fg" value="${s.ferieGia}"><label>Santo patrono (MM-GG, es. 06-24)</label><input id="pa" value="${s.patrono}" placeholder="opzionale">
<div class="row" style="margin-top:14px"><button class="b" id="sv">Salva</button><button class="b s" id="ex">Esporta backup</button></div><p id="ms" style="color:var(--ac)"></p></div>`}
function bSet(){$('#sv').onclick=()=>{const s=S.set;s.hire=$('#hire').value;document.querySelectorAll('[data-w]').forEach(i=>s.week[+i.dataset.w]=+i.value||0);s.ferieAnno=+$('#fa').value;s.ferieOld=+$('#fo').value;s.ferieGia=+$('#fg').value;s.patrono=$('#pa').value.trim();save();$('#ms').textContent='Salvato ✓'};
$('#ex').onclick=()=>{const a=document.createElement('a');a.href='data:application/json,'+encodeURIComponent(JSON.stringify(S));a.download='ore-lavoro-backup.json';a.click()}}
function vHome(){const n=new Date(),y=n.getFullYear(),m=n.getMonth(),k=iso(n),H=holidays(y),st=monthStats(y,m),f=ferie(y),a=anz(S.set.hire),x=S.days[k]||{},E=exp(n,H),hr=n.getHours();
const gr=hr<12?'Buongiorno':hr<18?'Buon pomeriggio':'Buonasera',pct=st.e?Math.min(100,Math.round((st.w+st.fe)/st.e*100)):0;
const nh=Object.entries({...H,...holidays(y+1)}).filter(e=>e[0]>=k).sort()[0],lp=S.pay.slice().sort((a,b)=>(b.per||'').localeCompare(a.per||''))[0];
const stt=H[k]&&!x.t?'Festivo: '+H[k]:x.t?x.t[0].toUpperCase()+x.t.slice(1):x.h!=null?fmt(x.h)+' h registrate':'Nessuna ora registrata';
const nd=nh?new Date(nh[0]):null;
return`<div class="hero"><small>${GG[n.getDay()]} ${n.getDate()} ${MESI[m]} ${y}</small><h2>${gr}</h2><small>Saldo di ${MESI[m]}</small><div class="big">${st.bal>0?'+':''}${fmt(st.bal)} h</div><div class="bar"><i style="width:${pct}%"></i></div><small>${fmt(st.w+st.fe)} di ${fmt(st.e)} h previste · ${pct}%</small></div>
<div class="card"><div class="row"><b>Oggi</b><span style="color:var(--mu);text-align:right">${stt}</span></div><div class="chips"><button class="b" id="qe">✓ Ore previste (${fmt(E)})</button><button class="b s" id="qf">Ferie</button><button class="b s" id="qm">Malattia</button><input type="number" step="0.25" id="qh" placeholder="Ore" value="${x.t?'':x.h??''}"></div></div>
<div class="grid" style="margin-bottom:12px"><div class="k"><b>${fmt(f.tot)} g</b><span>Ferie disponibili (${fmt(f.oldLeft)} vecchie)</span></div><div class="k"><b>${a?a.y+' a '+a.m+' m':'—'}</b><span>Anzianità</span></div><div class="k"><b>${nd?nd.getDate()+' '+MESI[nd.getMonth()].slice(0,3):'—'}</b><span>Prossimo festivo${nh?': '+nh[1]:''}</span></div><div class="k"><b>${lp&&lp.netto?fmt(lp.netto)+' €':'—'}</b><span>Ultima busta${lp&&lp.per?' ('+lp.per+')':''}</span></div></div>
<div class="tiles"><button class="tile" data-go="m"><span>📅</span><b>Ore del mese</b><small>Inserisci e controlla</small></button><button class="tile" data-go="f"><span>🏖️</span><b>Ferie</b><small>Totali, usate, vecchie</small></button><button class="tile" data-go="p"><span>📄</span><b>Busta paga</b><small>Carica il PDF</small></button><button class="tile" data-go="s"><span>⚙️</span><b>Impostazioni</b><small>Orari, ferie, backup</small></button></div>`}
function bHome(){const d=new Date(),k=iso(d),E=exp(d,holidays(d.getFullYear())),set=o=>{S.days[k]=o;if(!o.h&&!o.t)delete S.days[k];save();render()};
$('#qe').onclick=()=>set({h:E});$('#qf').onclick=()=>set({t:'ferie'});$('#qm').onclick=()=>set({t:'malattia'});
$('#qh').onchange=e=>set({h:e.target.value===''?undefined:+e.target.value});
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{tab=b.dataset.go;render()})}
const pd=s=>new Date(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8)),GF=['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];let sel=iso(new Date());
function vCal(){const y=cur.getFullYear(),m=cur.getMonth(),H=holidays(y),P=period(y,m),ps=iso(P.s),pe=iso(P.e),n=new Date(y,m+1,0).getDate(),st=monthStats(y,m),td=iso(new Date()),ym=iso(cur).slice(0,7);
if(sel.slice(0,7)!==ym)sel=td.slice(0,7)===ym?td:iso(cur);
let c='<div></div>'.repeat((cur.getDay()+6)%7);
for(let i=1;i<=n;i++){const d=new Date(y,m,i),k=iso(d),z=S.days[k]||{},cl=['dy'];if(H[k]||d.getDay()===0)cl.push('ho');if(k===td)cl.push('td');if(k===sel)cl.push('sl');if(k<ps||k>pe)cl.push('out');
c+=`<button class="${cl.join(' ')}" data-d="${k}">${i}${k===td||z.h||z.t?'<i></i>':''}</button>`}
const D=pd(sel),E=exp(D,H),x=S.days[sel]||{},op=(v,l)=>`<option value="${v}"${x.t===v?' selected':''}>${l}</option>`;
return`<div class="row"><button class="b s" id="pv">‹</button><h2>${MESI[m]} ${y}</h2><button class="b s" id="nx">›</button></div>
<div class="card"><div class="cal">${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(g=>`<div class="wd">${g}</div>`).join('')}${c}</div></div>
<div class="card"><b>Periodo di calcolo di ${MESI[m]}</b><div class="chips"><input type="date" id="ps" value="${ps}"><span>→</span><input type="date" id="pe" value="${pe}"><button class="b s" id="pr">Reimposta</button></div></div>
<div class="card"><div class="row"><b>${GF[D.getDay()]} ${D.getDate()} ${MESI[D.getMonth()]}</b><small style="color:${H[sel]?'#ef4444':'var(--mu)'}">${H[sel]||'previste '+fmt(E)+' h'}</small></div>
<div class="chips"><select id="dt">${op('','Lavoro')}${op('ferie','Ferie')}${op('permesso','Permesso')}${op('malattia','Malattia')}</select><input type="number" step="0.25" min="0" max="24" id="dh" placeholder="${fmt(E)}" value="${x.h??''}"><button class="b" id="de">✓ Ore previste</button><button class="b s" id="dc">Cancella</button></div></div>
<div class="card"><div class="grid"><div class="k"><b>${fmt(st.w+st.fe)} h</b><span>Ore effettive (incl. assenze)</span></div><div class="k"><b>${fmt(st.e)} h</b><span>Ore previste</span></div><div class="k"><b class="${st.bal>=0?'pos':'neg'}">${st.bal>0?'+':''}${fmt(st.bal)} h</b><span>Saldo mese</span></div><div class="k"><b>${st.ex} / ${st.hol}</b><span>Ferie / festivi nel mese</span></div></div>
<small style="color:var(--mu)">Periodo: ${P.s.getDate()} ${MESI[P.s.getMonth()]} → ${P.e.getDate()} ${MESI[P.e.getMonth()]} · giorni fuori periodo sbiaditi · rosso = festivi e domeniche</small></div>`}
function bCal(){$('#pv').onclick=()=>{cur.setMonth(cur.getMonth()-1);render()};$('#nx').onclick=()=>{cur.setMonth(cur.getMonth()+1);render()};
document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{sel=b.dataset.d;keep=1;render()});
const E=exp(pd(sel),holidays(+sel.slice(0,4))),upd=f=>{const x=S.days[sel]=S.days[sel]||{};f(x);if(!x.h&&!x.t)delete S.days[sel];save();keep=1;render()};
$('#dt').onchange=e=>upd(x=>{x.t=e.target.value||undefined});$('#dh').onchange=e=>upd(x=>{x.h=e.target.value===''?undefined:+e.target.value});
$('#de').onclick=()=>upd(x=>{x.t=undefined;x.h=E});$('#dc').onclick=()=>{delete S.days[sel];save();keep=1;render()};
const K=iso(cur).slice(0,7),sp=(f,v)=>{S.per=S.per||{};const p=S.per[K]=S.per[K]||{};p[f]=v||undefined;save();keep=1;render()};
$('#ps').onchange=e=>sp('s',e.target.value);$('#pe').onchange=e=>sp('e',e.target.value);$('#pr').onclick=()=>{if(S.per)delete S.per[K];save();keep=1;render()}}
let last=null;
function vPay(){const a=anz(S.set.hire),P=S.pay,n=P.filter(p=>p.netto);const tot=n.reduce((s,p)=>s+p.netto,0);
return`<h2>Busta paga</h2><div class="card"><input type="file" id="pf" accept="application/pdf"><p style="color:var(--mu);font-size:13px">Il PDF resta sul tuo dispositivo. I campi vengono riconosciuti in automatico: controllali e correggili prima di salvare.</p><div id="res"></div></div>
<div class="card"><div class="grid"><div class="k"><b>${a?a.y+' a '+a.m+' m '+a.d+' g':'—'}</b><span>Anzianità${a?' ('+a.tot+' giorni)':' (serve data assunzione)'}</span></div><div class="k"><b>${P.length}</b><span>Buste salvate</span></div>
<div class="k"><b>${n.length?fmt(tot/n.length)+' €':'—'}</b><span>Netto medio</span></div><div class="k"><b>${n.length?fmt(tot)+' €':'—'}</b><span>Netto totale salvato</span></div></div></div>
${P.length?'<div class="card">'+P.slice().sort((a,b)=>(b.per||'').localeCompare(a.per||'')).map(p=>`<div class="r"><div class="d"><b>${p.per||'Periodo ?'}</b><small>Netto ${p.netto?fmt(p.netto)+' €':'—'} · Lordo ${p.lordo?fmt(p.lordo)+' €':'—'} · Ore ${p.ore||'—'}</small></div><button class="b s" data-del="${p.id}">✕</button></div>`).join('')+'</div>':''}`}
const num=s=>s==null?null:parseFloat(String(s).replace(/\./g,'').replace(',','.'));
function parse(t){const g=(r)=>{const m=t.match(r);return m?m[1]:''};
const mm=t.match(new RegExp('('+MESI.join('|')+')\\s+(\\d{4})','i'));
let ha=g(/assunzione[^\d]{0,15}(\d{2}[\/.\-]\d{2}[\/.\-]\d{2,4})/i);if(ha){const p=ha.split(/[\/.\-]/);if(p[2].length===2)p[2]='20'+p[2];ha=p[2]+'-'+p[1]+'-'+p[0]}
return{per:mm?String(mm[2])+'-'+String(MESI.indexOf(mm[1].toLowerCase())+1).padStart(2,'0'):'',hire:ha,
netto:num(g(/netto[^\d\n]{0,30}?([\d.]+,\d{2})/i)),lordo:num(g(/(?:totale\s+competenze|retribuzione\s+lorda|totale\s+lordo)[^\d\n]{0,25}([\d.]+,\d{2})/i)),
ore:g(/ore\s+(?:ordinarie|lavorate)[^\d\n]{0,20}([\d.,]+)/i),ferie:g(/ferie[^\d\n]{0,40}(?:residu\w*|saldo)[^\d\n]{0,20}(-?[\d.,]+)/i),
liv:g(/livello[\s:]*([\w°]+)/i),tfr:num(g(/t\.?f\.?r\.?[^\d\n]{0,30}([\d.]+,\d{2})/i))}}
async function readPdf(f){const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;let out='';
for(let i=1;i<=pdf.numPages;i++){const c=await(await pdf.getPage(i)).getTextContent();let y=null,l='';for(const it of c.items){const yy=Math.round(it.transform[5]);if(y!==null&&Math.abs(yy-y)>3){out+=l+'\n';l=''}y=yy;l+=it.str+' '}out+=l+'\n'}return out}
function bPay(){document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{S.pay=S.pay.filter(p=>p.id!=b.dataset.del);save();render()});
$('#pf').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#res').textContent='Lettura in corso…';
try{const t=await readPdf(f);if(t.trim().length<30){$('#res').innerHTML='<p class="neg">Nessun testo trovato: il PDF sembra una scansione (immagine). Serve un PDF digitale.</p>';return}
last=parse(t);const L=last,F=(k,l,v)=>`<label>${l}</label><input data-p="${k}" value="${v??''}">`;
$('#res').innerHTML=F('per','Periodo (AAAA-MM)',L.per)+F('netto','Netto (€)',L.netto)+F('lordo','Lordo (€)',L.lordo)+F('ore','Ore ordinarie',L.ore)+F('ferie','Ferie residue',L.ferie)+F('liv','Livello',L.liv)+F('tfr','TFR (€)',L.tfr)+F('hire','Data assunzione (AAAA-MM-GG)',L.hire)+
`<div class="row" style="margin-top:12px"><button class="b" id="sp">Salva busta</button></div><details><summary>Testo estratto</summary><pre>${t.replace(/</g,'&lt;')}</pre></details>`;
$('#sp').onclick=()=>{const o={id:Date.now()};document.querySelectorAll('[data-p]').forEach(i=>{const k=i.dataset.p,v=i.value.trim();o[k]=['netto','lordo','tfr'].includes(k)?(v?num(v.includes(',')?v:v.replace('.',',')):null):v});
if(o.hire&&!S.set.hire)S.set.hire=o.hire;S.pay=S.pay.filter(p=>!(p.per&&p.per===o.per));S.pay.push(o);save();render()}}
catch(err){$('#res').innerHTML='<p class="neg">Errore nella lettura del PDF.</p>'}}}
const FD=[['per','Periodo (AAAA-MM)'],['azienda','Azienda'],['hire','Data assunzione (AAAA-MM-GG)'],['liv','Livello'],['qual','Qualifica'],['pt','Part time %'],['lordo','Totale competenze €'],['tratt','Totale trattenute €'],['netto','Netto del mese €'],['ore','Ore ordinarie lavorate'],['straord','Ore suppl./straord.'],['ggLav','Giorni lavorati'],['festOre','Ore festivo lavorate'],['ferieGod','Ferie godute nel mese (ore)'],['ferieAP','Ferie residuo AP (ore)'],['ferieMat','Ferie maturate (ore)'],['ferieGodAnno','Ferie godute da inizio anno (ore)'],['ferieSaldo','Ferie saldo (ore)'],['exSaldo','Ex-festività saldo (ore)'],['permSaldo','Permessi saldo (ore)'],['tfrFondo','TFR fondo al 31/12 €'],['tfrQuota','Quota TFR del mese €'],['tfrAnno','TFR quota anno €'],['impIrpef','Imponibile IRPEF mese €'],['irpef','Ritenute IRPEF mese €'],['progImpInps','Progr. imponibile INPS €'],['progImpIrpef','Progr. imponibile IRPEF €'],['progIrpef','IRPEF pagata da inizio anno €']],TXT=['per','azienda','hire','liv','qual'];
const mn=s=>s.replace(/\s+/g,'').toLowerCase(),money=/^-?[\d.]+,\d{2}\s*€?$/,N=v=>v==null||v===''?null:num(v),esc=v=>String(v).replace(/'/g,'&#39;').replace(/</g,'&lt;');
async function readPdf2(f){const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise,pg=[];
for(let i=1;i<=pdf.numPages;i++){const c=await(await pdf.getPage(i)).getTextContent(),it=c.items.filter(t=>t.str.trim()).map(t=>({s:t.str.trim(),x:t.transform[4],y:t.transform[5]})),L=[];
it.slice().sort((a,b)=>b.y-a.y||a.x-b.x).forEach(t=>{const l=L[L.length-1];if(l&&Math.abs(l.y-t.y)<=3)l.t.push(t);else L.push({y:t.y,t:[t]})});
pg.push({it,txt:L.map(l=>l.t.sort((a,b)=>a.x-b.x).map(t=>t.s).join(' ')).join('\n')})}return pg}
function near(P,lab,dir){for(const l of P.it.filter(t=>mn(t.s).includes(lab))){const c=P.it.filter(t=>money.test(t.s)&&(dir==='r'?t.x>l.x+5&&Math.abs(t.y-l.y)<9:t.y<l.y&&l.y-t.y<45&&Math.abs(t.x-l.x)<130)).sort((a,b)=>dir==='r'?a.x-b.x:(b.y-a.y)||Math.abs(a.x-l.x)-Math.abs(b.x-l.x));if(c.length)return c[0].s}}
function parse2(pg){const R={},put=(k,v)=>{if(R[k]==null||R[k]==='')R[k]=v};
pg.forEach(P=>{const t=P.txt,g=(r,i=1)=>{const m=t.match(r);return m?m[i]:undefined};let m;
put('netto',N(near(P,'nettodelmese','b')||g(/([\d.]+,\d{2})\s*€/)));
put('lordo',N(near(P,'totalecompetenze','r')||g(/TOTALE\s+COMPETENZE\s+([\d.]+,\d{2})/i)));
put('tratt',N(near(P,'totaletrattenute','r')||g(/TOTALE\s+TRATTENUTE\s+([\d.]+,\d{2})/i)));
m=t.match(/(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i);if(m)put('per',m[2]+'-'+String(MESI.indexOf(m[1].toLowerCase())+1).padStart(2,'0'));
put('azienda',g(/^([A-Z][A-Z0-9 .&'-]*?\s(?:S\.?P\.?A\.?|S\.?R\.?L\.?|S\.?N\.?C\.?|S\.?A\.?S\.?))(?=\s|$)/m));
m=t.match(/(\d{2}-\d{2}-\d{4})\s+(\d{2}-\d{2}-\d{4})/);if(m)put('hire',m[2].split('-').reverse().join('-'));
put('liv',g(/(\d+)\s*°?\s*Livello/i));put('qual',g(/\s([A-Z]{2,5})\s+\d+\s*Livello/));
put('pt',N((g(/Part\s*Time\s*([\d.,]+)\s*%/i)||'').replace('.',',')));
m=t.match(/(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+,\d{2})\s+(\d+,\d{2})\s+(\d+)(?!\d)/);if(m){put('ggLav',+m[5]);put('ore',N(m[6]));put('straord',N(m[7]))}
put('festOre',N(g(/Maggiorazione festivo[^\n]*?([\d.,]+)\s*ORE/i)));put('ferieGod',N(g(/Ferie godute\s+([\d.,]+)\s*ORE/i)));
put('impIrpef',N(g(/Imponibile IRPEF\s+([\d.]+,\d{2})/i)));put('irpef',N(g(/Ritenute IRPEF\s+([\d.]+,\d{2})/i)));
m=t.match(/\bFerie\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*ORE/);if(m){put('ferieAP',N(m[1]));put('ferieMat',N(m[2]));put('ferieGodAnno',N(m[3]));put('ferieSaldo',N(m[4]))}
m=t.match(/Perm\.?\s*Ex-?\s*Fs\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*ORE/i);if(m)put('exSaldo',N(m[4]));
m=t.match(/Permessi\s+([\d.,]+)(?:\s+([\d.,]+))?\s*ORE/i);if(m)put('permSaldo',N(m[2]||m[1]));
put('tfrFondo',N(near(P,'f.do31/12','b')));put('tfrQuota',N(g(/Quota T\.F\.R\.\s+([\d.]+,\d{2})/)));put('tfrAnno',N(near(P,'quotaanno','b')));
put('progImpInps',N(near(P,'imp.inps','b')));put('progImpIrpef',N(near(P,'imp.irpef','b')));put('progIrpef',N(near(P,'irpefpagata','b')))});return R}
function vPay2(){const P=S.pay.slice().sort((a,b)=>(b.per||'').localeCompare(a.per||'')),a=anz(S.set.hire),l=P[0],n=P.filter(p=>p.netto),tot=n.reduce((s,p)=>s+p.netto,0),wk=S.set.week.filter(x=>+x),av=wk.length?wk.reduce((s,x)=>s+ +x,0)/wk.length:8,d=v=>v==null?'—':fmt(v);
return`<h2>Busta paga</h2><div class='card'><input type='file' id='pf' accept='application/pdf'><p style='color:var(--mu);font-size:13px'>Carica il PDF della busta (anche di 2 pagine). Resta sul tuo dispositivo; controlla i campi prima di salvare.</p><div id='res'></div></div>
<div class='card'><div class='grid'><div class='k'><b>${a?a.y+' a '+a.m+' m '+a.d+' g':'—'}</b><span>Anzianità${a?' ('+a.tot+' giorni)':' (serve data assunzione)'}</span></div><div class='k'><b>${P.length}</b><span>Buste salvate</span></div><div class='k'><b>${n.length?fmt(tot/n.length)+' €':'—'}</b><span>Netto medio</span></div><div class='k'><b>${n.length?fmt(tot)+' €':'—'}</b><span>Netto totale salvato</span></div></div></div>
${l?`<div class='card'><b>Ultima busta (${l.per||'?'})</b><div class='grid' style='margin-top:8px'><div class='k'><b>${d(l.netto)} €</b><span>Netto del mese</span></div><div class='k'><b>${d(l.ferieSaldo)} h</b><span>Ferie residue${l.ferieSaldo!=null?' ≈ '+fmt(l.ferieSaldo/av)+' giorni':''}</span></div><div class='k'><b>${l.permSaldo==null&&l.exSaldo==null?'—':fmt((l.permSaldo||0)+(l.exSaldo||0))+' h'}</b><span>Permessi + ex-festività</span></div><div class='k'><b>${d(l.tfrFondo)} €</b><span>TFR accantonato al 31/12</span></div><div class='k'><b>${d(l.ore)} h</b><span>Ore ordinarie${l.straord?' + '+fmt(l.straord)+' h suppl.':''}</span></div><div class='k'><b>${d(l.tratt)} €</b><span>Trattenute</span></div></div></div>`:''}
${P.length?`<div class='card'>${P.map(p=>`<div class='r'><div class='d'><b>${p.per||'Periodo ?'}</b><small>Netto ${p.netto?fmt(p.netto)+' €':'—'} · Lordo ${p.lordo?fmt(p.lordo)+' €':'—'} · Ore ${p.ore||'—'}</small></div><button class='b s' data-del='${p.id}'>✕</button></div>`).join('')}</div>`:''}`}
function bPay2(){document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{S.pay=S.pay.filter(p=>p.id!=b.dataset.del);save();render()});
$('#pf').onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#res').textContent='Lettura in corso…';
try{const pg=await readPdf2(f),txt=pg.map(p=>p.txt).join('\n');if(txt.trim().length<30){$('#res').innerHTML='<p class=\'neg\'>Nessun testo trovato: il PDF sembra una scansione. Serve un PDF digitale.</p>';return}
const R=parse2(pg);
$('#res').innerHTML=`<p style='color:var(--mu);font-size:13px'>${pg.length} pagina/e lette. Controlla i campi:</p><div class='fg'>`+FD.map(([k,l])=>`<div><label>${l}</label><input data-p='${k}' value='${R[k]==null?'':TXT.includes(k)?esc(R[k]):String(R[k]).replace('.',',')}'></div>`).join('')+`</div><div class='row' style='margin-top:12px'><button class='b' id='sp'>Salva busta</button></div><details><summary>Testo estratto</summary><pre>${esc(txt)}</pre></details>`;
$('#sp').onclick=()=>{const o={id:Date.now()};document.querySelectorAll('[data-p]').forEach(i=>{const k=i.dataset.p,v=i.value.trim();o[k]=TXT.includes(k)?v:v===''?null:v.includes(',')?num(v):parseFloat(v)});
if(o.hire&&!S.set.hire)S.set.hire=o.hire;S.pay=S.pay.filter(p=>!(p.per&&p.per===o.per));S.pay.push(o);save();render()}}
catch(err){$('#res').innerHTML='<p class=\'neg\'>Errore nella lettura del PDF.</p>'}}}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;render()});
try{const ic='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#0f766e"/><circle cx="96" cy="96" r="58" fill="none" stroke="#fff" stroke-width="12"/><path d="M96 58v40l26 16" stroke="#fff" stroke-width="12" fill="none" stroke-linecap="round"/></svg>');
const mf={name:'Ore Lavoro',short_name:'Ore',display:'standalone',start_url:'.',background_color:'#0f766e',theme_color:'#0f766e',icons:[{src:ic,sizes:'192x192',type:'image/svg+xml'}]};
const l=document.createElement('link');l.rel='manifest';l.href=URL.createObjectURL(new Blob([JSON.stringify(mf)],{type:'application/manifest+json'}));document.head.appendChild(l)}catch(e){}
render();
