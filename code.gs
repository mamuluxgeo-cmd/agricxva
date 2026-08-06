/*******************************************************
 * Supplier Flow Control — Code.gs
 * Google Sheet = Database
 * GitHub / Website = Frontend
 *
 * Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1JEBM2tXzoKZLLyEOijSjRBaFpv6db17lLZiiutte4sQ/edit
 *******************************************************/

const CONFIG = {
  SPREADSHEET_ID: '1JEBM2tXzoKZLLyEOijSjRBaFpv6db17lLZiiutte4sQ',
  CACHE_SECONDS: 25,
  TZ: 'Asia/Tbilisi',
  DEFAULT_COMPANIES: ['Brand House', 'Koncept'],
  DEFAULT_CURRENCIES: ['CNY', 'USD', 'GEL', 'EUR', 'TRY'],
};

const SHEETS = {
  SETTINGS: 'Settings',
  SUPPLIERS: 'Suppliers',
  GOODS: 'Goods',
  SHIPMENT_GROUPS: 'ShipmentGroups',
  CHARGES: 'SupplierCharges',
  BANKS: 'Banks',
  BANK_DEPOSITS: 'BankDeposits',
  SUPPLIER_PAYMENTS: 'SupplierPayments',
  ACTIVITY: 'ActivityLog',
};

const HEADERS = {
  [SHEETS.SETTINGS]: [
    'Key', 'Value', 'Notes', 'UpdatedAt'
  ],

  [SHEETS.SUPPLIERS]: [
    'ID',
    'Company',
    'SupplierName',
    'Country',
    'Category',
    'Currency',
    'Status',
    'OpeningBalance',
    'OpeningBalanceType',
    'OpeningBalanceSigned',
    'Comment',
    'CreatedAt',
    'UpdatedAt',
    'Deleted'
  ],

  [SHEETS.GOODS]: [
    'ID',
    'Company',
    'SupplierID',
    'SupplierName',
    'ProductName',
    'AmountCNY',
    'Boxes',
    'Status',
    'ShipmentGroupID',
    'ShipmentGroupName',
    'OrderDate',
    'SentDate',
    'ExpectedArrivalDate',
    'ReceivedDate',
    'ReceivedAmountCNY',
    'ReceivedBoxes',
    'DifferenceCNY',
    'DifferenceBoxes',
    'DifferenceComment',
    'Comment',
    'CreatedAt',
    'UpdatedAt',
    'Deleted'
  ],

  [SHEETS.SHIPMENT_GROUPS]: [
    'ID',
    'Company',
    'GroupName',
    'OriginCountry',
    'SentDate',
    'ExpectedArrivalDate',
    'Status',
    'Comment',
    'CreatedAt',
    'UpdatedAt',
    'Deleted'
  ],

  [SHEETS.CHARGES]: [
    'ID',
    'Company',
    'SupplierID',
    'SupplierName',
    'ChargeDate',
    'AmountCNY',
    'Comment',
    'CreatedAt',
    'UpdatedAt',
    'Deleted'
  ],

  [SHEETS.BANKS]: [
    'ID',
    'Company',
    'BankName',
    'AccountName',
    'Currency',
    'OpeningBalance',
    'Status',
    'Comment',
    'CreatedAt',
    'UpdatedAt',
    'Deleted'
  ],

  [SHEETS.BANK_DEPOSITS]: [
    'ID',
    'Company',
    'BankID',
    'BankName',
    'DepositDate',
    'Amount',
    'TransferCurrency',
    'FeePercent',
    'Fee',
    'NetTransferAmount',
    'NetAmount',
    'Currency',
    'Comment',
    'CreatedAt',
    'UpdatedAt',
    'Deleted'
  ],

  [SHEETS.SUPPLIER_PAYMENTS]: [
    'ID',
    'Company',
    'SupplierID',
    'SupplierName',
    'BankID',
    'BankName',
    'PaymentDate',
    'BankOutAmount',
    'BankFee',
    'BankTotalOut',
    'BankCurrency',
    'ReflectedCNY',
    'Comment',
    'CreatedAt',
    'UpdatedAt',
    'Deleted'
  ],

  [SHEETS.ACTIVITY]: [
    'ID',
    'Company',
    'Entity',
    'EntityID',
    'Action',
    'Comment',
    'CreatedAt'
  ],
};

/*******************************************************
 * WEB API
 *******************************************************/

