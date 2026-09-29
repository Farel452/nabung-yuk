// ── Category Config ────────────────────────
const CAT = {
  food:          { icon: '🍔', color: '#EF4444', label: 'Makanan' },
  transport:     { icon: '🚗', color: '#F59E0B', label: 'Transportasi' },
  shopping:      { icon: '🛍️', color: '#8B5CF6', label: 'Belanja' },
  bills:         { icon: '📄', color: '#06B6D4', label: 'Tagihan' },
  entertainment: { icon: '🎮', color: '#EC4899', label: 'Hiburan' },
  health:        { icon: '💊', color: '#10B981', label: 'Kesehatan' },
  salary:        { icon: '💰', color: '#10B981', label: 'Gaji' },
  freelance:     { icon: '💻', color: '#06B6D4', label: 'Freelance' },
};

// Helpers 
const formatRp = (num) => 'Rp' + Math.round(num).toLocaleString('id-ID');

function formatShortRp(num) {
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);
  if (absNum >= 1e9) return sign + 'Rp' + (absNum / 1e9).toFixed(2) + 'M';
  if (absNum >= 1e6) return sign + 'Rp' + (absNum / 1e6).toFixed(2) + 'Jt';
  if (absNum >= 1e3) return sign + 'Rp' + (absNum / 1e3).toFixed(1) + 'Rb';
  return sign + 'Rp' + Math.round(absNum).toLocaleString('id-ID');
}

// ── Global Settings (Dynamic Inputs) ────────
let userSettings = {
  dailyBudget: 250000,
  trendPercent: 12.5,
  invested: 1200000
};

// ── Transactions State (Kosong) ─────────────
let nextId = 1;
let transactions = [];

// ── Dynamic Savings Jars (Kosong) ───────────
let savingsJars = [];
let activeJarId = null;
let nextJarId = 1;

// ── Derived State ──────────────────────────
function calcBalance()  { return transactions.reduce((s,t) => t.type==='income' ? s+t.amount : s-t.amount, 0); }
function totalIncome()  { return transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0); }
function totalExpense() { return transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0); }

function getDailySpent() {
  const todayStr = new Date().toISOString().split('T')[0];
  return transactions
    .filter(t => t.type === 'expense' && t.date === todayStr)
    .reduce((s, t) => s + t.amount, 0);
}

let activeChart   = null;
let chartType     = 'donut';
let searchTerm    = '';
let filterCat     = 'all';
let isFlipped     = false;

// ═══ Init ══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updateStaticTexts();
  animateBalances();
  initGauge();
  initChart();
  initSparkline();
  initSavingsJars();
  renderTransactions();
  updateBackMetrics();
  initCardTilt();
  initCardFlip();
  initSimulator();
  updateSimulator();
  initModal();
  initSettingsModal();
  initFilterPills();
  initCatFilters();
  initSearch();
  initChartToggle();
  initThemeToggle();
});

