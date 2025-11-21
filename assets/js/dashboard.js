// === Rutas candidatas (fallback robusto) ===
const CANDIDATES = [
  '/assets/data/data.json',
  'assets/data/data.json',
  '/assets/data/dashboard/data.json',
  'assets/data/dashboard/data.json'
];

// === Selector de fuente (override por página o query) ===
const QP = new URLSearchParams(window.location.search);
const DW_DATA_URL = QP.get('src') || (typeof window !== 'undefined' ? window.DW_DATA_URL : null);

// === Paleta / ejes ===
const brand = '#00e18e', red = '#ef9a9a', axis = '#9aa0a6', grid = '#eaecef', gray = '#cbd5e1';

const baseGrid = { left: 36, right: 16, top: 24, bottom: 28, containLabel: true };
const axisX = (l, opts={}) => ({
  type:'category',
  data:l,
  axisLabel:{
    color:'#555',
    interval: opts.showAll ? 0 : 'auto',
    hideOverlap: opts.showAll ? false : true,
    margin: 10
  },
  axisTick:{ alignWithLabel:true },
  axisLine:{ lineStyle:{ color:axis } }
});
const axisY = (opts={}) => ({
  type:'value',
  axisLabel:{ color:'#555', show: !(opts.hideLabels) },
  axisTick:{ show:false },
  splitLine:{ lineStyle:{ color:grid } }
});

