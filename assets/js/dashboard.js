const DATA_URL = 'assets/data/dasboard/data.json';

async function loadDW(){
  const res = await fetch(DATA_URL + '?v=' + Date.now());
  if(!res.ok){ alert('No se pudo cargar data.json'); return; }
  const d = await res.json();

  document.getElementById('dw-periodo').textContent = `From: ${d.period.from} → ${d.period.to}`;
  renderKPIs(d.kpis);
  drawCharts(d);
}

function renderKPIs(k){
  const ul = document.getElementById('dw-kpis'); ul.innerHTML = '';
  Object.entries(k).forEach(([label, val])=>{
    let txt = val;
    if(typeof val === 'number' && (label.includes('Rate') || label.includes('%') || label.includes('Wipe'))) txt = `${val}%`;
    if(label.includes('P&L')) txt = `${val>=0?'+$':'-$'}${Math.abs(val)}`;
    ul.insertAdjacentHTML('beforeend', `<li><span>${label}</span><span class="${label.includes('P&L')&&val<0?'neg':''}">${txt}</span></li>`);
  });
}

const baseGrid = {left:28,right:12,top:20,bottom:22,containLabel:true};
const axisX = labels => ({type:'category',data:labels,axisLabel:{color:'#ccc'},axisLine:{lineStyle:{color:'#666'}}});
const axisY = () => ({type:'value',axisLabel:{color:'#ccc'},splitLine:{lineStyle:{color:'#1a1a1a'}}});

function optLine(labels,values){return{grid:baseGrid,xAxis:axisX(labels),yAxis:axisY(),tooltip:{trigger:'axis'},series:[{type:'line',smooth:true,areaStyle:{opacity:.05},data:values}]};}
function optBar(labels,values){return{grid:baseGrid,xAxis:axisX(labels),yAxis:axisY(),tooltip:{trigger:'axis'},series:[{type:'bar',barMaxWidth:28,data:values.map(v=>({value:v,itemStyle:{color:v>=0?'#00c853':'#ff5252'}}))}]};}
function optPie(labels,values){return{tooltip:{trigger:'item'},series:[{type:'pie',radius:['45%','70%'],center:['50%','55%'],label:{color:'#ddd'},data:labels.map((l,i)=>({name:l,value:values[i]}))}]};}
function optDist(d){return{grid:baseGrid,tooltip:{trigger:'axis'},legend:{data:['n°','P&L'],textStyle:{color:'#ccc'}},xAxis:axisX(d.labels),yAxis:[axisY(),{...axisY(),name:'P&L'}],series:[{name:'n°',type:'bar',barMaxWidth:28,data:d.counts},{name:'P&L',type:'line',yAxisIndex:1,data:d.pnl}]};}

function drawCharts(d){
  echarts.init(document.getElementById('ch_balance')).setOption(optLine(d.balance.labels, d.balance.values));
  echarts.init(document.getElementById('ch_monthly')).setOption(optBar(d.monthly.labels, d.monthly.values));
  echarts.init(document.getElementById('ch_distribution')).setOption(optDist(d.distribution));
  echarts.init(document.getElementById('ch_allocation')).setOption(optPie(d.allocation.labels, d.allocation.values));
  echarts.init(document.getElementById('ch_pl_assets')).setOption(optBar(d.plAssets.labels, d.plAssets.values));
  echarts.init(document.getElementById('ch_wr_assets')).setOption(optBar(d.wrAssets.labels, d.wrAssets.values));
  echarts.init(document.getElementById('ch_days_dist')).setOption(optBar(d.daysDist.labels, d.daysDist.values));
  echarts.init(document.getElementById('ch_days_perf')).setOption(optBar(d.daysPerf.labels, d.daysPerf.values));
  echarts.init(document.getElementById('ch_avg_pos')).setOption(optBar(d.avgPos.labels, d.avgPos.values));
  window.addEventListener('resize', ()=>document.querySelectorAll('.dw-chart').forEach(el=>echarts.getInstanceByDom(el)?.resize()));
}

document.addEventListener('DOMContentLoaded', loadDW);
