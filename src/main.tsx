import React from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowUpRight, BarChart3, Bell, CheckCircle2, CircleDollarSign, Menu, Package, Search, ShieldCheck, Store, Users, X } from 'lucide-react';
import './styles.css';

const metrics = [
  {label:'Total sellers',value:'—',icon:Users,note:'Connect Supabase to load'},
  {label:'Active shops',value:'—',icon:Store,note:'Live data pending'},
  {label:'Products',value:'—',icon:Package,note:'Live data pending'},
  {label:'Premium revenue',value:'$—',icon:CircleDollarSign,note:'Current $9 lifetime only'},
];

function App(){
 const [open,setOpen]=React.useState(false);
 return <div className="app">
  <header className="topbar"><button className="icon mobile" onClick={()=>setOpen(!open)} aria-label="Menu">{open?<X/>:<Menu/>}</button><div className="brand"><span className="mark">T</span><div><strong>ThreadZW</strong><small>MISSION CONTROL</small></div></div><div className="top-actions"><button className="search"><Search size={17}/><span>Search</span><kbd>⌘ K</kbd></button><button className="icon"><Bell size={18}/></button><div className="avatar">A</div></div></header>
  <div className="layout">
   <aside className={open?'sidebar open':'sidebar'}><nav>{[['Dashboard',BarChart3],['Sellers',Users],['Shops',Store],['Moderation',ShieldCheck],['Payments',CircleDollarSign],['Analytics',Activity]].map(([label,Icon],i)=><button className={i===0?'nav active':'nav'} key={label as string} onClick={()=>setOpen(false)}><Icon size={18}/>{label as string}</button>)}</nav><div className="side-bottom"><div className="health"><span className="dot"/>Systems nominal</div><small>ThreadZW Admin v0.1</small></div></aside>
   <main><div className="mobile-overlay" onClick={()=>setOpen(false)}></div><section className="hero"><div><p className="eyebrow">OVERVIEW / OPERATIONS</p><h1>Good evening, Admin.</h1><p className="muted">Your platform at a glance. Live Supabase metrics will appear here.</p></div><button className="primary"><ArrowUpRight size={16}/> View live activity</button></section>
    <section className="metrics">{metrics.map(m=>{const I=m.icon;return <article className="metric" key={m.label}><div className="metric-head"><span>{m.label}</span><I size={17}/></div><strong>{m.value}</strong><small>{m.note}</small></article>})}</section>
    <section className="grid"><article className="panel large"><div className="panel-head"><div><p className="eyebrow">PLATFORM PULSE</p><h2>Activity</h2></div><span className="pill"><span className="dot"/> Awaiting live data</span></div><div className="chart-placeholder"><BarChart3 size={34}/><p>Analytics will connect to <code>shop_analytics</code> and <code>analytics_events</code>.</p></div></article><article className="panel"><div className="panel-head"><div><p className="eyebrow">ATTENTION</p><h2>Operational queue</h2></div></div><div className="empty"><CheckCircle2 size={30}/><strong>Nothing connected yet</strong><span>Payments, moderation and health checks will surface here.</span></div></article></section>
   </main>
  </div>
 </div>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
