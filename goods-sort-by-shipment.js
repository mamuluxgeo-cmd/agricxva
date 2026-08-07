// Sort goods cards by shipment number inside every kanban lane.
// Numbered cards go first in ascending order: 1, 2, 3...; cards without a number go last.
// Also final workflow fix:
// 1) "გამოიგზავნა" -> "მიღებულია" saves only received date.
// 2) Actual received amount/boxes are entered on "მიღებულია" -> "დასრულებულია".
// 3) Shipment number range is 1-99.
(function () {
  function safeShipmentNumber(g) {
    if (typeof shipmentNo === 'function') {
      const n = shipmentNo(g);
      return n ? Number(n) : 9999;
    }
    const raw = String(g.ShipmentGroupID || g.ShipmentGroupName || '').replace('#', '').trim();
    const n = Number(raw);
    return n >= 1 && n <= 99 ? n : 9999;
  }

  function rowDate(g) {
    return String(g.SentDate || g.OrderDate || g.CreatedAt || g.UpdatedAt || '');
  }

  window.shipmentNo = function (g) {
    const raw = String(g?.ShipmentGroupID || g?.ShipmentGroupName || '').replace('#', '').trim();
    const n = Number(raw);
    return n >= 1 && n <= 99 ? n : '';
  };

  window.shipmentNoOptions = function (selected) {
    const current = Number(selected || 0);
    let html = '<option value="">№</option>';
    for (let i = 1; i <= 99; i++) {
      html += `<option value="${i}" ${current === i ? 'selected' : ''}>${i}</option>`;
    }
    return html;
  };

  function expandGoodsFormShipmentSelect() {
    const sel = document.getElementById('ShipmentGroupID');
    if (!sel) return;
    const current = sel.value || '';
    sel.innerHTML = '<option value="">გზავნილის გარეშე</option>' + Array.from({ length: 99 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    sel.value = current;
  }

  const previousOpenGoodsForm = window.openGoodsForm;
  window.openGoodsForm = function (id = '') {
    if (typeof previousOpenGoodsForm === 'function') previousOpenGoodsForm(id);
    setTimeout(expandGoodsFormShipmentSelect, 20);
  };

  const previousBuildForms = window.buildForms;
  window.buildForms = function () {
    if (typeof previousBuildForms === 'function') previousBuildForms();
    expandGoodsFormShipmentSelect();
  };

  window.moveGoodsPrompt = async function (id, status) {
    const item = (state.data?.goods || []).find(g => g.ID === id) || {};
    const patch = { Status: status };

    if (status === 'გამოიგზავნა') {
      patch.SentDate = prompt('გამოგზავნის თარიღი', today()) || today();
      const no = shipmentNo(item);
      patch.ShipmentGroupID = no ? String(no) : '';
      patch.ShipmentGroupName = no ? String(no) : '';
    }

    if (status === 'მიღებულია') {
      patch.ReceivedDate = prompt('მიღების თარიღი', today()) || today();
      // Actual amount and boxes are entered when finalizing.
    }

    if (status === 'დასრულებულია') {
      patch.ReceivedAmountCNY = prompt('ფაქტიურად მიღებული თანხა CNY', item.ReceivedAmountCNY || item.AmountCNY || 0) || item.AmountCNY;
      patch.ReceivedBoxes = prompt('ფაქტიურად მიღებული ყუთები', item.ReceivedBoxes || item.Boxes || 0) || item.Boxes;
      patch.DifferenceComment = prompt('კომენტარი: რა აკლდა ან რა იყო ზედმეტი', item.DifferenceComment || '') || item.DifferenceComment || '';
      patch.ShipmentGroupID = '';
      patch.ShipmentGroupName = '';
    }

    await saveAction('moveGoods', patch, id, status);
  };

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

  function renderStatsShipment99() {
    if (!state.data) return;
    const shipSel = document.getElementById('statsShipmentNo');
    if (!shipSel) return;

    const cur = shipSel.value || '';
    shipSel.innerHTML = '<option value="">აირჩიე ნომერი</option>' + Array.from({ length: 99 }, (_, i) => `<option value="${i + 1}">№ ${i + 1}</option>`).join('');
    shipSel.value = cur;

    const no = shipSel.value || '';
    const box = document.getElementById('statsShipmentResult');
    if (!box) return;

    const rows = (state.data.goods || []).filter(g => String(shipmentNo(g)) === String(no) && g.Status !== 'დასრულებულია');
    const amount = rows.reduce((s, g) => s + Number(g.AmountCNY || 0), 0);
    const boxes = rows.reduce((s, g) => s + Number(g.Boxes || 0), 0);

    box.innerHTML = no ? `
      <div class="stats-cards">
        <div class="stats-mini"><p>თანხა გზაში</p><strong>${money(amount)} CNY</strong></div>
        <div class="stats-mini"><p>ყუთები</p><strong>${money(boxes)}</strong></div>
        <div class="stats-mini"><p>ჩანაწერი</p><strong>${rows.length}</strong></div>
        <div class="stats-mini"><p>მომწოდებელი</p><strong>${new Set(rows.map(g => g.SupplierID)).size}</strong></div>
      </div>
      <div class="stats-list">${rows.length ? rows.map(g => `<div class="stats-item"><div><b>${g.ProductName || 'საქონელი'}</b><div class="muted">${g.SupplierName || '-'} · ${money(g.AmountCNY)} CNY · ${money(g.Boxes)} ყუთი</div></div><span>№${no}</span></div>`).join('') : '<div class="empty">ამ ნომერზე ჩანაწერი არ არის</div>'}</div>
    ` : '<div class="empty">აირჩიე გზავნილის ნომერი</div>';
  }

  const prevRenderAll = window.renderAll;
  window.renderAll = function () {
    if (typeof prevRenderAll === 'function') prevRenderAll();
    expandGoodsFormShipmentSelect();
    setTimeout(renderStatsShipment99, 20);
  };

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'statsShipmentNo') {
      setTimeout(renderStatsShipment99, 0);
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      expandGoodsFormShipmentSelect();
      renderStatsShipment99();
    }, 300);
  });
})();
