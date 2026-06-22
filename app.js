const API_URL = 'https://script.google.com/macros/s/AKfycbw5s9EZO_6WYQDpr5IIIJy-mBubSEneL79vkDRBYpPqskYrl_iLkuv_hEl_emgH_Ws-/exec';

const state = {
  company: 'Brand House',
  page: 'dashboard',
  data: null,
  editing: {},
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const money = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const balanceClass = n => Number(n || 0) > 0 ? 'positive' : Number(n || 0) < 0 ? 'negative' : 'neutral';

const pages = {
  dashboard: 'მთავარი',
  suppliers: 'მომწოდებლები',
  goods: 'საქონელი',
  charges: 'დარიცხვები',
  banks: 'ბანკები',
};

const statusFlow = ['შეკვეთა', 'გამოიგზავნა', 'მიღებულია', 'დასრულებულია'];

window.addEventListener('DOMContentLoaded', () => {
  bindShell();
  buildForms();
  loadData();
});

function bindShell() {
  $$('.company-btn').forEach(btn => btn.addEventListener('click', () => {
    state.company = btn.dataset.company;
    $$('.company-btn').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    loadData();
  }));

  $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
  $('#refreshBtn').addEventListener('click', () => loadData(true));
  $('#quickSupplierBtn').addEventListener('click', () => openSupplierForm());
  $('#quickGoodsBtn').addEventListener('click', () => openGoodsForm());
  $('#supplierSearch').addEventListener('input', renderSuppliers);

  $$('[data-open]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.open;
    if (id === 'supplierModal') return openSupplierForm();
    if (id === 'goodsModal') return openGoodsForm();
    if (id === 'shipmentModal') return openShipmentForm();
    if (id === 'chargeModal') return openChargeForm();
    if (id === 'bankModal') return openBankForm();
    if (id === 'depositModal') return openDepositForm();
    if (id === 'paymentModal') return openPaymentForm();
  }));
}

function showPage(page) {
  state.page = page;
  $$('.page').forEach(x => x.classList.remove('active'));
  $('#' + page).classList.add('active');
  $$('.nav-btn').forEach(x => x.classList.toggle('active', x.dataset.page === page));
  $('#pageTitle').textContent = pages[page];
  renderAll();
}

async function apiGet(params = {}) {
  const url = API_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url, { method: 'GET' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'API error');
  return json.data;
}

async function apiPost(action, data = {}, id = '', status = '') {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, data, id, status }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'API error');
  return json.data;
}

async function loadData(force = false) {
  try {
    setSync('იტვირთება...');
    if (force) await apiGet({ action: 'clearCache' }).catch(() => null);
    state.data = await apiGet({ action: 'getAppData', company: state.company });
    renderAll();
    setSync('განახლდა');
  } catch (err) {
    console.error(err);
    setSync('შეცდომა');
    toast('ვერ ჩაიტვირთა მონაცემები: ' + err.message);
  }
}

function setSync(text) { $('#syncStatus').textContent = text; }
function toast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function renderAll() {
  if (!state.data) return;
  renderDashboard();
  renderSuppliers();
  renderGoods();
  renderCharges();
  renderBanks();
}

function renderDashboard() {
  const d = state.data.dashboard || {};
  const cards = [
    ['მომწოდებლები', d.suppliersCount],
    ['აქტიური', d.activeSuppliersCount],
    ['გზაში', d.goodsSentCount],
    ['მიღებული', d.goodsReceivedCount],
    ['დარიცხვა CNY', money(d.totalChargesCNY)],
    ['გადარიცხვა CNY', money(d.totalPaymentsCNY)],
    ['მიღებული საქონელი CNY', money(d.totalGoodsReceivedCNY)],
    ['საერთო ნაშთი CNY', money(d.totalSupplierBalanceCNY)],
  ];
  $('#dashboardCards').innerHTML = cards.map(([label, value]) => `<div class="stat-card"><p>${label}</p><strong>${value ?? 0}</strong></div>`).join('');

  $('#supplierBalanceList').innerHTML = emptyOr((state.data.supplierCards || []).map(s => `
    <div class="mini-row"><div><b>${s.supplierName}</b><div class="muted">${s.country || ''} · ${s.category || ''}</div></div><strong class="${balanceClass(s.balanceCNY)}">${money(s.balanceCNY)} CNY</strong></div>
  `));

  $('#bankBalanceList').innerHTML = emptyOr((state.data.bankCards || []).map(b => `
    <div class="mini-row"><div><b>${b.bankName}</b><div class="muted">${b.accountName || ''}</div></div><strong>${money(b.balance)} ${b.currency}</strong></div>
  `));
}

