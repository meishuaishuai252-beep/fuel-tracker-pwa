(function () {
  'use strict';

  // ==================== State ====================
  let fuelRecords = [];
  let tripRecords = [];
  let currentPage = 'home';

  // ==================== DOM Elements ====================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const mainContent = $('#main-content');
  const headerTitle = $('#header-title');
  const headerStatus = $('#header-status');
  const modalOverlay = $('#modal-overlay');
  const modalContent = $('#modal-content');
  const confirmDialog = $('#confirm-dialog');
  const confirmMessage = $('#confirm-message');
  const confirmOk = $('#confirm-ok');
  const confirmCancel = $('#confirm-cancel');

  let confirmCallback = null;

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

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function isCurrentMonth(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  function sortByDateDesc(arr) {
    return [...arr].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function getMonthProgress() {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const day = now.getDate();
    return {
      day, daysInMonth,
      remaining: daysInMonth - day,
      pct: Math.round((day / daysInMonth) * 100)
    };
  }

  function monthLabel() {
    const now = new Date();
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
  function loadData() {
    try {
      fuelRecords = JSON.parse(localStorage.getItem('fuelRecords') || '[]');
      tripRecords = JSON.parse(localStorage.getItem('tripRecords') || '[]');
    } catch (e) {
      fuelRecords = [];
      tripRecords = [];
    }
  }

  function saveData() {
    localStorage.setItem('fuelRecords', JSON.stringify(fuelRecords));
    localStorage.setItem('tripRecords', JSON.stringify(tripRecords));
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
    $$('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    var titles = { home: '油耗记录助手', fuel: 'Fuel Refill Log', trip: 'Trip Energy Log', stats: 'Analytics Center', settings: 'System Console' };
    headerTitle.textContent = titles[page] || '油耗记录助手';

    if (page === 'home') {
      headerStatus.innerHTML = '<span class="status-tag local">LOCAL MODE</span><span class="status-tag pwa">PWA READY</span>';
    } else {
      headerStatus.innerHTML = '';
    }

    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        if (dist > 0 && curr.liters > 0) {
          totalLiters += curr.liters;
          totalDist += dist;
          count++;
        }
      }
    }
    if (count === 0 || totalDist === 0) return null;
    return (totalLiters / totalDist) * 100;
  }

  function getLatestFuelPrice() {
    if (fuelRecords.length === 0) return null;
    var sorted = sortByDateDesc(fuelRecords);
    return sorted[0].pricePerLiter || null;
  }

  function getCostPerKm() {
    var avg = getAverageConsumption();
    var price = getLatestFuelPrice();
    if (avg == null || price == null) return null;
    return (avg * price) / 100;
  }

  function getMonthlyFuelStats() {
    var recs = fuelRecords.filter(function (r) { return isCurrentMonth(r.date); });
    return {
      totalAmount: recs.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0),
      totalLiters: recs.reduce(function (s, r) { return s + (Number(r.liters) || 0); }, 0),
    };
  }

  function getMonthlyDistance() {
    return tripRecords
      .filter(function (r) { return isCurrentMonth(r.date); })
      .reduce(function (s, r) { return s + (Number(r.distance) || 0); }, 0);
  }

  function getTotalStats() {
    return {
      totalAmount: fuelRecords.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0),
      totalDistance: tripRecords.reduce(function (s, r) { return s + (Number(r.distance) || 0); }, 0),
    };
  }

  function getLatestFuelRecord() {
    if (fuelRecords.length === 0) return null;
    return sortByDateDesc(fuelRecords)[0];
  }

  function getLatestTripRecord() {
    if (tripRecords.length === 0) return null;
    return sortByDateDesc(tripRecords)[0];
  }

  // ==================== Data Operations ====================
  function addFuelRecord(record) { fuelRecords.push(record); saveData(); }
  function deleteFuelRecord(id) { fuelRecords = fuelRecords.filter(function (r) { return r.id !== id; }); saveData(); }
  function addTripRecord(record) { tripRecords.push(record); saveData(); }
  function deleteTripRecord(id) { tripRecords = tripRecords.filter(function (r) { return r.id !== id; }); saveData(); }

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

    var h = '<div class="page active" id="page-home">';

    // Hero dashboard
    h += '<div class="hero-dashboard">';
    h += '<div class="hero-label">PER KM COST · 每公里成本</div>';
    if (costPerKm != null) {
      h += '<div class="hero-value">¥' + fmtMoney(costPerKm) + '</div>';
      h += '<div class="hero-unit">元 / km</div>';
      h += '<div class="hero-aux">';
      h += '<div class="hero-aux-item"><div class="hero-aux-value">' + (avgConsumption != null ? fmtFuel(avgConsumption) + ' L' : '—') + '</div><div class="hero-aux-label">百公里油耗</div></div>';
      h += '<div class="hero-separator"></div>';
      h += '<div class="hero-aux-item"><div class="hero-aux-value">¥' + (latestPrice != null ? fmtMoney(latestPrice) : '—') + '</div><div class="hero-aux-label">最近油价 /L</div></div>';
      h += '</div>';
    } else {
      h += '<div class="hero-no-data">等待更多加油数据<br><span style="font-size:0.7rem;color:#64748b">至少需要两次加满油的记录</span></div>';
    }
    h += '</div>';

    // Quick actions
    h += '<div class="quick-actions">';
    h += '<button class="btn-action" onclick="window._showFuelForm()"><span class="action-icon">⛽</span><span>+ 加油记录</span></button>';
    h += '<button class="btn-action trip" onclick="window._showTripForm()"><span class="action-icon">🛣️</span><span>+ 行程记录</span></button>';
    h += '</div>';

    // Summary grid
    h += '<div class="summary-grid">';
    h += '<div class="card summary-card"><div class="card-title">本月油费</div><div class="card-value orange">¥' + fmtMoney(monthlyFuel.totalAmount) + '</div></div>';
    h += '<div class="card summary-card"><div class="card-title">本月行驶</div><div class="card-value blue">' + fmtDist(monthlyDist) + '<span class="card-unit">km</span></div></div>';
    h += '<div class="card summary-card"><div class="card-title">平均油耗</div><div class="card-value' + (avgConsumption != null ? ' cyan' : '') + '">' + (avgConsumption != null ? fmtFuel(avgConsumption) + '<span class="card-unit">L/100km</span>' : '—') + '</div></div>';
    h += '<div class="card summary-card"><div class="card-title">每公里成本</div><div class="card-value green">' + (costPerKm != null ? '¥' + fmtMoney(costPerKm) : '—') + '</div></div>';
    h += '</div>';

    // Month progress
    h += '<div class="progress-card">';
    h += '<div class="progress-header"><span class="progress-label">' + monthLabel() + ' 进度</span><span class="progress-days">' + progress.pct + '%</span></div>';
    h += '<div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + progress.pct + '%"></div></div>';
    h += '<div class="progress-info"><span>已过 ' + progress.day + ' 天</span><span>剩余 ' + progress.remaining + ' 天</span><span>本月油费 ¥' + fmtMoney(monthlyFuel.totalAmount) + '</span></div>';
    h += '</div>';

    // Latest records
    h += '<div class="latest-section-title">最近记录</div>';

    h += '<div class="latest-record-card fuel">';
    h += '<div class="latest-info"><div class="latest-label">RECENT REFILL · 最近加油</div>';
    if (latestFuel) {
      h += '<div class="latest-detail">' + latestFuel.date + ' · ' + fmtDist(latestFuel.odometer) + ' km' + (latestFuel.note ? ' · ' + escHtml(latestFuel.note) : '') + '</div>';
      h += '</div><div class="latest-value">¥' + fmtMoney(latestFuel.amount) + '</div>';
    } else {
      h += '<div class="latest-detail">暂无记录</div></div><div class="latest-value no-data">—</div>';
    }
    h += '</div>';

    h += '<div class="latest-record-card trip">';
    h += '<div class="latest-info"><div class="latest-label">RECENT TRIP · 最近行程</div>';
    if (latestTrip) {
      h += '<div class="latest-detail">' + latestTrip.date + ' · ' + (latestTrip.name || latestTrip.purpose || '未命名') + '</div>';
      h += '</div><div class="latest-value">' + fmtDist(latestTrip.distance) + ' km</div>';
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
    h += '<div class="page-title"><span class="dot"></span> Fuel Refill Log · 能源补给记录</div>';

    if (records.length === 0) {
      h += '<div class="empty-state"><div class="empty-state-icon">⛽</div><p>还没有加油记录</p><button class="btn btn-primary btn-sm" onclick="window._showFuelForm()">+ 新增加油记录</button></div>';
    } else {
      h += '<div class="record-list">';
      records.forEach(function (r) { h += renderFuelItem(r); });
      h += '</div>';
    }
    h += '</div>';
    mainContent.innerHTML = h;

    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = '+';
    fab.onclick = function () { showFuelForm(); };
    document.body.appendChild(fab);
  }

  function renderFuelItem(r) {
    var h = '<div class="record-item" data-id="' + r.id + '">';
    h += '<div class="record-header"><span class="record-date">' + r.date;
    if (r.fullTank) h += '<span class="badge-full">FULL</span>';
    h += '</span><button class="record-delete" data-action="delete-fuel" data-id="' + r.id + '">删除</button></div>';
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
    var h = '<div class="modal-header"><h2>⛽ ' + (editRecord ? '编辑加油记录' : '新增加油记录') + '</h2><button class="modal-close" onclick="window._closeModal()">✕</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="fuel-date" value="' + (r.date || today()) + '"></div>';
    h += '<div class="form-group"><label class="form-label">当前总里程 (km)</label><input type="number" class="form-input" id="fuel-odo" placeholder="例如 35620" step="0.1" min="0" value="' + (r.odometer || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">加油金额 (元)</label><input type="number" class="form-input fuel-calc" id="fuel-amount" placeholder="例如 300" step="0.01" min="0" value="' + (r.amount || '') + '" inputmode="decimal" data-role="amount"></div>';
    h += '<div class="form-group"><label class="form-label">加油升数 (L)</label><input type="number" class="form-input fuel-calc" id="fuel-liters" placeholder="例如 38.5" step="0.01" min="0" value="' + (r.liters || '') + '" inputmode="decimal" data-role="liters"></div>';
    h += '<div class="form-group"><label class="form-label">油价 (元/L)</label><input type="number" class="form-input fuel-calc" id="fuel-price" placeholder="自动计算或手动输入" step="0.01" min="0" value="' + (r.pricePerLiter || '') + '" inputmode="decimal" data-role="price"></div>';
    h += '<div class="form-hint">填写任意两项，第三项自动计算</div>';
    h += '<div class="form-group" style="margin-top:12px"><div class="form-check"><input type="checkbox" id="fuel-fulltank"' + (r.fullTank ? ' checked' : '') + '><label for="fuel-fulltank">本次已加满油箱</label></div></div>';
    h += '<div class="form-group"><label class="form-label">备注</label><input type="text" class="form-input" id="fuel-note" placeholder="例如：中石化、92号" value="' + (r.note || '') + '"></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-primary btn-block" onclick="window._saveFuel(\'' + (r.id || '') + '\')">保存记录</button></div>';
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
      fuelRecords = fuelRecords.map(function (r) { return r.id === editId ? { id: r.id, date: date, odometer: odo, amount: amt, liters: lit, pricePerLiter: prc, fullTank: full, note: note } : r; });
    } else {
      addFuelRecord({ id: genId(), date: date, odometer: odo, amount: amt, liters: lit, pricePerLiter: prc, fullTank: full, note: note });
    }
    closeModal(); refreshCurrentPage();
  };

  // ==================== Render: Trip Records ====================
  function renderTripPage() {
    var records = sortByDateDesc(tripRecords);
    var h = '<div class="page active" id="page-trip">';
    h += '<div class="page-title"><span class="dot"></span> Trip Energy Log · 行程能耗记录</div>';

    if (records.length === 0) {
      h += '<div class="empty-state"><div class="empty-state-icon">🛣️</div><p>还没有行程记录</p><button class="btn btn-primary btn-sm" onclick="window._showTripForm()">+ 新增行程记录</button></div>';
    } else {
      h += '<div class="record-list">';
      records.forEach(function (r) { h += renderTripItem(r); });
      h += '</div>';
    }
    h += '</div>';
    mainContent.innerHTML = h;

    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = '+';
    fab.onclick = function () { showTripForm(); };
    document.body.appendChild(fab);
  }

  function renderTripItem(r) {
    var h = '<div class="record-item" data-id="' + r.id + '">';
    h += '<div class="record-header"><span class="record-date">' + r.date;
    if (r.purpose) h += ' · ' + escHtml(r.purpose);
    h += '</span><button class="record-delete" data-action="delete-trip" data-id="' + r.id + '">删除</button></div>';
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
    var h = '<div class="modal-header"><h2>🛣️ ' + (editRecord ? '编辑行程记录' : '新增行程记录') + '</h2><button class="modal-close" onclick="window._closeModal()">✕</button></div>';
    h += '<div class="modal-body">';
    h += '<div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="trip-date" value="' + (r.date || today()) + '"></div>';
    h += '<div class="form-group"><label class="form-label">行程名称</label><input type="text" class="form-input" id="trip-name" placeholder="例如：去公司、周末出游" value="' + (r.name || '') + '"></div>';
    h += '<div class="form-row"><div class="form-group"><label class="form-label">起始里程 (km)</label><input type="number" class="form-input trip-odo" id="trip-start" placeholder="例如 35620" step="0.1" min="0" value="' + (r.startOdometer || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">结束里程 (km)</label><input type="number" class="form-input trip-odo" id="trip-end" placeholder="例如 35648" step="0.1" min="0" value="' + (r.endOdometer || '') + '" inputmode="decimal"></div></div>';
    h += '<div class="form-group"><label class="form-label">行驶距离 (km)</label><input type="number" class="form-input" id="trip-distance" placeholder="自动计算" step="0.1" min="0" value="' + (r.distance || '') + '" inputmode="decimal" readonly></div>';
    h += '<div class="form-group"><label class="form-label">用途</label><select class="form-input" id="trip-purpose"><option value="">请选择</option><option value="上班"' + (r.purpose === '上班' ? ' selected' : '') + '>上班</option><option value="商务"' + (r.purpose === '商务' ? ' selected' : '') + '>商务</option><option value="出游"' + (r.purpose === '出游' ? ' selected' : '') + '>出游</option><option value="购物"' + (r.purpose === '购物' ? ' selected' : '') + '>购物</option><option value="接送"' + (r.purpose === '接送' ? ' selected' : '') + '>接送</option><option value="其他"' + (r.purpose === '其他' ? ' selected' : '') + '>其他</option></select></div>';
    h += '<div class="form-group"><label class="form-label">预估油费 (元)</label><input type="number" class="form-input" id="trip-cost" placeholder="' + (cpk != null ? '约 ¥' + fmtMoney(cpk) + '/km' : '需要足够数据才能估算') + '" step="0.01" min="0" value="' + (r.estimatedCost || '') + '" inputmode="decimal" readonly></div>';
    h += '<div class="form-group"><label class="form-label">备注</label><input type="text" class="form-input" id="trip-note" placeholder="例如：市区拥堵" value="' + (r.note || '') + '"></div>';
    h += '</div><div class="modal-footer"><button class="btn btn-primary btn-block" onclick="window._saveTrip(\'' + (r.id || '') + '\')">保存记录</button></div>';
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
      tripRecords = tripRecords.map(function (r) { return r.id === editId ? { id: r.id, date: date, name: name, startOdometer: startOdo, endOdometer: endOdo, distance: dist, purpose: purpose, estimatedCost: cost, note: note } : r; });
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
    h += '<div class="page-title"><span class="dot"></span> Analytics Center · 数据分析中心</div>';

    if (avgConsumption == null && fuelRecords.length > 0) {
      h += '<div class="stats-insufficient">⚠ 数据不足，至少需要两次加满油的记录才能计算真实油耗</div>';
    }
    if (fuelRecords.length === 0) {
      h += '<div class="stats-insufficient">暂无任何数据，请先添加加油记录</div>';
    }

    h += '<div class="stats-grid">';
    h += statsCardHtml('本月加油金额', '¥' + fmtMoney(monthlyFuel.totalAmount), 'orange');
    h += statsCardHtml('本月加油升数', fmtFuel(monthlyFuel.totalLiters) + ' L', 'blue');
    h += statsCardHtml('本月行驶里程', fmtDist(monthlyDist) + ' km', 'blue');
    h += statsCardHtml('平均百公里油耗', avgConsumption != null ? fmtFuel(avgConsumption) + ' L/100km' : '数据不足', 'cyan');
    h += statsCardHtml('平均每公里油费', costPerKm != null ? '¥' + fmtMoney(costPerKm) + ' /km' : '数据不足', 'green');
    h += statsCardHtml('最近一次油价', latestPrice != null ? '¥' + fmtMoney(latestPrice) + ' /L' : '无数据', 'orange');
    h += statsCardHtml('总加油金额', '¥' + fmtMoney(totals.totalAmount), '');
    h += statsCardHtml('总行驶里程', fmtDist(totals.totalDistance) + ' km', '');
    h += '</div>';

    h += '</div>';
    mainContent.innerHTML = h;
  }

  function statsCardHtml(title, value, cls) {
    return '<div class="stats-card' + (title.length > 6 ? ' stats-full' : '') + '">' +
      '<div class="card-title">' + title + '</div>' +
      '<div class="card-value' + (cls ? ' ' + cls : '') + '">' + value + '</div>' +
      '</div>';
  }

  // ==================== Render: Settings ====================
  function renderSettingsPage() {
    var h = '<div class="page active" id="page-settings">';
    h += '<div class="page-title"><span class="dot"></span> System Console · 系统控制台</div>';

    h += '<div class="settings-section"><h3>数据概况</h3>';
    h += '<div class="settings-row"><span class="settings-label">加油记录</span><span class="settings-value">' + fuelRecords.length + ' 条</span></div>';
    h += '<div class="settings-row"><span class="settings-label">行程记录</span><span class="settings-value">' + tripRecords.length + ' 条</span></div>';
    h += '<div class="settings-row"><span class="settings-label">存储状态</span><span class="settings-value">localStorage</span></div>';
    h += '<div class="settings-row"><span class="settings-label">PWA 模式</span><span class="settings-value">离线可用</span></div>';
    h += '</div>';

    h += '<div class="settings-section"><h3>数据备份</h3>';
    h += '<button class="btn btn-outline btn-block" onclick="window._exportData()" style="margin-bottom:8px">📤 导出全部数据 (JSON)</button>';
    h += '<button class="btn btn-outline btn-block" onclick="window._importData()">📥 从 JSON 文件导入</button>';
    h += '<input type="file" id="import-file-input" accept=".json" style="display:none" onchange="window._handleImport(event)">';
    h += '</div>';

    h += '<div class="settings-section"><h3 style="color:var(--accent-rose)">危险操作</h3>';
    h += '<button class="btn btn-danger btn-block" onclick="window._clearAllData()">🗑 清空全部数据</button>';
    h += '</div>';

    h += '<p class="settings-about">Fuel Intelligence Dashboard v2.0<br>数据保存在浏览器本地存储 · 离线可用<br>清除浏览器数据会导致记录丢失，请定期导出 JSON 备份</p>';

    h += '</div>';
    mainContent.innerHTML = h;
  }

  window._exportData = function () {
    var data = { version: 1, exportedAt: new Date().toISOString(), fuelRecords: fuelRecords, tripRecords: tripRecords };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '油耗记录备份_' + today() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window._importData = function () { var inp = $('#import-file-input'); if (inp) inp.click(); };

  window._handleImport = function (event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.fuelRecords || !data.tripRecords) { alert('无效的备份文件格式'); return; }
        showConfirm('即将导入 ' + data.fuelRecords.length + ' 条加油记录和 ' + data.tripRecords.length + ' 条行程记录。\n\n⚠ 当前数据将被覆盖，是否继续？', function () {
          fuelRecords = data.fuelRecords;
          tripRecords = data.tripRecords;
          saveData();
          alert('导入成功！');
          refreshCurrentPage();
        });
      } catch (err) { alert('文件解析失败，请检查文件格式'); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  window._clearAllData = function () {
    showConfirm('⚠ 确定要清空全部数据吗？\n\n此操作不可撤销，建议先导出备份。', function () {
      fuelRecords = [];
      tripRecords = [];
      saveData();
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

    var delFuel = e.target.closest('[data-action="delete-fuel"]');
    if (delFuel) {
      var fid = delFuel.dataset.id;
      var fr = fuelRecords.find(function (r) { return r.id === fid; });
      showConfirm('确定要删除 ' + (fr ? fr.date + ' 的加油记录' : '该条加油记录') + ' 吗？', function () {
        deleteFuelRecord(fid); refreshCurrentPage();
      });
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

  function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== Init ====================
  function init() {
    loadData();
    navigateTo('home');
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
