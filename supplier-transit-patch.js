// Supplier in-transit summary patch
// Shows sent goods total per supplier without affecting real supplier balance.

function supplierTransitStats(supplierId) {
  const goods = state.data?.goods || [];
  const rows = goods.filter(g => g.SupplierID === supplierId && g.Status === 'გამოიგზავნა');
  return {
    amountCNY: rows.reduce((sum, g) => sum + Number(g.AmountCNY || 0), 0),
    boxes: rows.reduce((sum, g) => sum + Number(g.Boxes || 0), 0),
    count: rows.length,
  };
}

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
      <div class="panel"><h3>გზაში მყოფი საქონელი</h3><div class="mini-list">${emptyOr(transitRows.map(g => `<div class="mini-row"><div><b>${g.ProductName || 'საქონელი'}</b><div class="muted">${money(g.AmountCNY)} CNY · ${money(g.Boxes)} ყუთი ${g.ShipmentGroupName ? '· ' + g.ShipmentGroupName : ''}</div></div><span>${g.SentDate || ''}</span></div>`))}</div></div>
      <div class="panel"><h3>ისტორია</h3><div class="mini-list">${emptyOr(data.history.map(h=>`<div class="mini-row"><div><b>${h.type}</b><div class="muted">${h.productName || h.bankName || h.status || ''} ${h.comment || ''}</div></div><span>${h.date || ''}</span></div>`))}</div></div>`;
    $('#supplierCardModal').showModal();
  } catch (err) { toast('ბარათი ვერ გაიხსნა: ' + err.message); }
}
