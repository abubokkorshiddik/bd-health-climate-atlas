/* ---------- helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function byDistrict(name){ return DATA.filter(d => d.District === name).sort((a,b)=>a.Year-b.Year); }
function byYear(year){ return DATA.filter(d => d.Year === year); }
function label(v){ return META.labels[v] || v; }

function pearson(xs, ys){
  const n = xs.length;
  const mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let num=0, dx2=0, dy2=0;
  for(let i=0;i<n;i++){ const dx=xs[i]-mx, dy=ys[i]-my; num+=dx*dy; dx2+=dx*dx; dy2+=dy*dy; }
  const denom = Math.sqrt(dx2*dy2);
  return denom === 0 ? 0 : num/denom;
}
function linReg(xs, ys){
  const n=xs.length, mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
  let num=0, den=0;
  for(let i=0;i<n;i++){ num += (xs[i]-mx)*(ys[i]-my); den += (xs[i]-mx)**2; }
  const slope = den===0?0:num/den;
  const intercept = my - slope*mx;
  return {slope, intercept};
}
const palette = ['#0f6b5c','#c97d2e','#b3462c','#3a6ea5','#7a4fa3','#2f9e8f','#c2452e','#5b7553','#a3752c','#4c5f58','#8a3b5c','#317a3d'];

/* ---------- populate variable dropdowns (grouped) ---------- */
function fillVarSelect(sel, defaultVal){
  sel.innerHTML = '';
  Object.entries(META.groups).forEach(([group, vars])=>{
    const og = document.createElement('optgroup');
    og.label = group;
    vars.forEach(v=>{
      const opt = document.createElement('option');
      opt.value = v; opt.textContent = label(v);
      if(v===defaultVal) opt.selected = true;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
}

/* ================= TRENDS VIEW ================= */
let selectedDistricts = new Set(['Dhaka','Chittagong','Sylhet']);

function initTrendsControls(){
  const varSel = $('#trendVar');
  fillVarSelect(varSel, 'Dengue');
  varSel.addEventListener('change', renderTrend);

  const chipWrap = $('#districtChips');
  META.districts.forEach(d=>{
    const chip = document.createElement('div');
    chip.className = 'chip' + (selectedDistricts.has(d) ? ' on':'');
    chip.textContent = d;
    chip.addEventListener('click', ()=>{
      if(selectedDistricts.has(d)){ selectedDistricts.delete(d); chip.classList.remove('on'); }
      else { selectedDistricts.add(d); chip.classList.add('on'); }
      renderTrend();
    });
    chipWrap.appendChild(chip);
  });

  $('#clearDistricts').addEventListener('click', ()=>{
    selectedDistricts.clear();
    $$('#districtChips .chip').forEach(c=>c.classList.remove('on'));
    renderTrend();
  });
}

function renderTrend(){
  const variable = $('#trendVar').value;
  const dists = Array.from(selectedDistricts);
  const traces = dists.map((d,i)=>{
    const rows = byDistrict(d);
    return {
      x: rows.map(r=>r.Year),
      y: rows.map(r=>r[variable]),
      mode:'lines+markers',
      name:d,
      line:{width:2.5, color: palette[i % palette.length]},
      marker:{size:6}
    };
  });
  const layout = {
    margin:{t:10,r:20,l:56,b:40},
    font:{family:'Inter, sans-serif', size:12.5, color:'#12231d'},
    xaxis:{title:'Year', dtick:1, gridcolor:'#e6e9e7'},
    yaxis:{title:label(variable), gridcolor:'#e6e9e7'},
    legend:{orientation:'h', y:-0.18},
    plot_bgcolor:'#fff', paper_bgcolor:'#fff',
    height:460
  };
  Plotly.newPlot('trendChart', traces, layout, {displayModeBar:false, responsive:true});
}

/* ================= MAP VIEW ================= */
let leafletMap, markerLayer;

function initMapControls(){
  const varSel = $('#mapVar');
  fillVarSelect(varSel, 'Dengue');
  varSel.addEventListener('change', renderMap);

  const yearRange = $('#mapYear');
  yearRange.min = META.years[0];
  yearRange.max = META.years[META.years.length-1];
  yearRange.value = META.years[META.years.length-1];
  yearRange.addEventListener('input', ()=>{
    $('#mapYearBadge').textContent = yearRange.value;
    renderMap();
  });
  $('#mapYearBadge').textContent = yearRange.value;

  leafletMap = L.map('mapEl', {scrollWheelZoom:false}).setView([23.8, 90.3], 6.6);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:'&copy; OpenStreetMap &copy; CARTO', maxZoom:11
  }).addTo(leafletMap);
  markerLayer = L.layerGroup().addTo(leafletMap);
}

function colorScale(t){
  // t in [0,1] -> teal (low) -> amber (mid) -> red (high)
  const stops = [[15,107,92],[201,125,46],[179,70,44]];
  const seg = t<0.5 ? 0 : 1;
  const localT = t<0.5 ? t/0.5 : (t-0.5)/0.5;
  const a = stops[seg], b = stops[seg+1] || stops[seg];
  const c = a.map((v,i)=>Math.round(v + (b[i]-v)*localT));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function renderMap(){
  const variable = $('#mapVar').value;
  const year = parseInt($('#mapYear').value, 10);
  const rows = byYear(year);
  const vals = rows.map(r=>r[variable]);
  const min = Math.min(...vals), max = Math.max(...vals);
  markerLayer.clearLayers();

  rows.forEach(r=>{
    const v = r[variable];
    const t = max===min ? 0.5 : (v-min)/(max-min);
    const radius = 5 + t*22;
    const marker = L.circleMarker([r.Latitude, r.Longitude], {
      radius, color:'#12231d', weight:0.6, fillColor:colorScale(t), fillOpacity:0.82
    });
    marker.bindTooltip(`<b>${r.District}</b><br>${label(variable)}: ${v}<br>Year: ${year}`, {sticky:true});
    marker.addTo(markerLayer);
  });

  $('#mapStatMin').textContent = min.toLocaleString();
  $('#mapStatMax').textContent = max.toLocaleString();
  const maxRow = rows.find(r=>r[variable]===max);
  $('#mapStatMaxDist').textContent = maxRow ? maxRow.District : '—';
}

/* ================= CORRELATION VIEW ================= */
function initCorrControls(){
  const xSel = $('#corrX'), ySel = $('#corrY');
  fillVarSelect(xSel, 'T2M_MEAN');
  fillVarSelect(ySel, 'Dengue');
  xSel.addEventListener('change', renderCorr);
  ySel.addEventListener('change', renderCorr);

  const yearSel = $('#corrYear');
  yearSel.innerHTML = '<option value="all">All years (2017–2023)</option>' +
    META.years.map(y=>`<option value="${y}">${y}</option>`).join('');
  yearSel.addEventListener('change', renderCorr);
}

function renderCorr(){
  const xVar = $('#corrX').value, yVar = $('#corrY').value;
  const yearFilter = $('#corrYear').value;
  const rows = yearFilter==='all' ? DATA : DATA.filter(d=>d.Year===parseInt(yearFilter,10));

  const xs = rows.map(r=>r[xVar]), ys = rows.map(r=>r[yVar]);
  const r = pearson(xs, ys);
  const {slope, intercept} = linReg(xs, ys);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const lineX = [xMin, xMax], lineY = lineX.map(x=>slope*x+intercept);

  const scatter = {
    x: xs, y: ys, mode:'markers', type:'scatter', name:'Districts',
    text: rows.map(r=>`${r.District} (${r.Year})`),
    hovertemplate:'%{text}<br>'+label(xVar)+': %{x}<br>'+label(yVar)+': %{y}<extra></extra>',
    marker:{ size:7, color:'#0f6b5c', opacity:0.6, line:{width:0.5,color:'#0a4a40'} }
  };
  const trend = {
    x:lineX, y:lineY, mode:'lines', name:'Trend', line:{color:'#c97d2e', width:2.5, dash:'solid'}
  };
  const layout = {
    margin:{t:10,r:20,l:60,b:48},
    font:{family:'Inter, sans-serif', size:12.5, color:'#12231d'},
    xaxis:{title:label(xVar), gridcolor:'#e6e9e7'},
    yaxis:{title:label(yVar), gridcolor:'#e6e9e7'},
    showlegend:false,
    plot_bgcolor:'#fff', paper_bgcolor:'#fff',
    height:460
  };
  Plotly.newPlot('corrChart', [scatter, trend], layout, {displayModeBar:false, responsive:true});

  $('#corrCoef').textContent = r.toFixed(3);
  let strength = 'very weak';
  const ar = Math.abs(r);
  if(ar>=0.7) strength='strong';
  else if(ar>=0.5) strength='moderate';
  else if(ar>=0.3) strength='weak';
  $('#corrStrength').textContent = `${strength} ${r>=0 ? 'positive':'negative'} relationship`;
  $('#corrN').textContent = rows.length;
}

/* ================= TABS ================= */
function initTabs(){
  $$('nav.tabs button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('nav.tabs button').forEach(b=>b.classList.remove('active'));
      $$('.view').forEach(v=>v.classList.remove('active'));
      btn.classList.add('active');
      $('#'+btn.dataset.view).classList.add('active');
      if(btn.dataset.view==='mapView' && leafletMap){ setTimeout(()=>leafletMap.invalidateSize(), 60); }
    });
  });
}

/* ================= HEADER SPARKLINE ================= */
function renderSpark(){
  const years = META.years;
  const totals = years.map(y => byYear(y).reduce((s,r)=>s+r.Dengue+r.ABD_total+r.WBDD_total,0));
  const w=280,h=52, max=Math.max(...totals), min=Math.min(...totals);
  const pts = totals.map((v,i)=>{
    const x = i/(totals.length-1)*w;
    const y = h - ( (v-min)/(max-min||1) )*h;
    return [x,y];
  });
  const path = pts.map((p,i)=> (i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const svg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    <path d="${path}" fill="none" stroke="#0f6b5c" stroke-width="2"/>
    ${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="2.4" fill="#c97d2e"/>`).join('')}
  </svg>`;
  $('#sparkSvg').innerHTML = svg;
}

/* ================= INIT ================= */
window.addEventListener('DOMContentLoaded', ()=>{
  initTabs();
  initTrendsControls();
  initMapControls();
  initCorrControls();
  renderTrend();
  renderMap();
  renderCorr();
  renderSpark();
});