// === Nº locales ===
const nf0 = new Intl.NumberFormat('es-CL',{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat('es-CL',{minimumFractionDigits:1,maximumFractionDigits:1}); // 1 decimal (Profitability)
const nf2 = new Intl.NumberFormat('es-CL',{minimumFractionDigits:0,maximumFractionDigits:2});
const cf0 = new Intl.NumberFormat('es-CL',{style:'currency',currency:'USD',maximumFractionDigits:0});

// === Labels ===
const barLabelTop       = { show:true, position:'top',   fontSize:10, color:'#4b5563', formatter:p=>nf2.format(p.value ?? p.data?.value ?? 0) };
const barLabelTopPct    = { show:true, position:'top',   fontSize:10, color:'#4b5563', formatter:p=>`${nf2.format(p.value ?? p.data?.value ?? 0)}%` };
const barLabelRight     = { show:true, position:'right', fontSize:10, color:'#4b5563', formatter:p=>nf2.format(p.value ?? p.data?.value ?? 0) };
const barLabelRightPct  = { show:true, position:'right', fontSize:10, color:'#4b5563', formatter:p=>`${nf2.format(p.value ?? p.data?.value ?? 0)}%` };

// === Render helper (notMerge=true) ===
function render(id, option){
  const el = document.getElementById(id);
  if(!el) return;
  let chart = echarts.getInstanceByDom(el);
  if(!chart) chart = echarts.init(el);
  chart.setOption(option, true);
}

// === Opciones de gráficos ===
function optLine(labels, values){
  return {
    grid: baseGrid,
    xAxis: axisX(labels),
    yAxis: axisY({hideLabels:false}),
    tooltip:{trigger:'axis'},
    series:[{ type:'line', smooth:true, symbol:'circle', symbolSize:6,
      lineStyle:{width:2,color:brand}, areaStyle:{opacity:.08,color:brand}, data:values }]
  };
}

function optBar(labels, values, opts={}){
  const gridCfg = opts.showAllCats ? { ...baseGrid, bottom: 52 } : baseGrid;
  return {
    grid: gridCfg,
    xAxis: axisX(labels, { showAll: !!opts.showAllCats }),
    yAxis: axisY({ hideLabels: !!opts.hideValueAxisLabels }),
    tooltip:{ trigger:'axis' },
    series:[{
      type:'bar', barMaxWidth:28, label: (opts.percent ? barLabelTopPct : barLabelTop),
      data: values.map(v=>({ value:v, itemStyle:{ color: v>=0 ? brand : red } }))
    }]
  };
}

function optBarH(labels, values, opts={}){
  return {
    grid: baseGrid,
    xAxis: axisY({ hideLabels: !!opts.hideValueAxisLabels }),
    yAxis:{ type:'category', data:labels, axisLabel:{ color:'#555' }, axisLine:{ lineStyle:{ color:axis } } },
    tooltip:{ trigger:'axis' },
    series:[{
      type:'bar', barMaxWidth:22, label: (opts.percent ? barLabelRightPct : barLabelRight),
      data: values.map(v=>({ value:v, itemStyle:{ color: v>=0 ? brand : red } }))
    }]
  };
}

// Allocation
const PALETTE = { GBPUSD:'#3b82f6', XAUUSD:'#22c55e', NDX100:'#f59e0b', BTCUSD:'#ef4444' };
function optPie(labels, values){
  const total = values.reduce((a,b)=>a+b,0) || 1;
  return {
    legend:{ bottom: 0, itemWidth:12, itemHeight:12, textStyle:{ color:'#444' },
      formatter: (name)=>{ const i=labels.indexOf(name); const p=Math.round(values[i]*100/total); return `${name}  ${p}%`; } },
    tooltip:{ trigger:'item', formatter: ({name,percent}) => `${name}: ${percent}%` },
    series:[{ type:'pie', radius:['46%','68%'], center:['50%','44%'],
      label:{ show:false },
      data: labels.map((n,i)=>({ name:n, value:values[i], itemStyle:{ color: PALETTE[n] || '#94a3b8' } }))
    }]
  };
}

// Distribution USD
function optDist(d){
  const maxCount = Math.max(...d.counts,0);
  const maxPnl   = Math.max(...d.pnl,0);
  const head = x => Math.ceil(x*1.15);
  return {
    grid:{ ...baseGrid, top: 60 },
    legend:{ top:6, right:8, data:['n°','P&L'], textStyle:{ color:'#444' } },
    tooltip:{ trigger:'axis' },
    xAxis: axisX(d.labels, { showAll:true }),
    yAxis:[
      { ...axisY({ hideLabels:true }), max: head(maxCount) },
      { ...axisY({ hideLabels:true }), name:'P&L', max: head(maxPnl) }
    ],
    series:[
      { name:'n°',  type:'bar', barMaxWidth:26, itemStyle:{ color:gray },
        label:{ ...barLabelTop, color:'#6b7280' }, data:d.counts, z:1 },
      { name:'P&L', type:'bar', yAxisIndex:1, barMaxWidth:26, itemStyle:{ color:brand },
        label:barLabelTop, data:d.pnl, barGap:'35%', barCategoryGap:'30%', z:2 }
    ]
  };
}

// === KPIs ===
function renderKPIs(k){
  const ul = document.getElementById('dw-kpis'); if(!ul) return; ul.innerHTML='';
  Object.entries(k).forEach(([label,val])=>{
    const isPct = typeof val==='number' && (label.includes('%') || /Rate|Profitability|Wipe/i.test(label));
    const isPL  = /P&L/i.test(label) || /Comission/i.test(label);
    let txt;
    if(isPct){
      const use1 = /Profitability/i.test(label); // Profitability con 1 decimal
      txt = `${(use1 ? nf1 : nf0).format(val)}%`;
    } else if(isPL){
      const signed = /P&L/i.test(label) ? (val>=0?'+':'-') : '';
      txt = /Comission/i.test(label) ? cf0.format(val) : `${signed}${cf0.format(Math.abs(val))}`;
    } else {
      txt = Number.isInteger(val)? nf0.format(val) : nf2.format(val);
    }
    ul.insertAdjacentHTML('beforeend',
      `<li><span>${label}</span><span class="${/P&L/i.test(label)&&val<0?'neg':''}">${txt}</span></li>`);
  });
}

// === Draw ===
function draw(d){
  const per=document.getElementById('dw-periodo');
  if(per) per.textContent = `From : ${d.period.from}  →  ${d.period.to}`;
  renderKPIs(d.kpis);

  render('ch_balance',     optLine(d.balance.labels, d.balance.values));
  render('ch_monthly',     optBar(d.monthly.labels, d.monthly.values, { hideValueAxisLabels:false }));
  render('ch_distribution',optDist(d.distribution));
  render('ch_allocation',  optPie(d.allocation.labels, d.allocation.values));
  render('ch_pl_assets',   optBarH(d.plAssets.labels, d.plAssets.values, { hideValueAxisLabels:true }));
  render('ch_wr_assets',   optBar(d.wrAssets.labels, d.wrAssets.values, { hideValueAxisLabels:true, showAllCats:true, percent:true }));
  render('ch_days_dist',   optBar(d.daysDist.labels, d.daysDist.values, { hideValueAxisLabels:true, showAllCats:true, percent:true }));
  render('ch_days_perf',   optBar(d.daysPerf.labels, d.daysPerf.values, { hideValueAxisLabels:true, showAllCats:true, percent:true }));
  render('ch_avg_pos',     optBarH(d.avgPos.labels, d.avgPos.values, { hideValueAxisLabels:true }));

  window.addEventListener('resize', ()=>document.querySelectorAll('.dw-chart')
    .forEach(el=>echarts.getInstanceByDom(el)?.resize()));
}

// === Boot ===
document.addEventListener('DOMContentLoaded', async ()=>{
  const list = DW_DATA_URL ? [DW_DATA_URL, ...CANDIDATES] : CANDIDATES;
  for(const url of list){
    try{
      const r = await fetch(url + '?v=' + Date.now(), { cache:'no-store' });
      if(r.ok){ draw(await r.json()); return; }
    }catch(e){}
  }
  console.warn('No se encontró data.json en rutas candidatas.');
});
