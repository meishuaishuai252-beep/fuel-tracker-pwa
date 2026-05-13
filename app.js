(function () {
  'use strict';

  // ==================== State ====================
  var fuelRecords = [];
  var tripRecords = [];
  var chargeRecords = [];
  var currentPage = 'home';
  var energyMode = 'fuel';
  var activeEnergyTab = 'fuel';
  var vehicleProfile = null;
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
  var pendingPasteImportData = null;

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
  function getUserInitial(user) {
    var source = '';
    user = user || window.currentUser || {};
    source = user.displayName || user.username || user.name || user.email || localStorage.getItem('displayName') || localStorage.getItem('username') || localStorage.getItem('email') || '';
    source = String(source).trim();
    if (!source) return 'U';
    if (source.indexOf('@') > 0) source = source.split('@')[0];
    return source.charAt(0).toUpperCase();
  }

  function updateAvatar() {
    if (headerAvatar) {
      headerAvatar.textContent = getUserInitial();
    }
  }

  function userAvatarButton() {
    return '<button class="user-avatar-action" type="button" aria-label="用户入口">' + getUserInitial() + '</button>';
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
      charge: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 2h10"/><path d="M9 2v5"/><path d="M15 2v5"/><path d="M8 7h8v5a4 4 0 0 1-8 0V7z"/><path d="M12 16v6"/><path d="M9 22h6"/></svg>',
      energy: '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 10-13h-7l1-7z"/></svg>',
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

  function vehicleVisual(mode) {
    mode = normalizeEnergyMode(mode || energyMode);
    var badge = mode === 'electric' ? 'EV' : (mode === 'hybrid' ? 'HY' : 'ICE');
    var accentClass = 'vehicle-' + mode;
    var extra = mode === 'electric'
      ? '<path class="vehicle-spark" d="M156 34l-10 17h12l-8 17 20-24h-13l7-10z"/>'
      : (mode === 'hybrid'
        ? '<path class="vehicle-leaf" d="M151 45c18-18 34-13 40-8-3 16-17 29-36 23-5 8-11 13-19 16 7-8 12-16 15-31z"/>'
        : '<path class="vehicle-fuel-mark" d="M154 40h22a8 8 0 0 1 8 8v30h-38V48a8 8 0 0 1 8-8zM153 56h24"/>');
    return '<svg class="vehicle-visual ' + accentClass + '" viewBox="0 0 220 132" role="img" aria-label="' + getModeLabel(mode) + '车辆图">' +
      '<defs><linearGradient id="carBody-' + mode + '" x1="28" y1="22" x2="194" y2="110" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--vehicle-body-start)"/><stop offset="1" stop-color="var(--vehicle-body-end)"/></linearGradient><linearGradient id="carGlass-' + mode + '" x1="76" y1="32" x2="144" y2="66"><stop offset="0" stop-color="rgba(255,255,255,.88)"/><stop offset="1" stop-color="rgba(255,255,255,.24)"/></linearGradient></defs>' +
      '<ellipse class="vehicle-shadow" cx="112" cy="108" rx="78" ry="13"/>' +
      '<path class="vehicle-body" d="M28 85c5-20 19-27 41-28l16-21c7-9 18-14 30-14h31c11 0 22 6 28 15l16 23c14 4 22 13 25 26 2 8-4 16-13 16H42c-10 0-17-8-14-17z"/>' +
      '<path class="vehicle-glass" d="M86 57l13-17c4-5 10-8 17-8h25c8 0 15 4 19 11l8 14H86z"/>' +
      '<path class="vehicle-highlight" d="M42 80c33-10 86-13 148-4"/>' +
      '<circle class="vehicle-wheel" cx="70" cy="98" r="17"/><circle class="vehicle-wheel-core" cx="70" cy="98" r="7"/>' +
      '<circle class="vehicle-wheel" cx="168" cy="98" r="17"/><circle class="vehicle-wheel-core" cx="168" cy="98" r="7"/>' +
      '<rect class="vehicle-badge" x="31" y="31" width="43" height="24" rx="12"/><text class="vehicle-badge-text" x="52.5" y="48" text-anchor="middle">' + badge + '</text>' +
      extra +
      '</svg>';
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
    chargeRecords = data.chargeRecords || [];
  }

  function loadData() {
    applyData(dataService.loadData());
    energyMode = dataService.getEnergyMode ? dataService.getEnergyMode() : 'fuel';
    vehicleProfile = dataService.getVehicleProfile ? dataService.getVehicleProfile() : { mode: energyMode, currentOdometer: null, initializedAt: null, updatedAt: null };
    if (vehicleProfile && vehicleProfile.mode && vehicleProfile.mode !== energyMode) {
      energyMode = dataService.setEnergyMode ? dataService.setEnergyMode(vehicleProfile.mode) : vehicleProfile.mode;
    }
    activeEnergyTab = energyMode === 'electric' ? 'charge' : 'fuel';
    updateEnergyNav();
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

  // ==================== Energy Mode ====================
  function normalizeEnergyMode(mode) {
    return ['fuel', 'electric', 'hybrid'].indexOf(mode) >= 0 ? mode : 'fuel';
  }

  function getEnergyPageTitle() {
    if (energyMode === 'electric') return '充电';
    if (energyMode === 'hybrid') return '补能';
    return '加油';
  }

  function getEnergyPageSubtitle() {
    if (energyMode === 'electric') return 'EV Charging';
    if (energyMode === 'hybrid') return 'Energy Refill';
    return 'Fuel Refill';
  }

  function updateEnergyNav() {
    var navLabel = document.querySelector('.nav-item[data-page="fuel"] .nav-label');
    if (navLabel) navLabel.textContent = getEnergyPageTitle();
  }

  function setEnergyMode(mode) {
    energyMode = dataService.setEnergyMode ? dataService.setEnergyMode(mode) : normalizeEnergyMode(mode);
    vehicleProfile = dataService.updateVehicleProfile ? dataService.updateVehicleProfile({ mode: energyMode }) : Object.assign({}, vehicleProfile || {}, { mode: energyMode });
    activeEnergyTab = energyMode === 'electric' ? 'charge' : 'fuel';
    updateEnergyNav();
    refreshCurrentPage();
    setTimeout(updateNavPill, 50);
  }

  // ==================== Navigation ====================
  function navigateTo(page) {
    currentPage = page;
    updateEnergyNav();
    $$('.nav-item').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    var titles = { home: '概览', fuel: getEnergyPageTitle(), trip: '行程', stats: '统计', settings: '设置' };
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

  function getLatestChargeRecord() {
    if (chargeRecords.length === 0) return null;
    return sortByDateDesc(chargeRecords)[0];
  }

  function getLatestTripRecord() {
    if (tripRecords.length === 0) return null;
    return sortByDateDesc(tripRecords)[0];
  }

  function getLatestChargePrice() {
    if (chargeRecords.length === 0) return null;
    return sortByDateDesc(chargeRecords)[0].pricePerKwh || null;
  }

  function getMonthlyChargeStats() {
    var recs = chargeRecords.filter(function (r) { return isCurrentMonth(r.date); });
    return {
      totalAmount: recs.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0),
      totalKwh: recs.reduce(function (s, r) { return s + (Number(r.kwh) || 0); }, 0)
    };
  }

  function getChargeTrendPoints() {
    var sorted = [].concat(chargeRecords).sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    var points = [];
    for (var i = 1; i < sorted.length; i++) {
      var prev = sorted[i - 1], curr = sorted[i];
      var dist = Number(curr.odometer) - Number(prev.odometer);
      var kwh = Number(curr.kwh) || 0;
      if (dist > 0 && kwh > 0) {
        points.push({ date: curr.date, distance: dist, kwh: kwh, amount: Number(curr.amount) || 0, price: Number(curr.pricePerKwh) || 0, consumption: (kwh / dist) * 100, costPerKm: dist > 0 ? (Number(curr.amount) || 0) / dist : 0 });
      }
    }
    return points;
  }

  function getChargeTrendSummary() {
    var points = getChargeTrendPoints();
    if (!points.length) return { points: [], avg: null, latest: null, min: null, max: null, delta: null, totalDistance: 0, totalAmount: 0 };
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

  function getAverageElectricConsumption() {
    var summary = getChargeTrendSummary();
    return summary.avg;
  }

  function getElectricCostPerKm() {
    var avg = getAverageElectricConsumption();
    var price = getLatestChargePrice();
    if (avg == null || price == null) return null;
    return (avg * price) / 100;
  }

  function getHybridCostPerKm() {
    var monthlyDist = getMonthlyDistance();
    var fuel = getMonthlyFuelStats();
    var charge = getMonthlyChargeStats();
    if (!monthlyDist) return null;
    return (fuel.totalAmount + charge.totalAmount) / monthlyDist;
  }

  function getModeLabel(mode) {
    mode = mode || energyMode;
    if (mode === 'electric') return '纯电模式';
    if (mode === 'hybrid') return '油电混合';
    return '燃油模式';
  }

  function getMaxRecordOdometer() {
    var values = [];
    fuelRecords.forEach(function (r) { if (Number(r.odometer) >= 0) values.push(Number(r.odometer)); });
    chargeRecords.forEach(function (r) { if (Number(r.odometer) >= 0) values.push(Number(r.odometer)); });
    tripRecords.forEach(function (r) {
      if (Number(r.startOdometer) >= 0) values.push(Number(r.startOdometer));
      if (Number(r.endOdometer) >= 0) values.push(Number(r.endOdometer));
    });
    return values.length ? Math.max.apply(null, values) : null;
  }

  function getCurrentOdometerInfo() {
    var profile = vehicleProfile || {};
    var profileOdo = Number(profile.currentOdometer);
    var recordOdo = getMaxRecordOdometer();
    var hasProfile = isFinite(profileOdo) && profileOdo >= 0;
    var value = hasProfile ? profileOdo : null;
    var source = hasProfile ? 'profile' : 'none';
    if (recordOdo != null && (!hasProfile || recordOdo > value)) {
      value = recordOdo;
      source = 'records';
    }
    return {
      value: value,
      source: source,
      updatedAt: profile.updatedAt || profile.initializedAt || null
    };
  }

  function formatOdometer(value) {
    return value == null ? '待设置' : Math.round(Number(value)).toLocaleString('en-US');
  }

  function shouldShowOdometerInit() {
    var profile = vehicleProfile || {};
    return profile.currentOdometer == null && getMaxRecordOdometer() == null && !profile.skippedOdometerInit;
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

  function renderTrendChart(summary, options) {
    options = options || {};
    var emptyTitle = options.emptyTitle || '油耗趋势等待生成';
    var emptyText = options.emptyText || '至少添加两次带里程和升数的加油记录后，将显示真实油耗曲线、均线、最高/最低和成本变化。';
    var aria = options.aria || '油耗变化趋势图';
    var avgPrefix = options.avgPrefix || '均 ';
    if (!summary.points.length) {
      return '<div class="trend-empty"><strong>' + emptyTitle + '</strong><span>' + emptyText + '</span></div>';
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
    return '<div class="trend-graph" role="img" aria-label="' + aria + '">' +
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
      '<text class="avg-label" x="' + (w - right - 46) + '" y="' + (Number(avgY) - 6) + '">' + avgPrefix + fmtFuel(summary.avg) + '</text>' +
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
  function addChargeRecord(record) { applyData(dataService.addChargeRecord(record)); }
  function updateChargeRecord(id, record) { applyData(dataService.updateChargeRecord(id, record)); }
  function deleteChargeRecord(id) { applyData(dataService.deleteChargeRecord(id)); }

  // ==================== Render: Home ====================
  function renderHome() {
    var costPerKm = getCostPerKm();
    var avgConsumption = getAverageConsumption();
    var latestPrice = getLatestFuelPrice();
    var monthlyFuel = getMonthlyFuelStats();
    var monthlyDist = getMonthlyDistance();
    var latestFuel = getLatestFuelRecord();
    var latestTrip = getLatestTripRecord();
    var totals = getTotalStats();
    var trend = getTrendSummary();
    var confidence = getFuelConfidence();
    var effectiveAvg = avgConsumption != null ? avgConsumption : trend.avg;
    var effectiveCost = costPerKm != null ? costPerKm : (effectiveAvg != null && latestPrice != null ? (effectiveAvg * latestPrice) / 100 : null);

    var h = '<div class="page active" id="page-home">';
    h += '<div class="page-head home-head"><div><h2>概览</h2><div class="subtitle">Fuel Overview</div></div>' + userAvatarButton() + '</div>';

    h += '<section class="ios-hero-card">';
    h += '<div class="hero-card-top"><div><span class="hero-kicker">本月油费</span><strong>¥' + fmtMoney(monthlyFuel.totalAmount) + '</strong><small>' + monthLabel() + ' · ' + fuelRecords.filter(function (r) { return isCurrentMonth(r.date); }).length + ' 笔记录</small></div><div class="hero-pump">' + icon('fuel') + '</div></div>';
    h += '<div class="hero-metrics">';
    h += '<div><span>平均油耗</span><strong>' + (effectiveAvg != null ? fmtFuel(effectiveAvg) : '—') + '</strong><small>L/100km</small></div>';
    h += '<div><span>每公里成本</span><strong>' + (effectiveCost != null ? '¥' + fmtMoney(effectiveCost) : '—') + '</strong><small>/km</small></div>';
    h += '<div><span>本月油量</span><strong>' + fmtFuel(monthlyFuel.totalLiters) + '</strong><small>L</small></div>';
    h += '</div></section>';

    h += '<div class="quick-actions">';
    h += '<button class="btn-action" onclick="window._showFuelForm()"><span class="action-icon action-fuel">' + icon('fuel') + '</span><span>记录加油</span></button>';
    h += '<button class="btn-action" onclick="window._showTripForm()"><span class="action-icon action-trip">' + icon('route') + '</span><span>记录行程</span></button>';
    h += '</div>';

    h += '<div class="ios-card-grid">';
    h += '<div class="ios-mini-card"><span class="mini-icon blue">' + icon('gauge') + '</span><div><small>本月行驶</small><strong>' + fmtDist(monthlyDist) + '</strong><em>km</em></div></div>';
    h += '<div class="ios-mini-card"><span class="mini-icon green">' + icon('fuel') + '</span><div><small>最近油价</small><strong>' + (latestPrice != null ? '¥' + fmtMoney(latestPrice) : '—') + '</strong><em>/L</em></div></div>';
    h += '<div class="ios-mini-card"><span class="mini-icon orange">' + icon('cost') + '</span><div><small>累计油费</small><strong>¥' + fmtMoney(totals.totalAmount) + '</strong><em>元</em></div></div>';
    h += '<div class="ios-mini-card"><span class="mini-icon purple">' + icon('route') + '</span><div><small>最近行程</small><strong>' + (latestTrip ? fmtDist(latestTrip.distance) : '—') + '</strong><em>km</em></div></div>';
    h += '</div>';

    h += '<section class="trend-card"><div class="section-head"><strong>油耗变化趋势</strong><span>' + confidence.label + '</span></div>';
    h += renderTrendChart(trend);
    h += '<div class="trend-insights">';
    h += '<div><span>最近一次</span><strong>' + (trend.latest ? fmtFuel(trend.latest.consumption) : '—') + '</strong><small>L/100km</small></div>';
    h += '<div><span>平均</span><strong>' + (trend.avg ? fmtFuel(trend.avg) : '—') + '</strong><small>L/100km</small></div>';
    h += '<div><span>置信度</span><strong>' + confidence.label + '</strong><small>' + confidence.detail + '</small></div>';
    h += '</div></section>';

    h += '<div class="ios-list-card">';
    h += '<div class="ios-list-row"><span class="list-icon fuel">' + icon('fuel') + '</span><div class="latest-info"><div class="latest-label">最近一次加油</div>';
    if (latestFuel) {
      h += '<div class="latest-detail">' + latestFuel.date + ' · ' + fmtFuel(latestFuel.liters) + ' L · ¥' + fmtMoney(latestFuel.amount) + '</div></div><div class="latest-value">¥' + fmtMoney(latestFuel.amount) + '</div><span class="chevron">›</span>';
    } else {
      h += '<div class="latest-detail">暂无记录</div></div><div class="latest-value no-data">—</div><span class="chevron">›</span>';
    }
    h += '</div>';

    h += '<div class="ios-list-row"><span class="list-icon trip">' + icon('route') + '</span><div class="latest-info"><div class="latest-label">最近一次行程</div>';
    if (latestTrip) {
      h += '<div class="latest-detail">' + latestTrip.date + ' · ' + (latestTrip.name || latestTrip.purpose || '未命名') + '</div></div><div class="latest-value">' + fmtDist(latestTrip.distance) + ' km</div>';
    } else {
      h += '<div class="latest-detail">暂无记录</div></div><div class="latest-value no-data">—</div>';
    }
    h += '<span class="chevron">›</span></div>';

    h += '</div>';
    mainContent.innerHTML = h;
  }

  function renderEnergyHome() {
    var monthlyFuel = getMonthlyFuelStats();
    var monthlyCharge = getMonthlyChargeStats();
    var monthlyDist = getMonthlyDistance();
    var latestFuel = getLatestFuelRecord();
    var latestCharge = getLatestChargeRecord();
    var latestTrip = getLatestTripRecord();
    var fuelTrend = getTrendSummary();
    var chargeTrend = getChargeTrendSummary();
    var latestFuelPrice = getLatestFuelPrice();
    var latestChargePrice = getLatestChargePrice();
    var fuelCost = getCostPerKm();
    var electricCost = getElectricCostPerKm();
    var hybridCost = getHybridCostPerKm();
    var odoInfo = getCurrentOdometerInfo();
    var primaryAvg = energyMode === 'electric' ? chargeTrend.avg : fuelTrend.avg;
    var primaryCost = energyMode === 'electric' ? electricCost : (energyMode === 'hybrid' ? hybridCost : fuelCost);
    var primaryUnit = energyMode === 'electric' ? 'kWh/100km' : (energyMode === 'hybrid' ? '综合 /km' : 'L/100km');
    var h = '<div class="page active" id="page-home">';

    h += '<div class="page-head home-head"><div><h2>概览</h2><div class="subtitle">Energy Overview</div></div>' + userAvatarButton() + '</div>';
    h += '<section class="ios-hero-card energy-mode-' + energyMode + '">';
    h += '<div class="hero-card-top vehicle-hero-top"><div class="vehicle-hero-copy"><span class="hero-kicker">当前总里程</span><span class="hero-subtitle-en">Current Odometer</span><strong class="odometer-value">' + formatOdometer(odoInfo.value) + '</strong>' + (odoInfo.value == null ? '' : '<span class="hero-odometer-unit">km</span>') + '<small>' + (odoInfo.value == null ? '未初始化 · 可在设置中填写' : getModeLabel() + ' · ' + (odoInfo.source === 'records' ? '来自最新记录' : '车辆信息')) + '</small></div><div class="hero-vehicle">' + vehicleVisual(energyMode) + '</div></div>';
    h += '<div class="hero-metrics">';
    h += '<div><span>本月行驶</span><strong>' + fmtDist(monthlyDist) + '</strong><small>km</small></div>';
    h += '<div><span>' + (energyMode === 'electric' ? '每公里电费' : (energyMode === 'hybrid' ? '综合成本' : '每公里油费')) + '</span><strong>' + (primaryCost != null ? '¥' + fmtMoney(primaryCost) : '—') + '</strong><small>/km</small></div>';
    h += '<div><span>' + (energyMode === 'electric' ? '平均电耗' : (energyMode === 'hybrid' ? '本月总费用' : '平均油耗')) + '</span><strong>' + (energyMode === 'hybrid' ? '¥' + fmtMoney(monthlyFuel.totalAmount + monthlyCharge.totalAmount) : (primaryAvg != null ? fmtFuel(primaryAvg) : '—')) + '</strong><small>' + primaryUnit + '</small></div>';
    h += '</div></section>';

    h += '<div class="quick-actions">';
    h += '<button class="btn-action" onclick="window._showEnergyForm()"><span class="action-icon ' + (energyMode === 'electric' ? 'action-charge' : 'action-fuel') + '">' + (energyMode === 'electric' ? icon('charge') : icon('fuel')) + '</span><span>记录' + getEnergyPageTitle() + '</span></button>';
    h += '<button class="btn-action" onclick="window._showTripForm()"><span class="action-icon action-trip">' + icon('route') + '</span><span>记录行程</span></button>';
    h += '</div>';

    h += '<div class="ios-card-grid">';
    h += '<div class="ios-mini-card"><span class="mini-icon blue">' + icon('gauge') + '</span><div><small>本月行驶</small><strong>' + fmtDist(monthlyDist) + '</strong><em>km</em></div></div>';
    if (energyMode === 'electric') {
      h += '<div class="ios-mini-card"><span class="mini-icon green">' + icon('charge') + '</span><div><small>最近电价</small><strong>' + (latestChargePrice != null ? '¥' + fmtMoney(latestChargePrice) : '—') + '</strong><em>/kWh</em></div></div>';
      h += '<div class="ios-mini-card"><span class="mini-icon orange">' + icon('cost') + '</span><div><small>累计电费</small><strong>¥' + fmtMoney(chargeRecords.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0)) + '</strong><em>元</em></div></div>';
    } else if (energyMode === 'hybrid') {
      h += '<div class="ios-mini-card"><span class="mini-icon green">' + icon('fuel') + '</span><div><small>本月油费</small><strong>¥' + fmtMoney(monthlyFuel.totalAmount) + '</strong><em>元</em></div></div>';
      h += '<div class="ios-mini-card"><span class="mini-icon orange">' + icon('charge') + '</span><div><small>本月电费</small><strong>¥' + fmtMoney(monthlyCharge.totalAmount) + '</strong><em>元</em></div></div>';
    } else {
      h += '<div class="ios-mini-card"><span class="mini-icon green">' + icon('fuel') + '</span><div><small>最近油价</small><strong>' + (latestFuelPrice != null ? '¥' + fmtMoney(latestFuelPrice) : '—') + '</strong><em>/L</em></div></div>';
      h += '<div class="ios-mini-card"><span class="mini-icon orange">' + icon('cost') + '</span><div><small>累计油费</small><strong>¥' + fmtMoney(fuelRecords.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0)) + '</strong><em>元</em></div></div>';
    }
    h += '<div class="ios-mini-card"><span class="mini-icon purple">' + icon('route') + '</span><div><small>最近行程</small><strong>' + (latestTrip ? fmtDist(latestTrip.distance) : '—') + '</strong><em>km</em></div></div>';
    h += '</div>';

    h += renderEnergyTrendSection();
    h += renderEnergyLatestList(latestFuel, latestCharge, latestTrip);
    h += '</div>';
    mainContent.innerHTML = h;
  }

  function renderEnergyTrendSection() {
    var fuelTrend = getTrendSummary();
    var chargeTrend = getChargeTrendSummary();
    if (energyMode === 'electric') {
      return '<section class="trend-card"><div class="section-head"><strong>电耗变化趋势</strong><span>' + (chargeTrend.points.length ? '持续记录' : '等待更多记录') + '</span></div>' +
        renderTrendChart(chargeTrend, { emptyTitle: '电耗趋势等待生成', emptyText: '至少添加两次带里程和度数的充电记录后，将显示真实电耗曲线和成本变化。', aria: '电耗变化趋势图' }) +
        '<div class="trend-insights"><div><span>最近一次</span><strong>' + (chargeTrend.latest ? fmtFuel(chargeTrend.latest.consumption) : '—') + '</strong><small>kWh/100km</small></div><div><span>平均</span><strong>' + (chargeTrend.avg ? fmtFuel(chargeTrend.avg) : '—') + '</strong><small>kWh/100km</small></div><div><span>状态</span><strong>' + (chargeTrend.points.length ? '可计算' : '数据不足') + '</strong><small>至少两次充电记录</small></div></div></section>';
    }
    if (energyMode === 'hybrid') {
      var cost = getHybridCostPerKm();
      return '<section class="trend-card"><div class="section-head"><strong>综合成本统计</strong><span>' + (cost != null ? '本月可用' : '等待行程') + '</span></div>' +
        '<div class="trend-empty"><strong>' + (cost != null ? '每公里综合成本 ¥' + fmtMoney(cost) : '等待更多记录') + '</strong><span>混动模式会同时保留油耗和电耗记录，并用本月油费、电费和行程里程估算综合成本。</span></div>' +
        '<div class="trend-insights"><div><span>油耗点</span><strong>' + fuelTrend.points.length + '</strong><small>records</small></div><div><span>电耗点</span><strong>' + chargeTrend.points.length + '</strong><small>records</small></div><div><span>综合成本</span><strong>' + (cost != null ? '¥' + fmtMoney(cost) : '—') + '</strong><small>/km</small></div></div></section>';
    }
    return '<section class="trend-card"><div class="section-head"><strong>油耗变化趋势</strong><span>' + getFuelConfidence().label + '</span></div>' +
      renderTrendChart(fuelTrend) +
      '<div class="trend-insights"><div><span>最近一次</span><strong>' + (fuelTrend.latest ? fmtFuel(fuelTrend.latest.consumption) : '—') + '</strong><small>L/100km</small></div><div><span>平均</span><strong>' + (fuelTrend.avg ? fmtFuel(fuelTrend.avg) : '—') + '</strong><small>L/100km</small></div><div><span>状态</span><strong>' + getFuelConfidence().label + '</strong><small>' + getFuelConfidence().detail + '</small></div></div></section>';
  }

  function renderEnergyLatestList(latestFuel, latestCharge, latestTrip) {
    var h = '<div class="ios-list-card">';
    if (energyMode !== 'electric') {
      h += '<div class="ios-list-row"><span class="list-icon fuel">' + icon('fuel') + '</span><div class="latest-info"><div class="latest-label">最近一次加油</div>';
      h += latestFuel ? '<div class="latest-detail">' + latestFuel.date + ' · ' + fmtFuel(latestFuel.liters) + ' L · ¥' + fmtMoney(latestFuel.amount) + '</div></div><div class="latest-value">¥' + fmtMoney(latestFuel.amount) + '</div>' : '<div class="latest-detail">暂无记录</div></div><div class="latest-value no-data">—</div>';
      h += '<span class="chevron">›</span></div>';
    }
    if (energyMode !== 'fuel') {
      h += '<div class="ios-list-row"><span class="list-icon charge">' + icon('charge') + '</span><div class="latest-info"><div class="latest-label">最近一次充电</div>';
      h += latestCharge ? '<div class="latest-detail">' + latestCharge.date + ' · ' + fmtFuel(latestCharge.kwh) + ' kWh · ¥' + fmtMoney(latestCharge.amount) + '</div></div><div class="latest-value">¥' + fmtMoney(latestCharge.amount) + '</div>' : '<div class="latest-detail">暂无记录</div></div><div class="latest-value no-data">—</div>';
      h += '<span class="chevron">›</span></div>';
    }
    h += '<div class="ios-list-row"><span class="list-icon trip">' + icon('route') + '</span><div class="latest-info"><div class="latest-label">最近一次行程</div>';
    h += latestTrip ? '<div class="latest-detail">' + latestTrip.date + ' · ' + escHtml(latestTrip.name || latestTrip.purpose || '未命名') + '</div></div><div class="latest-value">' + fmtDist(latestTrip.distance) + ' km</div>' : '<div class="latest-detail">暂无记录</div></div><div class="latest-value no-data">—</div>';
    h += '<span class="chevron">›</span></div></div>';
    return h;
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

  function renderEnergyPage() {
    var mode = energyMode;
    var showing = mode === 'electric' ? 'charge' : activeEnergyTab;
    if (mode === 'fuel') showing = 'fuel';
    if (mode === 'hybrid' && showing !== 'charge') showing = 'fuel';
    var records = showing === 'charge' ? sortByDateDesc(chargeRecords) : sortByDateDesc(fuelRecords);
    var h = '<div class="page active" id="page-fuel">';
    h += '<div class="page-head"><h2>' + getEnergyPageTitle() + '</h2><div class="subtitle">' + getEnergyPageSubtitle() + '</div></div>';
    if (mode === 'hybrid') {
      h += '<div class="energy-segmented"><button class="theme-seg-btn' + (showing === 'fuel' ? ' active' : '') + '" onclick="window._setEnergyTab(\'fuel\')">加油</button><button class="theme-seg-btn' + (showing === 'charge' ? ' active' : '') + '" onclick="window._setEnergyTab(\'charge\')">充电</button></div>';
    }
    if (records.length === 0) {
      h += '<div class="empty-state"><div class="empty-state-icon">' + (showing === 'charge' ? icon('charge') : icon('fuel')) + '</div><p>还没有' + (showing === 'charge' ? '充电' : '加油') + '记录</p><button class="btn btn-primary btn-sm" onclick="' + (showing === 'charge' ? 'window._showChargeForm()' : 'window._showFuelForm()') + '">新增' + (showing === 'charge' ? '充电' : '加油') + '记录</button></div>';
    } else {
      h += '<div class="record-list">';
      records.forEach(function (r) { h += showing === 'charge' ? renderChargeItem(r) : renderFuelItem(r); });
      h += '</div>';
    }
    h += '</div>';
    mainContent.innerHTML = h;

    var fab = document.createElement('button');
    fab.className = 'fab'; fab.textContent = '+';
    fab.onclick = function () { showing === 'charge' ? showChargeForm() : showFuelForm(); };
    document.body.appendChild(fab);
  }

  function renderChargeItem(r) {
    var h = '<div class="record-item" data-id="' + r.id + '">';
    h += '<div class="record-header"><span class="record-date">' + r.date;
    if (r.chargeType) h += '<span class="badge-full">' + escHtml(r.chargeType) + '</span>';
    h += '</span><div class="record-actions"><button class="record-edit" data-action="edit-charge" data-id="' + r.id + '">编辑</button><button class="record-delete" data-action="delete-charge" data-id="' + r.id + '">删除</button></div></div>';
    h += '<div class="record-details">';
    h += '<div class="record-detail">里程 <span>' + fmtDist(r.odometer) + ' km</span></div>';
    h += '<div class="record-detail">金额 <span>¥' + fmtMoney(r.amount) + '</span></div>';
    h += '<div class="record-detail">电量 <span>' + fmtFuel(r.kwh) + ' kWh</span></div>';
    h += '<div class="record-detail">电价 <span>¥' + fmtMoney(r.pricePerKwh) + '/kWh</span></div>';
    if (r.socStart || r.socEnd) h += '<div class="record-detail">电量区间 <span>' + (r.socStart || 0) + '% → ' + (r.socEnd || 0) + '%</span></div>';
    h += '</div>';
    if (r.note) h += '<div class="record-note">' + escHtml(r.note) + '</div>';
    h += '</div>';
    return h;
  }

  function showChargeForm(editRecord) {
    var r = editRecord || {};
    var h = '<div class="modal-header"><h2>' + icon('charge') + (editRecord ? '编辑充电记录' : '新增充电记录') + '</h2><button class="modal-close" onclick="window._closeModal()" aria-label="关闭">×</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="charge-date" value="' + (r.date || today()) + '"></div>';
    h += '<div class="form-group"><label class="form-label">当前总里程 (km)</label><input type="number" class="form-input" id="charge-odo" placeholder="例如 28600" step="0.1" min="0" value="' + (r.odometer || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">充电金额 (元)</label><input type="number" class="form-input charge-calc" id="charge-amount" placeholder="例如 48.5" step="0.01" min="0" value="' + (r.amount || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">充电度数 (kWh)</label><input type="number" class="form-input charge-calc" id="charge-kwh" placeholder="例如 36.2" step="0.01" min="0" value="' + (r.kwh || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">电价 (元/kWh)</label><input type="number" class="form-input charge-calc" id="charge-price" placeholder="自动计算或手动输入" step="0.01" min="0" value="' + (r.pricePerKwh || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-hint">填写金额和度数可自动计算电价；填写度数和电价可自动计算金额。</div>';
    h += '<div class="form-row"><div class="form-group"><label class="form-label">充电类型</label><select class="form-input" id="charge-type"><option value="快充"' + (r.chargeType === '快充' ? ' selected' : '') + '>快充</option><option value="慢充"' + (r.chargeType === '慢充' ? ' selected' : '') + '>慢充</option><option value="家充"' + (r.chargeType === '家充' ? ' selected' : '') + '>家充</option><option value="其他"' + (r.chargeType === '其他' ? ' selected' : '') + '>其他</option></select></div>';
    h += '<div class="form-group"><label class="form-label">起始电量 (%)</label><input type="number" class="form-input" id="charge-soc-start" min="0" max="100" step="1" value="' + (r.socStart || '') + '" inputmode="numeric"></div></div>';
    h += '<div class="form-group"><label class="form-label">结束电量 (%)</label><input type="number" class="form-input" id="charge-soc-end" min="0" max="100" step="1" value="' + (r.socEnd || '') + '" inputmode="numeric"></div>';
    h += '<div class="form-group"><label class="form-label">备注</label><input type="text" class="form-input" id="charge-note" placeholder="例如：高速服务区快充" value="' + (r.note || '') + '"></div>';
    h += '<div class="modal-footer">';
    if (editRecord) h += '<button class="btn btn-outline" onclick="window._closeModal()">取消编辑</button>';
    h += '<button class="btn btn-primary btn-block" onclick="window._saveCharge(\'' + (r.id || '') + '\')">' + (editRecord ? '保存修改' : '保存记录') + '</button></div>';
    openModal(h);
    setTimeout(function () {
      $$('.charge-calc').forEach(function (inp) { inp.addEventListener('input', autoCalcCharge); });
    }, 100);
  }

  function autoCalcCharge() {
    var amtEl = $('#charge-amount'), kwhEl = $('#charge-kwh'), prcEl = $('#charge-price');
    if (!amtEl || !kwhEl || !prcEl) return;
    var amt = parseFloat(amtEl.value), kwh = parseFloat(kwhEl.value), prc = parseFloat(prcEl.value);
    if (amtEl.value && kwhEl.value && !isNaN(amt) && !isNaN(kwh) && kwh > 0) prcEl.value = fmtMoney(amt / kwh);
    else if (kwhEl.value && prcEl.value && !isNaN(kwh) && !isNaN(prc)) amtEl.value = fmtMoney(kwh * prc);
  }

  window._saveCharge = function (editId) {
    var date = $('#charge-date').value;
    var odo = parseFloat($('#charge-odo').value);
    var amt = parseFloat($('#charge-amount').value) || 0;
    var kwh = parseFloat($('#charge-kwh').value) || 0;
    var prc = parseFloat($('#charge-price').value) || 0;
    var type = $('#charge-type').value;
    var socStart = parseFloat($('#charge-soc-start').value) || 0;
    var socEnd = parseFloat($('#charge-soc-end').value) || 0;
    var note = $('#charge-note').value.trim();
    if (!date) { alert('请选择日期'); return; }
    if (isNaN(odo) || odo < 0) { alert('请输入有效的里程数'); return; }
    if (amt === 0 && kwh === 0) { alert('请至少填写金额或度数'); return; }
    var record = { id: editId || genId(), date: date, odometer: odo, amount: amt, kwh: kwh, pricePerKwh: prc, chargeType: type, socStart: socStart, socEnd: socEnd, note: note };
    if (editId) updateChargeRecord(editId, record);
    else addChargeRecord(record);
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

  function renderEnergyStatsPage() {
    var monthlyFuel = getMonthlyFuelStats();
    var monthlyCharge = getMonthlyChargeStats();
    var monthlyDist = getMonthlyDistance();
    var fuelTrend = getTrendSummary();
    var chargeTrend = getChargeTrendSummary();
    var h = '<div class="page active" id="page-stats">';
    h += '<div class="page-head"><h2>统计</h2><div class="subtitle">Analytics</div></div>';

    if (energyMode === 'fuel') {
      h += '<section class="trend-card"><div class="section-head"><strong>油耗趋势</strong><span>' + getFuelConfidence().label + '</span></div>' + renderTrendChart(fuelTrend) + '</section>';
      h += '<div class="stats-grid">';
      h += '<div class="stats-card"><div class="card-title">本月油费</div><div class="card-value">¥' + fmtMoney(monthlyFuel.totalAmount) + '</div></div>';
      h += '<div class="stats-card"><div class="card-title">本月加油</div><div class="card-value">' + fmtFuel(monthlyFuel.totalLiters) + ' L</div></div>';
      h += '<div class="stats-card"><div class="card-title">平均油耗</div><div class="card-value">' + (fuelTrend.avg != null ? fmtFuel(fuelTrend.avg) + ' L/100km' : '数据不足') + '</div></div>';
      h += '<div class="stats-card"><div class="card-title">每公里油费</div><div class="card-value">' + (getCostPerKm() != null ? '¥' + fmtMoney(getCostPerKm()) : '数据不足') + '</div></div>';
      h += '</div>';
    } else if (energyMode === 'electric') {
      h += '<section class="trend-card"><div class="section-head"><strong>电耗趋势</strong><span>' + (chargeTrend.points.length ? '可计算' : '等待更多记录') + '</span></div>' + renderTrendChart(chargeTrend, { emptyTitle: '电耗趋势等待生成', emptyText: '至少两次连续充电记录才能计算真实百公里电耗。', aria: '电耗变化趋势图' }) + '</section>';
      h += '<div class="stats-grid">';
      h += '<div class="stats-card"><div class="card-title">本月电费</div><div class="card-value">¥' + fmtMoney(monthlyCharge.totalAmount) + '</div></div>';
      h += '<div class="stats-card"><div class="card-title">本月充电</div><div class="card-value">' + fmtFuel(monthlyCharge.totalKwh) + ' kWh</div></div>';
      h += '<div class="stats-card"><div class="card-title">平均电耗</div><div class="card-value">' + (chargeTrend.avg != null ? fmtFuel(chargeTrend.avg) + ' kWh/100km' : '数据不足') + '</div></div>';
      h += '<div class="stats-card"><div class="card-title">每公里电费</div><div class="card-value">' + (getElectricCostPerKm() != null ? '¥' + fmtMoney(getElectricCostPerKm()) : '数据不足') + '</div></div>';
      h += '</div>';
    } else {
      var hybridCost = getHybridCostPerKm();
      h += '<section class="trend-card"><div class="section-head"><strong>综合成本</strong><span>' + (hybridCost != null ? '本月可用' : '等待行程') + '</span></div><div class="trend-empty"><strong>' + (hybridCost != null ? '¥' + fmtMoney(hybridCost) + ' / km' : '等待更多记录') + '</strong><span>混动统计会同时保留油耗、电耗和本月总能耗费用。</span></div></section>';
      h += '<div class="stats-grid">';
      h += '<div class="stats-card"><div class="card-title">本月总费用</div><div class="card-value">¥' + fmtMoney(monthlyFuel.totalAmount + monthlyCharge.totalAmount) + '</div></div>';
      h += '<div class="stats-card"><div class="card-title">本月油费</div><div class="card-value">¥' + fmtMoney(monthlyFuel.totalAmount) + '</div></div>';
      h += '<div class="stats-card"><div class="card-title">本月电费</div><div class="card-value">¥' + fmtMoney(monthlyCharge.totalAmount) + '</div></div>';
      h += '<div class="stats-card"><div class="card-title">本月行驶</div><div class="card-value">' + fmtDist(monthlyDist) + ' km</div></div>';
      h += '<div class="stats-card"><div class="card-title">平均油耗</div><div class="card-value">' + (fuelTrend.avg != null ? fmtFuel(fuelTrend.avg) + ' L/100km' : '数据不足') + '</div></div>';
      h += '<div class="stats-card"><div class="card-title">平均电耗</div><div class="card-value">' + (chargeTrend.avg != null ? fmtFuel(chargeTrend.avg) + ' kWh/100km' : '数据不足') + '</div></div>';
      h += '</div>';
    }
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

    // Vehicle profile
    var odoInfo = getCurrentOdometerInfo();
    h += '<div class="settings-section"><h3>车辆信息</h3>';
    h += '<div class="settings-row"><div class="theme-segmented energy-mode-control">';
    h += '<button class="theme-seg-btn' + (energyMode === 'fuel' ? ' active' : '') + '" onclick="window._setEnergyMode(\'fuel\')">燃油模式</button>';
    h += '<button class="theme-seg-btn' + (energyMode === 'electric' ? ' active' : '') + '" onclick="window._setEnergyMode(\'electric\')">纯电模式</button>';
    h += '<button class="theme-seg-btn' + (energyMode === 'hybrid' ? ' active' : '') + '" onclick="window._setEnergyMode(\'hybrid\')">油电混合</button>';
    h += '</div></div>';
    h += '<div class="settings-row vehicle-odometer-row"><label class="settings-label" for="vehicle-odometer">当前总里程</label><div class="vehicle-odometer-input"><input id="vehicle-odometer" class="form-input" type="number" min="0" step="1" inputmode="numeric" value="' + (odoInfo.value != null ? Math.round(odoInfo.value) : '') + '" placeholder="例如 23680"><span>km</span></div></div>';
    h += '<div class="settings-btn-row"><button class="btn btn-primary btn-block" onclick="window._saveVehicleSettings()">保存车辆信息</button></div>';
    h += '</div>';

    // Data info
    h += '<div class="settings-section"><h3>数据概况</h3>';
    h += '<div class="settings-row"><span class="settings-label">加油记录</span><span class="settings-value">' + fuelRecords.length + ' 条</span></div>';
    h += '<div class="settings-row"><span class="settings-label">充电记录</span><span class="settings-value">' + chargeRecords.length + ' 条</span></div>';
    h += '<div class="settings-row"><span class="settings-label">行程记录</span><span class="settings-value">' + tripRecords.length + ' 条</span></div>';
    h += '<div class="settings-row"><span class="settings-label">存储状态</span><span class="settings-value">本地存储</span></div>';
    h += '<div class="settings-row"><span class="settings-label">离线模式</span><span class="settings-value">PWA 已启用</span></div>';
    h += '</div>';

    // Backup
    h += '<div class="settings-section"><h3>数据备份</h3>';
    h += '<p class="settings-help">安卓 PWA 或部分浏览器可能限制文件导入/下载。若文件方式失败，请优先使用复制备份文本和粘贴备份恢复。</p>';
    h += '<div class="settings-btn-row">';
    h += '<button class="btn btn-primary btn-block" onclick="window._copyBackupText()">' + icon('export') + '复制备份文本</button>';
    h += '<button class="btn btn-outline btn-block" onclick="window._showPasteImport()">' + icon('import') + '粘贴备份恢复</button>';
    h += '<button class="btn btn-outline btn-block" onclick="window._exportData()">' + icon('export') + '导出全部数据 (JSON)</button>';
    h += '<button class="btn btn-outline btn-block" onclick="window._importData()">' + icon('import') + '从 JSON 文件导入</button>';
    h += '</div>';
    h += '<input type="file" id="import-file-input" accept=".json,application/json,text/json,text/plain,*/*" style="position:fixed;left:-9999px;top:auto;width:1px;height:1px;opacity:0" onchange="window._handleImport(event)">';
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
    var ok = dataService.downloadExport('油耗记录备份_' + today() + '.json');
    if (!ok) {
      alert('文件下载失败，请使用“复制备份文本”。');
      showManualBackupText('自动下载失败，请手动复制下方备份文本。');
    }
  };

  window._importData = function () {
    var inp = $('#import-file-input');
    if (!inp) {
      alert('无法打开文件选择器，请使用“粘贴备份恢复”。');
      return;
    }
    try {
      inp.click();
    } catch (e) {
      alert('无法打开文件选择器，请使用“粘贴备份恢复”。');
    }
  };

  function getBackupText() {
    return dataService.createExportText ? dataService.createExportText() : JSON.stringify(dataService.createExportData(), null, 2);
  }

  window._copyBackupText = function () {
    var text = getBackupText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () {
          alert('备份文本已复制，可粘贴到微信、备忘录或文件中保存。');
        })
        .catch(function () {
          showManualBackupText('自动复制失败，请手动复制下方备份文本。');
        });
    } else {
      showManualBackupText('当前浏览器不支持自动复制，请手动复制下方备份文本。');
    }
  };

  function showManualBackupText(message) {
    var text = getBackupText();
    var h = '<div class="modal-header"><h2>' + icon('export') + '手动复制备份</h2><button class="modal-close" onclick="window._closeModal()" aria-label="关闭">×</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="form-hint">' + message + '</div>';
    h += '<div class="form-group"><label class="form-label">完整备份 JSON</label><textarea class="form-input import-json-textarea backup-json-textarea" id="backup-json-text" readonly spellcheck="false"></textarea></div>';
    h += '<div class="modal-footer"><button class="btn btn-outline" onclick="window._selectBackupText()">全选文本</button><button class="btn btn-primary btn-block" onclick="window._closeModal()">关闭</button></div>';
    openModal(h);
    var ta = $('#backup-json-text');
    if (ta) ta.value = text;
  }

  window._selectBackupText = function () {
    var ta = $('#backup-json-text');
    if (!ta) return;
    ta.focus();
    ta.select();
    if (ta.setSelectionRange) ta.setSelectionRange(0, ta.value.length);
  };

  function applyImportedDataWithConfirm(data) {
    showConfirm('即将导入 ' + data.fuelRecords.length + ' 条加油记录、' + data.chargeRecords.length + ' 条充电记录和 ' + data.tripRecords.length + ' 条行程记录。\n\n⚠ 当前数据将被覆盖，是否继续？', function () {
      applyData(dataService.importData(data));
      energyMode = dataService.getEnergyMode ? dataService.getEnergyMode() : 'fuel';
      vehicleProfile = dataService.getVehicleProfile ? dataService.getVehicleProfile() : vehicleProfile;
      activeEnergyTab = energyMode === 'electric' ? 'charge' : 'fuel';
      updateEnergyNav();
      closeModal();
      alert('导入成功！');
      refreshCurrentPage();
    });
  }

  window._handleImport = function (event) {
    var file = event.target.files[0];
    if (!file) return;
    dataService.readImportFile(file)
      .then(function (data) {
        applyImportedDataWithConfirm(data);
      })
      .catch(function () { alert('文件读取或解析失败，请使用“粘贴备份恢复”，并确认粘贴的是完整 JSON。'); });
    event.target.value = '';
  };

  window._showPasteImport = function () {
    pendingPasteImportData = null;
    var h = '<div class="modal-header"><h2>' + icon('import') + '粘贴备份恢复</h2><button class="modal-close" onclick="window._closeModal()" aria-label="关闭">×</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="form-hint">请粘贴之前复制的备份 JSON 文本。安卓手机无法上传文件时，推荐使用这个方式恢复数据。</div>';
    h += '<div class="form-group"><label class="form-label">备份 JSON 文本</label><textarea class="form-input import-json-textarea" id="import-json-text" placeholder="请粘贴之前复制的备份 JSON 文本" spellcheck="false"></textarea></div>';
    h += '<div class="backup-preview hidden" id="backup-preview"></div>';
    h += '<div class="modal-footer"><button class="btn btn-outline" onclick="window._closeModal()">取消</button><button class="btn btn-outline" onclick="window._checkPasteBackup()">检查备份</button><button class="btn btn-primary btn-block" onclick="window._restorePasteBackup()">导入恢复</button></div>';
    openModal(h);
  };

  function parsePasteBackup() {
    var textEl = $('#import-json-text');
    var text = textEl ? textEl.value.trim() : '';
    if (!text) throw new Error('empty');
    var raw = JSON.parse(text);
    return dataService.validateImportData ? dataService.validateImportData(raw) : raw;
  }

  function renderBackupPreview(data) {
    var preview = $('#backup-preview');
    if (!preview) return;
    preview.classList.remove('hidden');
    preview.innerHTML = '<strong>备份检查通过</strong>' +
      '<span>加油记录：' + data.fuelRecords.length + ' 条</span>' +
      '<span>行程记录：' + data.tripRecords.length + ' 条</span>' +
      '<span>充电记录：' + data.chargeRecords.length + ' 条</span>' +
      '<span>导出时间：' + (data.exportedAt || '未提供') + '</span>' +
      '<span>版本：' + (data.version || '旧版') + '</span>';
  }

  window._checkPasteBackup = function () {
    try {
      pendingPasteImportData = parsePasteBackup();
      renderBackupPreview(pendingPasteImportData);
    } catch (e) {
      pendingPasteImportData = null;
      alert('备份文本格式不正确，请确认粘贴的是完整 JSON。');
    }
  };

  window._restorePasteBackup = function () {
    try {
      var data = pendingPasteImportData || parsePasteBackup();
      pendingPasteImportData = data;
      renderBackupPreview(data);
      applyImportedDataWithConfirm(data);
    } catch (e) {
      alert('备份文本格式不正确，请确认粘贴的是完整 JSON。');
    }
  };

  window._importFromText = function () {
    window._restorePasteBackup();
  };

  window._clearAllData = function () {
    showConfirm('⚠ 确定要清空全部数据吗？\n\n此操作不可撤销，建议先导出备份。', function () {
      applyData(dataService.clearAllData());
      navigateTo('home');
    });
  };

  function showOdometerInitPrompt() {
    var h = '<div class="modal-header"><h2>' + icon('gauge') + '初始化车辆里程</h2><button class="modal-close" onclick="window._skipVehicleInit()" aria-label="关闭">×</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="form-hint">为了让首页显示真实的当前总里程，请先填写一次车辆基础信息。以后可以在设置页修改。</div>';
    h += '<div class="form-group"><label class="form-label">车辆模式</label><select class="form-input" id="init-energy-mode"><option value="fuel"' + (energyMode === 'fuel' ? ' selected' : '') + '>燃油模式</option><option value="electric"' + (energyMode === 'electric' ? ' selected' : '') + '>纯电模式</option><option value="hybrid"' + (energyMode === 'hybrid' ? ' selected' : '') + '>油电混合模式</option></select></div>';
    h += '<div class="form-group"><label class="form-label">当前车辆总里程 (km)</label><input type="number" class="form-input" id="init-odometer" min="0" step="1" inputmode="numeric" placeholder="例如 23680"></div>';
    h += '<div class="modal-footer"><button class="btn btn-outline" onclick="window._skipVehicleInit()">稍后设置</button><button class="btn btn-primary btn-block" onclick="window._saveVehicleInit()">保存</button></div>';
    openModal(h);
  }

  function saveVehicleProfileFromValues(mode, odometer, skipped) {
    mode = normalizeEnergyMode(mode || energyMode);
    var now = new Date().toISOString();
    var current = dataService.getVehicleProfile ? dataService.getVehicleProfile() : {};
    var next = Object.assign({}, current, {
      mode: mode,
      currentOdometer: odometer,
      initializedAt: current.initializedAt || now,
      updatedAt: now,
      skippedOdometerInit: !!skipped
    });
    vehicleProfile = dataService.saveVehicleProfile ? dataService.saveVehicleProfile(next) : next;
    energyMode = dataService.getEnergyMode ? dataService.getEnergyMode() : mode;
    activeEnergyTab = energyMode === 'electric' ? 'charge' : 'fuel';
    updateEnergyNav();
  }

  window._saveVehicleInit = function () {
    var modeEl = $('#init-energy-mode');
    var odoEl = $('#init-odometer');
    var odo = parseFloat(odoEl.value);
    if (isNaN(odo) || odo < 0) { alert('请输入有效的当前总里程'); return; }
    saveVehicleProfileFromValues(modeEl.value, odo, false);
    closeModal();
    refreshCurrentPage();
  };

  window._skipVehicleInit = function () {
    saveVehicleProfileFromValues(energyMode, null, true);
    closeModal();
    refreshCurrentPage();
  };

  window._saveVehicleSettings = function () {
    var odoEl = $('#vehicle-odometer');
    var odo = parseFloat(odoEl.value);
    if (isNaN(odo) || odo < 0) { alert('请输入有效的当前总里程'); return; }
    saveVehicleProfileFromValues(energyMode, odo, false);
    alert('车辆信息已保存');
    refreshCurrentPage();
  };

  // ==================== Render Dispatch ====================
  function renderPage() {
    var oldFab = document.querySelector('.fab');
    if (oldFab) oldFab.remove();
    switch (currentPage) {
      case 'home': renderEnergyHome(); break;
      case 'fuel': renderEnergyPage(); break;
      case 'trip': renderTripPage(); break;
      case 'stats': renderEnergyStatsPage(); break;
      case 'settings': renderSettingsPage(); break;
    }
  }

  function refreshCurrentPage() { renderPage(); }

  // ==================== Global Exports ====================
  window._closeModal = closeModal;
  window._showFuelForm = function () { showFuelForm(); };
  window._showChargeForm = function () { showChargeForm(); };
  window._showEnergyForm = function () {
    if (energyMode === 'electric' || (energyMode === 'hybrid' && activeEnergyTab === 'charge')) showChargeForm();
    else showFuelForm();
  };
  window._showTripForm = function () { showTripForm(); };
  window._setEnergyMode = function (mode) { setEnergyMode(mode); };
  window._setEnergyTab = function (tab) { activeEnergyTab = tab === 'charge' ? 'charge' : 'fuel'; refreshCurrentPage(); };
  window._refreshCurrentPage = refreshCurrentPage;

  // ==================== Event Delegation ====================
  document.addEventListener('click', function (e) {
    var navItem = e.target.closest('.nav-item');
    if (navItem) { navigateTo(navItem.dataset.page); return; }

    // Avatar
    if (e.target.closest('#header-avatar') || e.target.closest('.user-avatar-action')) {
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

    var editCharge = e.target.closest('[data-action="edit-charge"]');
    if (editCharge) {
      var ecid = editCharge.dataset.id;
      var ecr = chargeRecords.find(function (r) { return r.id === ecid; });
      if (ecr) showChargeForm(ecr);
      return;
    }

    var delCharge = e.target.closest('[data-action="delete-charge"]');
    if (delCharge) {
      var cid = delCharge.dataset.id;
      var cr = chargeRecords.find(function (r) { return r.id === cid; });
      showConfirm('确定要删除' + (cr ? cr.date + ' 的充电记录' : '该条充电记录') + ' 吗？', function () {
        deleteChargeRecord(cid); refreshCurrentPage();
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
    if (shouldShowOdometerInit()) {
      setTimeout(showOdometerInitPrompt, 450);
    }
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