function doGet(e) {
  try {
    const action = getParam_(e, 'action', 'getAppData');
    const company = getParam_(e, 'company', '');
    const id = getParam_(e, 'id', '');

    let result;

    if (action === 'setup') {
      result = setupDatabase();
    } else if (action === 'getAppData') {
      result = getAppData(company);
    } else if (action === 'getSupplierCard') {
      result = getSupplierCard(id);
    } else if (action === 'clearCache') {
      result = clearCache_();
    } else {
      result = error_('UNKNOWN_ACTION', 'Unknown GET action: ' + action);
    }

    return json_(result);
  } catch (err) {
    return json_(error_('SERVER_ERROR', err.message, err.stack));
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = body.action;

    let result;

    switch (action) {
      case 'setup':
        result = setupDatabase();
        break;

      case 'createSupplier':
        result = createSupplier(body.data || {});
        break;
      case 'updateSupplier':
        result = updateRowById_(SHEETS.SUPPLIERS, body.id, normalizeSupplier_(body.data || {}, true));
        break;
      case 'deleteSupplier':
        result = softDelete_(SHEETS.SUPPLIERS, body.id);
        break;

      case 'createGoods':
        result = createGoods(body.data || {});
        break;
      case 'updateGoods':
        result = updateGoods(body.id, body.data || {});
        break;
      case 'deleteGoods':
        result = softDelete_(SHEETS.GOODS, body.id);
        break;
      case 'moveGoods':
        result = moveGoods(body.id, body.status || (body.data && body.data.Status), body.data || {});
        break;

      case 'createShipmentGroup':
        result = createShipmentGroup(body.data || {});
        break;
      case 'updateShipmentGroup':
        result = updateRowById_(SHEETS.SHIPMENT_GROUPS, body.id, normalizeShipmentGroup_(body.data || {}, true));
        break;
      case 'deleteShipmentGroup':
        result = softDelete_(SHEETS.SHIPMENT_GROUPS, body.id);
        break;

      case 'createCharge':
        result = createCharge(body.data || {});
        break;
      case 'updateCharge':
        result = updateRowById_(SHEETS.CHARGES, body.id, normalizeCharge_(body.data || {}, true));
        break;
      case 'deleteCharge':
        result = softDelete_(SHEETS.CHARGES, body.id);
        break;

      case 'createBank':
        result = createBank(body.data || {});
        break;
      case 'updateBank':
        result = updateRowById_(SHEETS.BANKS, body.id, normalizeBank_(body.data || {}, true));
        break;
      case 'deleteBank':
        result = softDelete_(SHEETS.BANKS, body.id);
        break;

      case 'createBankDeposit':
        result = createBankDeposit(body.data || {});
        break;
      case 'updateBankDeposit':
        result = updateRowById_(SHEETS.BANK_DEPOSITS, body.id, normalizeBankDeposit_(body.data || {}, true));
        break;
      case 'deleteBankDeposit':
        result = softDelete_(SHEETS.BANK_DEPOSITS, body.id);
        break;

      case 'createSupplierPayment':
        result = createSupplierPayment(body.data || {});
        break;
      case 'updateSupplierPayment':
        result = updateRowById_(SHEETS.SUPPLIER_PAYMENTS, body.id, normalizeSupplierPayment_(body.data || {}, true));
        break;
      case 'deleteSupplierPayment':
        result = softDelete_(SHEETS.SUPPLIER_PAYMENTS, body.id);
        break;

      default:
        result = error_('UNKNOWN_ACTION', 'Unknown POST action: ' + action);
    }

    clearCache_();
    return json_(result);
  } catch (err) {
    return json_(error_('SERVER_ERROR', err.message, err.stack));
  }
}

/*******************************************************
 * SETUP
 *******************************************************/

function setupDatabase() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const ss = getSpreadsheet_();

    Object.keys(HEADERS).forEach(sheetName => {
      const sh = getOrCreateSheet_(ss, sheetName);
      setupSheet_(sh, HEADERS[sheetName]);
    });

    seedSettings_();
    formatAllSheets_();
    clearCache_();

    return ok_({
      message: 'Database setup completed',
      sheets: Object.keys(HEADERS),
    });
  } finally {
    lock.releaseLock();
  }
}