// ═══ Dynamic UI Updates ════════════════════
function updateStaticTexts() {
  const periodEl = document.getElementById('card-period');
  if (periodEl) {
    const now = new Date();
    periodEl.textContent = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  
  const trendEl = document.getElementById('balance-trend-text');
  const trendIcon = document.getElementById('trend-arrow');
  const trendContainer = document.getElementById('balance-trend');
  if (trendEl && trendContainer) {
    const sign = userSettings.trendPercent > 0 ? '+' : '';
    trendEl.textContent = `${sign}${userSettings.trendPercent}% dari bulan lalu`;
    trendContainer.className = `balance-trend ${userSettings.trendPercent >= 0 ? 'positive' : 'negative'}`;
    if (trendIcon) trendIcon.textContent = userSettings.trendPercent >= 0 ? '↑' : '↓';
  }
}

function updateBackMetrics() {
  const netSavingsEl = document.getElementById('metric-net-savings');
  if (netSavingsEl) {
    const sum = savingsJars.reduce((acc, jar) => acc + jar.current, 0);
    netSavingsEl.textContent = formatShortRp(sum);
  }

  const budgetUsedEl = document.getElementById('metric-budget-used');
  if (budgetUsedEl) {
    const spent = getDailySpent();
    const pct = userSettings.dailyBudget > 0 ? Math.round((spent / userSettings.dailyBudget) * 100) : 0;
    budgetUsedEl.textContent = pct + '%';
  }

  const investedEl = document.getElementById('metric-invested');
  if (investedEl) {
    investedEl.textContent = formatShortRp(userSettings.invested);
  }

  const totalTxEl = document.getElementById('metric-total-tx');
  if (totalTxEl) {
    totalTxEl.textContent = transactions.length;
  }
}

// ═══ Animated Counters ═════════════════════
function animateCounter(el, target, prefix = '', duration = 800) {
  if (!el) return;
  const start = performance.now();
  (function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + Math.floor(target * ease).toLocaleString('id-ID');
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

function animateBalances() {
  animateCounter(document.getElementById('net-balance'), calcBalance());
  animateCounter(document.getElementById('total-income'), totalIncome(), 'Rp');
  animateCounter(document.getElementById('total-expense'), totalExpense(), 'Rp');
}

// ═══ Gauge ═════════════════════════════════
function initGauge() {
  const spent = getDailySpent();
  const remaining = userSettings.dailyBudget - spent;
  const pct = userSettings.dailyBudget > 0 ? Math.max(0, remaining / userSettings.dailyBudget) : 0;
  const circ = 2 * Math.PI * 82; 
  const fill = document.getElementById('gauge-fill');
  const amountEl = document.getElementById('gauge-amount');
  const statusEl = document.getElementById('gauge-status');

  if (fill) {
    requestAnimationFrame(() => {
      fill.style.strokeDashoffset = circ * (1 - pct);
    });
  }

  if (amountEl) amountEl.textContent = formatRp(remaining);

  if (statusEl) {
    if (pct > 0.5) {
      if (fill) fill.style.stroke = '#10B981';
      statusEl.className = 'gauge-status';
      statusEl.querySelector('.status-text').textContent = "Aman terkendali! 🎯";
    } else if (pct > 0.2) {
      if (fill) fill.style.stroke = '#F59E0B';
      statusEl.className = 'gauge-status warning';
      statusEl.querySelector('.status-text').textContent = 'Agak boros nih ⚠️';
    } else {
      if (fill) fill.style.stroke = '#EF4444';
      statusEl.className = 'gauge-status danger';
      statusEl.querySelector('.status-text').textContent = 'Limit harian mau habis! 🔥';
    }
  }
}

// ═══ Charts ════════════════════════════════
function getChartColors() {
  const style = getComputedStyle(document.body);
  return {
    text3: style.getPropertyValue('--text-3').trim() || '#6B7280',
    border: style.getPropertyValue('--border').trim() || '#1F2937',
  };
}

function initChart() {
  if (activeChart) { activeChart.destroy(); activeChart = null; }

  const chartEl = document.getElementById('main-chart');
  if (!chartEl) return;
  const ctx = chartEl.getContext('2d');
  const colors = getChartColors();

  if (chartType === 'donut') {
    const expByCat = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      expByCat[t.cat] = (expByCat[t.cat] || 0) + t.amount;
    });

    const labels = Object.keys(expByCat).map(k => CAT[k]?.label || k);
    const data   = Object.values(expByCat);
    const bgCols = Object.keys(expByCat).map(k => CAT[k]?.color || '#888');

    const legendEl = document.getElementById('chart-legend');
    if (legendEl) legendEl.innerHTML = '';

    if (data.length === 0) {
      activeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Belum Ada Data'],
          datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.08)'], borderWidth: 0 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '68%',
          plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
      });
      if (legendEl) legendEl.innerHTML = '<span style="color:var(--text-3, #9ca3af); font-size:12px;">Belum ada transaksi pengeluaran</span>';
      return;
    }

    activeChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: bgCols, borderWidth: 0, hoverOffset: 10 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: { 
            backgroundColor: '#1F2937', titleColor: '#F9FAFB', bodyColor: '#9CA3AF', 
            cornerRadius: 12, padding: 14, titleFont: { weight: 700 },
            callbacks: { label: function(context) { return formatRp(context.raw); } }
          },
        },
        animation: { animateRotate: true, duration: 900 },
      },
    });

    if (legendEl) {
      Object.keys(expByCat).forEach((k, i) => {
        const btn = document.createElement('button');
        btn.className = 'legend-item';
        btn.innerHTML = `<span class="legend-dot" style="background:${bgCols[i]}"></span>${labels[i]} <span class="legend-val">${formatRp(data[i])}</span>`;
        btn.addEventListener('click', () => {
          activeChart.toggleDataVisibility(i);
          activeChart.update();
          btn.classList.toggle('disabled');
        });
        legendEl.appendChild(btn);
      });
    }

  } else {
    const days = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
    const incomeByDay = [0, 0, 0, 0, 0, 0, 0];
    const expenseByDay = [0, 0, 0, 0, 0, 0, 0];
    const dayMap = [6, 0, 1, 2, 3, 4, 5];

    transactions.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date + 'T00:00:00');
      const idx = dayMap[d.getDay()];
      if (idx !== undefined) {
        if (t.type === 'income') incomeByDay[idx] += t.amount;
        else if (t.type === 'expense') expenseByDay[idx] += t.amount;
      }
    });

    activeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days,
        datasets: [
          { label:'Pemasukan',   data: incomeByDay,  borderColor:'#10B981', backgroundColor:'rgba(16,185,129,.1)', fill:true, tension:.45, pointRadius:4, pointHoverRadius:7, borderWidth:2.5 },
          { label:'Pengeluaran', data: expenseByDay, borderColor:'#EF4444', backgroundColor:'rgba(239,68,68,.08)',  fill:true, tension:.45, pointRadius:4, pointHoverRadius:7, borderWidth:2.5 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { 
            backgroundColor: '#1F2937', titleColor: '#F9FAFB', bodyColor: '#9CA3AF', 
            cornerRadius: 12, padding: 14, mode: 'index', intersect: false,
            callbacks: { label: function(context) { return formatRp(context.raw); } }
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.text3, font: { size: 11 } } },
          y: { 
            grid: { color: 'rgba(255,255,255,.05)' }, 
            ticks: { 
              color: colors.text3, font: { size: 11 },
              callback: function(value) { return 'Rp' + value.toLocaleString('id-ID'); }
            }, 
            border: { display: false } 
          },
        },
        animation: { duration: 800 },
      },
    });

    const legendEl = document.getElementById('chart-legend');
    if (legendEl) {
      legendEl.innerHTML = `
        <button class="legend-item"><span class="legend-dot" style="background:#10B981"></span>Pemasukan</button>
        <button class="legend-item"><span class="legend-dot" style="background:#EF4444"></span>Pengeluaran</button>`;
    }
  }
}

