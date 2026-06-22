// Supplier in-transit summary + numeric shipment number patch
// Replaces shipment groups with simple reusable numbers 1-20.

function supplierTransitStats(supplierId) {
  const goods = state.data?.goods || [];
  const rows = goods.filter(g => g.SupplierID === supplierId && g.Status === 'გამოიგზავნა');
  return {
    amountCNY: rows.reduce((sum, g) => sum + Number(g.AmountCNY || 0), 0),
    boxes: rows.reduce((sum, g) => sum + Number(g.Boxes || 0), 0),
    count: rows.length,
  };
}

function shipmentNo(g) {
  const raw = String(g.ShipmentGroupID || g.ShipmentGroupName || '').replace('#', '').trim();
  const n = Number(raw);
  return n >= 1 && n <= 20 ? n : '';
}

function shipmentColor(n) {
  if (!n) return 'transparent';
  const colors = [
    '#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
    '#3b82f6', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
    '#8b5cf6', '#0ea5e9', '#eab308', '#22c55e', '#dc2626',
    '#6366f1', '#d946ef', '#65a30d', '#ea580c', '#0891b2'
  ];
  return colors[(Number(n) - 1) % colors.length];
}

function shipmentNoOptions(selected) {
  const current = Number(selected || 0);
  let html = '<option value="">№</option>';
  for (let i = 1; i <= 20; i++) {
    html += `<option value="${i}" ${current === i ? 'selected' : ''}>${i}</option>`;
  }
  return html;
}

function injectShipmentPatchStyles() {
  if (document.getElementById('shipmentNumberPatchStyles')) return;
  const style = document.createElement('style');
  style.id = 'shipmentNumberPatchStyles';
  style.textContent = `
    .goods-card.has-ship-no {
      border: 1px solid color-mix(in srgb, var(--ship-color) 55%, white);
      border-top: 4px solid var(--ship-color);
      box-shadow: 0 16px 35px color-mix(in srgb, var(--ship-color) 15%, transparent);
    }
    .shipment-number-wrap {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 7px;
      border-radius: 14px;
      background: rgba(255,255,255,.82);
      border: 1px solid rgba(15,23,42,.08);
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 18px rgba(15,23,42,.08);
    }
    .shipment-number-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--ship-color, #cbd5e1);
    }
    .shipment-number-select {
      border: 0;
      background: transparent;
      font-weight: 800;
      color: #0f172a;
      outline: none;
      cursor: pointer;
      min-width: 42px;
    }
    .shipment-number-select option { color: #0f172a; }
    .shipment-number-label {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      border-radius: 999px;
      background: var(--ship-color);
      color: #fff;
      font-size: 13px;
      font-weight: 900;
      box-shadow: 0 8px 18px color-mix(in srgb, var(--ship-color) 30%, transparent);
    }
  `;
  document.head.appendChild(style);
}

function hideShipmentGroupUi() {
  const btn = document.querySelector('[data-open="shipmentModal"]');
  if (btn) btn.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', () => {
  injectShipmentPatchStyles();
  hideShipmentGroupUi();
});

function renderDashboard() {
  const d = state.data.dashboard || {};
  const totalInTransit = (state.data.goods || [])
    .filter(g => g.Status === 'გამოიგზავნა')
    .reduce((sum, g) => sum + Number(g.AmountCNY || 0), 0);

  const cards = [
    ['მომწოდებლები', d.suppliersCount],
    ['აქტიური', d.activeSuppliersCount],
    ['გზაში პარტიები', d.goodsSentCount],
    ['გზაში თანხა CNY', money(totalInTransit)],
    ['მიღებული', d.goodsReceivedCount],
    ['დარიცხვა CNY', money(d.totalChargesCNY)],
    ['გადარიცხვა CNY', money(d.totalPaymentsCNY)],
    ['საერთო ნაშთი CNY', money(d.totalSupplierBalanceCNY)],
  ];
  $('#dashboardCards').innerHTML = cards.map(([label, value]) => `<div class="stat-card"><p>${label}</p><strong>${value ?? 0}</strong></div>`).join('');

  $('#supplierBalanceList').innerHTML = emptyOr((state.data.supplierCards || []).map(s => {
    const tr = supplierTransitStats(s.supplierId);
    return `<div class="mini-row"><div><b>${s.supplierName}</b><div class="muted">გზაში: ${money(tr.amountCNY)} CNY · ${money(tr.boxes)} ყუთი</div></div><strong class="${balanceClass(s.balanceCNY)}">${money(s.balanceCNY)} CNY</strong></div>`;
  }));

  $('#bankBalanceList').innerHTML = emptyOr((state.data.bankCards || []).map(b => `
    <div class="mini-row"><div><b>${b.bankName}</b><div class="muted">${b.accountName || ''}</div></div><strong>${money(b.balance)} ${b.currency}</strong></div>
  `));
}

