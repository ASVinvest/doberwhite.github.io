// === Rutas candidatas por defecto (fallback robusto) =========================
const DEFAULT_CANDIDATES = [
  '/assets/data/data.json',
  'assets/data/data.json',
  '/assets/data/dashboard/data.json',
  'assets/data/dashboard/data.json'
];

// === Selector de fuente (override por query o por página) ====================
// Soporta ?src=..., window.DW_DATA_URL (string) o window.DW_DATA_URLS (array).
const QP = new URLSearchParams(window.location.search);
const OVERRIDE = (() => {
  const qsrc = QP.get('src');
  if (qsrc) return [qsrc];

  if (Array.isArray(window.DW_DATA_URLS) && window.DW_DATA_URLS.length) {
    return window.DW_DATA_URLS.filter(Boolean);
  }
  if (typeof window.DW_DATA_URL === 'string' && window.DW_DATA_URL.trim()) {
    return [window.DW_DATA_URL.trim()];
  }
  return null;
})();
const CANDIDATES = OVERRIDE ? [...OVERRIDE, ...DEFAULT_CANDIDATES] : DEFAULT_CANDIDATES;

// === Paleta / ejes ===========================================================
const brand = '#00e18e', red = '#ef9a9a', axis = '#9aa0a6', grid = '#eaecef', gray = '#cbd5e1';

const baseGrid = { left: 36, right: 16, top: 24, bottom: 28, containLabel: true };
const axisX = (l, opts = {}) => ({
  type: 'category',
  data: l,
  axisLabel: {
    color: '#555',
    interval: opts.showAll ? 0 : 'auto',
    hideOverlap: opts.showAll ? false : true,
    margin: 10
  },
  axisTick: { alignWithLabel: true },
  axisLine: { lineStyle: { color: axis } }
});
const axisY = (opts = {}) => ({
  type: 'value',
  axisLabel: { color: '#555', show: !(opts.hideLabels) },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: grid } }
});

// === Nº locales ==============================================================
const nf0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); // Profitability a 1 decimal
const nf2 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const cf0 = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// === Labels ==================================================================
const barLabelTop      = { show: true, position: 'top',   fontSize: 10, color: '#4b5563', formatter: p => nf2.format(p.value ?? p.data?.value ?? 0) };
const barLabelTopPct   = { show: true, position: 'top',   fontSize: 10, color: '#4b5563', formatter: p => `${nf2.format(p.value ?? p.data?.value ?? 0)}%` };
const barLabelRight    = { show: true, position: 'right', fontSize: 10, color: '#4b5563', formatter: p => nf2.format(p.value ?? p.data?.value ?? 0) };
const barLabelRightPct = { show: true, position: 'right', fontSize: 10, color: '#4b5563', formatter: p => `${nf2.format(p.value ?? p.data?.value ?? 0)}%` };