function setupSheet_(sheet, headers) {
  const existingLastColumn = Math.max(sheet.getLastColumn(), 1);
  const firstRow = sheet.getRange(1, 1, 1, existingLastColumn).getValues()[0].filter(String);

  if (firstRow.length === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const missing = headers.filter(h => !firstRow.includes(h));
    if (missing.length) {
      sheet.getRange(1, firstRow.length + 1, 1, missing.length).setValues([missing]);
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .setFontWeight('bold')
    .setBackground('#111827')
    .setFontColor('#ffffff');

  if (sheet.getFilter()) sheet.getFilter().remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), sheet.getLastColumn()).createFilter();
  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function seedSettings_() {
  const sh = getSheet_(SHEETS.SETTINGS);
  const rows = readRows_(SHEETS.SETTINGS);
  if (rows.length) return;

  const now = now_();
  const values = [
    ['Companies', CONFIG.DEFAULT_COMPANIES.join(','), 'System company filter values', now],
    ['Currencies', CONFIG.DEFAULT_CURRENCIES.join(','), 'Allowed currencies', now],
    ['GoodsStatuses', 'შეკვეთა,გამოიგზავნა,მიღებულია,დასრულებულია,პრობლემურია', 'Kanban statuses', now],
    ['SupplierStatuses', 'აქტიური,პასიური', 'Supplier status values', now],
    ['ShipmentStatuses', 'გზაში,ნაწილობრივ მიღებული,მიღებულია,დასრულებულია,პრობლემურია', 'Shipment group statuses', now],
  ];

  sh.getRange(2, 1, values.length, values[0].length).setValues(values);
}

function formatAllSheets_() {
  Object.keys(HEADERS).forEach(name => {
    const sh = getSheet_(name);
    sh.autoResizeColumns(1, sh.getLastColumn());
  });
}

/*******************************************************
 * CREATE FUNCTIONS
 *******************************************************/

function createSupplier(data) {
  const row = normalizeSupplier_(data);
  row.ID = makeId_('SUP');
  appendObject_(SHEETS.SUPPLIERS, row);
  logActivity_(row.Company, 'Supplier', row.ID, 'CREATE', row.SupplierName);
  return ok_({ id: row.ID, row });
}

function createGoods(data) {
  const row = normalizeGoods_(data);
  row.ID = makeId_('GDS');
  fillSupplierName_(row);
  fillShipmentGroupName_(row);
  appendObject_(SHEETS.GOODS, row);
  logActivity_(row.Company, 'Goods', row.ID, 'CREATE', row.ProductName);
  return ok_({ id: row.ID, row });
}

function createShipmentGroup(data) {
  const row = normalizeShipmentGroup_(data);
  row.ID = makeId_('SHIP');
  appendObject_(SHEETS.SHIPMENT_GROUPS, row);
  logActivity_(row.Company, 'ShipmentGroup', row.ID, 'CREATE', row.GroupName);
  return ok_({ id: row.ID, row });
}

function createCharge(data) {
  const row = normalizeCharge_(data);
  row.ID = makeId_('CHG');
  fillSupplierName_(row);
  appendObject_(SHEETS.CHARGES, row);
  logActivity_(row.Company, 'Charge', row.ID, 'CREATE', row.AmountCNY + ' CNY');
  return ok_({ id: row.ID, row });
}

function createBank(data) {
  const row = normalizeBank_(data);
  row.ID = makeId_('BNK');
  appendObject_(SHEETS.BANKS, row);
  logActivity_(row.Company, 'Bank', row.ID, 'CREATE', row.BankName);
  return ok_({ id: row.ID, row });
}

function createBankDeposit(data) {
  const row = normalizeBankDeposit_(data);
  row.ID = makeId_('DEP');
  fillBankName_(row);
  appendObject_(SHEETS.BANK_DEPOSITS, row);
  logActivity_(row.Company, 'BankDeposit', row.ID, 'CREATE', row.NetAmount + ' ' + row.Currency);
  return ok_({ id: row.ID, row });
}

function createSupplierPayment(data) {
  const row = normalizeSupplierPayment_(data);
  row.ID = makeId_('PAY');
  fillSupplierName_(row);
  fillBankName_(row);
  appendObject_(SHEETS.SUPPLIER_PAYMENTS, row);
  logActivity_(row.Company, 'SupplierPayment', row.ID, 'CREATE', row.ReflectedCNY + ' CNY');
  return ok_({ id: row.ID, row });
}

/*******************************************************
 * GOODS FLOW
 *******************************************************/

function updateGoods(id, data) {
  const normalized = normalizeGoods_(data, true);
  if (normalized.SupplierID && !normalized.SupplierName) {
    fillSupplierName_(normalized);
  }
  if (normalized.ShipmentGroupID && !normalized.ShipmentGroupName) {
    fillShipmentGroupName_(normalized);
  }
  return updateRowById_(SHEETS.GOODS, id, normalized);
}

function moveGoods(id, status, data) {
  const allowed = ['შეკვეთა', 'გამოიგზავნა', 'მიღებულია', 'დასრულებულია', 'პრობლემურია'];
  if (!allowed.includes(status)) {
    return error_('INVALID_STATUS', 'Invalid goods status');
  }

  const patch = Object.assign({}, data || {});
  patch.Status = status;

  if (status === 'გამოიგზავნა' && !patch.SentDate) {
    patch.SentDate = today_();
  }

  if (status === 'მიღებულია' && !patch.ReceivedDate) {
    patch.ReceivedDate = today_();
  }

  if (status === 'დასრულებულია') {
    patch.DifferenceCNY = toNumber_(patch.ReceivedAmountCNY) - toNumber_(patch.AmountCNY);
    patch.DifferenceBoxes = toNumber_(patch.ReceivedBoxes) - toNumber_(patch.Boxes);
  }

  return updateGoods(id, patch);
}

/*******************************************************
 * DASHBOARD DATA
 *******************************************************/

function getAppData(company) {
  const cacheKey = 'APP_DATA_' + (company || 'ALL');

  // Cache is optional. If data becomes too large, Apps Script can throw:
  // "Argument too large: value". In that case the app must continue without cache.
  try {
    const cached = CacheService.getScriptCache().get(cacheKey);
    if (cached) {
      return ok_(JSON.parse(cached), true);
    }
  } catch (err) {
    // Ignore cache read errors.
  }

  const suppliers = filterCompany_(activeRows_(SHEETS.SUPPLIERS), company);
  const goods = filterCompany_(activeRows_(SHEETS.GOODS), company);
  const shipmentGroups = filterCompany_(activeRows_(SHEETS.SHIPMENT_GROUPS), company);
  const charges = filterCompany_(activeRows_(SHEETS.CHARGES), company);
  const banks = filterCompany_(activeRows_(SHEETS.BANKS), company);
  const bankDeposits = filterCompany_(activeRows_(SHEETS.BANK_DEPOSITS), company);
  const supplierPayments = filterCompany_(activeRows_(SHEETS.SUPPLIER_PAYMENTS), company);

  const supplierCards = suppliers.map(s => buildSupplierSummary_(s, goods, charges, supplierPayments));
  const bankCards = banks.map(b => buildBankSummary_(b, bankDeposits, supplierPayments));

  const dashboard = {
    suppliersCount: suppliers.length,
    activeSuppliersCount: suppliers.filter(s => s.Status === 'აქტიური').length,
    goodsOrdersCount: goods.filter(g => g.Status === 'შეკვეთა').length,
    goodsSentCount: goods.filter(g => g.Status === 'გამოიგზავნა').length,
    goodsReceivedCount: goods.filter(g => g.Status === 'მიღებულია').length,
    goodsDoneCount: goods.filter(g => g.Status === 'დასრულებულია').length,
    totalChargesCNY: sum_(charges, 'AmountCNY'),
    totalPaymentsCNY: sum_(supplierPayments, 'ReflectedCNY'),
    totalGoodsReceivedCNY: goods.reduce((a, g) => a + goodsReceivedValue_(g), 0),
    totalGoodsDifferenceCNY: sum_(goods, 'DifferenceCNY'),
    totalSupplierBalanceCNY: supplierCards.reduce((a, x) => a + toNumber_(x.balanceCNY), 0),
    totalBankFees: sum_(bankDeposits, 'Fee') + sum_(supplierPayments, 'BankFee'),
  };

  const data = {
    company: company || 'ALL',
    dashboard,
    suppliers,
    supplierCards,
    goods,
    shipmentGroups: enrichShipmentGroups_(shipmentGroups, goods),
    charges,
    banks,
    bankCards,
    bankDeposits,
    supplierPayments,
    settings: getSettings_(),
    generatedAt: now_(),
  };

  try {
    const cacheValue = JSON.stringify(data);
    // Apps Script cache values have a size limit. Keep cache only for smaller responses.
    if (cacheValue.length < 90000) {
      CacheService.getScriptCache().put(cacheKey, cacheValue, CONFIG.CACHE_SECONDS);
    }
  } catch (err) {
    // Ignore cache write errors so the website never breaks because of cache size.
  }

  return ok_(data, false);
}

function getSupplierCard(supplierId) {
  const suppliers = activeRows_(SHEETS.SUPPLIERS);
  const supplier = suppliers.find(s => s.ID === supplierId);
  if (!supplier) return error_('NOT_FOUND', 'Supplier not found');

  const goods = activeRows_(SHEETS.GOODS).filter(x => x.SupplierID === supplierId);
  const charges = activeRows_(SHEETS.CHARGES).filter(x => x.SupplierID === supplierId);
  const payments = activeRows_(SHEETS.SUPPLIER_PAYMENTS).filter(x => x.SupplierID === supplierId);

  const summary = buildSupplierSummary_(supplier, goods, charges, payments);
  const history = buildSupplierHistory_(supplier, goods, charges, payments);

  return ok_({
    supplier,
    summary,
    goods,
    charges,
    payments,
    history,
  });
}

/*******************************************************
 * SUMMARIES
 *******************************************************/

function buildSupplierSummary_(supplier, goods, charges, payments) {
  const supplierGoods = goods.filter(x => x.SupplierID === supplier.ID);
  const supplierCharges = charges.filter(x => x.SupplierID === supplier.ID);
  const supplierPayments = payments.filter(x => x.SupplierID === supplier.ID);

  const opening = toNumber_(supplier.OpeningBalanceSigned);
  const totalCharges = sum_(supplierCharges, 'AmountCNY');
  const totalPayments = sum_(supplierPayments, 'ReflectedCNY');
  const goodsReceived = supplierGoods.reduce((a, g) => a + goodsReceivedValue_(g), 0);
  const goodsDiff = sum_(supplierGoods, 'DifferenceCNY');

  const balance = opening + totalCharges + totalPayments - goodsReceived;

  return {
    supplierId: supplier.ID,
    company: supplier.Company,
    supplierName: supplier.SupplierName,
    country: supplier.Country,
    category: supplier.Category,
    currency: supplier.Currency,
    status: supplier.Status,
    openingBalanceCNY: opening,
    totalChargesCNY: totalCharges,
    totalPaymentsCNY: totalPayments,
    totalGoodsReceivedCNY: goodsReceived,
    goodsDifferenceCNY: goodsDiff,
    balanceCNY: balance,
    activeGoodsCount: supplierGoods.filter(g => g.Status !== 'დასრულებულია').length,
    lastActivity: findLastDate_(supplierGoods.concat(supplierCharges).concat(supplierPayments)),
  };
}

function buildBankSummary_(bank, deposits, payments) {
  const bankDeposits = deposits.filter(x => x.BankID === bank.ID);
  const bankPayments = payments.filter(x => x.BankID === bank.ID);

  const opening = toNumber_(bank.OpeningBalance);
  const depositedNet = sum_(bankDeposits, 'NetAmount');
  const depositFees = sum_(bankDeposits, 'Fee');
  const supplierOut = sum_(bankPayments, 'BankOutAmount');
  const paymentFees = sum_(bankPayments, 'BankFee');
  const totalOut = sum_(bankPayments, 'BankTotalOut');

  const balance = opening + depositedNet - totalOut;

  return {
    bankId: bank.ID,
    company: bank.Company,
    bankName: bank.BankName,
    accountName: bank.AccountName,
    currency: bank.Currency,
    status: bank.Status,
    openingBalance: opening,
    depositedNet,
    depositFees,
    supplierOut,
    paymentFees,
    totalOut,
    balance,
  };
}

function enrichShipmentGroups_(groups, goods) {
  return groups.map(g => {
    const items = goods.filter(x => x.ShipmentGroupID === g.ID);
    return Object.assign({}, g, {
      ItemsCount: items.length,
      TotalAmountCNY: sum_(items, 'AmountCNY'),
      TotalBoxes: sum_(items, 'Boxes'),
      ReceivedAmountCNY: sum_(items, 'ReceivedAmountCNY'),
      ReceivedBoxes: sum_(items, 'ReceivedBoxes'),
      DifferenceCNY: sum_(items, 'DifferenceCNY'),
      DifferenceBoxes: sum_(items, 'DifferenceBoxes'),
    });
  });
}

function buildSupplierHistory_(supplier, goods, charges, payments) {
  const rows = [];

  rows.push({
    date: supplier.CreatedAt,
    type: 'საწყისი ბალანსი',
    amountCNY: supplier.OpeningBalanceSigned,
    comment: supplier.Comment || '',
  });

  goods.forEach(g => rows.push({
    date: g.UpdatedAt || g.CreatedAt,
    type: 'საქონელი',
    status: g.Status,
    productName: g.ProductName,
    amountCNY: g.AmountCNY,
    differenceCNY: g.DifferenceCNY,
    comment: g.DifferenceComment || g.Comment || '',
  }));

  charges.forEach(c => rows.push({
    date: c.ChargeDate,
    type: 'დარიცხვა',
    amountCNY: c.AmountCNY,
    comment: c.Comment || '',
  }));

  payments.forEach(p => rows.push({
    date: p.PaymentDate,
    type: 'გადარიცხვა',
    bankName: p.BankName,
    bankOutAmount: p.BankOutAmount,
    bankFee: p.BankFee,
    reflectedCNY: p.ReflectedCNY,
    comment: p.Comment || '',
  }));

  return rows.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

function goodsReceivedValue_(g) {
  if (!g) return 0;
  const status = String(g.Status || '');
  if (status !== 'მიღებულია' && status !== 'დასრულებულია') return 0;
  const received = toNumber_(g.ReceivedAmountCNY);
  return received || toNumber_(g.AmountCNY);
}

/*******************************************************
 * NORMALIZERS
 *******************************************************/

function normalizeSupplier_(data, partial) {
  const opening = partial && data.OpeningBalance === undefined ? undefined : toNumber_(data.OpeningBalance);
  const type = data.OpeningBalanceType || '';
  let signed = data.OpeningBalanceSigned;

  if (!partial && (signed === undefined || signed === '')) {
    signed = type === 'მინუსი' ? -Math.abs(opening) : Math.abs(opening);
  } else if (!partial) {
    signed = toNumber_(signed);
  } else if (partial && data.OpeningBalance !== undefined && (signed === undefined || signed === '')) {
    signed = type === 'მინუსი' ? -Math.abs(toNumber_(data.OpeningBalance)) : Math.abs(toNumber_(data.OpeningBalance));
  }

  return cleanObject_({
    Company: data.Company,
    SupplierName: data.SupplierName,
    Country: data.Country,
    Category: data.Category,
    Currency: data.Currency || (partial ? undefined : 'CNY'),
    Status: data.Status || (partial ? undefined : 'აქტიური'),
    OpeningBalance: opening,
    OpeningBalanceType: type || (partial ? undefined : 'პლიუსი'),
    OpeningBalanceSigned: signed,
    Comment: data.Comment,
    UpdatedAt: now_(),
    CreatedAt: partial ? undefined : now_(),
    Deleted: partial ? undefined : false,
  }, partial);
}

function normalizeGoods_(data, partial) {
  const hasAmount = Object.prototype.hasOwnProperty.call(data, 'AmountCNY');
  const hasBoxes = Object.prototype.hasOwnProperty.call(data, 'Boxes');
  const hasReceivedAmount = Object.prototype.hasOwnProperty.call(data, 'ReceivedAmountCNY');
  const hasReceivedBoxes = Object.prototype.hasOwnProperty.call(data, 'ReceivedBoxes');

  const amount = hasAmount ? toNumber_(data.AmountCNY) : undefined;
  const boxes = hasBoxes ? toNumber_(data.Boxes) : undefined;
  const receivedAmount = hasReceivedAmount ? toNumber_(data.ReceivedAmountCNY) : undefined;
  const receivedBoxes = hasReceivedBoxes ? toNumber_(data.ReceivedBoxes) : undefined;

  let diffCNY = data.DifferenceCNY;
  let diffBoxes = data.DifferenceBoxes;

  if (hasReceivedAmount && hasAmount) diffCNY = toNumber_(receivedAmount) - toNumber_(amount);
  if (hasReceivedBoxes && hasBoxes) diffBoxes = toNumber_(receivedBoxes) - toNumber_(boxes);

  return cleanObject_({
    Company: data.Company,
    SupplierID: data.SupplierID,
    SupplierName: data.SupplierName,
    ProductName: data.ProductName,
    AmountCNY: amount,
    Boxes: boxes,
    Status: data.Status || (partial ? undefined : 'შეკვეთა'),
    ShipmentGroupID: data.ShipmentGroupID,
    ShipmentGroupName: data.ShipmentGroupName,
    OrderDate: data.OrderDate || (partial ? undefined : today_()),
    SentDate: data.SentDate,
    ExpectedArrivalDate: data.ExpectedArrivalDate,
    ReceivedDate: data.ReceivedDate,
    ReceivedAmountCNY: receivedAmount,
    ReceivedBoxes: receivedBoxes,
    DifferenceCNY: diffCNY,
    DifferenceBoxes: diffBoxes,
    DifferenceComment: data.DifferenceComment,
    Comment: data.Comment,
    UpdatedAt: now_(),
    CreatedAt: partial ? undefined : now_(),
    Deleted: partial ? undefined : false,
  }, partial);
}

function normalizeShipmentGroup_(data, partial) {
  return cleanObject_({
    Company: data.Company,
    GroupName: data.GroupName,
    OriginCountry: data.OriginCountry,
    SentDate: data.SentDate,
    ExpectedArrivalDate: data.ExpectedArrivalDate,
    Status: data.Status || 'გზაში',
    Comment: data.Comment,
    UpdatedAt: now_(),
    CreatedAt: partial ? undefined : now_(),
    Deleted: partial ? undefined : false,
  }, partial);
}

function normalizeCharge_(data, partial) {
  return cleanObject_({
    Company: data.Company,
    SupplierID: data.SupplierID,
    SupplierName: data.SupplierName,
    ChargeDate: data.ChargeDate || today_(),
    AmountCNY: partial && data.AmountCNY === undefined ? undefined : toNumber_(data.AmountCNY),
    Comment: data.Comment,
    UpdatedAt: now_(),
    CreatedAt: partial ? undefined : now_(),
    Deleted: partial ? undefined : false,
  }, partial);
}

function normalizeBank_(data, partial) {
  return cleanObject_({
    Company: data.Company,
    BankName: data.BankName,
    AccountName: data.AccountName,
    Currency: data.Currency || 'USD',
    OpeningBalance: partial && data.OpeningBalance === undefined ? undefined : toNumber_(data.OpeningBalance),
    Status: data.Status || 'აქტიური',
    Comment: data.Comment,
    UpdatedAt: now_(),
    CreatedAt: partial ? undefined : now_(),
    Deleted: partial ? undefined : false,
  }, partial);
}

function normalizeBankDeposit_(data, partial) {
  const hasAmount = Object.prototype.hasOwnProperty.call(data, 'Amount');
  const hasFee = Object.prototype.hasOwnProperty.call(data, 'Fee');
  const hasFeePercent = Object.prototype.hasOwnProperty.call(data, 'FeePercent');
  const hasNetTransfer = Object.prototype.hasOwnProperty.call(data, 'NetTransferAmount');
  const hasNetAmount = Object.prototype.hasOwnProperty.call(data, 'NetAmount');

  const amount = hasAmount ? toNumber_(data.Amount) : undefined;
  const feePercent = hasFeePercent ? toNumber_(data.FeePercent) : undefined;
  let fee = hasFee ? toNumber_(data.Fee) : undefined;

  if (hasAmount && hasFeePercent && !hasFee) {
    fee = amount * feePercent / 100;
  }

  const netTransfer = hasNetTransfer ? toNumber_(data.NetTransferAmount) : (hasAmount ? amount - toNumber_(fee) : undefined);
  const netAmount = hasNetAmount ? toNumber_(data.NetAmount) : netTransfer;

  return cleanObject_({
    Company: data.Company,
    BankID: data.BankID,
    BankName: data.BankName,
    DepositDate: data.DepositDate || today_(),
    Amount: amount,
    TransferCurrency: data.TransferCurrency || data.Currency || 'USD',
    FeePercent: feePercent,
    Fee: fee,
    NetTransferAmount: netTransfer,
    NetAmount: netAmount,
    Currency: data.Currency || data.BankCurrency || 'CNY',
    Comment: data.Comment,
    UpdatedAt: now_(),
    CreatedAt: partial ? undefined : now_(),
    Deleted: partial ? undefined : false,
  }, partial);
}

function normalizeSupplierPayment_(data, partial) {
  const out = partial && data.BankOutAmount === undefined ? undefined : toNumber_(data.BankOutAmount);
  const fee = partial && data.BankFee === undefined ? undefined : toNumber_(data.BankFee);
  return cleanObject_({
    Company: data.Company,
    SupplierID: data.SupplierID,
    SupplierName: data.SupplierName,
    BankID: data.BankID,
    BankName: data.BankName,
    PaymentDate: data.PaymentDate || today_(),
    BankOutAmount: out,
    BankFee: fee,
    BankTotalOut: (out === undefined && fee === undefined) ? undefined : toNumber_(out) + toNumber_(fee),
    BankCurrency: data.BankCurrency || 'USD',
    ReflectedCNY: partial && data.ReflectedCNY === undefined ? undefined : toNumber_(data.ReflectedCNY),
    Comment: data.Comment,
    UpdatedAt: now_(),
    CreatedAt: partial ? undefined : now_(),
    Deleted: partial ? undefined : false,
  }, partial);
}

/*******************************************************
 * ROW HELPERS
 *******************************************************/

function appendObject_(sheetName, obj) {
  const sh = getSheet_(sheetName);
  const headers = getHeaders_(sheetName);
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sh.appendRow(row);
}

function updateRowById_(sheetName, id, patch) {
  if (!id) return error_('MISSING_ID', 'ID is required');

  const sh = getSheet_(sheetName);
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('ID');
  if (idCol === -1) return error_('NO_ID_COLUMN', 'No ID column in ' + sheetName);

  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(id)) {
      Object.keys(patch).forEach(key => {
        const c = headers.indexOf(key);
        if (c !== -1) sh.getRange(r + 1, c + 1).setValue(patch[key]);
      });

      const updatedAtCol = headers.indexOf('UpdatedAt');
      if (updatedAtCol !== -1) sh.getRange(r + 1, updatedAtCol + 1).setValue(now_());

      logActivity_(getCompanyFromPatchOrRow_(patch, values[r], headers), sheetName, id, 'UPDATE', '');
      clearCache_();
      return ok_({ id, updated: true });
    }
  }

  return error_('NOT_FOUND', 'Row not found: ' + id);
}

