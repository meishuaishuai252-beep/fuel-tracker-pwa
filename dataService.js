(function () {
  'use strict';

  var STORAGE_KEYS = {
    fuelRecords: 'fuelRecords',
    tripRecords: 'tripRecords',
    chargeRecords: 'chargeRecords',
    energyMode: 'energyMode'
  };

  var ENERGY_MODES = ['fuel', 'electric', 'hybrid'];

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function cloneRecords(records) {
    return records.map(function (record) {
      return Object.assign({}, record);
    });
  }

  function normalizeData(data) {
    return {
      fuelRecords: Array.isArray(data && data.fuelRecords) ? cloneRecords(data.fuelRecords) : [],
      tripRecords: Array.isArray(data && data.tripRecords) ? cloneRecords(data.tripRecords) : [],
      chargeRecords: Array.isArray(data && data.chargeRecords) ? cloneRecords(data.chargeRecords) : []
    };
  }

  function normalizeEnergyMode(mode) {
    return ENERGY_MODES.indexOf(mode) >= 0 ? mode : 'fuel';
  }

  function getEnergyMode() {
    return normalizeEnergyMode(localStorage.getItem(STORAGE_KEYS.energyMode) || 'fuel');
  }

  function setEnergyMode(mode) {
    var nextMode = normalizeEnergyMode(mode);
    localStorage.setItem(STORAGE_KEYS.energyMode, nextMode);
    return nextMode;
  }

  function loadData() {
    return normalizeData({
      fuelRecords: readJson(STORAGE_KEYS.fuelRecords, []),
      tripRecords: readJson(STORAGE_KEYS.tripRecords, []),
      chargeRecords: readJson(STORAGE_KEYS.chargeRecords, [])
    });
  }

  function saveData(data) {
    var normalized = normalizeData(data);
    writeJson(STORAGE_KEYS.fuelRecords, normalized.fuelRecords);
    writeJson(STORAGE_KEYS.tripRecords, normalized.tripRecords);
    writeJson(STORAGE_KEYS.chargeRecords, normalized.chargeRecords);
    return normalized;
  }

  function addFuelRecord(record) {
    var data = loadData();
    data.fuelRecords.push(Object.assign({}, record));
    return saveData(data);
  }

  function updateFuelRecord(id, record) {
    var data = loadData();
    data.fuelRecords = data.fuelRecords.map(function (item) {
      return item.id === id ? Object.assign({}, record) : item;
    });
    return saveData(data);
  }

  function deleteFuelRecord(id) {
    var data = loadData();
    data.fuelRecords = data.fuelRecords.filter(function (record) {
      return record.id !== id;
    });
    return saveData(data);
  }

  function addTripRecord(record) {
    var data = loadData();
    data.tripRecords.push(Object.assign({}, record));
    return saveData(data);
  }

  function updateTripRecord(id, record) {
    var data = loadData();
    data.tripRecords = data.tripRecords.map(function (item) {
      return item.id === id ? Object.assign({}, record) : item;
    });
    return saveData(data);
  }

  function deleteTripRecord(id) {
    var data = loadData();
    data.tripRecords = data.tripRecords.filter(function (record) {
      return record.id !== id;
    });
    return saveData(data);
  }

  function addChargeRecord(record) {
    var data = loadData();
    data.chargeRecords.push(Object.assign({}, record));
    return saveData(data);
  }

  function updateChargeRecord(id, record) {
    var data = loadData();
    data.chargeRecords = data.chargeRecords.map(function (item) {
      return item.id === id ? Object.assign({}, record) : item;
    });
    return saveData(data);
  }

  function deleteChargeRecord(id) {
    var data = loadData();
    data.chargeRecords = data.chargeRecords.filter(function (record) {
      return record.id !== id;
    });
    return saveData(data);
  }

  function clearAllData() {
    return saveData({ fuelRecords: [], tripRecords: [], chargeRecords: [] });
  }

  function validateImportData(data) {
    if (!data || !Array.isArray(data.fuelRecords) || !Array.isArray(data.tripRecords)) {
      throw new Error('Invalid backup data format');
    }
    data.chargeRecords = Array.isArray(data.chargeRecords) ? data.chargeRecords : [];
    data.energyMode = normalizeEnergyMode(data.energyMode || 'fuel');
    return normalizeData(data);
  }

  function importData(data) {
    var normalized = validateImportData(data);
    setEnergyMode(data.energyMode);
    return saveData(normalized);
  }

  function createExportData() {
    var data = loadData();
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      energyMode: getEnergyMode(),
      fuelRecords: data.fuelRecords,
      tripRecords: data.tripRecords,
      chargeRecords: data.chargeRecords
    };
  }

  function downloadExport(filename) {
    var blob = new Blob([JSON.stringify(createExportData(), null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function readImportFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) {
        try {
          resolve(validateImportData(JSON.parse(event.target.result)));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = function () {
        reject(reader.error || new Error('Failed to read import file'));
      };
      reader.readAsText(file);
    });
  }

  window.dataService = {
    loadData: loadData,
    saveData: saveData,
    getEnergyMode: getEnergyMode,
    setEnergyMode: setEnergyMode,
    addFuelRecord: addFuelRecord,
    updateFuelRecord: updateFuelRecord,
    deleteFuelRecord: deleteFuelRecord,
    addTripRecord: addTripRecord,
    updateTripRecord: updateTripRecord,
    deleteTripRecord: deleteTripRecord,
    addChargeRecord: addChargeRecord,
    updateChargeRecord: updateChargeRecord,
    deleteChargeRecord: deleteChargeRecord,
    clearAllData: clearAllData,
    importData: importData,
    createExportData: createExportData,
    downloadExport: downloadExport,
    readImportFile: readImportFile
  };
})();