// === Helpers de saneo ========================================================
function toNum(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const s = v
      .replace(/\s+/g, '')
      .replace(/[%,$€₿]|US\$|USD/gi, '')
      .replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
const mapNums = arr => (Array.isArray(arr) ? arr.map(toNum) : []);

function section(d, keys, def = { labels: [], values: [] }) {
  for (const k of keys) {
    if (d && d[k]) return d[k];
  }
  return def;
}
function ensureCats(sec, fallback) {
  const labels = (sec.labels && sec.labels.length) ? sec.labels : (fallback || []);
  const values = mapNums(sec.values);
  return { labels, values };
}

// === Render helper (notMerge=true) ===========================================
function render(id, option) {
  const el = document.getElementById(id);
  if (!el) return;
  let chart = echarts.getInstanceByDom(el);
  if (!chart) chart = echarts.init(el);
  chart.setOption(option, true);
}

// === Opciones de gráficos ====================================================
function optLine(labels, values) {
  return {
    grid: baseGrid,
    xAxis: axisX(labels),
    yAxis: axisY({ hideLabels: false }),
    tooltip: { trigger: 'axis' },
    series: [{
      type: 'line', smooth: true, symbol: 'circle', symbolSize: 6,
      lineStyle: { width: 2, color: brand }, areaStyle: { opacity: .08, color: brand }, data: values
    }]
  };
}

function optBar(labels, values, opts = {}) {
  const gridCfg = opts.showAllCats ? { ...baseGrid, bottom: 52 } : baseGrid;
  return {
    grid: gridCfg,
    xAxis: axisX(labels, { showAll: !!opts.showAllCats }),
    yAxis: axisY({ hideLabels: !!opts.hideValueAxisLabels }),
    tooltip: { trigger: 'axis' },
    series: [{
      type: 'bar', barMaxWidth: 28, label: (opts.percent ? barLabelTopPct : barLabelTop),
      data: values.map(v => ({ value: v, itemStyle: { color: v >= 0 ? brand : red } }))
    }]
  };
}

function optBarH(labels, values, opts = {}) {
  return {
    grid: baseGrid,
    xAxis: axisY({ hideLabels: !!opts.hideValueAxisLabels }),
    yAxis: { type: 'category', data: labels, axisLabel: { color: '#555' }, axisLine: { lineStyle: { color: axis } } },
    tooltip: { trigger: 'axis' },
    series: [{
      type: 'bar', barMaxWidth: 22, label: (opts.percent ? barLabelRightPct : barLabelRight),
      data: values.map(v => ({ value: v, itemStyle: { color: v >= 0 ? brand : red } }))
    }]
  };
}

// Allocation (donut)
const PALETTE = { GBPUSD: '#3b82f6', XAUUSD: '#22c55e', NDX100: '#f59e0b', BTCUSD: '#ef4444', USDJPY: '#22d3ee', NAS100: '#f59e0b' };
function optPie(labels, values) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  return {
    legend: {
      bottom: 0, itemWidth: 12, itemHeight: 12, textStyle: { color: '#444' },
      formatter: (name) => {
        const i = labels.indexOf(name);
        const p = Math.round((values[i] || 0) * 100 / total);
        return `${name}  ${p}%`;
      }
    },
    tooltip: { trigger: 'item', formatter: ({ name, percent }) => `${name}: ${percent}%` },
    series: [{
      type: 'pie', radius: ['46%', '68%'], center: ['50%', '44%'],
      label: { show: false },
      data: labels.map((n, i) => ({ name: n, value: values[i], itemStyle: { color: PALETTE[n] || '#94a3b8' } }))
    }]
  };
}

// Distribution USD
function optDist(d) {
  const counts = mapNums(d.counts);
  const pnl    = mapNums(d.pnl);
  const maxCount = Math.max(...counts, 0);
  const maxPnl   = Math.max(...pnl, 0);
  const head = x => Math.ceil(x * 1.15);
  return {
    grid: { ...baseGrid, top: 60 },
    legend: { top: 6, right: 8, data: ['n°', 'P&L'], textStyle: { color: '#444' } },
    tooltip: { trigger: 'axis' },
    xAxis: axisX(d.labels || [], { showAll: true }),
    yAxis: [
      { ...axisY({ hideLabels: true }), max: head(maxCount) },
      { ...axisY({ hideLabels: true }), name: 'P&L', max: head(maxPnl) }
    ],
    series: [
      { name: 'n°',  type: 'bar', barMaxWidth: 26, itemStyle: { color: gray },
        label: { ...barLabelTop, color: '#6b7280' }, data: counts, z: 1 },
      { name: 'P&L', type: 'bar', yAxisIndex: 1, barMaxWidth: 26,
        itemStyle: { color: (p) => (toNum(p.value) < 0 ? red : brand) },
        label: barLabelTop, data: pnl, barGap: '35%', barCategoryGap: '30%', z: 2 }
    ]
  };
}