function renderSuppliers() {
  const q = ($('#supplierSearch')?.value || '').toLowerCase();
  const rows = (state.data?.supplierCards || []).filter(s => !q || String(s.supplierName).toLowerCase().includes(q));
  $('#suppliersGrid').innerHTML = emptyOr(rows.map(s => {
    const tr = supplierTransitStats(s.supplierId);
    return `
      <article class="supplier-card">
        <h3>${s.supplierName}</h3>
        <div class="meta">${s.country || '-'} · ${s.category || '-'} · ${s.currency || 'CNY'}</div>
        <div class="balance ${balanceClass(s.balanceCNY)}">${money(s.balanceCNY)} CNY</div>
        <div class="meta">დარიცხვა: ${money(s.totalChargesCNY)} · გადარიცხვა: ${money(s.totalPaymentsCNY)} · მიღებული საქონელი: ${money(s.totalGoodsReceivedCNY)}</div>
        <div class="meta"><b>გზაში:</b> ${money(tr.amountCNY)} CNY · ${money(tr.boxes)} ყუთი · ${tr.count} ჩანაწერი</div>
        <div class="card-actions">
          <button class="small-btn" onclick="openSupplierCard('${s.supplierId}')">გახსნა</button>
          <button class="small-btn" onclick="openSupplierForm('${s.supplierId}')">რედაქტირება</button>
          <button class="small-btn danger" onclick="deleteRow('deleteSupplier','${s.supplierId}')">წაშლა</button>
        </div>
      </article>`;
  }));
}

function renderGoodsCard(g) {
  const next = nextStatus(g.Status);
  const sentAmount = Number(g.AmountCNY || 0);
  const sentBoxes = Number(g.Boxes || 0);
  const receivedAmount = Number(g.ReceivedAmountCNY || 0);
  const receivedBoxes = Number(g.ReceivedBoxes || 0);
  const no = shipmentNo(g);
  const color = shipmentColor(no);
  const showReceived = g.Status === 'მიღებულია' || g.Status === 'დასრულებულია';
  const showSelector = g.Status !== 'დასრულებულია';
  const receivedBlock = showReceived ? `
    <div class="meta">გამოგზავნილი: <b>${money(sentAmount)} CNY</b> / <b>${money(sentBoxes)} ყუთი</b></div>
    <div class="meta">მიღებული: <b class="positive">${money(receivedAmount)} CNY</b> / <b>${money(receivedBoxes)} ყუთი</b></div>
  ` : `
    <div class="meta">გამოგზავნილი: <b>${money(sentAmount)} CNY</b> / <b>${money(sentBoxes)} ყუთი</b></div>
  `;
  const diff = g.Status === 'დასრულებულია' ? `<div class="meta">სხვაობა: <b class="${balanceClass(g.DifferenceCNY)}">${money(g.DifferenceCNY)} CNY</b> / <b class="${balanceClass(g.DifferenceBoxes)}">${money(g.DifferenceBoxes)} ყუთი</b></div>` : '';
  const numberControl = showSelector ? `
    <div class="shipment-number-wrap" style="--ship-color:${color}">
      <span class="shipment-number-dot"></span>
      <select class="shipment-number-select" onchange="changeShipmentNumber('${g.ID}', this.value)" onclick="event.stopPropagation()">
        ${shipmentNoOptions(no)}
      </select>
    </div>
  ` : (no ? `<div class="shipment-number-wrap" style="--ship-color:${color}"><span class="shipment-number-label">${no}</span></div>` : '');

  return `<div class="goods-card ${no ? 'has-ship-no' : ''}" style="--ship-color:${color}">
    ${numberControl}
    <b>${g.ProductName || 'საქონელი'}</b>
    <div class="meta">${g.SupplierName || '-'}</div>
    ${receivedBlock}
    ${diff}
    <div class="card-actions" style="margin-top:12px">
      ${next ? `<button class="small-btn" onclick="moveGoodsPrompt('${g.ID}','${next}')">${next}</button>` : ''}
      <button class="small-btn" onclick="openGoodsForm('${g.ID}')">რედაქტირება</button>
      <button class="small-btn danger" onclick="deleteRow('deleteGoods','${g.ID}')">წაშლა</button>
    </div>
  </div>`;
}

