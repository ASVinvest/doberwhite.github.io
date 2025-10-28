// === Config ===
const CANDIDATES = [
  '/assets/data/data.json',
  'assets/data/data.json',
  '/assets/data/dashboard/data.json',   // fallback por si quedó viejo
  'assets/data/dashboard/data.json'
];

// Paleta/estilos
const green='#9bd6a4', red='#ef9a9a', axis='#9aa0a6', grid='#eaecef';
const baseGrid={left:36,right:16,top:24,bottom:28,containLabel:true};
const axisX=l=>({type:'category',data:l,axisLabel:{color:'#555'},axisLine:{lineStyle:{color:axis}}});
const axisY=()=>({type:'value',axisLabel:{color:'#555'},splitLine:{lineStyle:{color:grid}}});
const optLine=(l,v)=>({grid:baseGrid,xAxis:axisX(l),yAxis:axisY(),tooltip:{trigger:'axis'},
  series:[{type:'line',smooth:true,lineStyle:{width:2,color:green},areaStyle:{opacity:.08,color:green},data:v}]});
const optBar=(l,v)=>({grid:baseGrid,xAxis:axisX(l),yAxis:axisY(),tooltip:{trigger:'axis'},
  series:[{type:'bar',barMaxWidth:28,data:v.map(x=>({value:x,itemStyle:{color:x>=0?green:red}}))}]});
const optBarH=(l,v)=>({grid:baseGrid,xAxis:axisY(),yAxis:{type:'category',data:l,axisLabel:{color:'#555'},axisLine:{lineStyle:{color:axis}}},
  tooltip:{trigger:'axis'},series:[{type:'bar',barMaxWidth:22,data:v.map(x=>({value:x,itemStyle:{color:x>=0?green:red}}))}]});
const optPie=(l,v)=>({tooltip:{trigger:'item'},series:[{type:'pie',radius:['46%','68%'],center:['50%','55%'],label:{color:'#444'},
  data:l.map((n,i)=>({name:n,value:v[i]}))}]});
  const brand = '#00e18e', red = '#ef9a9a', axis = '#9aa0a6', grid = '#eaecef';
const gray  = '#cbd5e1'; // gris claro para la serie "n°"
function optDist(d){
  return {
    grid: baseGrid,
    tooltip: { trigger: 'axis' },
    legend: { data: ['n°','P&L'], textStyle: { color: '#444' } },
    xAxis: axisX(d.labels),
    yAxis: [ axisY(), { ...axisY(), name: 'P&L' } ],
    series: [
      {
        name: 'n°',
        type: 'bar',
        barMaxWidth: 28,
        label: { ...barLabelTop, color: '#6b7280' },
        itemStyle: { color: gray },
        data: d.counts
      },
      {
        name: 'P&L',
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 28,
        label: barLabelTop,
        itemStyle: { color: brand },
        data: d.pnl
      }
    ]
  };
}


// Datos demo si no encuentra el JSON
const DEMO = {
  period:{from:'OCT-25',to:'27-10-2025'},
  kpis:{'Win Rate':42,'Profitability':0.9,'Risk Benefit':2.3,'N° Trades':65,'N° Trades Win':27,'N° Trades Loss':38,'P&L (USD)':475,'Win Average':45.3,'Loss Average':-19.7,'WipeOut':0,'% Average SL':20,'Comission':31},
  balance:{labels:['oct-25','nov-25'],values:[50475,50475]},
  monthly:{labels:['oct'],values:[475.46]},
  distribution:{labels:['buy','sell'],counts:[44,21],pnl:[388.21,87.25]},
  allocation:{labels:['GBPUSD','XAUUSD','NDX100','BTCUSD'],values:[20,31,43,6]},
  plAssets:{labels:['XAUUSD','GBPUSD','BTCUSD','NDX100'],values:[347.88,166.28,-12.83,-25.87]},
  wrAssets:{labels:['XAUUSD','GBPUSD','NDX100','BTCUSD'],values:[56,37,40,0]},
  daysDist:{labels:['Lunes','Martes','Miércoles','Jueves','Viernes'],values:[12,26,22,20,20]},
  daysPerf:{labels:['Lunes','Martes','Miércoles','Jueves','Viernes'],values:[50,29,71,31,31]},
  avgPos:{labels:['GBPUSD','NDX100','XAUUSD','BTCUSD'],values:[0.21,0.11,0.07,0.01]}
};

// KPIs
function renderKPIs(k){
  const ul=document.getElementById('dw-kpis'); if(!ul) return; ul.innerHTML='';
  Object.entries(k).forEach(([label,val])=>{
    const pct=(typeof val==='number')&&(label.includes('%')||/Rate|Profitability|Wipe/i.test(label));
    const isPL=/P&L/i.test(label);
    const txt=pct?`${val}%`:isPL?`${val>=0?'+$':'-$'}${Math.abs(val)}`:`${val}`;
    ul.insertAdjacentHTML('beforeend',`<li><span>${label}</span><span class="${isPL&&val<0?'neg':''}">${txt}</span></li>`);
  });
}

// Draw
function draw(d){
  const per=document.getElementById('dw-periodo');
  if(per) per.textContent=`From : ${d.period.from}  →  ${d.period.to}`;
  renderKPIs(d.kpis);
  echarts.init(document.getElementById('ch_balance')).setOption(optLine(d.balance.labels,d.balance.values));
  echarts.init(document.getElementById('ch_monthly')).setOption(optBar(d.monthly.labels,d.monthly.values));
  echarts.init(document.getElementById('ch_distribution')).setOption(optDist(d.distribution));
  echarts.init(document.getElementById('ch_allocation')).setOption(optPie(d.allocation.labels,d.allocation.values));
  echarts.init(document.getElementById('ch_pl_assets')).setOption(optBarH(d.plAssets.labels,d.plAssets.values));
  echarts.init(document.getElementById('ch_wr_assets')).setOption(optBar(d.wrAssets.labels,d.wrAssets.values));
  echarts.init(document.getElementById('ch_days_dist')).setOption(optBar(d.daysDist.labels,d.daysDist.values));
  echarts.init(document.getElementById('ch_days_perf')).setOption(optBar(d.daysPerf.labels,d.daysPerf.values));
  echarts.init(document.getElementById('ch_avg_pos')).setOption(optBarH(d.avgPos.labels,d.avgPos.values));
  window.addEventListener('resize',()=>document.querySelectorAll('.dw-chart').forEach(el=>echarts.getInstanceByDom(el)?.resize()));
}

// Boot con multi-ruta + anti-caché
document.addEventListener('DOMContentLoaded', async ()=>{
  for(const url of CANDIDATES){
    try{
      const r = await fetch(url+'?v='+Date.now(), {cache:'no-store'});
      if(r.ok){ const data=await r.json(); draw(data); return; }
    }catch(e){}
  }
  // Fallback (sin alert en móvil)
  console.warn('No se encontró data.json en las rutas candidatas. Usando DEMO.');
  draw(DEMO);
});
