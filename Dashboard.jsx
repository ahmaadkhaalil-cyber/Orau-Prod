import { useState, useEffect, useMemo, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis
} from "recharts";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800;900&family=Mulish:wght@400;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#060A10;color:#DDE3EE;font-family:'Mulish',sans-serif}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-thumb{background:rgba(56,189,248,0.25);border-radius:99px}
  input,select{font-family:'Mulish',sans-serif;outline:none}
  input[type=number]::-webkit-inner-spin-button{opacity:.3}
  input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.4)}
  select option{background:#0D1520}
  .card{background:linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.01));border:1px solid rgba(255,255,255,.07);border-radius:14px}
  .btn{border:none;cursor:pointer;font-family:'Mulish',sans-serif;font-weight:700;border-radius:9px;transition:all .2s}
  .tab{border:none;cursor:pointer;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;letter-spacing:1.5px;border-radius:8px;padding:8px 18px;transition:all .2s}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .fade{animation:fadeIn .3s ease}
  @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,.4)}50%{box-shadow:0 0 0 8px rgba(56,189,248,0)}}
  .pulse-live{animation:pulseGlow 2s infinite}
  .hover-row:hover{background:rgba(255,255,255,.04)!important}
`;

const round2 = v => Math.round(v * 100) / 100;
const pct = v => Math.min(Math.max(v, 0), 100);

function calcKPIs(r) {
  const tp = Number(r.tempsPlanifie) || 0;
  const arr = Math.min(Number(r.arrets) || 0, tp);
  const to = tp - arr;
  const dispo = tp > 0 ? pct((to / tp) * 100) : 0;
  const cadMin = tp > 0 ? (Number(r.cadenceIdeale) || 0) / tp : 0;
  const prodTheo = cadMin * to;
  const real = Number(r.productionReelle) || 0;
  const scrap = Math.min(Number(r.scrap) || 0, real);
  const perf = prodTheo > 0 ? pct((real / prodTheo) * 100) : 0;
  const qualite = real > 0 ? pct(((real - scrap) / real) * 100) : 0;
  const oee = round2((dispo / 100) * (perf / 100) * (qualite / 100) * 100);
  const scrapPct = real > 0 ? round2((scrap / real) * 100) : 0;
  const bon = real - scrap;
  const cad = Number(r.cadenceIdeale) || 0;
  const productivite = cad > 0 ? round2((real / cad) * 100) : 0;
  return { dispo: round2(dispo), perf: round2(perf), qualite: round2(qualite), oee, scrapPct, bon, prodTheo: Math.round(prodTheo), to, productivite };
}

function avg(arr, key) {
  if (!arr.length) return 0;
  return round2(arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length);
}
function sum(arr, key) { return arr.reduce((s, r) => s + (Number(r[key]) || 0), 0); }
function getColor(v) { return v >= 85 ? "#34D399" : v >= 65 ? "#FBBF24" : "#F87171"; }
function getBg(v) { return v >= 85 ? "rgba(52,211,153,.12)" : v >= 65 ? "rgba(251,191,36,.1)" : "rgba(248,113,113,.1)"; }
function getStatus(v) { return v >= 85 ? "BON" : v >= 65 ? "MOYEN" : "FAIBLE"; }
function isoWeek(d) {
  const dt = new Date(d); dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate() + 3 - ((dt.getDay() + 6) % 7));
  const week1 = new Date(dt.getFullYear(), 0, 4);
  return `S${Math.round(((dt - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1}-${dt.getFullYear()}`;
}

function KPIBadge({ label, value }) {
  const c = getColor(value), r = 38, stroke = 8, circ = 2 * Math.PI * r, dash = (pct(value) / 100) * circ;
  const gid = "kg" + label.replace(/\s/g, "");
  return (
    <div className="card" style={{ padding: "18px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={c} stopOpacity={1}/>
              <stop offset="100%" stopColor={c} stopOpacity={0.4}/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke}/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={c} strokeWidth={stroke+8} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)" opacity={0.12}/>
          <circle cx="50" cy="50" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 50 50)" style={{transition:"stroke-dasharray .6s ease"}}/>
          <circle cx={50 + r * Math.cos((dash/circ*360-90)*Math.PI/180)} cy={50 + r * Math.sin((dash/circ*360-90)*Math.PI/180)} r="4" fill={c}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:22, fontWeight:900, color:c, lineHeight:1 }}>{value.toFixed(0)}</span>
          <span style={{ fontSize:10, color:c, opacity:.6, fontWeight:700 }}>%</span>
        </div>
      </div>
      <div style={{ fontSize:9, fontWeight:800, letterSpacing:2, color:"rgba(255,255,255,.35)", textAlign:"center" }}>{label}</div>
      <div style={{ padding:"2px 10px", borderRadius:99, background:getBg(value), border:`1px solid ${c}40`, fontSize:9, fontWeight:800, color:c, letterSpacing:2 }}>{getStatus(value)}</div>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${c}80,transparent)` }}/>
    </div>
  );
}

