// === Config ===
const DATA_URL = '/assets/data/data.json';  // ruta singular

// Paleta estilo Excel
const green='#9bd6a4', red='#ef9a9a', axis='#9aa0a6', grid='#eaecef';
const baseGrid={left:36,right:16,top:24,bottom:28,containLabel:true};
const axisX=l=>({type:'category',data:l,axisLabel:{color:'#555'},axisLine:{lineStyle:{color:axis}}});
const axisY=()=>({type:'value',axisLabel:{color:'#555'},splitLine:{lineStyle:{color:grid}}});

// Opciones de gráficos
const optLine=(l,v)=>({grid:baseGrid,xAxis:axisX(l),yAxis:axisY(),tooltip:{trigger:'axis'},
  series:[{type:'line',smooth:true,lineStyle:{width:2,color:green},areaStyle:{opacity:.08,color:green},data:v}]});
const optBar=(l,v)=>({grid:baseGrid,xAxis:axisX(l),yAxis:axisY(),tooltip:{trigger:'axis'},
  series:[{type:'bar',barMaxWidth:28,data:v.map(x=>({value:x,itemStyle:{color:x>=0?green:red}}))}]});
const optBarH=(l,v)=>({grid:baseGrid,xAxis:axisY(),yAxis:{type:'category',data:l,axisLabel:{color:'#555'},axisLine:{lineStyle:{color:axis}}},
  tooltip:{trigger:'axis'},series:[{type:'bar',barMaxWidth:22,data:v.map(x=>({value:x,itemStyle:{color:x>=0?green:red}}))}]});
const optPie=(l,v)=>({tooltip:{trigger:'item'},series:[{type:'pie',radius:['46%','68%'],center:['50%','55%'],label:{color:'#444'},
  data:l.map((n,i)=>({name:n,value:v[i]}))}]});
const optDist=d=>({grid:baseGrid,tooltip:{trigger:'axis'},legend:{data:['n°','P&L'],textStyle:{color:'#444'}},
  xAxis:axisX(d.labels),yAxis:[axisY(),{...axisY(),name:'P&L'}],
  series:[{name:'n°',type:'bar',barMaxWidth:28,itemStyle:{color:green},data:d.counts},
          {name:'P&L',type:'bar',yAxisIndex:1,barMaxWidth:28,itemStyle:{color:green},data:d.pnl}]});

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

// Dibujo
function drawCharts(d){
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

  window.addEventListener('resize',()=>document.querySelectorAll('.dw-chart')
    .forEach(el=>echarts.getInstanceByDom(el)?.resize()));
}

// Boot
document.addEventListener('DOMContentLoaded', async()=>{
  if(typeof echarts==='undefined'){ console.error('ECharts no cargó'); return; }
  try{
    const r=await fetch(DATA_URL+'?v='+Date.now(),{cache:'no-store'});
    if(!r.ok) throw new Error('JSON 404');
    drawCharts(await r.json());
  }catch(e){
    console.error(e);
    alert('No se pudo cargar /assets/data/data.json');
  }
});