function renderSuppliers() {
  const q = ($('#supplierSearch')?.value || '').toLowerCase();
  const rows = (state.data?.supplierCards || []).filter(s => !q || String(s.supplierName).toLowerCase().includes(q));
  $('#suppliersGrid').innerHTML = emptyOr(rows.map(s => `
    <article class="supplier-card">
      <h3>${s.supplierName}</h3>
      <div class="meta">${s.country || '-'} · ${s.category || '-'} · ${s.currency || 'CNY'}</div>
      <div class="balance ${balanceClass(s.balanceCNY)}">${money(s.balanceCNY)} CNY</div>
      <div class="meta">დარიცხვა: ${money(s.totalChargesCNY)} · გადარიცხვა: ${money(s.totalPaymentsCNY)} · მიღებული საქონელი: ${money(s.totalGoodsReceivedCNY)}</div>
      <div class="card-actions">
        <button class="small-btn" onclick="openSupplierCard('${s.supplierId}')">გახსნა</button>
        <button class="small-btn" onclick="openSupplierForm('${s.supplierId}')">რედაქტირება</button>
        <button class="small-btn danger" onclick="deleteRow('deleteSupplier','${s.supplierId}')">წაშლა</button>
      </div>
    </article>
  `));
}

function renderGoods() {
  const goods = state.data?.goods || [];
  $('#goodsKanban').innerHTML = statusFlow.map(status => {
    const items = goods.filter(g => g.Status === status);
    return `<div class="lane"><h3>${status}<span class="lane-count">${items.length}</span></h3>${emptyOr(items.map(renderGoodsCard))}</div>`;
  }).join('');
}

function renderGoodsCard(g) {
  const next = nextStatus(g.Status);
  const group = g.ShipmentGroupName ? `<span class="badge">${g.ShipmentGroupName}</span>` : '';
  const sentAmount = Number(g.AmountCNY || 0);
  const sentBoxes = Number(g.Boxes || 0);
  const receivedAmount = Number(g.ReceivedAmountCNY || 0);
  const receivedBoxes = Number(g.ReceivedBoxes || 0);
  const showReceived = g.Status === 'მიღებულია' || g.Status === 'დასრულებულია';
  const receivedBlock = showReceived ? `
    <div class="meta">გამოგზავნილი: <b>${money(sentAmount)} CNY</b> / <b>${money(sentBoxes)} ყუთი</b></div>
    <div class="meta">მიღებული: <b class="positive">${money(receivedAmount)} CNY</b> / <b>${money(receivedBoxes)} ყუთი</b></div>
  ` : `
    <div class="meta">გამოგზავნილი: <b>${money(sentAmount)} CNY</b> / <b>${money(sentBoxes)} ყუთი</b></div>
  `;
  const diff = g.Status === 'დასრულებულია' ? `<div class="meta">სხვაობა: <b class="${balanceClass(g.DifferenceCNY)}">${money(g.DifferenceCNY)} CNY</b> / <b class="${balanceClass(g.DifferenceBoxes)}">${money(g.DifferenceBoxes)} ყუთი</b></div>` : '';
  return `<div class="goods-card">
    <b>${g.ProductName || 'საქონელი'}</b>
    <div class="meta">${g.SupplierName || '-'}</div>
    ${group}
    ${receivedBlock}
    ${diff}
    <div class="card-actions" style="margin-top:12px">
      ${next ? `<button class="small-btn" onclick="moveGoodsPrompt('${g.ID}','${next}')">${next}</button>` : ''}
      <button class="small-btn" onclick="openGoodsForm('${g.ID}')">რედაქტირება</button>
      <button class="small-btn danger" onclick="deleteRow('deleteGoods','${g.ID}')">წაშლა</button>
    </div>
  </div>`;
}

function nextStatus(status) {
  if (status === 'შეკვეთა') return 'გამოიგზავნა';
  if (status === 'გამოიგზავნა') return 'მიღებულია';
  if (status === 'მიღებულია') return 'დასრულებულია';
  return '';
}

