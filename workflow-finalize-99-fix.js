// Final workflow fix:
// 1) Move from "გამოიგზავნა" to "მიღებულია" saves only received date.
// 2) Actual received amount/boxes are entered when moving from "მიღებულია" to "დასრულებულია".
// 3) Shipment number range is 1-99.

(function () {
  function num(v) { return Number(v || 0); }
  function fmt(v) { return typeof money === 'function' ? money(v) : num(v).toLocaleString('en-US', { maximumFractionDigits: 2 }); }

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
    sel.innerHTML = '<option value="">გზავნილის გარეშე</option>' +
      Array.from({ length: 99 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
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
      // Do not ask actual amount/boxes here. They are entered at finalization.
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

  function renderStats99() {
    if (!state.data) return;
    const shipSel = document.getElementById('statsShipmentNo');
    if (shipSel) {
      const cur = shipSel.value || '';
      shipSel.innerHTML = '<option value="">აირჩიე ნომერი</option>' +
        Array.from({ length: 99 }, (_, i) => `<option value="${i + 1}">№ ${i + 1}</option>`).join('');
      shipSel.value = cur;
    }

    const no = shipSel?.value || '';
    const shipBox = document.getElementById('statsShipmentResult');
    if (shipBox) {
      const rows = (state.data.goods || []).filter(g => String(shipmentNo(g)) === String(no) && g.Status !== 'დასრულებულია');
      const amount = rows.reduce((s, g) => s + num(g.AmountCNY), 0);
      const boxes = rows.reduce((s, g) => s + num(g.Boxes), 0);
      shipBox.innerHTML = no ? `
        <div class="stats-cards">
          <div class="stats-mini"><p>თანხა გზაში</p><strong>${fmt(amount)} CNY</strong></div>
          <div class="stats-mini"><p>ყუთები</p><strong>${fmt(boxes)}</strong></div>
          <div class="stats-mini"><p>ჩანაწერი</p><strong>${rows.length}</strong></div>
          <div class="stats-mini"><p>მომწოდებელი</p><strong>${new Set(rows.map(g => g.SupplierID)).size}</strong></div>
        </div>
        <div class="stats-list">${rows.length ? rows.map(g => `<div class="stats-item"><div><b>${g.ProductName || 'საქონელი'}</b><div class="muted">${g.SupplierName || '-'} · ${fmt(g.AmountCNY)} CNY · ${fmt(g.Boxes)} ყუთი</div></div><span>№${no}</span></div>`).join('') : '<div class="empty">ამ ნომერზე ჩანაწერი არ არის</div>'}</div>
      ` : '<div class="empty">აირჩიე გზავნილის ნომერი</div>';
    }
  }

  const previousRenderAll = window.renderAll;
  window.renderAll = function () {
    if (typeof previousRenderAll === 'function') previousRenderAll();
    setTimeout(() => {
      expandGoodsFormShipmentSelect();
      renderStats99();
    }, 20);
  };

  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'statsShipmentNo') {
      setTimeout(renderStats99, 0);
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      expandGoodsFormShipmentSelect();
      renderStats99();
    }, 300);
  });
})();
