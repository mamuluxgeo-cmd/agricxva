// Sort goods cards by shipment number inside every kanban lane.
// Numbered cards go first in ascending order: 1, 2, 3...; cards without a number go last.
(function () {
  function safeShipmentNumber(g) {
    if (typeof shipmentNo === 'function') {
      const n = shipmentNo(g);
      return n ? Number(n) : 9999;
    }
    const raw = String(g.ShipmentGroupID || g.ShipmentGroupName || '').replace('#', '').trim();
    const n = Number(raw);
    return n >= 1 && n <= 20 ? n : 9999;
  }

  function rowDate(g) {
    return String(g.SentDate || g.OrderDate || g.CreatedAt || g.UpdatedAt || '');
  }

  window.renderGoods = function () {
    const goods = state.data?.goods || [];
    $('#goodsKanban').innerHTML = statusFlow.map(status => {
      const items = goods
        .filter(g => g.Status === status)
        .slice()
        .sort((a, b) => {
          const na = safeShipmentNumber(a);
          const nb = safeShipmentNumber(b);
          if (na !== nb) return na - nb;
          return rowDate(a).localeCompare(rowDate(b));
        });

      return `<div class="lane"><h3>${status}<span class="lane-count">${items.length}</span></h3>${emptyOr(items.map(renderGoodsCard))}</div>`;
    }).join('');
  };
})();