// ═══ Sparkline (Dynamic 7 Days) ════════════
function initSparkline() {
  const ctx = document.getElementById('sparkline-chart');
  if (!ctx) return;
  window.sparklineChart = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['S','S','R','K','J','S','M'],
      datasets: [{
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: '#06B6D4', borderWidth: 2,
        backgroundColor: 'rgba(6,182,212,.1)', fill: true,
        tension: .45, pointRadius: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: { duration: 600 },
    },
  });
  updateSparkline();
}

function updateSparkline() {
  if (!window.sparklineChart) return;
  const data = [];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const sum = transactions
      .filter(t => t.type === 'expense' && t.date === dateStr)
      .reduce((s,t) => s + t.amount, 0);
    data.push(sum);
    labels.push(d.toLocaleDateString('id-ID', {weekday: 'short'})[0]);
  }
  window.sparklineChart.data.labels = labels;
  window.sparklineChart.data.datasets[0].data = data;
  window.sparklineChart.update();
}

function initChartToggle() {
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chartType = btn.dataset.chart;
      initChart();
    });
  });
}

// ═══ Savings Jars Manager ══════════════════
function initSavingsJars() {
  renderSavingsJars();

  const jarOverlay     = document.getElementById('modal-jar-overlay');
  const depositOverlay = document.getElementById('modal-deposit-overlay');
  
  const btnAddJar = document.getElementById('btn-add-jar');
  if (btnAddJar) btnAddJar.addEventListener('click', () => jarOverlay && jarOverlay.classList.add('open'));
  
  const modalJarClose = document.getElementById('modal-jar-close');
  if (modalJarClose) modalJarClose.addEventListener('click', () => jarOverlay && jarOverlay.classList.remove('open'));
  
  if (jarOverlay) jarOverlay.addEventListener('click', e => { if (e.target === jarOverlay) jarOverlay.classList.remove('open'); });

  const btnDeleteJar = document.getElementById('btn-delete-jar');
  if (btnDeleteJar) {
    btnDeleteJar.addEventListener('click', () => {
      if (savingsJars.length === 0) {
        toast('Tidak ada toples untuk dihapus', 'error');
        return;
      }
      const currentJar = savingsJars.find(j => j.id === activeJarId);
      if (!currentJar) return;

      if (confirm(`Apakah kamu yakin ingin menghapus toples "${currentJar.name}"?`)) {
        const deletedName = currentJar.name;
        savingsJars = savingsJars.filter(j => j.id !== activeJarId);
        activeJarId = savingsJars.length > 0 ? savingsJars[0].id : null;
        renderSavingsJars();
        toast(`Toples "${deletedName}" berhasil dihapus`, 'error');
      }
    });
  }

  const btnDepositJar = document.getElementById('btn-deposit-jar');
  if (btnDepositJar) {
    btnDepositJar.addEventListener('click', () => {
      if (savingsJars.length === 0) {
         toast('Buat toples terlebih dahulu!', 'error');
         return;
      }
      const activeJar = savingsJars.find(j => j.id === activeJarId) || savingsJars[0];
      const targetLabel = document.getElementById('deposit-target-label');
      if (targetLabel) targetLabel.textContent = `Setor ke: ${activeJar.name}`;
      if (depositOverlay) depositOverlay.classList.add('open');
    });
  }

  const modalDepositClose = document.getElementById('modal-deposit-close');
  if (modalDepositClose) modalDepositClose.addEventListener('click', () => depositOverlay && depositOverlay.classList.remove('open'));
  if (depositOverlay) depositOverlay.addEventListener('click', e => { if (e.target === depositOverlay) depositOverlay.classList.remove('open'); });

  const jarForm = document.getElementById('jar-form');
  if (jarForm) {
    jarForm.addEventListener('submit', e => {
      e.preventDefault();
      const name   = document.getElementById('jar-title').value.trim();
      const goal   = parseFloat(document.getElementById('jar-target-input').value);
      const initial= parseFloat(document.getElementById('jar-initial-input').value) || 0;

      if (!name || !goal || goal <= 0) return;

      const newJar = { id: nextJarId++, name, goal, current: initial, icon: '🎯' };
      savingsJars.push(newJar);
      activeJarId = newJar.id;

      jarForm.reset();
      if (jarOverlay) jarOverlay.classList.remove('open');

      renderSavingsJars();
      toast(`Toples "${name}" berhasil dibuat! 🎉`, 'success');
    });
  }

  const depositForm = document.getElementById('deposit-form');
  if (depositForm) {
    depositForm.addEventListener('submit', e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('deposit-amount').value);
      if (!amount || amount <= 0) return;

      const jar = savingsJars.find(j => j.id === activeJarId);
      if (jar) {
        jar.current += amount;
        renderSavingsJars();
        toast(`Berhasil menyetor ${formatRp(amount)} ke ${jar.name}! 💰`, 'success');
      }

      depositForm.reset();
      if (depositOverlay) depositOverlay.classList.remove('open');
    });
  }
}

