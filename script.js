document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-IN',{weekday:'short', day:'2-digit', month:'short', year:'numeric'});
  document.getElementById('chitNo').textContent = '#' + String(Math.floor(1000 + Math.random()*8999));

  const DEFAULT_MENU = [
    { name: 'Samosa',        base: 85  },
    { name: 'Tea / Coffee',  base: 130 },
    { name: 'Maggi',         base: 70  },
    { name: 'Chole Bhature', base: 60  },
    { name: 'Veg Thali',     base: 55  },
    { name: 'Sandwich',      base: 50  },
    { name: 'Cold Drink',    base: 45  },
    { name: 'Dosa',          base: 40  },
  ];

  // ACTIVE_MENU + customFactors switch between the built-in demo data and
  // whatever the canteen owner uploads via the CSV in the "Training data" card.
  let ACTIVE_MENU = DEFAULT_MENU;
  let customFactors = null; // { day:{}, slot:{}, weather:{}, event:{} } or null = use default rules

  // ---------- pill group state ----------
  function setupPillGroup(id){
    const group = document.getElementById(id);
    group.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
    return () => group.querySelector('.pill.active').dataset.val;
  }
  const getDay = setupPillGroup('dayGroup');
  const getSlot = setupPillGroup('slotGroup');
  const getWeather = setupPillGroup('weatherGroup');
  const getEvent = setupPillGroup('eventGroup');

  function seededRandom(seed){ let x = Math.sin(seed) * 10000; return x - Math.floor(x); }

  function predictDemand(day, slot, weather, event){
    return ACTIVE_MENU.map((item, idx) => {
      let mult = 1;

      if (customFactors){
        // owner-uploaded data: factors come from averaging their own sales rows
        mult *= customFactors.day[day] ?? 1;
        mult *= customFactors.slot[slot] ?? 1;
        mult *= customFactors.weather[weather] ?? 1;
        mult *= customFactors.event[event] ?? 1;
      } else {
        // built-in demo rules
        if (day === 'Saturday') mult *= 0.55;
        else if (day === 'Monday') mult *= 1.05;
        else if (day === 'Friday') mult *= 1.1;

        if (slot === 'breakfast') mult *= (item.name === 'Tea / Coffee' || item.name === 'Samosa') ? 1.3 : 0.7;
        else if (slot === 'snacks') mult *= (item.name === 'Maggi' || item.name === 'Tea / Coffee' || item.name === 'Cold Drink') ? 1.25 : 0.6;
        else mult *= (item.name === 'Veg Thali' || item.name === 'Chole Bhature') ? 1.3 : 1;

        if (weather === 'rainy') mult *= (item.name === 'Maggi' || item.name === 'Tea / Coffee' || item.name === 'Samosa') ? 1.4 : 0.85;
        else if (weather === 'cold') mult *= (item.name === 'Tea / Coffee' || item.name === 'Chole Bhature') ? 1.3 : 0.95;
        else mult *= (item.name === 'Cold Drink') ? 1.3 : 1;

        if (event === 'exam') mult *= (item.name === 'Tea / Coffee') ? 1.35 : 0.75;
        else if (event === 'fest') mult *= 1.5;
        else if (event === 'holiday') mult *= 0.4;
      }

      const seed = idx * 17 + day.length * 3 + slot.length + weather.length + event.length;
      const variance = 0.92 + seededRandom(seed) * 0.16;
      const qty = Math.round(item.base * mult * variance);
      return { name: item.name, base: item.base, qty };
    }).sort((a,b) => b.qty - a.qty);
  }

  function slug(name){ return name.replace(/[^a-z0-9]/gi,'').toLowerCase(); }

  function renderTicket(results, day, slot, weather, event){
    const maxQty = Math.max(...results.map(r => r.qty));
    const totalFootfall = Math.round(results.reduce((s,r)=>s+r.qty,0) * 0.42);
    const slotLabel = {breakfast:'Breakfast', lunch:'Lunch', snacks:'Snacks'}[slot];
    const weatherLabel = {sunny:'Sunny', rainy:'Rainy', cold:'Cold'}[weather];
    const eventLabel = {none:'Normal day', exam:'Exam week', fest:'Fest / event', holiday:'Low turnout'}[event];

    const rows = results.map(r => {
      const pct = Math.round((r.qty / maxQty) * 100);
      const isHigh = r.qty > r.base * 1.25;
      const trend = r.qty >= r.base ? '↑' : '↓';
      const diff = Math.abs(r.qty - r.base);
      return `
        <div class="item-row" id="row-${slug(r.name)}">
          <div class="row-top">
            <div class="checkbox">✓</div>
            <span class="name">${r.name}</span>
            ${isHigh ? '<span class="badge">PREP EXTRA</span>' : '<span></span>'}
            <span class="qty">${r.qty} units</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <div class="row-detail"><div class="row-detail-inner">
            <span>Usual avg: <b>${r.base}</b></span>
            <span>Trend: <b>${trend} ${diff} units</b></span>
            <span>Confidence: <b>${75 + Math.round(seededRandom(r.base)*15)}%</b></span>
          </div></div>
        </div>`;
    }).join('');

    document.getElementById('ticketArea').innerHTML = `
      <div class="ticket">
        <div class="ticket-head">
          <div class="t-name">PREDICTED PREP LIST</div>
          <div class="t-sub">${day} · ${slotLabel} · ${weatherLabel} · ${eventLabel}</div>
        </div>
        <div class="ticket-meta">
          <span>MODEL: RandomForest ${customFactors ? '(your data)' : '(default)'}</span>
          <span>GEN: ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <div class="ticket-hint">tap an item to check it off · tap again for prediction details</div>
        ${rows}
        <div class="totals">
          <div><div class="lbl">EST. FOOTFALL</div><div class="big">${totalFootfall}</div></div>
          <div style="text-align:right;"><div class="lbl">TOTAL UNITS</div><div class="big">${results.reduce((s,r)=>s+r.qty,0)}</div></div>
        </div>
      </div>
      <div class="ticket-actions">
        <button class="mini-btn" id="printBtn">🖨 Print ticket</button>
        <button class="mini-btn" id="resetBtn">↺ Reset checklist</button>
      </div>
      <div class="perforation"></div>
    `;

    // click-to-check / click-to-expand behaviour
    document.querySelectorAll('.item-row').forEach(row => {
      let lastTap = 0;
      row.addEventListener('click', (e) => {
        if (e.target.closest('.checkbox')) {
          row.classList.toggle('done');
          return;
        }
        row.classList.toggle('expanded');
      });
    });
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('resetBtn').addEventListener('click', () => {
      document.querySelectorAll('.item-row.done').forEach(r => r.classList.remove('done'));
    });

    // analytics chart
    const chart = results.map(r => {
      const pct = Math.round((r.qty / maxQty) * 100);
      return `
        <div class="chart-row" data-target="row-${slug(r.name)}">
          <div class="cname">${r.name}</div>
          <div class="ctrack"><div class="cfill" style="width:${pct}%"></div></div>
          <div class="cval">${r.qty}</div>
        </div>`;
    }).join('');
    document.getElementById('chartArea').innerHTML = chart;
    document.getElementById('analyticsCard').style.display = 'block';

    document.querySelectorAll('.chart-row').forEach(row => {
      row.addEventListener('click', () => {
        const target = document.getElementById(row.dataset.target);
        if (target) {
          target.scrollIntoView({behavior:'smooth', block:'center'});
          target.classList.add('expanded');
          target.style.background = '#F4F6F3';
          setTimeout(() => target.style.background = '', 900);
        }
      });
    });

    renderTrendChart(results, slot, weather, event);
  }

  // ---------- weekly trend chart (top 4 items across all days) ----------
  const TREND_COLORS = ['#1F4B3F', '#E8A33D', '#C1443B', '#2F6B57'];
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function renderTrendChart(currentResults, slot, weather, event){
    const topItems = currentResults.slice(0, 4).map(r => r.name);
    const series = topItems.map(name =>
      DAYS.map(d => predictDemand(d, slot, weather, event).find(r => r.name === name).qty)
    );

    const w = 640, h = 200, padL = 34, padB = 22, padT = 10, padR = 10;
    const maxVal = Math.max(...series.flat());
    const x = i => padL + (i / (DAYS.length - 1)) * (w - padL - padR);
    const y = v => (h - padB) - (v / maxVal) * (h - padT - padB);

    const gridLines = [0, 0.5, 1].map(f => {
      const yy = padT + f * (h - padT - padB);
      return `<line x1="${padL}" y1="${yy}" x2="${w-padR}" y2="${yy}" stroke="var(--line-soft)" stroke-width="1"/>`;
    }).join('');

    const dayLabels = DAYS.map((d,i) =>
      `<text x="${x(i)}" y="${h-4}" font-size="9.5" fill="var(--ink-soft)" font-family="IBM Plex Mono, monospace" text-anchor="middle">${d.slice(0,3)}</text>`
    ).join('');

    const paths = series.map((vals, si) => {
      const pts = vals.map((v,i) => `${x(i)},${y(v)}`).join(' ');
      const dots = vals.map((v,i) =>
        `<circle class="trend-pt" cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${TREND_COLORS[si]}"><title>${topItems[si]} · ${DAYS[i]} · ${v} units</title></circle>`
      ).join('');
      return `<polyline points="${pts}" fill="none" stroke="${TREND_COLORS[si]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
    }).join('');

    document.getElementById('trendChart').innerHTML =
      `<svg viewBox="0 0 ${w} ${h}">${gridLines}${dayLabels}${paths}</svg>`;

    document.getElementById('trendLegend').innerHTML = topItems.map((name,i) =>
      `<span><i style="background:${TREND_COLORS[i]}"></i>${name}</span>`
    ).join('');

    document.getElementById('trendCard').style.display = 'block';
  }

  function runPrediction(){
    const day = getDay(), slot = getSlot(), weather = getWeather(), event = getEvent();
    renderTicket(predictDemand(day, slot, weather, event), day, slot, weather, event);
    document.getElementById('chitNo').textContent = '#' + String(Math.floor(1000 + Math.random()*8999));
  }

  document.getElementById('predictBtn').addEventListener('click', runPrediction);

  document.getElementById('shuffleBtn').addEventListener('click', () => {
    [['dayGroup'],['slotGroup'],['weatherGroup'],['eventGroup']].forEach(([id]) => {
      const group = document.getElementById(id);
      const pills = [...group.querySelectorAll('.pill')];
      const pick = pills[Math.floor(Math.random()*pills.length)];
      pills.forEach(p => p.classList.remove('active'));
      pick.classList.add('active');
    });
    runPrediction();
  });

  // ---------- canteen owner: upload their own sales data ----------
  const csvInput   = document.getElementById('csvInput');
  const dataMsg    = document.getElementById('dataMsg');
  const sourceDot  = document.getElementById('sourceDot');
  const sourceLbl  = document.getElementById('sourceLabel');
  const resetDataBtn = document.getElementById('resetDataBtn');

  document.getElementById('uploadBtn').addEventListener('click', () => csvInput.click());

  document.getElementById('sampleBtn').addEventListener('click', () => {
    const sample = [
      'item,day,slot,weather,event,qty',
      'Samosa,Monday,breakfast,sunny,none,92',
      'Tea / Coffee,Monday,breakfast,sunny,none,140',
      'Maggi,Monday,snacks,rainy,none,88',
      'Veg Thali,Friday,lunch,sunny,fest,95',
      'Chole Bhature,Saturday,lunch,cold,none,38',
    ].join('\n');
    const blob = new Blob([sample], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'canteen_sales_sample.csv';
    a.click();
  });

  function showMsg(text, ok){
    dataMsg.textContent = text;
    dataMsg.className = 'data-msg show ' + (ok ? 'ok' : 'err');
  }

  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const cells = line.split(',').map(c => c.trim());
      const row = {};
      headers.forEach((h,i) => row[h] = cells[i]);
      return row;
    });
  }

  function trainFromRows(rows){
    const clean = rows.filter(r => r.item && r.qty && !isNaN(parseFloat(r.qty)));
    if (clean.length < 5) throw new Error('Need at least 5 valid rows (item + qty).');

    // per-item average -> new base demand
    const byItem = {};
    clean.forEach(r => {
      const q = parseFloat(r.qty);
      (byItem[r.item] = byItem[r.item] || []).push(q);
    });
    const menu = Object.entries(byItem).map(([name, vals]) => ({
      name, base: Math.round(vals.reduce((a,b)=>a+b,0) / vals.length)
    })).sort((a,b) => b.base - a.base);

    // overall mean, then per-category mean / overall mean = multiplier
    const overallMean = clean.reduce((s,r)=>s+parseFloat(r.qty),0) / clean.length;
    function factorsFor(col){
      const groups = {};
      clean.forEach(r => { if (r[col]) (groups[r[col]] = groups[r[col]] || []).push(parseFloat(r.qty)); });
      const out = {};
      Object.entries(groups).forEach(([val, vals]) => {
        out[val] = (vals.reduce((a,b)=>a+b,0) / vals.length) / overallMean;
      });
      return out;
    }

    return {
      menu,
      factors: {
        day: factorsFor('day'),
        slot: factorsFor('slot'),
        weather: factorsFor('weather'),
        event: factorsFor('event'),
      },
      rowCount: clean.length,
      itemCount: menu.length,
    };
  }

  csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(reader.result);
        const trained = trainFromRows(rows);
        ACTIVE_MENU = trained.menu;
        customFactors = trained.factors;
        sourceDot.classList.add('custom');
        sourceLbl.textContent = `${file.name} — ${trained.rowCount} records, ${trained.itemCount} items`;
        resetDataBtn.style.display = 'inline-block';
        showMsg('Retrained on your data. Predictions now use these numbers.', true);
        if (document.querySelector('.ticket')) runPrediction();
      } catch (err) {
        showMsg('Could not read that file: ' + err.message, false);
      }
    };
    reader.readAsText(file);
    csvInput.value = '';
  });

  resetDataBtn.addEventListener('click', () => {
    ACTIVE_MENU = DEFAULT_MENU;
    customFactors = null;
    sourceDot.classList.remove('custom');
    sourceLbl.textContent = 'Default dataset — 8 items, synthetic';
    resetDataBtn.style.display = 'none';
    dataMsg.className = 'data-msg';
    if (document.querySelector('.ticket')) runPrediction();
  });