async function moveGoodsPrompt(id, status) {
  const item = state.data.goods.find(g => g.ID === id);
  const patch = { Status: status };
  if (status === 'გამოიგზავნა') {
    patch.SentDate = prompt('გამოგზავნის თარიღი', today()) || today();
    patch.ShipmentGroupID = promptGroupId(item.ShipmentGroupID || '');
  }
  if (status === 'მიღებულია') {
    patch.ReceivedDate = prompt('მიღების თარიღი', today()) || today();
    patch.ReceivedAmountCNY = prompt('ფაქტიურად მიღებული თანხა CNY', item.ReceivedAmountCNY || item.AmountCNY || 0) || item.AmountCNY;
    patch.ReceivedBoxes = prompt('ფაქტიურად მიღებული ყუთები', item.ReceivedBoxes || item.Boxes || 0) || item.Boxes;
  }
  if (status === 'დასრულებულია') {
    patch.ReceivedAmountCNY = item.ReceivedAmountCNY || prompt('ფაქტიურად მიღებული თანხა CNY', item.AmountCNY || 0) || item.AmountCNY;
    patch.ReceivedBoxes = item.ReceivedBoxes || prompt('ფაქტიურად მიღებული ყუთები', item.Boxes || 0) || item.Boxes;
    patch.DifferenceComment = prompt('კომენტარი: რა აკლდა ან რა იყო ზედმეტი', item.DifferenceComment || '') || item.DifferenceComment || '';
  }
  await saveAction('moveGoods', patch, id, status);
}

function promptGroupId(current) {
  const groups = state.data.shipmentGroups || [];
  if (!groups.length) return current;
  const list = groups.map(g => `${g.ID} — ${g.GroupName}`).join('\n');
  return prompt('გზავნილის ჯგუფის ID ჩაწერე ან ცარიელი დატოვე:\n' + list, current) || current;
}

function renderCharges() {
  const rows = state.data?.charges || [];
  $('#chargesTable').innerHTML = emptyOr(rows.map(c => `<tr><td>${c.ChargeDate}</td><td>${c.SupplierName}</td><td>${money(c.AmountCNY)}</td><td>${c.Comment || ''}</td><td><button class="small-btn" onclick="openChargeForm('${c.ID}')">რედაქტირება</button> <button class="small-btn danger" onclick="deleteRow('deleteCharge','${c.ID}')">წაშლა</button></td></tr>`), '<tr><td colspan="5" class="empty">ჩანაწერი არ არის</td></tr>');
}

function renderBanks() {
  const cards = state.data?.bankCards || [];
  $('#banksGrid').innerHTML = emptyOr(cards.map(b => `<div class="stat-card bank-card">
    <p>${b.bankName}</p>
    <strong>${money(b.balance)} ${b.currency}</strong>
    <div class="meta">ჩარიცხვა: ${money(b.depositedNet)} · გასული: ${money(b.totalOut)} · საკომისიო: ${money(Number(b.depositFees || 0) + Number(b.paymentFees || 0))}</div>
    <div class="card-actions"><button class="small-btn" onclick="openBankForm('${b.bankId}')">რედაქტირება</button><button class="small-btn danger" onclick="deleteRow('deleteBank','${b.bankId}')">წაშლა</button></div>
  </div>`));

  const deposits = (state.data.bankDeposits || []).map(x => ({
    date:x.DepositDate,
    type:'deposit',
    id:x.ID,
    text:`${x.BankName} — გადარიცხული ${money(x.Amount)} ${x.TransferCurrency || x.Currency}, საკომისიო ${money(x.Fee)}${x.FeePercent ? ' (' + x.FeePercent + '%)' : ''}, ბალანსზე დაჯდა ${money(x.NetAmount)} ${x.Currency}`
  }));
  const payments = (state.data.supplierPayments || []).map(x => ({
    date:x.PaymentDate,
    type:'payment',
    id:x.ID,
    text:`${x.BankName} → ${x.SupplierName} — მომწოდებელზე აისახა ${money(x.ReflectedCNY)} CNY, ბანკიდან გავიდა ${money(x.BankTotalOut)} ${x.BankCurrency}`
  }));

  $('#bankOperations').innerHTML = emptyOr(deposits.concat(payments).sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(x => `
    <div class="mini-row">
      <span>${x.text}</span>
      <div class="card-actions"><b>${x.date}</b><button class="small-btn" onclick="${x.type === 'deposit' ? 'openDepositForm' : 'openPaymentForm'}('${x.id}')">რედაქტირება</button><button class="small-btn danger" onclick="deleteRow('${x.type === 'deposit' ? 'deleteBankDeposit' : 'deleteSupplierPayment'}','${x.id}')">წაშლა</button></div>
    </div>`));
}

