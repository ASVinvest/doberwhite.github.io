// === Rutas candidatas (evita fallos en móvil/caché) ===
const CANDIDATES = [
  '/assets/data/data.json',
  'assets/data/data.json',
  '/assets/data/dashboard/data.json',
  'assets/data/dashboard/data.json'
];

// === Paleta y ejes (estilo Excel + marca) ===
const brand = '#00e18e', red = '#ef9a9a', axis = '#9aa0a6', grid = '#eaecef';
const baseGrid = { left: 36, right: 16, top: 24, bottom: 28, containLabel: true };
const axisX = l => ({ type:'category', data:l, axisLabel:{ color:'#555' }, axisLine:{ lineStyle:{ color:axis } } });
const axisY = () => ({ type:'value', axisLabel:{ color:'#555' }, splitLine:{ lineStyle:{ color:grid } } });

// === Formateadores local es-CL ===
const nf0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const cf0 = new Intl.NumberFormat('es-CL', { style:'currency', currency:'USD', maximumFractionDigits: 0 });

// === Opciones de gráficos (con etiquetas) ===
const barLabelTop = { show:true, position:'top', fontSize:10, color:'#4b5563',
  formatter:(p)=> nf2.format(p.value ?? p.data?.value ?? 0) };

const barLabelRight = { show:true, position:'right', fontSize:10, color:'#4b5563',
  formatter:(p)=> nf2.format(p.value ?? p.data?.value ?? 0) };

function optLine(labels, values){
  return {
    grid: baseGrid, xAxis: axisX(labels), yAxis: axisY(), tooltip:{ trigger:'axis' },
    series:[{ type:'line', smooth:true, symbol:'circle', symbolSize:6,
      lineStyle:{ width:2, color:brand }, areaStyle:{ opacity:.08, color:brand }, data: values }]
  };
}
function optBar(labels, values){
  return {
    grid: baseGrid, xAxis: axisX(labels), yAxis: axisY(), tooltip:{ trigger:'axis' },
    series:[{ type:'bar', barMaxWidth:28, label: barLabelTop,
      data: values.map(v => ({ value:v, itemStyle:{ color: v>=0 ? brand : red } })) }]
  };
}
function optBarH(labels, values){
  return {
    grid: baseGrid, xAxis: axisY(),
    yAxis:{ type:'category', data:labels, axisLabel:{ color:'#555' }, axisLine:{ lineStyle:{ color:axis } } },
    tooltip:{ trigger:'axis' },
    series:[{ type:'bar', barMaxWidth:22, label: barLabelRight,
      data: values.map(v => ({ value:v, itemStyle:{ color: v>=0 ? brand : red } })) }]
  };
}
const PALETTE = { GBPUSD:'#3b82f6', XAUUSD:'#22c55e', NDX100:'#f59e0b', BTCUSD:'#ef4444' };

function optPie(labels, values){
  const total = values.reduce((a,b)=>a+b,0) || 1;
  return {
    legend:{ bottom: 0, itemWidth:12, itemHeight:12, textStyle:{ color:'#444' },
      formatter: (name)=>{
        const i = labels.indexOf(name);
        const pct = Math.round(values[i]*100/total);
        return `${name}  ${pct}%`;
      }},
    tooltip:{ trigger:'item', formatter: ({name,value,percent}) => `${name}: ${percent}%` },
    series:[{
      type:'pie', radius:['46%','68%'], center:['50%','50%'],
      label:{ show:false }, // evitamos textos cortados en el donut
      data: labels.map((n,i)=>({ name:n, value:values[i], itemStyle:{ color: PALETTE[n] || '#94a3b8' } }))
    }]
  };
}

function optDist(d){
  return {
    grid: baseGrid, tooltip:{ trigger:'axis' },
    legend:{ data:['n°','P&L'], textStyle:{ color:'#444' } },
    xAxis: axisX(d.labels), yAxis: [ axisY(), { ...axisY(), name:'P&L' } ],
    series:[
      { name:'n°',  type:'bar', barMaxWidth:28, label: barLabelTop, itemStyle:{ color:brand }, data: d.counts },
      { name:'P&L', type:'bar', barMaxWidth:28, yAxisIndex:1, label: barLabelTop, itemStyle:{ color:brand }, data: d.pnl }
    ]
  };
}

// === KPIs con formato local ===
function renderKPIs(k){
  const ul = document.getElementById('dw-kpis'); if(!ul) return; ul.innerHTML = '';
  Object.entries(k).forEach(([label, val])=>{
    const isPct = typeof val === 'number' && (label.includes('%') || /Rate|Profitability|Wipe/i.test(label));
    const isPL  = /P&L/i.test(label) || /Comission/i.test(label);
    let txt;
    if(isPct) txt = `${nf0.format(val)}%`;
    else if(isPL){
      const signed = /P&L/i.test(label) ? (val>=0 ? '+' : '-') : '';
      txt = /Comission/i.test(label) ? cf0.format(val) : `${signed}${cf0.format(Math.abs(val))}`;
    }else{
      txt = Number.isInteger(val) ? nf0.format(val) : nf2.format(val);
    }
    ul.insertAdjacentHTML('beforeend',
      `<li><span>${label}</span><span class="${/P&L/i.test(label)&&val<0?'neg':''}">${txt}</span></li>`);
  });
}

// === Dibujo ===
function draw(d){
  const per = document.getElementById('dw-periodo');
  if(per) per.textContent = `From : ${d.period.from}  →  ${d.period.to}`;
  renderKPIs(d.kpis);

  echarts.init(document.getElementById('ch_balance')).setOption(optLine(d.balance.labels, d.balance.values));
  echarts.init(document.getElementById('ch_monthly')).setOption(optBar(d.monthly.labels, d.monthly.values));
  echarts.init(document.getElementById('ch_distribution')).setOption(optDist(d.distribution));
  echarts.init(document.getElementById('ch_allocation')).setOption(optPie(d.allocation.labels, d.allocation.values));
  echarts.init(document.getElementById('ch_pl_assets')).setOption(optBarH(d.plAssets.labels, d.plAssets.values));
  echarts.init(document.getElementById('ch_wr_assets')).setOption(optBar(d.wrAssets.labels, d.wrAssets.values));
  echarts.init(document.getElementById('ch_days_dist')).setOption(optBar(d.daysDist.labels, d.daysDist.values));
  echarts.init(document.getElementById('ch_days_perf')).setOption(optBar(d.daysPerf.labels, d.daysPerf.values));
  echarts.init(document.getElementById('ch_avg_pos')).setOption(optBarH(d.avgPos.labels, d.avgPos.values));

  window.addEventListener('resize', ()=>document.querySelectorAll('.dw-chart')
    .forEach(el => echarts.getInstanceByDom(el)?.resize()));
}

// === Boot con multi-ruta y anti-caché ===
document.addEventListener('DOMContentLoaded', async ()=>{
  for(const url of CANDIDATES){
    try{
      const r = await fetch(url+'?v='+Date.now(), { cache:'no-store' });
      if(r.ok){ draw(await r.json()); return; }
    }catch(e){}
  }
  console.warn('No se encontró data.json en rutas candidatas.');
});