function softDelete_(sheetName, id) {
  return updateRowById_(sheetName, id, { Deleted: true, UpdatedAt: now_() });
}

function readRows_(sheetName) {
  const sh = getSheet_(sheetName);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values.shift();

  return values
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function activeRows_(sheetName) {
  return readRows_(sheetName).filter(r => String(r.Deleted).toLowerCase() !== 'true');
}

function getHeaders_(sheetName) {
  const sh = getSheet_(sheetName);
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

/*******************************************************
 * LOOKUP HELPERS
 *******************************************************/

function fillSupplierName_(row) {
  if (!row.SupplierID || row.SupplierName) return;
  const supplier = activeRows_(SHEETS.SUPPLIERS).find(s => s.ID === row.SupplierID);
  if (supplier) {
    row.SupplierName = supplier.SupplierName;
    if (!row.Company) row.Company = supplier.Company;
  }
}

function fillBankName_(row) {
  if (!row.BankID || row.BankName) return;
  const bank = activeRows_(SHEETS.BANKS).find(b => b.ID === row.BankID);
  if (bank) {
    row.BankName = bank.BankName;
    if (!row.Company) row.Company = bank.Company;
    if (!row.Currency && bank.Currency) row.Currency = bank.Currency;
    if (!row.BankCurrency && bank.Currency) row.BankCurrency = bank.Currency;
  }
}

function fillShipmentGroupName_(row) {
  if (!row.ShipmentGroupID || row.ShipmentGroupName) return;
  const group = activeRows_(SHEETS.SHIPMENT_GROUPS).find(g => g.ID === row.ShipmentGroupID);
  if (group) {
    row.ShipmentGroupName = group.GroupName;
    if (!row.Company) row.Company = group.Company;
  }
}

/*******************************************************
 * GENERAL HELPERS
 *******************************************************/

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheet_(name) {
  const sh = getSpreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name + '. Run setupDatabase first.');
  return sh;
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function getParam_(e, key, fallback) {
  return e && e.parameter && e.parameter[key] !== undefined ? e.parameter[key] : fallback;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data, cached) {
  return {
    success: true,
    cached: !!cached,
    data,
  };
}

function error_(code, message, details) {
  return {
    success: false,
    error: {
      code,
      message,
      details: details || '',
    },
  };
}

function now_() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd HH:mm:ss');
}

function today_() {
  return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd');
}

function makeId_(prefix) {
  const stamp = Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMddHHmmss');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return prefix + '-' + stamp + '-' + rand;
}

function toNumber_(value) {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function sum_(rows, field) {
  return rows.reduce((acc, row) => acc + toNumber_(row[field]), 0);
}

function filterCompany_(rows, company) {
  if (!company) return rows;
  return rows.filter(r => String(r.Company) === String(company));
}

function cleanObject_(obj, partial) {
  const out = {};
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    if (partial && v === undefined) return;
    out[k] = v === undefined ? '' : v;
  });
  return out;
}