function emptyOr(arr, empty = '<div class="empty">ჩანაწერი არ არის</div>') { return arr.length ? arr.join('') : empty; }
function today() { return new Date().toISOString().slice(0,10); }

function buildForms() {
  $('#supplierForm').innerHTML = formShell('მომწოდებელი', [
    field('SupplierName','მომწოდებლის სახელი'), field('Country','ქვეყანა'), field('Category','კატეგორია'),
    selectField('Currency','ვალუტა',['CNY','USD','GEL','EUR','TRY']), selectField('Status','სტატუსი',['აქტიური','პასიური']),
    field('OpeningBalance','საწყისი ბალანსი','number'), selectField('OpeningBalanceType','ბალანსის ტიპი',['პლიუსი','მინუსი']), field('Comment','კომენტარი','textarea','full')
  ], 'submitSupplier');
  $('#goodsForm').innerHTML = formShell('საქონელი', [
    selectDynamic('SupplierID','მომწოდებელი','suppliers'), field('ProductName','საქონელი'), field('AmountCNY','გამოგზავნილი თანხა CNY','number'), field('Boxes','გამოგზავნილი ყუთები','number'),
    selectField('Status','სტატუსი',statusFlow.concat(['პრობლემურია'])), selectDynamic('ShipmentGroupID','გზავნილის ჯგუფი','shipmentGroups', true),
    field('OrderDate','შეკვეთის თარიღი','date'), field('SentDate','გამოგზავნის თარიღი','date'), field('ExpectedArrivalDate','სავარაუდო ჩამოსვლა','date'), field('ReceivedDate','მიღების თარიღი','date'),
    field('ReceivedAmountCNY','ფაქტიურად მიღებული თანხა CNY','number'), field('ReceivedBoxes','ფაქტიურად მიღებული ყუთები','number'), field('DifferenceComment','სხვაობის კომენტარი','textarea','full'), field('Comment','კომენტარი','textarea','full')
  ], 'submitGoods');
  $('#shipmentForm').innerHTML = formShell('გზავნილის ჯგუფი', [field('GroupName','ჯგუფის ნომერი / სახელი'), field('OriginCountry','ქვეყანა'), field('SentDate','გამოგზავნის თარიღი','date'), field('ExpectedArrivalDate','სავარაუდო ჩამოსვლა','date'), selectField('Status','სტატუსი',['გზაში','ნაწილობრივ მიღებული','მიღებულია','დასრულებულია','პრობლემურია']), field('Comment','კომენტარი','textarea','full')], 'submitShipment');
  $('#chargeForm').innerHTML = formShell('დარიცხვა', [selectDynamic('SupplierID','მომწოდებელი','suppliers'), field('ChargeDate','თარიღი','date'), field('AmountCNY','თანხა CNY','number'), field('Comment','კომენტარი','textarea','full')], 'submitCharge');
  $('#bankForm').innerHTML = formShell('ბანკი', [field('BankName','ბანკის სახელი'), field('AccountName','ანგარიშის სახელი'), selectField('Currency','ბანკის ბალანსის ვალუტა',['USD','CNY','GEL','EUR','TRY']), field('OpeningBalance','საწყისი ბალანსი','number'), selectField('Status','სტატუსი',['აქტიური','პასიური']), field('Comment','კომენტარი','textarea','full')], 'submitBank');
  $('#depositForm').innerHTML = formShell('ბანკში ჩარიცხვა', [selectDynamic('BankID','ბანკი','banks'), field('DepositDate','თარიღი','date'), field('Amount','გადარიცხული თანხა','number'), selectField('TransferCurrency','გადარიცხული ვალუტა',['USD','CNY','GEL','EUR','TRY']), field('FeePercent','საკომისიო %','number'), field('Fee','საკომისიო თანხით','number'), field('NetTransferAmount','საკომისიოს შემდეგ დარჩა','number'), field('NetAmount','ბანკზე ასახული თანხა','number'), selectField('Currency','ბანკზე ასახული ვალუტა',['CNY','USD','GEL','EUR','TRY']), field('Comment','კომენტარი','textarea','full')], 'submitDeposit');
  $('#paymentForm').innerHTML = formShell('მომწოდებელზე გადარიცხვა', [selectDynamic('SupplierID','მომწოდებელი','suppliers'), selectDynamic('BankID','ბანკი','banks'), field('PaymentDate','თარიღი','date'), field('BankOutAmount','ბანკიდან გასული თანხა','number'), field('BankFee','საკომისიო','number'), selectField('BankCurrency','ბანკის ვალუტა',['USD','CNY','GEL','EUR','TRY']), field('ReflectedCNY','მომწოდებელზე ასახული CNY','number'), field('Comment','კომენტარი','textarea','full')], 'submitPayment');
  bindDepositCalculator();
}

