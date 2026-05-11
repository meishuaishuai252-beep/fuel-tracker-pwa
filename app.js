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
    const titles = { home: '油耗记录助手', fuel: '加油记录', trip: '行程记录', stats: '统计', settings: '设置' };
    headerTitle.textContent = titles[page] || '油耗记录助手';
    renderPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ==================== Statistics ====================
  function getAverageConsumption() {
    if (fuelRecords.length < 2) return null;
    const sorted = [...fuelRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalLiters = 0;
    let totalDist = 0;
    let count = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (curr.fullTank && curr.odometer > prev.odometer) {
        const dist = curr.odometer - prev.odometer;
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
    const sorted = sortByDateDesc(fuelRecords);
    return sorted[0].pricePerLiter || null;
  }

  function getCostPerKm() {
    const avgConsumption = getAverageConsumption();
    const latestPrice = getLatestFuelPrice();
    if (avgConsumption == null || latestPrice == null) return null;
    return (avgConsumption * latestPrice) / 100;
  }

  function getMonthlyFuelStats() {
    const monthRecords = fuelRecords.filter((r) => isCurrentMonth(r.date));
    return {
      totalAmount: monthRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      totalLiters: monthRecords.reduce((s, r) => s + (Number(r.liters) || 0), 0),
    };
  }

  function getMonthlyDistance() {
    return tripRecords
      .filter((r) => isCurrentMonth(r.date))
      .reduce((s, r) => s + (Number(r.distance) || 0), 0);
  }

  function getTotalStats() {
    return {
      totalAmount: fuelRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      totalDistance: tripRecords.reduce((s, r) => s + (Number(r.distance) || 0), 0),
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
  function addFuelRecord(record) {
    fuelRecords.push(record);
    saveData();
  }

  function deleteFuelRecord(id) {
    fuelRecords = fuelRecords.filter((r) => r.id !== id);
    saveData();
  }

  function addTripRecord(record) {
    tripRecords.push(record);
    saveData();
  }

  function deleteTripRecord(id) {
    tripRecords = tripRecords.filter((r) => r.id !== id);
    saveData();
  }

  // ==================== Render: Home ====================
  function renderHome() {
    const monthlyFuel = getMonthlyFuelStats();
    const monthlyDist = getMonthlyDistance();
    const avgConsumption = getAverageConsumption();
    const costPerKm = getCostPerKm();
    const latestFuel = getLatestFuelRecord();
    const latestTrip = getLatestTripRecord();

    let html = '<div class="page active" id="page-home">';

    // Summary cards
    html += '<div class="summary-grid">';
    html += cardHtml('本月油费', '¥' + fmtMoney(monthlyFuel.totalAmount), 'primary');
    html += cardHtml('本月行驶', fmtDist(monthlyDist) + ' km');
    html += cardHtml('平均油耗', avgConsumption != null ? fmtFuel(avgConsumption) + ' L/100km' : '数据不足');
    html += cardHtml('每公里成本', costPerKm != null ? '¥' + fmtMoney(costPerKm) + ' /km' : '数据不足');
    html += '</div>';

    // Latest fuel record
    html += '<div class="card latest-card">';
    html += '<div class="latest-info">';
    html += '<div class="latest-label">最近加油</div>';
    if (latestFuel) {
      html += '<div class="latest-detail">' + latestFuel.date + ' · ' + fmtDist(latestFuel.odometer) + ' km</div>';
      html += '</div>';
      html += '<div class="latest-value">¥' + fmtMoney(latestFuel.amount) + '</div>';
    } else {
      html += '<div class="latest-detail" style="color:#9ca3af">暂无记录</div>';
      html += '</div>';
      html += '<div class="latest-value" style="color:#9ca3af">—</div>';
    }
    html += '</div>';

    // Latest trip record
    html += '<div class="card latest-card">';
    html += '<div class="latest-info">';
    html += '<div class="latest-label">最近行程</div>';
    if (latestTrip) {
      html += '<div class="latest-detail">' + latestTrip.date + ' · ' + (latestTrip.name || latestTrip.purpose || '未命名') + '</div>';
      html += '</div>';
      html += '<div class="latest-value">' + fmtDist(latestTrip.distance) + ' km</div>';
    } else {
      html += '<div class="latest-detail" style="color:#9ca3af">暂无记录</div>';
      html += '</div>';
      html += '<div class="latest-value" style="color:#9ca3af">—</div>';
    }
    html += '</div>';

    html += '</div>';
    mainContent.innerHTML = html;
  }

  function cardHtml(title, value, cls) {
    return '<div class="card summary-card">' +
      '<div class="card-title">' + title + '</div>' +
      '<div class="card-value' + (cls ? ' ' + cls : '') + '">' + value + '</div>' +
      '</div>';
  }

  // ==================== Render: Fuel Records ====================
  function renderFuelPage() {
    const records = sortByDateDesc(fuelRecords);
    let html = '<div class="page active" id="page-fuel">';

    if (records.length === 0) {
      html += '<div class="empty-state">';
      html += '<div class="empty-state-icon">⛽</div>';
      html += '<p>还没有加油记录</p>';
      html += '<button class="btn btn-primary btn-sm" onclick="window._showFuelForm()">+ 新增加油记录</button>';
      html += '</div>';
    } else {
      html += '<div class="record-list">';
      records.forEach((r) => {
        html += renderFuelItem(r);
      });
      html += '</div>';
    }

    html += '</div>';
    mainContent.innerHTML = html;

    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = '+';
    fab.onclick = function () { showFuelForm(); };
    document.body.appendChild(fab);
  }

  function renderFuelItem(r) {
    let h = '<div class="record-item" data-id="' + r.id + '">';
    h += '<div class="record-header">';
    h += '<span class="record-date">' + r.date;
    if (r.fullTank) h += '<span class="badge-full">已加满</span>';
    h += '</span>';
    h += '<button class="record-delete" data-action="delete-fuel" data-id="' + r.id + '">删除</button>';
    h += '</div>';
    h += '<div class="record-details">';
    h += '<div class="record-detail">里程：<span>' + fmtDist(r.odometer) + ' km</span></div>';
    h += '<div class="record-detail">金额：<span>¥' + fmtMoney(r.amount) + '</span></div>';
    h += '<div class="record-detail">升数：<span>' + fmtFuel(r.liters) + ' L</span></div>';
    h += '<div class="record-detail">油价：<span>¥' + fmtMoney(r.pricePerLiter) + ' /L</span></div>';
    h += '</div>';
    if (r.note) {
      h += '<div class="record-note">' + escHtml(r.note) + '</div>';
    }
    h += '</div>';
    return h;
  }

  function showFuelForm(editRecord) {
    const r = editRecord || {};
    let h = '<div class="modal-header">';
    h += '<h2>' + (editRecord ? '编辑加油记录' : '新增加油记录') + '</h2>';
    h += '<button class="modal-close" onclick="window._closeModal()">✕</button>';
    h += '</div>';
    h += '<div class="modal-body">';
    h += '<div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="fuel-date" value="' + (r.date || today()) + '"></div>';
    h += '<div class="form-group"><label class="form-label">当前总里程 (km)</label><input type="number" class="form-input" id="fuel-odo" placeholder="例如 35620" step="0.1" min="0" value="' + (r.odometer || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">加油金额 (元)</label><input type="number" class="form-input fuel-calc" id="fuel-amount" placeholder="例如 300" step="0.01" min="0" value="' + (r.amount || '') + '" inputmode="decimal" data-role="amount"></div>';
    h += '<div class="form-group"><label class="form-label">加油升数 (L)</label><input type="number" class="form-input fuel-calc" id="fuel-liters" placeholder="例如 38.5" step="0.01" min="0" value="' + (r.liters || '') + '" inputmode="decimal" data-role="liters"></div>';
    h += '<div class="form-group"><label class="form-label">油价 (元/L)</label><input type="number" class="form-input fuel-calc" id="fuel-price" placeholder="自动计算或手动输入" step="0.01" min="0" value="' + (r.pricePerLiter || '') + '" inputmode="decimal" data-role="price"></div>';
    h += '<div class="form-hint">填写任意两项，第三项自动计算</div>';
    h += '<div class="form-group" style="margin-top:12px"><div class="form-check"><input type="checkbox" id="fuel-fulltank"' + (r.fullTank ? ' checked' : '') + '><label for="fuel-fulltank">本次已加满油箱</label></div></div>';
    h += '<div class="form-group"><label class="form-label">备注</label><input type="text" class="form-input" id="fuel-note" placeholder="例如：中石化、92号" value="' + (r.note || '') + '"></div>';
    h += '</div>';
    h += '<div class="modal-footer"><button class="btn btn-primary btn-block" onclick="window._saveFuel(\'' + (r.id || '') + '\')">保存</button></div>';

    openModal(h);

    // Auto-calc listeners
    setTimeout(() => {
      const calcInputs = $$('.fuel-calc');
      calcInputs.forEach((inp) => {
        inp.addEventListener('input', autoCalcFuel);
      });
    }, 100);
  }

  function autoCalcFuel() {
    const amountEl = $('#fuel-amount');
    const litersEl = $('#fuel-liters');
    const priceEl = $('#fuel-price');
    if (!amountEl || !litersEl || !priceEl) return;

    const amount = parseFloat(amountEl.value);
    const liters = parseFloat(litersEl.value);
    const price = parseFloat(priceEl.value);

    const filled = [!!amountEl.value, !!litersEl.value, !!priceEl.value].filter(Boolean).length;

    if (filled >= 2) {
      if (amountEl.value && litersEl.value && !isNaN(amount) && !isNaN(liters) && liters > 0) {
        priceEl.value = fmtMoney(amount / liters);
      } else if (litersEl.value && priceEl.value && !isNaN(liters) && !isNaN(price)) {
        amountEl.value = fmtMoney(liters * price);
      } else if (amountEl.value && priceEl.value && !isNaN(amount) && !isNaN(price) && price > 0) {
        litersEl.value = fmtFuel(amount / price);
      }
    }
  }

  window._saveFuel = function (editId) {
    const date = $('#fuel-date').value;
    const odometer = parseFloat($('#fuel-odo').value);
    const amount = parseFloat($('#fuel-amount').value) || 0;
    const liters = parseFloat($('#fuel-liters').value) || 0;
    const pricePerLiter = parseFloat($('#fuel-price').value) || 0;
    const fullTank = $('#fuel-fulltank').checked;
    const note = $('#fuel-note').value.trim();

    if (!date) { alert('请选择日期'); return; }
    if (isNaN(odometer) || odometer < 0) { alert('请输入有效的里程数'); return; }
    if (amount === 0 && liters === 0) { alert('请至少填写金额或升数'); return; }

    if (editId) {
      fuelRecords = fuelRecords.map((r) => {
        if (r.id === editId) {
          return { ...r, date, odometer, amount, liters, pricePerLiter, fullTank, note };
        }
        return r;
      });
    } else {
      addFuelRecord({ id: genId(), date, odometer, amount, liters, pricePerLiter, fullTank, note });
    }
    closeModal();
    refreshCurrentPage();
  };

  // ==================== Render: Trip Records ====================
  function renderTripPage() {
    const records = sortByDateDesc(tripRecords);
    let html = '<div class="page active" id="page-trip">';

    if (records.length === 0) {
      html += '<div class="empty-state">';
      html += '<div class="empty-state-icon">🛣️</div>';
      html += '<p>还没有行程记录</p>';
      html += '<button class="btn btn-primary btn-sm" onclick="window._showTripForm()">+ 新增行程记录</button>';
      html += '</div>';
    } else {
      html += '<div class="record-list">';
      records.forEach((r) => {
        html += renderTripItem(r);
      });
      html += '</div>';
    }

    html += '</div>';
    mainContent.innerHTML = html;

    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.textContent = '+';
    fab.onclick = function () { showTripForm(); };
    document.body.appendChild(fab);
  }

  function renderTripItem(r) {
    let h = '<div class="record-item" data-id="' + r.id + '">';
    h += '<div class="record-header">';
    h += '<span class="record-date">' + r.date;
    if (r.purpose) h += ' · ' + escHtml(r.purpose);
    h += '</span>';
    h += '<button class="record-delete" data-action="delete-trip" data-id="' + r.id + '">删除</button>';
    h += '</div>';
    h += '<div class="record-details">';
    h += '<div class="record-detail">名称：<span>' + escHtml(r.name || '未命名') + '</span></div>';
    h += '<div class="record-detail">距离：<span>' + fmtDist(r.distance) + ' km</span></div>';
    h += '<div class="record-detail">起：<span>' + fmtDist(r.startOdometer) + ' km</span></div>';
    h += '<div class="record-detail">止：<span>' + fmtDist(r.endOdometer) + ' km</span></div>';
    if (r.estimatedCost) {
      h += '<div class="record-detail" style="grid-column:1/-1">预估油费：<span>¥' + fmtMoney(r.estimatedCost) + '</span></div>';
    }
    h += '</div>';
    if (r.note) {
      h += '<div class="record-note">' + escHtml(r.note) + '</div>';
    }
    h += '</div>';
    return h;
  }

  function showTripForm(editRecord) {
    const r = editRecord || {};
    const costPerKm = getCostPerKm();
    let h = '<div class="modal-header">';
    h += '<h2>' + (editRecord ? '编辑行程记录' : '新增行程记录') + '</h2>';
    h += '<button class="modal-close" onclick="window._closeModal()">✕</button>';
    h += '</div>';
    h += '<div class="modal-body">';
    h += '<div class="form-group"><label class="form-label">日期</label><input type="date" class="form-input" id="trip-date" value="' + (r.date || today()) + '"></div>';
    h += '<div class="form-group"><label class="form-label">行程名称</label><input type="text" class="form-input" id="trip-name" placeholder="例如：去公司、周末出游" value="' + (r.name || '') + '"></div>';
    h += '<div class="form-row">';
    h += '<div class="form-group"><label class="form-label">起始里程 (km)</label><input type="number" class="form-input trip-odo" id="trip-start" placeholder="例如 35620" step="0.1" min="0" value="' + (r.startOdometer || '') + '" inputmode="decimal"></div>';
    h += '<div class="form-group"><label class="form-label">结束里程 (km)</label><input type="number" class="form-input trip-odo" id="trip-end" placeholder="例如 35648" step="0.1" min="0" value="' + (r.endOdometer || '') + '" inputmode="decimal"></div>';
    h += '</div>';
    h += '<div class="form-group"><label class="form-label">行驶距离 (km) <span style="color:#9ca3af;font-weight:400">自动计算</span></label><input type="number" class="form-input" id="trip-distance" placeholder="自动计算" step="0.1" min="0" value="' + (r.distance || '') + '" inputmode="decimal" readonly style="background:#f9fafb"></div>';
    h += '<div class="form-group"><label class="form-label">用途</label><select class="form-input" id="trip-purpose"><option value="">请选择</option><option value="上班"' + (r.purpose === '上班' ? ' selected' : '') + '>上班</option><option value="商务"' + (r.purpose === '商务' ? ' selected' : '') + '>商务</option><option value="出游"' + (r.purpose === '出游' ? ' selected' : '') + '>出游</option><option value="购物"' + (r.purpose === '购物' ? ' selected' : '') + '>购物</option><option value="接送"' + (r.purpose === '接送' ? ' selected' : '') + '>接送</option><option value="其他"' + (r.purpose === '其他' ? ' selected' : '') + '>其他</option></select></div>';
    h += '<div class="form-group"><label class="form-label">预估油费 (元) <span style="color:#9ca3af;font-weight:400">自动计算</span></label><input type="number" class="form-input" id="trip-cost" placeholder="' + (costPerKm != null ? '约 ¥' + fmtMoney(costPerKm) + '/km' : '需要足够数据才能估算') + '" step="0.01" min="0" value="' + (r.estimatedCost || '') + '" inputmode="decimal" readonly style="background:#f9fafb"></div>';
    h += '<div class="form-group"><label class="form-label">备注</label><input type="text" class="form-input" id="trip-note" placeholder="例如：市区拥堵" value="' + (r.note || '') + '"></div>';
    h += '</div>';
    h += '<div class="modal-footer"><button class="btn btn-primary btn-block" onclick="window._saveTrip(\'' + (r.id || '') + '\')">保存</button></div>';

    openModal(h);

    setTimeout(() => {
      const odoInputs = $$('.trip-odo');
      odoInputs.forEach((inp) => {
        inp.addEventListener('input', autoCalcDistance);
      });
    }, 100);
  }

  function autoCalcDistance() {
    const startEl = $('#trip-start');
    const endEl = $('#trip-end');
    const distEl = $('#trip-distance');
    const costEl = $('#trip-cost');
    if (!startEl || !endEl || !distEl) return;

    const start = parseFloat(startEl.value);
    const end = parseFloat(endEl.value);

    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const dist = end - start;
      distEl.value = fmtDist(dist);

      const cpk = getCostPerKm();
      if (cpk != null && costEl) {
        costEl.value = fmtMoney(dist * cpk);
      }
    }
  }

  window._saveTrip = function (editId) {
    const date = $('#trip-date').value;
    const name = $('#trip-name').value.trim();
    const startOdometer = parseFloat($('#trip-start').value) || 0;
    const endOdometer = parseFloat($('#trip-end').value) || 0;
    const distance = parseFloat($('#trip-distance').value) || 0;
    const purpose = $('#trip-purpose').value;
    const estimatedCost = parseFloat($('#trip-cost').value) || 0;
    const note = $('#trip-note').value.trim();

    if (!date) { alert('请选择日期'); return; }
    if (distance <= 0) { alert('行驶距离必须大于 0，请填写起止里程'); return; }

    if (editId) {
      tripRecords = tripRecords.map((r) => {
        if (r.id === editId) {
          return { ...r, date, name, startOdometer, endOdometer, distance, purpose, estimatedCost, note };
        }
        return r;
      });
    } else {
      addTripRecord({ id: genId(), date, name, startOdometer, endOdometer, distance, purpose, estimatedCost, note });
    }
    closeModal();
    refreshCurrentPage();
  };

  // ==================== Render: Statistics ====================
  function renderStatsPage() {
    const monthlyFuel = getMonthlyFuelStats();
    const monthlyDist = getMonthlyDistance();
    const avgConsumption = getAverageConsumption();
    const costPerKm = getCostPerKm();
    const totals = getTotalStats();
    const latestPrice = getLatestFuelPrice();

    let html = '<div class="page active" id="page-stats">';

    // Data insufficient warning
    if (avgConsumption == null && fuelRecords.length > 0) {
      html += '<div class="stats-insufficient">⚠️ 数据不足，至少需要两次加满油的记录才能计算真实油耗</div>';
    }
    if (fuelRecords.length === 0) {
      html += '<div class="stats-insufficient">暂无任何数据，请先添加加油记录</div>';
    }

    html += '<div class="stats-grid">';
    html += statsCardHtml('本月加油金额', '¥' + fmtMoney(monthlyFuel.totalAmount), 'primary');
    html += statsCardHtml('本月加油升数', fmtFuel(monthlyFuel.totalLiters) + ' L');
    html += statsCardHtml('本月行驶里程', fmtDist(monthlyDist) + ' km');
    html += statsCardHtml('平均百公里油耗', avgConsumption != null ? fmtFuel(avgConsumption) + ' L/100km' : '数据不足');
    html += statsCardHtml('平均每公里油费', costPerKm != null ? '¥' + fmtMoney(costPerKm) + ' /km' : '数据不足');
    html += statsCardHtml('最近一次油价', latestPrice != null ? '¥' + fmtMoney(latestPrice) + ' /L' : '无数据');
    html += statsCardHtml('总加油金额', '¥' + fmtMoney(totals.totalAmount));
    html += statsCardHtml('总行驶里程', fmtDist(totals.totalDistance) + ' km');
    html += '</div>';

    html += '</div>';
    mainContent.innerHTML = html;
  }

  function statsCardHtml(title, value, cls) {
    return '<div class="stats-card' + (title.length > 6 ? ' stats-full' : '') + '">' +
      '<div class="card-title">' + title + '</div>' +
      '<div class="card-value' + (cls ? ' ' + cls : '') + '">' + value + '</div>' +
      '</div>';
  }

  // ==================== Render: Settings ====================
  function renderSettingsPage() {
    let html = '<div class="page active" id="page-settings">';

    // Data info
    html += '<div class="settings-section">';
    html += '<h3>数据概况</h3>';
    html += '<div class="settings-row"><span class="settings-label">加油记录</span><span class="settings-value">' + fuelRecords.length + ' 条</span></div>';
    html += '<div class="settings-row"><span class="settings-label">行程记录</span><span class="settings-value">' + tripRecords.length + ' 条</span></div>';
    html += '</div>';

    // Backup
    html += '<div class="settings-section">';
    html += '<h3>数据备份</h3>';
    html += '<button class="btn btn-outline btn-block" onclick="window._exportData()" style="margin-bottom:8px">📤 导出全部数据 (JSON)</button>';
    html += '<button class="btn btn-outline btn-block" onclick="window._importData()">📥 从 JSON 文件导入</button>';
    html += '<input type="file" id="import-file-input" accept=".json" style="display:none" onchange="window._handleImport(event)">';
    html += '</div>';

    // Danger zone
    html += '<div class="settings-section">';
    html += '<h3 style="color:var(--danger)">危险操作</h3>';
    html += '<button class="btn btn-danger btn-block" onclick="window._clearAllData()">🗑 清空全部数据</button>';
    html += '</div>';

    // About
    html += '<div class="settings-section" style="margin-top:24px">';
    html += '<p style="text-align:center;color:var(--text-muted);font-size:0.8rem">油耗记录助手 v1.0<br>数据保存在浏览器本地存储</p>';
    html += '</div>';

    html += '</div>';
    mainContent.innerHTML = html;
  }

  window._exportData = function () {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      fuelRecords: fuelRecords,
      tripRecords: tripRecords,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '油耗记录备份_' + today() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  window._importData = function () {
    const input = $('#import-file-input');
    if (input) input.click();
  };

  window._handleImport = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.fuelRecords || !data.tripRecords) {
          alert('无效的备份文件格式');
          return;
        }
        showConfirm(
          '即将导入 ' + data.fuelRecords.length + ' 条加油记录和 ' + data.tripRecords.length + ' 条行程记录。\n\n⚠️ 当前数据将被覆盖，是否继续？',
          function () {
            fuelRecords = data.fuelRecords;
            tripRecords = data.tripRecords;
            saveData();
            alert('导入成功！');
            refreshCurrentPage();
          }
        );
      } catch (err) {
        alert('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  window._clearAllData = function () {
    showConfirm(
      '⚠️ 确定要清空全部数据吗？\n\n此操作不可撤销，建议先导出备份。',
      function () {
        fuelRecords = [];
        tripRecords = [];
        saveData();
        navigateTo('home');
      }
    );
  };

  // ==================== Render Dispatch ====================
  function renderPage() {
    const oldFab = document.querySelector('.fab');
    if (oldFab) oldFab.remove();

    switch (currentPage) {
      case 'home': renderHome(); break;
      case 'fuel': renderFuelPage(); break;
      case 'trip': renderTripPage(); break;
      case 'stats': renderStatsPage(); break;
      case 'settings': renderSettingsPage(); break;
    }
  }

  function refreshCurrentPage() {
    renderPage();
  }

  // ==================== Global Exports ====================
  window._closeModal = closeModal;
  window._showFuelForm = function () { showFuelForm(); };
  window._showTripForm = function () { showTripForm(); };
  window._refreshCurrentPage = refreshCurrentPage;

  // ==================== Event Delegation ====================
  document.addEventListener('click', function (e) {
    // Bottom nav
    const navItem = e.target.closest('.nav-item');
    if (navItem) {
      navigateTo(navItem.dataset.page);
      return;
    }

    // Delete fuel
    const delFuel = e.target.closest('[data-action="delete-fuel"]');
    if (delFuel) {
      const id = delFuel.dataset.id;
      const record = fuelRecords.find((r) => r.id === id);
      const label = record ? record.date + ' 的加油记录' : '该条加油记录';
      showConfirm('确定要删除 ' + label + ' 吗？', function () {
        deleteFuelRecord(id);
        refreshCurrentPage();
      });
      return;
    }

    // Delete trip
    const delTrip = e.target.closest('[data-action="delete-trip"]');
    if (delTrip) {
      const id = delTrip.dataset.id;
      const record = tripRecords.find((r) => r.id === id);
      const label = record ? record.date + ' 的行程记录' : '该条行程记录';
      showConfirm('确定要删除 ' + label + ' 吗？', function () {
        deleteTripRecord(id);
        refreshCurrentPage();
      });
      return;
    }
  });

  // Modal overlay click to close
  modalOverlay.addEventListener('click', function (e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  // Confirm dialog buttons
  confirmOk.addEventListener('click', function () {
    if (confirmCallback) {
      confirmCallback();
    }
    hideConfirm();
  });

  confirmCancel.addEventListener('click', hideConfirm);

  confirmDialog.addEventListener('click', function (e) {
    if (e.target === confirmDialog) {
      hideConfirm();
    }
  });

  // Keyboard
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!modalOverlay.classList.contains('hidden')) {
        closeModal();
      } else if (!confirmDialog.classList.contains('hidden')) {
        hideConfirm();
      }
    }
  });

  // ==================== HTML Escape ====================
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== Init ====================
  function init() {
    loadData();
    navigateTo('home');

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(function () {
        // Silent fail - app works without SW
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