function renderSavingsJars() {
  const selector = document.getElementById('jar-selector');
  if (!selector) return;

  if (savingsJars.length === 0) {
    selector.innerHTML = '<span style="color:var(--text-3); font-size:12px; padding: 4px;">Belum ada toples.</span>';
    activeJarId = null;
    updateJarDisplay();
    updateBackMetrics();
    return;
  }

  if (!activeJarId || !savingsJars.find(j => j.id === activeJarId)) {
    activeJarId = savingsJars[0].id;
  }

  selector.innerHTML = savingsJars.map(jar => `
    <button class="jar-pill ${jar.id === activeJarId ? 'active' : ''}" data-id="${jar.id}">
      ${jar.icon} ${jar.name}
    </button>
  `).join('');

  selector.querySelectorAll('.jar-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      activeJarId = Number(btn.dataset.id);
      renderSavingsJars();
    });
  });

  updateJarDisplay();
  updateBackMetrics();
}

function updateJarDisplay() {
  const nameEl = document.getElementById('jar-goal-name');
  const curEl  = document.getElementById('jar-current');
  const goalEl = document.getElementById('jar-goal');
  const pctEl  = document.getElementById('jar-pct');
  const liquid = document.getElementById('liquid');

  if (!activeJarId || savingsJars.length === 0) {
     if (nameEl) nameEl.textContent = 'Belum Ada Toples';
     if (curEl)  curEl.textContent = 'Rp0';
     if (goalEl) goalEl.textContent = 'Rp0';
     if (pctEl)  pctEl.textContent = '0%';
     if (liquid) liquid.style.height = '0%';
     return;
  }

  const jar = savingsJars.find(j => j.id === activeJarId);
  if (!jar) return;

  const pct = Math.min(100, Math.max(0, (jar.current / jar.goal) * 100));

  if (nameEl) nameEl.textContent = `${jar.icon} ${jar.name}`;
  if (curEl)  curEl.textContent = formatRp(jar.current);
  if (goalEl) goalEl.textContent = formatRp(jar.goal);
  if (pctEl)  pctEl.textContent = pct.toFixed(0) + '%';
  if (liquid) liquid.style.height = pct + '%';
}