function bindDepositCalculator() {
  ['Amount','FeePercent','Fee'].forEach(id => document.addEventListener('input', e => { if (e.target?.id === id) calculateDeposit(id); }));
}
function calculateDeposit(changedId = '') {
  const amountEl = $('#Amount'), percentEl = $('#FeePercent'), feeEl = $('#Fee'), netEl = $('#NetTransferAmount');
  if (!amountEl || !feeEl || !netEl) return;
  const amount = Number(amountEl.value || 0);
  let fee = Number(feeEl.value || 0);
  if (changedId === 'FeePercent') {
    const percent = Number(percentEl.value || 0);
    fee = amount * percent / 100;
    feeEl.value = fee ? fee.toFixed(2) : '';
  }
  netEl.value = Math.max(amount - fee, 0).toFixed(2);
}

function formShell(title, fields, submitName) { return `<h3>${title}</h3><div class="form-grid">${fields.join('')}</div><div class="modal-actions"><button type="button" class="ghost-btn" onclick="closeModals()">დახურვა</button><button type="button" class="liquid-btn" onclick="${submitName}()">შენახვა</button></div>`; }
function field(id,label,type='text',cls='') { return `<div class="field ${cls}"><label>${label}</label>${type==='textarea'?`<textarea id="${id}" rows="3"></textarea>`:`<input id="${id}" type="${type}" step="any" />`}</div>`; }
function selectField(id,label,opts) { return `<div class="field"><label>${label}</label><select id="${id}">${opts.map(o=>`<option value="${o}">${o}</option>`).join('')}</select></div>`; }
function selectDynamic(id,label,source,optional=false) { return `<div class="field"><label>${label}</label><select id="${id}" data-source="${source}" data-optional="${optional?'1':'0'}"></select></div>`; }

function refreshSelects() {
  $$('select[data-source]').forEach(sel => {
    const source = sel.dataset.source;
    const optional = sel.dataset.optional === '1';
    let rows = [];
    if (source === 'suppliers') rows = state.data?.suppliers || [];
    if (source === 'banks') rows = state.data?.banks || [];
    if (source === 'shipmentGroups') rows = state.data?.shipmentGroups || [];
    const opts = rows.map(r => `<option value="${r.ID}">${r.SupplierName || r.BankName || r.GroupName}</option>`).join('');
    sel.innerHTML = (optional ? '<option value="">ჯგუფის გარეშე</option>' : '') + opts;
  });
}

function openModal(id) { refreshSelects(); $('#' + id).showModal(); }
function closeModals() { $$('dialog').forEach(d => d.close()); state.editing = {}; }
function fillForm(formId, obj={}) { $$('#'+formId+' [id]').forEach(el => { if (obj[el.id] !== undefined) el.value = obj[el.id]; }); }
function collectForm(formId) { const out = { Company: state.company }; $$('#'+formId+' [id]').forEach(el => out[el.id] = el.value); return out; }