async function changeShipmentNumber(goodsId, number) {
  try {
    setSync('ნომერი ინახება...');
    const data = {
      ShipmentGroupID: number || '',
      ShipmentGroupName: number ? String(number) : '',
    };
    await apiPost('updateGoods', data, goodsId);
    await loadData(true);
    toast(number ? `მინიჭდა გზავნილის №${number}` : 'ნომერი მოიხსნა');
  } catch (err) {
    toast('ნომერი ვერ შეინახა: ' + err.message);
    setSync('შეცდომა');
  }
}

async function moveGoodsPrompt(id, status) {
  const item = state.data.goods.find(g => g.ID === id);
  const patch = { Status: status };
  if (status === 'გამოიგზავნა') {
    patch.SentDate = prompt('გამოგზავნის თარიღი', today()) || today();
    patch.ShipmentGroupID = shipmentNo(item) ? String(shipmentNo(item)) : '';
    patch.ShipmentGroupName = shipmentNo(item) ? String(shipmentNo(item)) : '';
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
    patch.ShipmentGroupID = '';
    patch.ShipmentGroupName = '';
  }
  await saveAction('moveGoods', patch, id, status);
}

function buildForms() {
  $('#supplierForm').innerHTML = formShell('მომწოდებელი', [
    field('SupplierName','მომწოდებლის სახელი'), field('Country','ქვეყანა'), field('Category','კატეგორია'),
    selectField('Currency','ვალუტა',['CNY','USD','GEL','EUR','TRY']), selectField('Status','სტატუსი',['აქტიური','პასიური']),
    field('OpeningBalance','საწყისი ბალანსი','number'), selectField('OpeningBalanceType','ბალანსის ტიპი',['პლიუსი','მინუსი']), field('Comment','კომენტარი','textarea','full')
  ], 'submitSupplier');
  $('#goodsForm').innerHTML = formShell('საქონელი', [
    selectDynamic('SupplierID','მომწოდებელი','suppliers'), field('ProductName','საქონელი'), field('AmountCNY','გამოგზავნილი თანხა CNY','number'), field('Boxes','გამოგზავნილი ყუთები','number'),
    selectField('Status','სტატუსი',statusFlow.concat(['პრობლემურია'])), selectField('ShipmentGroupID','გზავნილის ნომერი', ['', ...Array.from({length:20},(_,i)=>String(i+1))]),
    field('OrderDate','შეკვეთის თარიღი','date'), field('SentDate','გამოგზავნის თარიღი','date'), field('ExpectedArrivalDate','სავარაუდო ჩამოსვლა','date'), field('ReceivedDate','მიღების თარიღი','date'),
    field('ReceivedAmountCNY','ფაქტიურად მიღებული თანხა CNY','number'), field('ReceivedBoxes','ფაქტიურად მიღებული ყუთები','number'), field('DifferenceComment','სხვაობის კომენტარი','textarea','full'), field('Comment','კომენტარი','textarea','full')
  ], 'submitGoods');
  $('#shipmentForm').innerHTML = '';
  $('#chargeForm').innerHTML = formShell('დარიცხვა', [selectDynamic('SupplierID','მომწოდებელი','suppliers'), field('ChargeDate','თარიღი','date'), field('AmountCNY','თანხა CNY','number'), field('Comment','კომენტარი','textarea','full')], 'submitCharge');
  $('#bankForm').innerHTML = formShell('ბანკი', [field('BankName','ბანკის სახელი'), field('AccountName','ანგარიშის სახელი'), selectField('Currency','ბანკის ბალანსის ვალუტა',['USD','CNY','GEL','EUR','TRY']), field('OpeningBalance','საწყისი ბალანსი','number'), selectField('Status','სტატუსი',['აქტიური','პასიური']), field('Comment','კომენტარი','textarea','full')], 'submitBank');
  $('#depositForm').innerHTML = formShell('ბანკში ჩარიცხვა', [selectDynamic('BankID','ბანკი','banks'), field('DepositDate','თარიღი','date'), field('Amount','გადარიცხული თანხა','number'), selectField('TransferCurrency','გადარიცხული ვალუტა',['USD','CNY','GEL','EUR','TRY']), field('FeePercent','საკომისიო %','number'), field('Fee','საკომისიო თანხით','number'), field('NetTransferAmount','საკომისიოს შემდეგ დარჩა','number'), field('NetAmount','ბანკზე ასახული თანხა','number'), selectField('Currency','ბანკზე ასახული ვალუტა',['CNY','USD','GEL','EUR','TRY']), field('Comment','კომენტარი','textarea','full')], 'submitDeposit');
  $('#paymentForm').innerHTML = formShell('მომწოდებელზე გადარიცხვა', [selectDynamic('SupplierID','მომწოდებელი','suppliers'), selectDynamic('BankID','ბანკი','banks'), field('PaymentDate','თარიღი','date'), field('BankOutAmount','ბანკიდან გასული თანხა','number'), field('BankFee','საკომისიო','number'), selectField('BankCurrency','ბანკის ვალუტა',['USD','CNY','GEL','EUR','TRY']), field('ReflectedCNY','მომწოდებელზე ასახული CNY','number'), field('Comment','კომენტარი','textarea','full')], 'submitPayment');
  bindDepositCalculator();
}

