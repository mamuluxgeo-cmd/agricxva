// Supplier statistics history fix
// Shows each goods/order only once with its current status, instead of duplicating old status entries.
(function(){
  function n(v){ return Number(v || 0); }
  function fmt(v){
    try { return money(v); } catch(e) { return n(v).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  }
  function dateOf(x){
    return x.ReceivedDate || x.SentDate || x.OrderDate || x.PaymentDate || x.ChargeDate || x.CreatedAt || x.UpdatedAt || '';
  }
  function shipNoLocal(g){
    if (typeof shipmentNo === 'function') return shipmentNo(g) || '-';
    const raw = String(g.ShipmentGroupID || g.ShipmentGroupName || '').trim();
    return raw || '-';
  }
  function itemHtml(item){
    const amount = item.amountText || '';
    const sign = item.sign || '';
    return `<div class="stats-item stats-history-item">
      <div class="stats-date">${item.date || ''}</div>
      <div class="stats-body">
        <b>${item.title || ''}</b>
        <div class="muted">${item.sub || ''}</div>
      </div>
      <span>${sign}${amount}</span>
    </div>`;
  }
  function supplierHistoryOnce(supplierId){
    const goods = (state.data?.goods || [])
      .filter(g => g.SupplierID === supplierId && String(g.Deleted).toLowerCase() !== 'true')
      .map(g => {
        const status = g.Status || 'შეკვეთა';
        const date = dateOf(g);
        const isReceived = status === 'მიღებულია' || status === 'დასრულებულია';
        const amount = isReceived ? n(g.ReceivedAmountCNY || g.AmountCNY) : n(g.AmountCNY);
        const boxes = isReceived ? n(g.ReceivedBoxes || g.Boxes) : n(g.Boxes);
        return {
          kind: 'goods',
          date,
          title: `საქონელი / ${status}`,
          sub: `${g.ProductName || 'საქონელი'} · №${shipNoLocal(g)} · ${fmt(amount)} CNY · ${fmt(boxes)} ყუთი${g.Comment ? ' · ' + g.Comment : ''}${g.DifferenceComment ? ' · ' + g.DifferenceComment : ''}`,
          amountText: `${fmt(amount)} CNY`,
          sortDate: date,
        };
      });

    const charges = (state.data?.charges || [])
      .filter(c => c.SupplierID === supplierId && String(c.Deleted).toLowerCase() !== 'true')
      .map(c => ({
        kind: 'charge',
        date: c.ChargeDate || c.CreatedAt || '',
        title: 'დარიცხვა',
        sub: `${c.Comment || ''}`,
        amountText: `${fmt(c.AmountCNY)} CNY`,
        sign: '+',
        sortDate: c.ChargeDate || c.CreatedAt || '',
      }));

    const payments = (state.data?.supplierPayments || [])
      .filter(p => p.SupplierID === supplierId && String(p.Deleted).toLowerCase() !== 'true')
      .map(p => ({
        kind: 'payment',
        date: p.PaymentDate || p.CreatedAt || '',
        title: 'გადარიცხვა',
        sub: `${p.BankName || ''}${p.Comment ? ' · ' + p.Comment : ''}`,
        amountText: `${fmt(p.ReflectedCNY)} CNY`,
        sign: '+',
        sortDate: p.PaymentDate || p.CreatedAt || '',
      }));

    return charges.concat(payments).concat(goods)
      .sort((a,b) => String(a.sortDate || '').localeCompare(String(b.sortDate || '')));
  }

  function injectHistoryStyle(){
    if(document.getElementById('singleOrderHistoryStyle')) return;
    const style = document.createElement('style');
    style.id = 'singleOrderHistoryStyle';
    style.textContent = `
      .stats-history-item{display:grid;grid-template-columns:96px 1fr auto;align-items:start}
      .stats-date{font-size:12px;font-weight:900;color:var(--muted);line-height:1.35}
      .stats-body b{font-size:15px}
      @media(max-width:650px){.stats-history-item{grid-template-columns:1fr}.stats-history-item span{margin-top:8px}}
    `;
    document.head.appendChild(style);
  }

  const prevRenderStatistics = window.renderStatistics;
  window.renderStatistics = function(){
    if(typeof prevRenderStatistics === 'function') prevRenderStatistics();
    injectHistoryStyle();
    const supplierId = document.getElementById('statsSupplier')?.value || '';
    const box = document.getElementById('statsSupplierResult');
    if(!supplierId || !box) return;
    const oldHistory = box.querySelector('.stats-history-panel');
    if(oldHistory) oldHistory.remove();
    const rows = supplierHistoryOnce(supplierId);
    const panel = document.createElement('div');
    panel.className = 'stats-history-panel';
    panel.innerHTML = `<h3 style="margin-top:18px">ოპერაციების ისტორია</h3><div class="stats-list">${rows.length ? rows.map(itemHtml).join('') : '<div class="empty">ოპერაცია არ არის</div>'}</div>`;
    box.appendChild(panel);
  };

  window.addEventListener('DOMContentLoaded', () => setTimeout(() => {
    injectHistoryStyle();
    if(typeof window.renderStatistics === 'function') window.renderStatistics();
  }, 500));
})();