// ═══ 3D Card Tilt ══════════════════════════
function initCardTilt() {
  const wrapper = document.querySelector('.card-3d-wrapper');
  const card    = document.getElementById('card-3d');
  if (!wrapper || !card) return;

  wrapper.addEventListener('mousemove', e => {
    if (isFlipped) return;
    const r = wrapper.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.classList.add('no-transition');
    card.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
  });

  wrapper.addEventListener('mouseleave', () => {
    if (isFlipped) return;
    card.classList.remove('no-transition');
    card.style.transform = '';
  });
}

// ═══ Card Flip ═════════════════════════════
function initCardFlip() {
  const card = document.getElementById('card-3d');
  const flipBtn = document.getElementById('flip-btn');
  const flipBtnBack = document.getElementById('flip-btn-back');

  if (flipBtn && card) {
    flipBtn.addEventListener('click', e => {
      e.stopPropagation();
      isFlipped = true;
      card.classList.remove('no-transition');
      card.style.transform = '';
      card.classList.add('flipped');
    });
  }

  if (flipBtnBack && card) {
    flipBtnBack.addEventListener('click', e => {
      e.stopPropagation();
      isFlipped = false;
      card.classList.remove('no-transition');
      card.classList.remove('flipped');
    });
  }
}

// ═══ Transactions ══════════════════════════
function renderTransactions() {
  const list = document.getElementById('tx-list');
  if (!list) return;

  let filtered = [...transactions];

  if (filterCat !== 'all') filtered = filtered.filter(t => t.cat === filterCat);
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.cat.toLowerCase().includes(q) ||
      (t.note && t.note.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  const countEl = document.getElementById('tx-count');
  if (countEl) countEl.textContent = filtered.length + ' transaksi';

  if (!filtered.length) {
    list.innerHTML = '<div class="tx-empty">Belum ada transaksi. Silakan tambah transaksi baru.</div>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const c = CAT[t.cat] || { icon: '📌', color: '#888', label: t.cat };
    const sign = t.type === 'income' ? '+' : '-';
    const cls  = t.type;
    const d    = new Date(t.date);
    const dateStr = d.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `
      <div class="tx-item" data-id="${t.id}">
        <div class="tx-actions">
          <button class="tx-action edit" data-id="${t.id}" title="Edit">✏️</button>
          <button class="tx-action delete" data-id="${t.id}" title="Hapus">🗑️</button>
        </div>
        <div class="tx-content">
          <div class="tx-icon" style="background:${c.color}18">${c.icon}</div>
          <div class="tx-info">
            <span class="tx-name">${t.name}</span>
            <span class="tx-meta">
              ${dateStr}
              <span class="tx-tag" style="background:${c.color}18;color:${c.color}">${c.label}</span>
            </span>
          </div>
          <span class="tx-amount ${cls}">${sign}${formatRp(t.amount)}</span>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.tx-action.delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const item = list.querySelector(`.tx-item[data-id="${id}"]`);
      if (item) {
        item.style.transition = 'all .35s ease';
        item.style.transform = 'translateX(100%)';
        item.style.opacity = '0';
        item.style.maxHeight = item.offsetHeight + 'px';
        setTimeout(() => { item.style.maxHeight = '0'; item.style.padding = '0'; item.style.margin = '0'; }, 100);
        setTimeout(() => {
          transactions = transactions.filter(t => t.id !== id);
          renderTransactions();
          animateBalances();
          initGauge();
          initChart();
          updateSparkline();
          updateSimulator();
          updateBackMetrics();
          toast('Transaksi dihapus', 'error');
        }, 400);
      }
    });
  });

  list.querySelectorAll('.tx-action.edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toast('Fitur Edit segera hadir ✨', 'success');
    });
  });
}

function initSearch() {
  const searchEl = document.getElementById('tx-search');
  if (searchEl) {
    searchEl.addEventListener('input', e => {
      searchTerm = e.target.value;
      renderTransactions();
    });
  }
}

function initCatFilters() {
  document.querySelectorAll('#cat-filters .cat-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#cat-filters .cat-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterCat = btn.dataset.cat;
      renderTransactions();
    });
  });
}

function initFilterPills() {
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(btn => {
    if (btn.textContent.trim().toLowerCase() === 'hari ini') {
      pills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      pills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      toast(`Melihat metrik: ${btn.textContent}`, 'success');
    });
  });
}

// ═══ Budget Simulator ══════════════════════
function initSimulator() {
  const slider    = document.getElementById('sim-slider');
  const valEl     = document.getElementById('sim-value');
  const curEl     = document.getElementById('sim-current');
  const projEl    = document.getElementById('sim-projected');
  const impactEl  = document.getElementById('sim-impact');

  if (!slider) return;

  function update() {
    const extra = Number(slider.value);
    const maxVal = Number(slider.max) || 1;
    const pct   = (extra / maxVal) * 100;
    slider.style.setProperty('--fill', pct + '%');
    if (valEl) valEl.textContent = extra.toLocaleString('id-ID');

    const bal  = calcBalance();
    const proj = bal - extra;
    if (curEl) curEl.textContent  = formatRp(bal);
    if (projEl) {
      projEl.textContent = formatRp(proj);
      projEl.classList.toggle('red', proj < 0);
      projEl.classList.toggle('green', proj >= 0);
    }

    if (impactEl) {
      if (extra === 0) {
        impactEl.textContent = 'Geser slider untuk simulasi';
        impactEl.style.color = '';
        impactEl.style.background = '';
      } else if (proj >= 0) {
        impactEl.textContent = `✅ Masih aman! Sisa saldo ${formatRp(proj)}`;
        impactEl.style.color = '#10B981';
        impactEl.style.background = 'rgba(16,185,129,.08)';
      } else {
        impactEl.textContent = `⚠️ Overspend! Kamu minus ${formatRp(Math.abs(proj))}`;
        impactEl.style.color = '#EF4444';
        impactEl.style.background = 'rgba(239,68,68,.08)';
      }
    }
  }

  slider.addEventListener('input', update);
  window._updateSimulator = update;
}

function updateSimulator() { 
  const slider = document.getElementById('sim-slider');
  if (slider) {
    const bal = calcBalance();
    let maxVal = bal > 0 ? bal * 2 : 5000000;
    if (maxVal < 1000000) maxVal = 1000000;
    
    slider.max = maxVal;
    slider.step = maxVal / 100;
    
    const labels = document.querySelectorAll('.slider-labels span');
    if (labels.length === 3) {
      labels[0].textContent = 'Rp0';
      labels[1].textContent = formatShortRp(maxVal / 2);
      labels[2].textContent = formatShortRp(maxVal);
    }
  }
  if (window._updateSimulator) window._updateSimulator(); 
}

// ═══ Modal Add Transaction ═════════════════
function initModal() {
  const overlay = document.getElementById('modal-overlay');
  const form    = document.getElementById('tx-form');
  let selectedType = 'expense';
  let selectedCat  = 'food';

  const dateInput = document.getElementById('tx-date');
  if (dateInput) dateInput.valueAsDate = new Date();

  const btnAdd = document.getElementById('btn-add');
  if (btnAdd && overlay) btnAdd.addEventListener('click', () => overlay.classList.add('open'));

  const modalClose = document.getElementById('modal-close');
  if (modalClose && overlay) modalClose.addEventListener('click', () => overlay.classList.remove('open'));

  if (overlay) {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('open'); });
  }

  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
    });
  });

  document.querySelectorAll('#cat-selector .cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#cat-selector .cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCat = btn.dataset.cat;
    });
  });

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('tx-amount').value);
      const date   = document.getElementById('tx-date').value;
      const note   = document.getElementById('tx-note').value.trim();
      if (!amount || amount <= 0) return;

      const catInfo = CAT[selectedCat] || { label: selectedCat };
      transactions.unshift({
        id:   nextId++,
        name: note || catInfo.label,
        cat:  selectedCat,
        type: selectedType,
        amount,
        date,
        note,
      });

      form.reset();
      if (dateInput) dateInput.valueAsDate = new Date();
      if (overlay) overlay.classList.remove('open');

      renderTransactions();
      animateBalances();
      initGauge();
      initChart();
      updateSparkline();
      updateSimulator();
      updateBackMetrics();
      toast('Transaksi berhasil ditambahkan! 🎉', 'success');
    });
  }
}

// ═══ Modal Pengaturan Statis ═══════════════
function initSettingsModal() {
  const overlay = document.getElementById('modal-settings-overlay');
  const btn = document.getElementById('btn-settings');
  const close = document.getElementById('modal-settings-close');
  const form = document.getElementById('settings-form');

  if(btn) btn.addEventListener('click', () => overlay && overlay.classList.add('open'));
  if(close) close.addEventListener('click', () => overlay && overlay.classList.remove('open'));
  if(overlay) overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });

  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      userSettings.dailyBudget = parseFloat(document.getElementById('set-budget').value) || 0;
      userSettings.invested = parseFloat(document.getElementById('set-invested').value) || 0;
      userSettings.trendPercent = parseFloat(document.getElementById('set-trend').value) || 0;

      overlay.classList.remove('open');
      
      updateStaticTexts();
      initGauge();
      updateBackMetrics();
      toast('Pengaturan berhasil disimpan! ⚙️', 'success');
    });
  }
}

// ═══ Toast Notification ════════════════════
function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('exit'); setTimeout(() => el.remove(), 350); }, 3000);
}

// ═══ Theme Toggle ══════════════════════════
function initThemeToggle() {
  const btn  = document.getElementById('btn-theme');
  const icon = document.getElementById('theme-icon');
  if (btn && icon) {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      icon.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
      initChart();
    });
  }
}