async function submitGoods(){
  const data = collectForm('goodsForm');
  data.ShipmentGroupName = data.ShipmentGroupID || '';
  await saveAction(state.editing.goods?'updateGoods':'createGoods', data, state.editing.goods);
}

async function openSupplierCard(id) {
  try {
    const data = await apiGet({ action: 'getSupplierCard', id });
    const s = data.supplier, sum = data.summary;
    const tr = supplierTransitStats(id);
    const transitRows = (state.data?.goods || []).filter(g => g.SupplierID === id && g.Status === 'გამოიგზავნა');

    $('#supplierCardContent').innerHTML = `
      <div class="panel-head"><div><h3>${s.SupplierName}</h3><div class="muted">${s.Country || ''} · ${s.Category || ''}</div></div><button class="ghost-btn" onclick="closeModals()">დახურვა</button></div>
      <div class="cards-grid">
        <div class="stat-card"><p>საწყისი</p><strong>${money(sum.openingBalanceCNY)} CNY</strong></div>
        <div class="stat-card"><p>დარიცხვა</p><strong>${money(sum.totalChargesCNY)} CNY</strong></div>
        <div class="stat-card"><p>გადარიცხვა</p><strong>${money(sum.totalPaymentsCNY)} CNY</strong></div>
        <div class="stat-card"><p>მიღებული საქონელი</p><strong>${money(sum.totalGoodsReceivedCNY)} CNY</strong></div>
        <div class="stat-card"><p>გზაში</p><strong>${money(tr.amountCNY)} CNY</strong><div class="meta">${money(tr.boxes)} ყუთი · ${tr.count} ჩანაწერი</div></div>
        <div class="stat-card"><p>მიმდინარე ნაშთი</p><strong class="${balanceClass(sum.balanceCNY)}">${money(sum.balanceCNY)} CNY</strong></div>
      </div>
      <div class="panel"><h3>გზაში მყოფი საქონელი</h3><div class="mini-list">${emptyOr(transitRows.map(g => `<div class="mini-row"><div><b>${g.ProductName || 'საქონელი'}</b><div class="muted">№${shipmentNo(g) || '-'} · ${money(g.AmountCNY)} CNY · ${money(g.Boxes)} ყუთი</div></div><span>${g.SentDate || ''}</span></div>`))}</div></div>
      <div class="panel"><h3>ისტორია</h3><div class="mini-list">${emptyOr(data.history.map(h=>`<div class="mini-row"><div><b>${h.type}</b><div class="muted">${h.productName || h.bankName || h.status || ''} ${h.comment || ''}</div></div><span>${h.date || ''}</span></div>`))}</div></div>`;
    $('#supplierCardModal').showModal();
  } catch (err) { toast('ბარათი ვერ გაიხსნა: ' + err.message); }
}