function Tip({ label, value }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
      <span style={{ fontSize:12, color:"rgba(255,255,255,.4)" }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color:"#DDE3EE", fontFamily:"'DM Mono',monospace" }}>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, unit, type = "number" }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <label style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:"rgba(255,255,255,.35)", textTransform:"uppercase" }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input type={type} value={value} min={type==="number" ? 0 : undefined}
          onChange={e => onChange(type==="number" ? (parseFloat(e.target.value)||0) : e.target.value)}
          style={{ width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:unit?"10px 40px 10px 12px":"10px 12px", color:"#DDE3EE", fontSize:15, fontWeight:700 }}
          onFocus={e => e.target.style.borderColor="rgba(56,189,248,.5)"}
          onBlur={e => e.target.style.borderColor="rgba(255,255,255,.1)"}
        />
        {unit && <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"rgba(255,255,255,.3)", fontWeight:700 }}>{unit}</span>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0D1825", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"10px 16px" }}>
      <div style={{ fontWeight:800, color:"#fff", marginBottom:8, fontSize:13 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ fontSize:12, color:p.color, fontWeight:700 }}>{p.name}: {p.value?.toFixed?p.value.toFixed(1):p.value}%</div>)}
    </div>
  );
};

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [view, setView] = useState("shift");
  const [selectedLigne, setSelectedLigne] = useState("Toutes");
  const [tab, setTab] = useState("dashboard");
  const [time, setTime] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const fileRef = useRef();
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], ligne:"", shift:"A", tempsPlanifie:480, arrets:0, cadenceIdeale:900, productionReelle:0, scrap:0 });
  const fu = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  function showToast(msg, ok=true) { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); }

  const liveKPIs = useMemo(() => calcKPIs(form), [form]);
  const today = new Date().toISOString().split("T")[0];
  const currentWeek = isoWeek(today);
  const allLignes = useMemo(() => ["Toutes", ...new Set(records.map(r => r.ligne))], [records]);

  const filtered = useMemo(() => {
    let base = records;
    if (selectedLigne !== "Toutes") base = base.filter(r => r.ligne === selectedLigne);
    if (view === "shift" || view === "day") return base.filter(r => r.date === today);
    if (view === "week") return base.filter(r => isoWeek(r.date) === currentWeek);
    return base;
  }, [view, records, today, currentWeek, selectedLigne]);

  const agg = useMemo(() => ({
    oee: avg(filtered,"oee"), dispo: avg(filtered,"dispo"), perf: avg(filtered,"perf"),
    qualite: avg(filtered,"qualite"), scrapPct: avg(filtered,"scrapPct"),
    production: sum(filtered,"productionReelle"), scrapTotal: sum(filtered,"scrap"),
    bon: sum(filtered,"bon"), count: filtered.length,
  }), [filtered]);

  const chartData = useMemo(() => {
    let base = selectedLigne !== "Toutes" ? records.filter(r => r.ligne === selectedLigne) : records;
    if (view === "shift") { const day = base.filter(r => r.date===today); return ["A","B","C"].map(s => { const rows=day.filter(r=>r.shift===s); return {name:`Shift ${s}`,OEE:avg(rows,"oee"),Dispo:avg(rows,"dispo"),Qualite:avg(rows,"qualite")}; }); }
    if (view === "day") { const days=[...new Set(base.map(r=>r.date))].sort().slice(-10); return days.map(d=>{const rows=base.filter(r=>r.date===d);return{name:d.slice(5),OEE:avg(rows,"oee"),Dispo:avg(rows,"dispo"),Qualite:avg(rows,"qualite")}}); }
    if (view === "week") { const weeks=[...new Set(base.map(r=>isoWeek(r.date)))].slice(-6); return weeks.map(w=>{const rows=base.filter(r=>isoWeek(r.date)===w);return{name:w,OEE:avg(rows,"oee"),Dispo:avg(rows,"dispo"),Qualite:avg(rows,"qualite")}}); }
    return [...new Set(base.map(r=>r.ligne))].map(l=>{const rows=base.filter(r=>r.ligne===l);return{name:l,OEE:avg(rows,"oee"),Dispo:avg(rows,"dispo"),Qualite:avg(rows,"qualite")}});
  }, [view, records, today, selectedLigne]);

  const scrapTrend = useMemo(() => {
    let base = selectedLigne !== "Toutes" ? records.filter(r => r.ligne === selectedLigne) : records;
    const days = [...new Set(base.map(r=>r.date))].sort().slice(-10);
    return days.map(d=>{const rows=base.filter(r=>r.date===d);return{name:d.slice(5),Scrap:avg(rows,"scrapPct")}});
  }, [records, selectedLigne]);

  function handleSave() {
    if (!form.ligne) { showToast("Entrez un nom de ligne", false); return; }
    const id = `${form.date}-${form.ligne}-${form.shift}`;
    const rec = { id, ...form, ...calcKPIs(form) };
    setRecords(prev => { const ex=prev.findIndex(r=>r.id===id); if(ex>=0){const n=[...prev];n[ex]=rec;return n} return [rec,...prev]; });
    showToast("Données sauvegardées");
  }

  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const lines = ev.target.result.trim().split("\n");
        const headers = lines[0].split(",").map(h=>h.trim().replace(/"/g,""));
        const rows = lines.slice(1).map(l=>{const vals=l.split(",").map(v=>v.trim().replace(/"/g,""));return Object.fromEntries(headers.map((h,i)=>[h,vals[i]]))});
        const req = ["date","ligne","shift","tempsPlanifie","arrets","cadenceIdeale","productionReelle","scrap"];
        if (!rows.length || !req.every(k=>k in rows[0])) { showToast("Colonnes manquantes",false); return; }
        const imp = rows.map(r=>({id:`${r.date}-${r.ligne}-${r.shift}`,...r,...calcKPIs(r)}));
        setRecords(prev=>{const map=Object.fromEntries(prev.map(r=>[r.id,r]));imp.forEach(r=>{map[r.id]=r});return Object.values(map).sort((a,b)=>b.date.localeCompare(a.date))});
        showToast(`${imp.length} lignes importées`);
      } catch { showToast("Erreur CSV", false); }
    };
    reader.readAsText(file); e.target.value = "";
  }

  function exportCSV() {
    const cols = ["date","ligne","shift","tempsPlanifie","arrets","cadenceIdeale","productionReelle","scrap","dispo","perf","qualite","oee","scrapPct","productivite"];
    const csv = [cols.join(","),...records.map(r=>cols.map(c=>r[c]??"").join(","))].join("\n");
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="orau_kpis.csv"; a.click();
  }

  function downloadTemplate() {
    const csv = `date,ligne,shift,tempsPlanifie,arrets,cadenceIdeale,productionReelle,scrap\n${today},Ligne A,A,480,30,900,420,8`;
    const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="template_orau.csv"; a.click();
  }

  const VIEWS = [{id:"shift",label:"SHIFT"},{id:"day",label:"JOURNÉE"},{id:"week",label:"SEMAINE"},{id:"global",label:"GLOBAL"}];
  const TABS = [{id:"dashboard",label:"📊 Dashboard"},{id:"saisie",label:"✏️ Saisie"},{id:"import",label:"📁 Import"},{id:"table",label:"📋 Données"}];

  return <div>Dashboard ORAU KPI v16</div>;
}