// === KPIs ====================================================================
function renderKPIs(k) {
  const ul = document.getElementById('dw-kpis'); if (!ul) return; ul.innerHTML = '';
  Object.entries(k).forEach(([label, val]) => {
    const num = toNum(val);
    const isPct = typeof val === 'number' || (typeof val === 'string' && /%/.test(val))
      ? (label.includes('%') || /Rate|Profitability|Wipe/i.test(label))
      : false;
    const isPL  = /P&L/i.test(label) || /Comission/i.test(label);
    let txt;
    if (isPct) {
      const use1 = /Profitability/i.test(label);
      txt = `${(use1 ? nf1 : nf0).format(num)}%`;
    } else if (isPL) {
      const signed = /P&L/i.test(label) ? (num >= 0 ? '+' : '-') : '';
      txt = /Comission/i.test(label) ? cf0.format(num) : `${signed}${cf0.format(Math.abs(num))}`;
    } else {
      txt = Number.isInteger(num) ? nf0.format(num) : nf2.format(num);
    }
    ul.insertAdjacentHTML(
      'beforeend',
      `<li><span>${label}</span><span class="${/P&L/i.test(label) && num < 0 ? 'neg' : ''}">${txt}</span></li>`
    );
  });
}

// === Draw ====================================================================
function draw(dRaw) {
  // Aliases seguros + saneo de números
  const d = structuredClone(dRaw || {});
  const per = document.getElementById('dw-periodo');
  if (per && d.period) per.textContent = `From : ${d.period.from}  →  ${d.period.to}`;

  // KPIs
  if (d.kpis) renderKPIs(d.kpis);

  // P&L
  const balance = d.balance || { labels: [], values: [] };
  render('ch_balance', optLine(balance.labels || [], mapNums(balance.values)));

  const monthly = d.monthly || { labels: [], values: [] };
  render('ch_monthly', optBar(monthly.labels || [], mapNums(monthly.values), { hideValueAxisLabels: false }));

  const dist = d.distribution || { labels: [], counts: [], pnl: [] };
  render('ch_distribution', optDist(dist));

  // Assets
  const alloc  = d.allocation || { labels: [], values: [] };
  render('ch_allocation', optPie(alloc.labels || [], mapNums(alloc.values)));

  const plSec  = section(d, ['plAssets','plUSD','pl_usd'], { labels: [], values: [] });
  render('ch_pl_assets', optBarH(plSec.labels || [], mapNums(plSec.values), { hideValueAxisLabels: true }));

  const wrSec  = ensureCats(section(d, ['wrAssets','winRate','winrate','wr'], { labels: [], values: [] }),
                           ['A','B','C','D']);
  render('ch_wr_assets', optBar(wrSec.labels, wrSec.values, {
    hideValueAxisLabels: true, showAllCats: true, percent: true
  }));

  // Misc
  const daysDist = ensureCats(section(d, ['daysDist','daysDistribution','tradingDays'], { labels: [], values: [] }),
                              ['Lunes','Martes','Miércoles','Jueves','Viernes']);
  render('ch_days_dist', optBar(daysDist.labels, daysDist.values, {
    hideValueAxisLabels: true, showAllCats: true, percent: true
  }));

  const daysPerf = ensureCats(section(d, ['daysPerf','performanceDay','dayPerf'], { labels: [], values: [] }),
                              ['Lunes','Martes','Miércoles','Jueves','Viernes']);
  render('ch_days_perf', optBar(daysPerf.labels, daysPerf.values, {
    hideValueAxisLabels: true, showAllCats: true, percent: true
  }));

  const avgPos = ensureCats(section(d, ['avgPos','averagePosition','avgPosition'], { labels: [], values: [] }), []);
  render('ch_avg_pos', optBarH(avgPos.labels, avgPos.values, { hideValueAxisLabels: true }));

  // Resize
  window.addEventListener('resize', () =>
    document.querySelectorAll('.dw-chart').forEach(el => echarts.getInstanceByDom(el)?.resize())
  );
}

// === Boot ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
  for (const url of CANDIDATES) {
    try {
      const r = await fetch(url + '?v=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { draw(await r.json()); return; }
    } catch (e) {}
  }
  console.warn('No se encontró data.json en rutas candidatas u override.');
});