function findLastDate_(rows) {
  const dates = rows
    .map(r => r.UpdatedAt || r.CreatedAt || r.PaymentDate || r.ChargeDate || r.ReceivedDate || r.SentDate || r.OrderDate)
    .filter(Boolean)
    .map(String)
    .sort();
  return dates.length ? dates[dates.length - 1] : '';
}

function getCompanyFromPatchOrRow_(patch, row, headers) {
  if (patch.Company) return patch.Company;
  const idx = headers.indexOf('Company');
  return idx !== -1 ? row[idx] : '';
}

function logActivity_(company, entity, entityId, action, comment) {
  try {
    const row = {
      ID: makeId_('LOG'),
      Company: company || '',
      Entity: entity,
      EntityID: entityId,
      Action: action,
      Comment: comment || '',
      CreatedAt: now_(),
    };
    appendObject_(SHEETS.ACTIVITY, row);
  } catch (err) {
    // Activity log must not block main operation.
  }
}

function getSettings_() {
  const rows = readRows_(SHEETS.SETTINGS);
  const out = {};
  rows.forEach(r => {
    out[r.Key] = String(r.Value || '').split(',').map(x => x.trim()).filter(Boolean);
  });
  return out;
}

function clearCache_() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('APP_DATA_ALL');
    CONFIG.DEFAULT_COMPANIES.forEach(c => cache.remove('APP_DATA_' + c));
  } catch (err) {
    // Ignore cache errors.
  }
  return ok_({ message: 'Cache cleared' });
}

/*******************************************************
 * OPTIONAL TEST FUNCTIONS
 * Run these manually from Apps Script editor.
 *******************************************************/

function TEST_setupDatabase() {
  return setupDatabase();
}

function TEST_getAppData() {
  return getAppData('Brand House');
}
