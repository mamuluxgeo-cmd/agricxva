// Extra supplier card stats: total goods in all positions + charge/goods difference
(function () {
  function n(v) { return Number(v || 0); }
  function m(v) { return money ? money(v) : n(v).toLocaleString('en-US', { maximumFractionDigits: 2 }); }

  function supplierAllGoodsStats(supplierId) {
    const goods = (state.data?.goods || []).filter(g => g.SupplierID === supplierId);
    const notDeleted = goods.filter(g => String(g.Deleted).toLowerCase() !== 'true');
    const allAmount = notDeleted.reduce((sum, g) => sum + n(g.AmountCNY), 0);
    const allBoxes = notDeleted.reduce((sum, g) => sum + n(g.Boxes), 0);
    const receivedAmount = notDeleted
      .filter(g => g.Status === 'მიღებულია' || g.Status === 'დასრულებულია')
      .reduce((sum, g) => sum + n(g.ReceivedAmountCNY || g.AmountCNY), 0);
    return { allAmount, allBoxes, count: notDeleted.length, receivedAmount };
  }

  const previousOpenSupplierCard = window.openSupplierCard;

  window.openSupplierCard = async function (id) {
    try {
      const data = await apiGet({ action: 'getSupplierCard', id });
      const s = data.supplier;
      const sum = data.summary;
      const tr = typeof supplierTransitStats === 'function' ? supplierTransitStats(id) : { amountCNY: 0, boxes: 0, count: 0 };
      const gs = supplierAllGoodsStats(id);
      const chargeGoodsDiff = n(sum.totalChargesCNY) - gs.allAmount;
      const transitRows = (state.data?.goods || []).filter(g => g.SupplierID === id && g.Status === 'გამოიგზავნა');

      $('#supplierCardContent').innerHTML = `
        <div class="panel-head"><div><h3>${s.SupplierName}</h3><div class="muted">${s.Country || ''} · ${s.Category || ''}</div></div><button class="ghost-btn" onclick="closeModals()">დახურვა</button></div>
        <div class="cards-grid">
          <div class="stat-card"><p>საწყისი</p><strong>${m(sum.openingBalanceCNY)} CNY</strong></div>
          <div class="stat-card"><p>დარიცხვა</p><strong>${m(sum.totalChargesCNY)} CNY</strong></div>
          <div class="stat-card"><p>გადარიცხვა</p><strong>${m(sum.totalPaymentsCNY)} CNY</strong></div>
          <div class="stat-card"><p>მიღებული საქონელი</p><strong>${m(sum.totalGoodsReceivedCNY)} CNY</strong></div>
          <div class="stat-card"><p>საქონელი ყველა პოზიციაზე</p><strong>${m(gs.allAmount)} CNY</strong><div class="meta">${m(gs.allBoxes)} ყუთი · ${gs.count} ჩანაწერი</div></div>
          <div class="stat-card"><p>დარიცხვა / საქონლის სხვაობა</p><strong class="${balanceClass(chargeGoodsDiff)}">${m(chargeGoodsDiff)} CNY</strong><div class="meta">დარიცხვა - ყველა საქონელი</div></div>
          <div class="stat-card"><p>გზაში</p><strong>${m(tr.amountCNY)} CNY</strong><div class="meta">${m(tr.boxes)} ყუთი · ${tr.count} ჩანაწერი</div></div>
          <div class="stat-card"><p>მიმდინარე ნაშთი</p><strong class="${balanceClass(sum.balanceCNY)}">${m(sum.balanceCNY)} CNY</strong></div>
        </div>
        <div class="panel"><h3>გზაში მყოფი საქონელი</h3><div class="mini-list">${emptyOr(transitRows.map(g => `<div class="mini-row"><div><b>${g.ProductName || 'საქონელი'}</b><div class="muted">№${typeof shipmentNo === 'function' ? (shipmentNo(g) || '-') : '-'} · ${m(g.AmountCNY)} CNY · ${m(g.Boxes)} ყუთი</div></div><span>${g.SentDate || ''}</span></div>`))}</div></div>
        <div class="panel"><h3>ისტორია</h3><div class="mini-list">${emptyOr(data.history.map(h=>`<div class="mini-row"><div><b>${h.type}</b><div class="muted">${h.productName || h.bankName || h.status || ''} ${h.comment || ''}</div></div><span>${h.date || ''}</span></div>`))}</div></div>`;
      $('#supplierCardModal').showModal();
    } catch (err) {
      if (typeof previousOpenSupplierCard === 'function') return previousOpenSupplierCard(id);
      toast('ბარათი ვერ გაიხსნა: ' + err.message);
    }
  };
})();
