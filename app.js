(function () {
  'use strict';

  // ==================== State ====================
  var fuelRecords = [];
  var tripRecords = [];
  var currentPage = 'home';
  var dataService = window.dataService;

  // ==================== DOM Elements ====================
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return document.querySelectorAll(sel); };

  var mainContent = $('#main-content');
  var headerTitle = $('#header-title');
  var headerAvatar = $('#header-avatar');
  var modalOverlay = $('#modal-overlay');
  var modalContent = $('#modal-content');
  var confirmDialog = $('#confirm-dialog');
  var confirmMessage = $('#confirm-message');
  var confirmOk = $('#confirm-ok');
  var confirmCancel = $('#confirm-cancel');

  var confirmCallback = null;

  // ==================== Theme ====================
  function getThemeMode() {
    return localStorage.getItem('theme') || 'system';
  }

  function applyTheme(mode) {
    localStorage.setItem('theme', mode);
    var isDark;
    if (mode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = mode === 'dark';
    }
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  function initTheme() {
    applyTheme(getThemeMode());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (getThemeMode() === 'system') {
        applyTheme('system');
      }
    });
  }

  window._setTheme = function (mode) {
    applyTheme(mode);
    refreshCurrentPage();
  };

  // ==================== Nav Pill ====================
  function updateNavPill() {
    var nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    var active = nav.querySelector('.nav-item.active');
    var pill = nav.querySelector('.nav-pill-bg');
    if (!active || !pill) return;
    var navRect = nav.getBoundingClientRect();
    var activeRect = active.getBoundingClientRect();
    pill.style.left = (activeRect.left - navRect.left) + 'px';
    pill.style.width = activeRect.width + 'px';
  }

  // ==================== Avatar ====================
  function getUserInitial() {
    return 'U';
  }

  function updateAvatar() {
    if (headerAvatar) {
      headerAvatar.textContent = getUserInitial();
    }
  }

  // ==================== Utilities ====================
  function genId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
  }

  function fmt(n, d) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toFixed(d);
  }

  function fmtMoney(n) { return fmt(n, 2); }
  function fmtDist(n) { return fmt(n, 1); }
  function fmtFuel(n) { return fmt(n, 2); }
  function fmtInt(n) { return fmt(n, 0); }

  function icon(name) {
    var icons = {
      fuel: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15"/><path d="M6 9h8"/><path d="M18 8l2 2v7a2 2 0 0 1-2 2h-2"/><path d="M20 10h-2"/></svg>',
      route: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c2.5-3.5 5.5-3.5 8-7s5.5-3.5 6-7"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/></svg>',
      cost: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18"/><path d="M17 7.5c-.9-1-2.4-1.5-4.4-1.5-2.5 0-4.1 1.1-4.1 2.8 0 4.1 9 1.7 9 6.1 0 1.8-1.8 3.1-4.6 3.1-2.2 0-3.9-.7-4.9-1.9"/></svg>',
      gauge: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M12 14l4-5"/><path d="M8 18h8"/></svg>',
      trend: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M14 7h6v6"/></svg>',
      export: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>',
      import: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="M7 10l5 5 5-5"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg>',
      trash: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>'
    };
    return icons[name] || '';
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function isCurrentMonth(dateStr) {
    var d = new Date(dateStr);
    var now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  function sortByDateDesc(arr) {
    return [].concat(arr).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  }

  function getMonthProgress() {
    var now = new Date();
    var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var day = now.getDate();
    return { day: day, daysInMonth: daysInMonth, remaining: daysInMonth - day, pct: Math.round((day / daysInMonth) * 100) };
  }

  function monthLabel() {
    var now = new Date();
    return now.getFullYear() + '年' + (now.getMonth() + 1) + '月';
  }

  function showConfirm(msg, cb) {
    confirmMessage.textContent = msg;
    confirmCallback = cb;
    confirmDialog.classList.remove('hidden');
  }

  function hideConfirm() {
    confirmDialog.classList.add('hidden');
    confirmCallback = null;
  }

  // ==================== Storage ====================
  function applyData(data) {
    fuelRecords = data.fuelRecords;
    tripRecords = data.tripRecords;
  }

  function loadData() {
    applyData(dataService.loadData());
  }

  // ==================== Modal ====================
  function openModal(html) {
    modalContent.innerHTML = html;
    modalOverlay.classList.remove('hidden');
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    modalContent.innerHTML = '';
  }

  // ==================== Navigation ====================
  function navigateTo(page) {
    currentPage = page;
    $$('.nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    var titles = { home: '概览', fuel: '加油', trip: '行程', stats: '统计', settings: '设置' };
    headerTitle.textContent = titles[page] || '概览';

    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(updateNavPill, 50);
  }

  // ==================== Statistics ====================
  function getAverageConsumption() {
    if (fuelRecords.length < 2) return null;
    var sorted = [].concat(fuelRecords).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var totalLiters = 0, totalDist = 0, count = 0;
    for (var i = 1; i < sorted.length; i++) {
      var prev = sorted[i - 1], curr = sorted[i];
      if (curr.fullTank && curr.odometer > prev.odometer) {
        var dist = curr.odometer - prev.odometer;
        if (dist > 0 && curr.liters > 0) { totalLiters += curr.liters; totalDist += dist; count++; }
      }
    }
    if (count === 0 || totalDist === 0) return null;
    return (totalLiters / totalDist) * 100;
  }

  function getConsumptionTrendPoints() {
    var sorted = [].concat(fuelRecords).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var points = [];
    for (var i = 1; i < sorted.length; i++) {
      var prev = sorted[i - 1], curr = sorted[i];
      var dist = Number(curr.odometer) - Number(prev.odometer);
      var liters = Number(curr.liters) || 0;
      if (dist > 0 && liters > 0) {
        points.push({ date: curr.date, distance: dist, liters: liters, amount: Number(curr.amount) || 0, price: Number(curr.pricePerLiter) || 0, consumption: (liters / dist) * 100, costPerKm: dist > 0 ? (Number(curr.amount) || 0) / dist : 0 });
      }
    }
    return points;
  }

  function getTrendSummary() {
    var points = getConsumptionTrendPoints();
    if (!points.length) return { points: [], avg: getAverageConsumption(), latest: null, min: null, max: null, delta: null, totalDistance: 0, totalAmount: 0 };
    var values = points.map(function (p) { return p.consumption; });
    var latest = points[points.length - 1];
    var prev = points.length > 1 ? points[points.length - 2] : null;
    return {
      points: points,
      avg: values.reduce(function (s, v) { return s + v; }, 0) / values.length,
      latest: latest,
      min: Math.min.apply(null, values),
      max: Math.max.apply(null, values),
      delta: prev ? latest.consumption - prev.consumption : null,
      totalDistance: points.reduce(function (s, p) { return s + p.distance; }, 0),
      totalAmount: points.reduce(function (s, p) { return s + p.amount; }, 0)
    };
  }

  function getLatestFuelPrice() {
    if (fuelRecords.length === 0) return null;
    return sortByDateDesc(fuelRecords)[0].pricePerLiter || null;
  }

  function getCostPerKm() {
    var avg = getAverageConsumption();
    var price = getLatestFuelPrice();
    if (avg == null || price == null) return null;
    return (avg * price) / 100;
  }

  function getMonthlyFuelStats() {
    var recs = fuelRecords.filter(function (r) { return isCurrentMonth(r.date); });
    return { totalAmount: recs.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0), totalLiters: recs.reduce(function (s, r) { return s + (Number(r.liters) || 0); }, 0) };
  }

  function getMonthlyDistance() {
    return tripRecords.filter(function (r) { return isCurrentMonth(r.date); }).reduce(function (s, r) { return s + (Number(r.distance) || 0); }, 0);
  }

  function getTotalStats() {
    return { totalAmount: fuelRecords.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0), totalDistance: tripRecords.reduce(function (s, r) { return s + (Number(r.distance) || 0); }, 0) };
  }

  function getLatestFuelRecord() {
    if (fuelRecords.length === 0) return null;
    return sortByDateDesc(fuelRecords)[0];
  }

  function getLatestTripRecord() {
    if (tripRecords.length === 0) return null;
    return sortByDateDesc(tripRecords)[0];
  }

  function getFuelConfidence() {
    var fullCount = fuelRecords.filter(function (r) { return r.fullTank; }).length;
    if (fuelRecords.length >= 4 && fullCount >= 2) return { label: '数据可信', detail: fullCount + ' 次满箱校准', pct: 88 };
    if (fuelRecords.length >= 2) return { label: '持续学习', detail: '建议补充满箱标记', pct: 58 };
    return { label: '等待校准', detail: '记录两次满箱后更准确', pct: 24 };
  }

  function getEfficiencyGrade(avg) {
    if (avg == null) return { grade: '—', label: '等待评级', tone: 'muted' };
    if (avg <= 6) return { grade: 'S', label: '极省油', tone: 'mint' };
    if (avg <= 7.5) return { grade: 'A', label: '优秀', tone: 'cyan' };
    if (avg <= 9) return { grade: 'B', label: '均衡', tone: 'blue' };
    if (avg <= 11) return { grade: 'C', label: '偏高', tone: 'amber' };
    return { grade: 'D', label: '需关注', tone: 'rose' };
  }

  function renderTrendChart(summary) {
    if (!summary.points.length) {
      return '<div class="trend-empty"><strong>油耗趋势等待生成</strong><span>至少添加两次带里程和升数的加油记录后，将显示真实油耗曲线、均线、最高/最低和成本变化。</span></div>';
    }
    var points = summary.points.slice(-12);
    var values = points.map(function (p) { return p.consumption; });
    var min = Math.min.apply(null, values.concat([summary.avg])) - 0.6;
    var max = Math.max.apply(null, values.concat([summary.avg])) + 0.6;
    if (max - min < 2) { max += 1; min -= 1; }
    var w = 320, h = 168, left = 28, right = 16, top = 18, bottom = 26;
    var innerW = w - left - right, innerH = h - top - bottom;
    function x(i) { return left + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1)); }
    function y(v) { return top + innerH - ((v - min) / (max - min)) * innerH; }
    var line = points.map(function (p, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(p.consumption).toFixed(1); }).join(' ');
    var area = line + ' L ' + x(points.length - 1).toFixed(1) + ' ' + (top + innerH).toFixed(1) + ' L ' + x(0).toFixed(1) + ' ' + (top + innerH).toFixed(1) + ' Z';
    var avgY = y(summary.avg).toFixed(1);
    var last = points[points.length - 1];
    var lastX = x(points.length - 1).toFixed(1), lastY = y(last.consumption).toFixed(1);
    var dots = points.map(function (p, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.consumption).toFixed(1) + '" r="' + (i === points.length - 1 ? 4.2 : 2.8) + '" />'; }).join('');
    return '<div class="trend-graph" role="img" aria-label="油耗变化趋势图">' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--trend-fill)" stop-opacity="1"/><stop offset="100%" stop-color="transparent" stop-opacity="0"/></linearGradient></defs>' +
      '<line class="grid-line" x1="' + left + '" y1="' + top + '" x2="' + (w - right) + '" y2="' + top + '"/>' +
      '<line class="grid-line" x1="' + left + '" y1="' + (top + innerH / 2).toFixed(1) + '" x2="' + (w - right) + '" y2="' + (top + innerH / 2).toFixed(1) + '"/>' +
      '<line class="grid-line" x1="' + left + '" y1="' + (top + innerH) + '" x2="' + (w - right) + '" y2="' + (top + innerH) + '"/>' +
      '<line class="avg-line" x1="' + left + '" y1="' + avgY + '" x2="' + (w - right) + '" y2="' + avgY + '"/>' +
      '<path class="trend-area" d="' + area + '"/>' +
      '<path class="trend-line" d="' + line + '"/>' +
      '<g class="trend-dots">' + dots + '</g>' +
      '<circle class="trend-last-dot" cx="' + lastX + '" cy="' + lastY + '" r="7"/>' +
      '<text class="axis-label" x="2" y="' + (top + 4) + '">' + Math.ceil(max) + '</text>' +
      '<text class="axis-label" x="2" y="' + (top + innerH + 3) + '">' + Math.floor(min) + '</text>' +
      '<text class="avg-label" x="' + (w - right - 46) + '" y="' + (Number(avgY) - 6) + '">均 ' + fmtFuel(summary.avg) + '</text>' +
      '</svg>' +
      '<div class="trend-axis"><span>' + points[0].date.slice(5) + '</span><span>' + last.date.slice(5) + '</span></div>' +
      '</div>';
  }

  // ==================== Data Operations ====================
  function addFuelRecord(record) { applyData(dataService.addFuelRecord(record)); }
  function updateFuelRecord(id, record) { applyData(dataService.updateFuelRecord(id, record)); }
  function deleteFuelRecord(id) { applyData(dataService.deleteFuelRecord(id)); }
  function addTripRecord(record) { applyData(dataService.addTripRecord(record)); }
  function updateTripRecord(id, record) { applyData(dataService.updateTripRecord(id, record)); }
  function deleteTripRecord(id) { applyData(dataService.deleteTripRecord(id)); }

  // ==================== Render: Home ====================
  function renderHome() {
    var costPerKm = getCostPerKm();
    var avgConsumption = getAverageConsumption();
    var latestPrice = getLatestFuelPrice();
    var monthlyFuel = getMonthlyFuelStats();
    var monthlyDist = getMonthlyDistance();
    var latestFuel = getLatestFuelRecord();
    var latestTrip = getLatestTripRecord();
    var progress = getMonthProgress();
    var totals = getTotalStats();
    var trend = getTrendSummary();
    var confidence = getFuelConfidence();

    var h = '<div class="page active" id="page-home">';
    h += '<div class="page-head"><h2>概览</h2><div class="subtitle">Fuel Overview</div></div>';

    // Hero stat card
    h += '<div class="hero-dashboard">';
    h += '<div class="hero-label">本月油费</div>';
    h += '<div class="hero-value">¥' + fmtMoney(monthlyFuel.totalAmount) + '</div>';
    h += '<div class="hero-unit">' + monthLabel() + '</div>';
    h += '<div class="hero-sub-stats">';
    h += '<div class="hero-sub-stat"><div class="val">' + (avgConsumption != null ? fmtFuel(avgConsumption) : '—') + '</div><div class="lbl">平均油耗 L/100km</div></div>';
    h += '<div class="hero-sub-stat"><div class="val">' + (costPerKm != null ? '¥' + fmtMoney(costPerKm) : '—') + '</div><div class="lbl">每公里成本</div></div>';
    h += '</div></div>';

    // Quick actions
    h += '<div class="quick-actions">';
    h += '<button class="btn-action" onclick="window._showFuelForm()"><span class="action-icon">' + icon('fuel') + '</span>记录加油</button>';
    h += '<button class="btn-action" onclick="window._showTripForm()"><span class="action-icon">' + icon('route') + '</span>记录行程</button>';
    h += '</div>';

    // 4 small cards in 2x2
    h += '<div class="summary-grid">';
    h += '<div class="card summary-card"><div class="card-title">本月行驶</div><div class="card-value">' + fmtDist(monthlyDist) + '</div><div class="card-unit">km</div></div>';
    h += '<div class="card summary-card"><div class="card-title">最近油价</div><div class="card-value">' + (latestPrice != null ? '¥' + fmtMoney(latestPrice) : '—') + '</div></div>';
    h += '<div class="card summary-card"><div class="card-title">累计行驶</div><div class="card-value">' + fmtInt(totals.totalDistance) + '</div><div class="card-unit">km</div></div>';
    h += '<div class="card summary-card"><div class="card-title">累计油费</div><div class="card-value">¥' + fmtMoney(totals.totalAmount) + '</div></div>';
    h += '</div>';

    // Month progress
    h += '<div class="progress-card">';
    h += '<div class="progress-header"><span class="progress-label">' + monthLabel() + ' 进度</span><span class="progress-pct">' + progress.pct + '%</span></div>';
    h += '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + progress.pct + '%"></div></div>';
    h += '<div class="progress-info"><span>已过 ' + progress.day + ' 天</span><span>剩余 ' + progress.remaining + ' 天</span><span>本月油费 ¥' + fmtMoney(monthlyFuel.totalAmount) + '</span></div>';
    h += '</div>';

    // Trend
    h += '<div class="trend-card"><div class="section-head"><strong>油耗变化趋势</strong></div>';
    h += renderTrendChart(trend);
    h += '<div class="trend-insights">';
    h += '<div><span>最近一次</span><strong>' + (trend.latest ? fmtFuel(trend.latest.consumption) : '—') + '</strong><small>L/100km</small></div>';
    h += '<div><span>平均</span><strong>' + (trend.avg ? fmtFuel(trend.avg) : '—') + '</strong><small>L/100km</small></div>';
    h += '<div><span>置信度</span><strong>' + confidence.label + '</strong><small>' + confidence.detail + '</small></div>';
    h += '</div></div>';

    // Latest records
    h += '<div class="latest-section-title">最近记录</div>';
    h += '<div class="latest-record-card fuel"><div class="latest-info"><div class="latest-label">最近加油</div>';
    if (latestFuel) {
      h += '<div class="latest-detail">' + latestFuel.date + ' · ' + fmtDist(latestFuel.odometer) + ' km' + (latestFuel.note ? ' · ' + escHtml(latestFuel.note) : '') + '</div></div><div class="latest-value">¥' + fmtMoney(latestFuel.amount) + '</div>';
    } else {
      h += '<div class="latest-detail">暂无记录</div></div><div class="latest-value no-data">—</div>';
    }
    h += '</div>';

    h += '<div class="latest-record-card trip"><div class="latest-info"><div class="latest-label">最近行程</div>';
    if (latestTrip) {
      h += '<div class="latest-detail">' + latestTrip.date + ' · ' + (latestTrip.name || latestTrip.purpose || '未命名') + '</div></div><div class="latest-value">' + fmtDist(latestTrip.distance) + ' km</div>';
    } else {
      h += '<div class="latest-detail">暂无记录</div></div><div class="latest-value no-data">—</div>';
    }
    h += '</div>';

    h += '</div>';
    mainContent.innerHTML = h;
  }

  // ==================== Render: Fuel Records ====================
  function renderFuelPage() {
    var records = sortByDateDesc(fuelRecords);
    var h = '<div class="page active" id="page-fuel">';
    h += '<div class="page-head"><h2>加油</h2><div class="subtitle">Fuel Refill</div></div>';

    if (records.length === 0) {
      h += '<div class="empty-state"><div class="empty-state-icon">' + icon('fuel') + '</div><p>还没有加油记录</p><button class="btn btn-primary btn-sm" onclick="window._showFuelForm()">新增加油记录</button></div>';
    } else {
      h += '<div class="record-list">';
      records.forEach(function (r) { h += renderFuelItem(r); });
      h += '</div>';
    }
    h += '</div>';
    mainContent.innerHTML = h;

    var fab = document.createElement('button');
    fab.className = 'fab'; fab.textContent = '+';
    fab.onclick = function () { showFuelForm(); };
    document.body.appendChild(fab);
  }

  function renderFuelItem(r) {
    var h = '<div class="record-item" data-id="' + r.id + '">';
    h += '<div class="record-header"><span class="record-date">' + r.date;
    if (r.fullTank) h += '<span class="badge-full">FULL</span>';
    h += '</span><div class="record-actions"><button class="record-edit" data-action="edit-fuel" data-id="' + r.id + '">编辑</button><button class="record-delete" data-action="delete-fuel" data-id="' + r.id + '">删除</button></div></div>';
    h += '<div class="record-details">';
    h += '<div class="record-detail">里程 <span>' + fmtDist(r.odometer) + ' km</span></div>';
    h += '<div class="record-detail">金额 <span>¥' + fmtMoney(r.amount) + '</span></div>';
    h += '<div class="record-detail">升数 <span>' + fmtFuel(r.liters) + ' L</span></div>';
    h += '<div class="record-detail">油价 <span>¥' + fmtMoney(r.pricePerLiter) + '/L</span></div>';
    h += '</div>';
    if (r.note) h += '<div class="record-note">' + escHtml(r.note) + '</div>';
    h += '</div>';
    return h;
  }

  function showFuelForm(editRecord) {
    var r = editRecord || {};
    var h = '<div class="modal-header"><h2>' + icon('fuel') + (editRecord ? '编辑加油记录' : '新增加油记录') + '</h2><button class="modal-close" onclick="window._closeModal()" aria-label="关闭">×</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="fuel-date" value="' + (r.date || today()) + '"></div>';
    h += '<div class="form-group"><label class="form-label">当前总里程 (km)</label><input type="number" class="form-input" id="fuel-odo" placeholder="例如 35620" step="0.1" min="0" value="' + (r.odometer || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">加油金额 (元)</label><input type="number" class="form-input fuel-calc" id="fuel-amount" placeholder="例如 300" step="0.01" min="0" value="' + (r.amount || '') + '" inputmode="decimal" data-role="amount"></div>';
    h += '<div class="form-group"><label class="form-label">加油升数 (L)</label><input type="number" class="form-input fuel-calc" id="fuel-liters" placeholder="例如 38.5" step="0.01" min="0" value="' + (r.liters || '') + '" inputmode="decimal" data-role="liters"></div>';
    h += '<div class="form-group"><label class="form-label">油价 (元/L)</label><input type="number" class="form-input fuel-calc" id="fuel-price" placeholder="自动计算或手动输入" step="0.01" min="0" value="' + (r.pricePerLiter || '') + '" inputmode="decimal" data-role="price"></div>';
    h += '<div class="form-hint">填写任意两项，第三项自动计算</div>';
    h += '<div class="form-group" style="margin-top:12px"><div class="form-check"><input type="checkbox" id="fuel-fulltank"' + (r.fullTank ? ' checked' : '') + '><label for="fuel-fulltank">本次已加满油箱</label></div></div>';
    h += '<div class="form-group"><label class="form-label">备注</label><input type="text" class="form-input" id="fuel-note" placeholder="例如：中石化、92号" value="' + (r.note || '') + '"></div>';
    h += '<div class="modal-footer">';
    if (editRecord) h += '<button class="btn btn-outline" onclick="window._closeModal()">取消编辑</button>';
    h += '<button class="btn btn-primary btn-block" onclick="window._saveFuel(\'' + (r.id || '') + '\')">' + (editRecord ? '保存修改' : '保存记录') + '</button></div>';
    openModal(h);
    setTimeout(function () {
      $$('.fuel-calc').forEach(function (inp) { inp.addEventListener('input', autoCalcFuel); });
    }, 100);
  }

  function autoCalcFuel() {
    var amtEl = $('#fuel-amount'), litEl = $('#fuel-liters'), prcEl = $('#fuel-price');
    if (!amtEl || !litEl || !prcEl) return;
    var amt = parseFloat(amtEl.value), lit = parseFloat(litEl.value), prc = parseFloat(prcEl.value);
    var filled = [!!amtEl.value, !!litEl.value, !!prcEl.value].filter(Boolean).length;
    if (filled >= 2) {
      if (amtEl.value && litEl.value && !isNaN(amt) && !isNaN(lit) && lit > 0) prcEl.value = fmtMoney(amt / lit);
      else if (litEl.value && prcEl.value && !isNaN(lit) && !isNaN(prc)) amtEl.value = fmtMoney(lit * prc);
      else if (amtEl.value && prcEl.value && !isNaN(amt) && !isNaN(prc) && prc > 0) litEl.value = fmtFuel(amt / prc);
    }
  }

  window._saveFuel = function (editId) {
    var date = $('#fuel-date').value;
    var odo = parseFloat($('#fuel-odo').value);
    var amt = parseFloat($('#fuel-amount').value) || 0;
    var lit = parseFloat($('#fuel-liters').value) || 0;
    var prc = parseFloat($('#fuel-price').value) || 0;
    var full = $('#fuel-fulltank').checked;
    var note = $('#fuel-note').value.trim();
    if (!date) { alert('请选择日期'); return; }
    if (isNaN(odo) || odo < 0) { alert('请输入有效的里程数'); return; }
    if (amt === 0 && lit === 0) { alert('请至少填写金额或升数'); return; }
    if (editId) {
      updateFuelRecord(editId, { id: editId, date: date, odometer: odo, amount: amt, liters: lit, pricePerLiter: prc, fullTank: full, note: note });
    } else {
      addFuelRecord({ id: genId(), date: date, odometer: odo, amount: amt, liters: lit, pricePerLiter: prc, fullTank: full, note: note });
    }
    closeModal(); refreshCurrentPage();
  };

  // ==================== Render: Trip Records ====================
  function renderTripPage() {
    var records = sortByDateDesc(tripRecords);
    var h = '<div class="page active" id="page-trip">';
    h += '<div class="page-head"><h2>行程</h2><div class="subtitle">Trip Log</div></div>';

    if (records.length === 0) {
      h += '<div class="empty-state"><div class="empty-state-icon">' + icon('route') + '</div><p>还没有行程记录</p><button class="btn btn-primary btn-sm" onclick="window._showTripForm()">新增行程记录</button></div>';
    } else {
      h += '<div class="record-list">';
      records.forEach(function (r) { h += renderTripItem(r); });
      h += '</div>';
    }
    h += '</div>';
    mainContent.innerHTML = h;

    var fab = document.createElement('button');
    fab.className = 'fab'; fab.textContent = '+';
    fab.onclick = function () { showTripForm(); };
    document.body.appendChild(fab);
  }

  function renderTripItem(r) {
    var h = '<div class="record-item" data-id="' + r.id + '">';
    h += '<div class="record-header"><span class="record-date">' + r.date;
    if (r.purpose) h += ' · ' + escHtml(r.purpose);
    h += '</span><div class="record-actions"><button class="record-edit" data-action="edit-trip" data-id="' + r.id + '">编辑</button><button class="record-delete" data-action="delete-trip" data-id="' + r.id + '">删除</button></div></div>';
    h += '<div class="record-details">';
    h += '<div class="record-detail">名称 <span>' + escHtml(r.name || '未命名') + '</span></div>';
    h += '<div class="record-detail">距离 <span>' + fmtDist(r.distance) + ' km</span></div>';
    h += '<div class="record-detail">起 <span>' + fmtDist(r.startOdometer) + ' km</span></div>';
    h += '<div class="record-detail">止 <span>' + fmtDist(r.endOdometer) + ' km</span></div>';
    if (r.estimatedCost) h += '<div class="record-detail" style="grid-column:1/-1">预估油费 <span>¥' + fmtMoney(r.estimatedCost) + '</span></div>';
    h += '</div>';
    if (r.note) h += '<div class="record-note">' + escHtml(r.note) + '</div>';
    h += '</div>';
    return h;
  }

  function showTripForm(editRecord) {
    var r = editRecord || {};
    var cpk = getCostPerKm();
    var h = '<div class="modal-header"><h2>' + icon('route') + (editRecord ? '编辑行程记录' : '新增行程记录') + '</h2><button class="modal-close" onclick="window._closeModal()" aria-label="关闭">×</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="trip-date" value="' + (r.date || today()) + '"></div>';
    h += '<div class="form-group"><label class="form-label">行程名称</label><input type="text" class="form-input" id="trip-name" placeholder="例如：去公司、周末出游" value="' + (r.name || '') + '"></div>';
    h += '<div class="form-row"><div class="form-group"><label class="form-label">起始里程 (km)</label><input type="number" class="form-input trip-odo" id="trip-start" placeholder="例如 35620" step="0.1" min="0" value="' + (r.startOdometer || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">结束里程 (km)</label><input type="number" class="form-input trip-odo" id="trip-end" placeholder="例如 35648" step="0.1" min="0" value="' + (r.endOdometer || '') + '" inputmode="decimal"></div></div>';
    h += '<div class="form-group"><label class="form-label">行驶距离 (km)</label><input type="number" class="form-input" id="trip-distance" placeholder="自动计算" step="0.1" min="0" value="' + (r.distance || '') + '" inputmode="decimal" readonly></div>';
    h += '<div class="form-group"><label class="form-label">用途</label><select class="form-input" id="trip-purpose"><option value="">请选择</option><option value="上班"' + (r.purpose === '上班' ? ' selected' : '') + '>上班</option><option value="商务"' + (r.purpose === '商务' ? ' selected' : '') + '>商务</option><option value="出游"' + (r.purpose === '出游' ? ' selected' : '') + '>出游</option><option value="购物"' + (r.purpose === '购物' ? ' selected' : '') + '>购物</option><option value="接送"' + (r.purpose === '接送' ? ' selected' : '') + '>接送</option><option value="其他"' + (r.purpose === '其他' ? ' selected' : '') + '>其他</option></select></div>';
    h += '<div class="form-group"><label class="form-label">预估油费 (元)</label><input type="number" class="form-input" id="trip-cost" placeholder="' + (cpk != null ? '约 ¥' + fmtMoney(cpk) + '/km' : '需要足够数据才能估算') + '" step="0.01" min="0" value="' + (r.estimatedCost || '') + '" inputmode="decimal" readonly></div>';
    h += '<div class="form-group"><label class="form-label">备注</label><input type="text" class="form-input" id="trip-note" placeholder="例如：市区拥堵" value="' + (r.note || '') + '"></div>';
    h += '<div class="modal-footer">';
    if (editRecord) h += '<button class="btn btn-outline" onclick="window._closeModal()">取消编辑</button>';
    h += '<button class="btn btn-primary btn-block" onclick="window._saveTrip(\'' + (r.id || '') + '\')">' + (editRecord ? '保存修改' : '保存记录') + '</button></div>';
    openModal(h);
    setTimeout(function () {
      $$('.trip-odo').forEach(function (inp) { inp.addEventListener('input', autoCalcDistance); });
    }, 100);
  }

  function autoCalcDistance() {
    var sEl = $('#trip-start'), eEl = $('#trip-end'), dEl = $('#trip-distance'), cEl = $('#trip-cost');
    if (!sEl || !eEl || !dEl) return;
    var s = parseFloat(sEl.value), e = parseFloat(eEl.value);
    if (!isNaN(s) && !isNaN(e) && e >= s) {
      var dist = e - s;
      dEl.value = fmtDist(dist);
      var cpk = getCostPerKm();
      if (cpk != null && cEl) cEl.value = fmtMoney(dist * cpk);
    }
  }

  window._saveTrip = function (editId) {
    var date = $('#trip-date').value;
    var name = $('#trip-name').value.trim();
    var startOdo = parseFloat($('#trip-start').value) || 0;
    var endOdo = parseFloat($('#trip-end').value) || 0;
    var dist = parseFloat($('#trip-distance').value) || 0;
    var purpose = $('#trip-purpose').value;
    var cost = parseFloat($('#trip-cost').value) || 0;
    var note = $('#trip-note').value.trim();
    if (!date) { alert('请选择日期'); return; }
    if (dist <= 0) { alert('行驶距离必须大于 0，请填写起止里程'); return; }
    if (editId) {
      updateTripRecord(editId, { id: editId, date: date, name: name, startOdometer: startOdo, endOdometer: endOdo, distance: dist, purpose: purpose, estimatedCost: cost, note: note });
    } else {
      addTripRecord({ id: genId(), date: date, name: name, startOdometer: startOdo, endOdometer: endOdo, distance: dist, purpose: purpose, estimatedCost: cost, note: note });
    }
    closeModal(); refreshCurrentPage();
  };

  // ==================== Render: Statistics ====================
  function renderStatsPage() {
    var monthlyFuel = getMonthlyFuelStats();
    var monthlyDist = getMonthlyDistance();
    var avgConsumption = getAverageConsumption();
    var costPerKm = getCostPerKm();
    var totals = getTotalStats();
    var latestPrice = getLatestFuelPrice();

    var h = '<div class="page active" id="page-stats">';
    h += '<div class="page-head"><h2>统计</h2><div class="subtitle">Analytics</div></div>';

    if (avgConsumption == null && fuelRecords.length > 0) {
      h += '<div class="stats-insufficient">⚠ 数据不足，至少需要两次加满油的记录才能计算真实油耗</div>';
    }
    if (fuelRecords.length === 0) {
      h += '<div class="stats-insufficient">暂无任何数据，请先添加加油记录</div>';
    }

    h += '<div class="stats-grid">';
    h += '<div class="stats-card"><div class="card-title">本月加油金额</div><div class="card-value">¥' + fmtMoney(monthlyFuel.totalAmount) + '</div></div>';
    h += '<div class="stats-card"><div class="card-title">本月加油升数</div><div class="card-value">' + fmtFuel(monthlyFuel.totalLiters) + ' L</div></div>';
    h += '<div class="stats-card"><div class="card-title">本月行驶里程</div><div class="card-value">' + fmtDist(monthlyDist) + ' km</div></div>';
    h += '<div class="stats-card"><div class="card-title">最近一次油价</div><div class="card-value">' + (latestPrice != null ? '¥' + fmtMoney(latestPrice) : '无数据') + '</div></div>';
    h += '<div class="stats-card"><div class="card-title">平均百公里油耗</div><div class="card-value">' + (avgConsumption != null ? fmtFuel(avgConsumption) + ' L/100km' : '数据不足') + '</div></div>';
    h += '<div class="stats-card"><div class="card-title">平均每公里油费</div><div class="card-value">' + (costPerKm != null ? '¥' + fmtMoney(costPerKm) : '数据不足') + '</div></div>';
    h += '<div class="stats-card"><div class="card-title">总加油金额</div><div class="card-value">¥' + fmtMoney(totals.totalAmount) + '</div></div>';
    h += '<div class="stats-card"><div class="card-title">总行驶里程</div><div class="card-value">' + fmtDist(totals.totalDistance) + ' km</div></div>';
    h += '</div>';

    h += '</div>';
    mainContent.innerHTML = h;
  }

  // ==================== Render: Settings ====================
  function renderSettingsPage() {
    var currentTheme = getThemeMode();
    var h = '<div class="page active" id="page-settings">';
    h += '<div class="page-head"><h2>设置</h2><div class="subtitle">Settings</div></div>';

    // Theme section
    h += '<div class="settings-section"><h3>外观</h3>';
    h += '<div class="settings-row"><div class="theme-segmented">';
    h += '<button class="theme-seg-btn' + (currentTheme === 'system' ? ' active' : '') + '" onclick="window._setTheme(\'system\')">跟随系统</button>';
    h += '<button class="theme-seg-btn' + (currentTheme === 'light' ? ' active' : '') + '" onclick="window._setTheme(\'light\')">浅色</button>';
    h += '<button class="theme-seg-btn' + (currentTheme === 'dark' ? ' active' : '') + '" onclick="window._setTheme(\'dark\')">深色</button>';
    h += '</div></div>';
    h += '</div>';

    // Data info
    h += '<div class="settings-section"><h3>数据概况</h3>';
    h += '<div class="settings-row"><span class="settings-label">加油记录</span><span class="settings-value">' + fuelRecords.length + ' 条</span></div>';
    h += '<div class="settings-row"><span class="settings-label">行程记录</span><span class="settings-value">' + tripRecords.length + ' 条</span></div>';
    h += '<div class="settings-row"><span class="settings-label">存储状态</span><span class="settings-value">本地存储</span></div>';
    h += '<div class="settings-row"><span class="settings-label">离线模式</span><span class="settings-value">PWA 已启用</span></div>';
    h += '</div>';

    // Backup
    h += '<div class="settings-section"><h3>数据备份</h3>';
    h += '<div class="settings-btn-row">';
    h += '<button class="btn btn-outline btn-block" onclick="window._exportData()">' + icon('export') + '导出全部数据 (JSON)</button>';
    h += '<button class="btn btn-outline btn-block" onclick="window._importData()">' + icon('import') + '从 JSON 文件导入</button>';
    h += '</div>';
    h += '<input type="file" id="import-file-input" accept=".json" style="display:none" onchange="window._handleImport(event)">';
    h += '</div>';

    // Danger
    h += '<div class="settings-section"><h3 style="color:var(--accent-red)">危险操作</h3>';
    h += '<button class="btn btn-danger btn-block" onclick="window._clearAllData()">' + icon('trash') + '清空全部数据</button>';
    h += '</div>';

    h += '<p class="settings-about">油耗记录助手 · Apple Style<br>数据保存在浏览器本地存储 · PWA 离线可用<br>清除浏览器数据会导致记录丢失，请定期导出 JSON 备份</p>';

    h += '</div>';
    mainContent.innerHTML = h;
  }

  window._exportData = function () {
    dataService.downloadExport('油耗记录备份_' + today() + '.json');
  };

  window._importData = function () { var inp = $('#import-file-input'); if (inp) inp.click(); };

  window._handleImport = function (event) {
    var file = event.target.files[0];
    if (!file) return;
    dataService.readImportFile(file)
      .then(function (data) {
        showConfirm('即将导入 ' + data.fuelRecords.length + ' 条加油记录和 ' + data.tripRecords.length + ' 条行程记录。\n\n⚠ 当前数据将被覆盖，是否继续？', function () {
          applyData(dataService.importData(data));
          alert('导入成功！');
          refreshCurrentPage();
        });
      })
      .catch(function () { alert('文件解析失败，请检查文件格式'); });
    event.target.value = '';
  };

  window._clearAllData = function () {
    showConfirm('⚠ 确定要清空全部数据吗？\n\n此操作不可撤销，建议先导出备份。', function () {
      applyData(dataService.clearAllData());
      navigateTo('home');
    });
  };

  // ==================== Render Dispatch ====================
  function renderPage() {
    var oldFab = document.querySelector('.fab');
    if (oldFab) oldFab.remove();
    switch (currentPage) {
      case 'home': renderHome(); break;
      case 'fuel': renderFuelPage(); break;
      case 'trip': renderTripPage(); break;
      case 'stats': renderStatsPage(); break;
      case 'settings': renderSettingsPage(); break;
    }
  }

  function refreshCurrentPage() { renderPage(); }

  // ==================== Global Exports ====================
  window._closeModal = closeModal;
  window._showFuelForm = function () { showFuelForm(); };
  window._showTripForm = function () { showTripForm(); };
  window._refreshCurrentPage = refreshCurrentPage;

  // ==================== Event Delegation ====================
  document.addEventListener('click', function (e) {
    var navItem = e.target.closest('.nav-item');
    if (navItem) { navigateTo(navItem.dataset.page); return; }

    // Avatar
    if (e.target.closest('#header-avatar')) {
      navigateTo('settings');
      return;
    }

    var editFuel = e.target.closest('[data-action="edit-fuel"]');
    if (editFuel) {
      var eid = editFuel.dataset.id;
      var er = fuelRecords.find(function (r) { return r.id === eid; });
      if (er) showFuelForm(er);
      return;
    }

    var delFuel = e.target.closest('[data-action="delete-fuel"]');
    if (delFuel) {
      var fid = delFuel.dataset.id;
      var fr = fuelRecords.find(function (r) { return r.id === fid; });
      showConfirm('确定要删除 ' + (fr ? fr.date + ' 的加油记录' : '该条加油记录') + ' 吗？', function () {
        deleteFuelRecord(fid); refreshCurrentPage();
      });
      return;
    }

    var editTrip = e.target.closest('[data-action="edit-trip"]');
    if (editTrip) {
      var etid = editTrip.dataset.id;
      var etr = tripRecords.find(function (r) { return r.id === etid; });
      if (etr) showTripForm(etr);
      return;
    }

    var delTrip = e.target.closest('[data-action="delete-trip"]');
    if (delTrip) {
      var tid = delTrip.dataset.id;
      var tr = tripRecords.find(function (r) { return r.id === tid; });
      showConfirm('确定要删除 ' + (tr ? tr.date + ' 的行程记录' : '该条行程记录') + ' 吗？', function () {
        deleteTripRecord(tid); refreshCurrentPage();
      });
      return;
    }
  });

  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) closeModal(); });
  confirmOk.addEventListener('click', function () { if (confirmCallback) confirmCallback(); hideConfirm(); });
  confirmCancel.addEventListener('click', hideConfirm);
  confirmDialog.addEventListener('click', function (e) { if (e.target === confirmDialog) hideConfirm(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!modalOverlay.classList.contains('hidden')) closeModal();
      else if (!confirmDialog.classList.contains('hidden')) hideConfirm();
    }
  });

  window.addEventListener('resize', function () {
    if (currentPage) setTimeout(updateNavPill, 100);
  });

  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== Init ====================
  function init() {
    initTheme();
    loadData();
    updateAvatar();
    navigateTo('home');
    setTimeout(updateNavPill, 200);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