function openSupplierForm(id='') { state.editing.supplier=id; openModal('supplierModal'); const row=(state.data?.suppliers||[]).find(x=>x.ID===id)||{}; fillForm('supplierForm', row); }
function openGoodsForm(id='') { state.editing.goods=id; openModal('goodsModal'); const row=(state.data?.goods||[]).find(x=>x.ID===id)||{OrderDate:today()}; fillForm('goodsForm', row); }
function openShipmentForm(id='') { state.editing.shipment=id; openModal('shipmentModal'); const row=(state.data?.shipmentGroups||[]).find(x=>x.ID===id)||{SentDate:today()}; fillForm('shipmentForm', row); }
function openChargeForm(id='') { state.editing.charge=id; openModal('chargeModal'); const row=(state.data?.charges||[]).find(x=>x.ID===id)||{ChargeDate:today()}; fillForm('chargeForm', row); }
function openBankForm(id='') { state.editing.bank=id; openModal('bankModal'); const row=(state.data?.banks||[]).find(x=>x.ID===id)||{}; fillForm('bankForm', row); }
function openDepositForm(id='') { state.editing.deposit=id; openModal('depositModal'); const row=(state.data?.bankDeposits||[]).find(x=>x.ID===id)||{DepositDate:today()}; fillForm('depositForm', row); calculateDeposit(); }
function openPaymentForm(id='') { state.editing.payment=id; openModal('paymentModal'); const row=(state.data?.supplierPayments||[]).find(x=>x.ID===id)||{PaymentDate:today()}; fillForm('paymentForm', row); }

async function submitSupplier(){ await saveAction(state.editing.supplier?'updateSupplier':'createSupplier', collectForm('supplierForm'), state.editing.supplier); }
async function submitGoods(){ await saveAction(state.editing.goods?'updateGoods':'createGoods', collectForm('goodsForm'), state.editing.goods); }
async function submitShipment(){ await saveAction(state.editing.shipment?'updateShipmentGroup':'createShipmentGroup', collectForm('shipmentForm'), state.editing.shipment); }
async function submitCharge(){ await saveAction(state.editing.charge?'updateCharge':'createCharge', collectForm('chargeForm'), state.editing.charge); }
async function submitBank(){ await saveAction(state.editing.bank?'updateBank':'createBank', collectForm('bankForm'), state.editing.bank); }
async function submitDeposit(){ calculateDeposit(); await saveAction(state.editing.deposit?'updateBankDeposit':'createBankDeposit', collectForm('depositForm'), state.editing.deposit); }
async function submitPayment(){ await saveAction(state.editing.payment?'updateSupplierPayment':'createSupplierPayment', collectForm('paymentForm'), state.editing.payment); }

async function saveAction(action, data, id='', status='') {
  try {
    setSync('ინახება...');
    const payload = status ? { ...data, Status: status } : data;
    await apiPost(action, payload, id, status);
    closeModals();
    await loadData(true);
    toast('შენახულია');
  } catch (err) { toast('შეცდომა: ' + err.message); setSync('შეცდომა'); }
}
async function deleteRow(action, id) { if (!confirm('ნამდვილად გინდა წაშლა?')) return; await saveAction(action, {}, id); }

async function openSupplierCard(id) {
  try {
    const data = await apiGet({ action: 'getSupplierCard', id });
    const s = data.supplier, sum = data.summary;
    $('#supplierCardContent').innerHTML = `
      <div class="panel-head"><div><h3>${s.SupplierName}</h3><div class="muted">${s.Country || ''} · ${s.Category || ''}</div></div><button class="ghost-btn" onclick="closeModals()">დახურვა</button></div>
      <div class="cards-grid">
        <div class="stat-card"><p>საწყისი</p><strong>${money(sum.openingBalanceCNY)} CNY</strong></div>
        <div class="stat-card"><p>დარიცხვა</p><strong>${money(sum.totalChargesCNY)} CNY</strong></div>
        <div class="stat-card"><p>გადარიცხვა</p><strong>${money(sum.totalPaymentsCNY)} CNY</strong></div>
        <div class="stat-card"><p>მიღებული საქონელი</p><strong>${money(sum.totalGoodsReceivedCNY)} CNY</strong></div>
        <div class="stat-card"><p>მიმდინარე ნაშთი</p><strong class="${balanceClass(sum.balanceCNY)}">${money(sum.balanceCNY)} CNY</strong></div>
      </div>
      <div class="panel"><h3>ისტორია</h3><div class="mini-list">${emptyOr(data.history.map(h=>`<div class="mini-row"><div><b>${h.type}</b><div class="muted">${h.productName || h.bankName || h.status || ''} ${h.comment || ''}</div></div><span>${h.date || ''}</span></div>`))}</div></div>`;
    $('#supplierCardModal').showModal();
  } catch (err) { toast('ბარათი ვერ გაიხსნა: ' + err.message); }
}
