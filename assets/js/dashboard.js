// Ruta absoluta para evitar problemas en GitHub Pages
const DATA_URL = '/assets/data/data.json';

// Paleta y ejes estilo Excel
const green = '#9bd6a4', red = '#ef9a9a', axis = '#9aa0a6', grid = '#eaecef';
const baseGrid = { left: 36, right: 16, top: 24, bottom: 28, containLabel: true };
const axisX = labels => ({ type:'category', data:labels, axisLabel:{color:'#555'}, axisLine:{lineStyle:{color:axis}} });
const axisY = () => ({ type:'value', axisLabel:{color:'#555'}, splitLine:{lineStyle:{color:grid}} });

function optLine(labels,values){
  return { grid:baseGrid, xAxis:axisX(labels), yAxis:axisY(), tooltip:{trigger:'axis'},
    series:[{ type:'line', smooth:true, lineStyle:{width:2,color:green}, areaStyle:{opacity:.08,color:green}, data:values }] };
}
function optBar(labels,values){
  return { grid:baseGrid, xAxis:axisX(labels), yAxis:axisY(), tooltip:{trigger:'axis'},
    series:[{ type:'bar', barMaxWidth:28, data:values.map(v=>({value:v,itemStyle:{color:v>=0?green:red}})) }] };
}
function optBarH(labels,values){ // barras horizontales (P&L USD y Average Position)
  return { grid:baseGrid, xAxis:axisY(), yAxis:{ type:'category', data:labels, axisLabel:{color:'#555'}, axisLine:{lineStyle:{color:axis}} },
    tooltip:{trigger:'axis'}, series:[{ type:'bar', barMaxWidth:22, data:values.map(v=>({value:v,itemStyle:{color:v>=0?green:red}})) }] };
}
function optPie(labels,values){
  return { tooltip:{trigger:'item'},
    series:[{ type:'pie', radius:['46%','68%'], center:['50%','55%'],
      label:{color:'#444'}, data:labels.map((l,i)=>({name:l,value:values[i]})) }] };
}
function optDist(d){ // dos barras como en tu lámina
  return { grid:baseGrid, tooltip:{trigger:'axis'},
    legend:{data:['n°','P&L'], textStyle:{color:'#444'}},
    xAxis:axisX(d.labels), yAxis:[axisY(), {...axisY(), name:'P&L'}],
    series:[
      { name:'n°', type:'bar', barMaxWidth:28, itemStyle:{color:green}, data:d.counts },
      { name:'P&L', type:'bar', barMaxWidth:28, yAxisIndex:1, itemStyle:{color:green}, data:d.pnl }
    ] };
}

function renderKPIs(k){
  const ul = document.getElementById('dw-kpis'); ul.innerHTML = '';
  Object.entries(k).forEach(([label, val])=>{
    const isPct = typeof val === 'number' && (label.includes('%') || /Rate|Profitability|Wipe/i.test(label));
    const isPL  = /P&L/i.test(label);
    const txt = isPct ? `${val}%` : isPL ? `${val>=0?'+$':'-$'}${Math.abs(val)}` : `${val}`;
    ul.insertAdjacentHTML('beforeend',
      `<li><span>${label}</span><span class="${isPL&&val<0?'neg':''}">${txt}</span></li>`);
  });
}

function drawCharts(d){
  document.getElementById('dw-periodo').textContent = `From : ${d.period.from}  →  ${d.period.to}`;

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

async function loadData(){
  const res = await fetch(DATA_URL+'?v='+Date.now(), {cache:'no-store'});
  if(!res.ok){ throw new Error('No se pudo cargar '+DATA_URL); }
  return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
  loadData().then(drawCharts).catch(err=>{
    console.error(err);
    alert('No se pudo cargar data.json. Abre /assets/data/dashboard/data.json y verifica la ruta.');
  });
});
