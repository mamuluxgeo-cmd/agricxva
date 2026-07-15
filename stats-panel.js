// Statistics page: shipment number, supplier and bank filters

(function(){
  function n(v){ return Number(v || 0); }
  function fmt(v){ return money ? money(v) : Number(v || 0).toLocaleString('en-US', {maximumFractionDigits:2}); }
  function getShipNo(g){
    if (typeof shipmentNo === 'function') return shipmentNo(g);
    const raw = String(g.ShipmentGroupID || g.ShipmentGroupName || '').trim();
    const num = Number(raw);
    return num >= 1 && num <= 20 ? num : '';
  }
  function opDate(v){ return String(v || '').replace('T',' ').replace('.000Z',''); }
  function sortByDateAsc(rows){ return rows.sort((a,b)=>String(a.date || '').localeCompare(String(b.date || ''))); }
  function injectStatsStyles(){
    if(document.getElementById('statsPanelStyles')) return;
    const style = document.createElement('style');
    style.id = 'statsPanelStyles';
    style.textContent = `
      .stats-layout{display:grid;grid-template-columns:repeat(3,minmax(260px,1fr));gap:18px;align-items:start}
      .stats-box{background:var(--card);border:1px solid rgba(255,255,255,.75);border-radius:var(--radius);box-shadow:var(--shadow);padding:20px}
      .stats-box h3{margin-bottom:14px}
      .stats-filter{display:grid;gap:8px;margin-bottom:14px}
      .stats-filter label{font-size:12px;color:var(--muted);font-weight:900}
      .stats-filter select{width:100%;border:1px solid var(--line);background:white;border-radius:16px;padding:13px;outline:0}
      .stats-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
      .stats-mini{background:#f8fafc;border:1px solid var(--line);border-radius:18px;padding:14px}
      .stats-mini p{margin:0;color:var(--muted);font-size:12px;font-weight:800}
      .stats-mini strong{display:block;font-size:20px;margin-top:6px}
      .stats-list{display:grid;gap:8px;margin-top:12px;max-height:420px;overflow:auto;padding-right:4px}
      .stats-item{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;background:white;border:1px solid var(--line);border-radius:16px;padding:12px}
      .stats-item b{display:block}.stats-item span{white-space:nowrap;font-weight:900}
      .stats-history-title{margin:18px 0 8px;font-size:16px;font-weight:950;color:#0f172a}
      .stats-operation{display:grid;grid-template-columns:96px 1fr auto;gap:10px;align-items:start;background:white;border:1px solid var(--line);border-radius:16px;padding:12px}
      .stats-operation .op-date{font-size:12px;color:var(--muted);font-weight:800;line-height:1.35}
      .stats-operation .op-type{font-weight:950;color:#0f172a}
      .stats-operation .op-meta{font-size:13px;color:var(--muted);margin-top:3px;line-height:1.35}
      .stats-operation .op-amount{font-weight:950;white-space:nowrap;color:#0f172a}
      .stats-operation.charge{border-left:4px solid #7c3aed}
      .stats-operation.payment{border-left:4px solid #06b6d4}
      .stats-operation.goods{border-left:4px solid #f59e0b}
      @media(max-width:1100px){.stats-layout{grid-template-columns:1fr}.stats-cards{grid-template-columns:1fr}.stats-operation{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }
  function optionHtml(rows, valueKey, labelKey, emptyLabel){
    return `<option value="">${emptyLabel}</option>` + rows.map(r => `<option value="${r[valueKey]}">${r[labelKey]}</option>`).join('');
  }
  function ensureStatsOptions(){
    if(!state.data) return;
    const shipSel = document.getElementById('statsShipmentNo');
    const supSel = document.getElementById('statsSupplier');
    const bankSel = document.getElementById('statsBank');
    if(!shipSel || !supSel || !bankSel) return;
    const curShip = shipSel.value, curSup = supSel.value, curBank = bankSel.value;
    shipSel.innerHTML = '<option value="">აირჩიე ნომერი</option>' + Array.from({length:20},(_,i)=>`<option value="${i+1}">№ ${i+1}</option>`).join('');
    supSel.innerHTML = optionHtml(state.data.suppliers || [], 'ID', 'SupplierName', 'აირჩიე მომწოდებელი');
    bankSel.innerHTML = optionHtml(state.data.banks || [], 'ID', 'BankName', 'აირჩიე ბანკი');
    shipSel.value = curShip;
    supSel.value = curSup;
    bankSel.value = curBank;
  }
  function card(label, value, suffix=''){
    return `<div class="stats-mini"><p>${label}</p><strong>${value}${suffix}</strong></div>`;
  }
  function renderShipmentStats(){
    const no = document.getElementById('statsShipmentNo')?.value || '';
    const box = document.getElementById('statsShipmentResult');
    if(!box) return;
    const rows = (state.data?.goods || []).filter(g => String(getShipNo(g)) === String(no) && g.Status !== 'დასრულებულია');
    const amount = rows.reduce((s,g)=>s+n(g.AmountCNY),0);
    const boxes = rows.reduce((s,g)=>s+n(g.Boxes),0);
    box.innerHTML = no ? `
      <div class="stats-cards">${card('თანხა გზაში', fmt(amount), ' CNY')}${card('ყუთები', fmt(boxes))}${card('ჩანაწერი', rows.length)}${card('მომწოდებელი', new Set(rows.map(g=>g.SupplierID)).size)}</div>
      <div class="stats-list">${rows.length ? rows.map(g=>`<div class="stats-item"><div><b>${g.ProductName || 'საქონელი'}</b><div class="muted">${g.SupplierName || '-'} · ${fmt(g.AmountCNY)} CNY · ${fmt(g.Boxes)} ყუთი</div></div><span>№${no}</span></div>`).join('') : '<div class="empty">ამ ნომერზე ჩანაწერი არ არის</div>'}</div>
    ` : '<div class="empty">აირჩიე გზავნილის ნომერი</div>';
  }
  function supplierOperations(id, goods, charges, payments){
    const ops = [];
    charges.forEach(c => ops.push({
      kind:'charge',
      date:c.ChargeDate || c.CreatedAt,
      type:'დარიცხვა',
      title:c.Comment || 'მომწოდებელზე დარიცხვა',
      meta:'მიწოდებული თანხა / დარიცხვა',
      amount:`+${fmt(c.AmountCNY)} CNY`
    }));
    payments.forEach(p => ops.push({
      kind:'payment',
      date:p.PaymentDate || p.CreatedAt,
      type:'გადარიცხვა',
      title:p.BankName || 'ბანკი',
      meta:`მომწოდებელზე აისახა ${fmt(p.ReflectedCNY)} CNY · ბანკიდან გავიდა ${fmt(p.BankTotalOut)} ${p.BankCurrency || ''}${p.Comment ? ' · ' + p.Comment : ''}`,
      amount:`+${fmt(p.ReflectedCNY)} CNY`
    }));
    goods.forEach(g => {
      ops.push({
        kind:'goods',
        date:g.OrderDate || g.CreatedAt,
        type:'საქონელი / შეკვეთა',
        title:g.ProductName || 'საქონელი',
        meta:`სტატუსი: ${g.Status || '-'} · №${getShipNo(g) || '-'} · გამოგზავნილი ${fmt(g.AmountCNY)} CNY · ${fmt(g.Boxes)} ყუთი${g.Comment ? ' · ' + g.Comment : ''}`,
        amount:`${fmt(g.AmountCNY)} CNY`
      });
      if(g.SentDate){
        ops.push({
          kind:'goods', date:g.SentDate, type:'საქონელი / გამოგზავნა', title:g.ProductName || 'საქონელი',
          meta:`გზავნილის №${getShipNo(g) || '-'} · გამოგზავნილი ${fmt(g.AmountCNY)} CNY · ${fmt(g.Boxes)} ყუთი`,
          amount:`${fmt(g.AmountCNY)} CNY`
        });
      }
      if(g.ReceivedDate){
        ops.push({
          kind:'goods', date:g.ReceivedDate, type:g.Status === 'დასრულებულია' ? 'საქონელი / დასრულება' : 'საქონელი / მიღება', title:g.ProductName || 'საქონელი',
          meta:`ფაქტიურად მიღებული ${fmt(g.ReceivedAmountCNY || g.AmountCNY)} CNY · ${fmt(g.ReceivedBoxes || g.Boxes)} ყუთი${g.DifferenceComment ? ' · ' + g.DifferenceComment : ''}`,
          amount:`-${fmt(g.ReceivedAmountCNY || g.AmountCNY)} CNY`
        });
      }
    });
    return sortByDateAsc(ops);
  }
  function renderSupplierStats(){
    const id = document.getElementById('statsSupplier')?.value || '';
    const box = document.getElementById('statsSupplierResult');
    if(!box) return;
    if(!id){ box.innerHTML = '<div class="empty">აირჩიე მომწოდებელი</div>'; return; }
    const s = (state.data.supplierCards || []).find(x => x.supplierId === id) || {};
    const goods = (state.data.goods || []).filter(g => g.SupplierID === id);
    const transit = goods.filter(g => g.Status === 'გამოიგზავნა');
    const received = goods.filter(g => g.Status === 'მიღებულია' || g.Status === 'დასრულებულია');
    const charges = (state.data.charges || []).filter(c => c.SupplierID === id);
    const payments = (state.data.supplierPayments || []).filter(p => p.SupplierID === id);
    const transitAmount = transit.reduce((a,g)=>a+n(g.AmountCNY),0);
    const transitBoxes = transit.reduce((a,g)=>a+n(g.Boxes),0);
    const receivedAmount = received.reduce((a,g)=>a+n(g.ReceivedAmountCNY || g.AmountCNY),0);
    const receivedBoxes = received.reduce((a,g)=>a+n(g.ReceivedBoxes || g.Boxes),0);
    const ops = supplierOperations(id, goods, charges, payments);
    box.innerHTML = `
      <div class="stats-cards">
        ${card('მიმდინარე ბალანსი', fmt(s.balanceCNY), ' CNY')}
        ${card('გზაში თანხა', fmt(transitAmount), ' CNY')}
        ${card('გზაში ყუთები', fmt(transitBoxes))}
        ${card('მიღებული საქონელი', fmt(receivedAmount), ' CNY')}
        ${card('მიღებული ყუთები', fmt(receivedBoxes))}
        ${card('გადარიცხვები', fmt(payments.reduce((a,p)=>a+n(p.ReflectedCNY),0)), ' CNY')}
      </div>
      <div class="stats-list">
        <div class="stats-item"><div><b>დარიცხვები</b><div class="muted">${charges.length} ჩანაწერი</div></div><span>${fmt(charges.reduce((a,c)=>a+n(c.AmountCNY),0))} CNY</span></div>
        <div class="stats-item"><div><b>გზაში</b><div class="muted">${transit.length} ჩანაწერი</div></div><span>${fmt(transitAmount)} CNY</span></div>
        <div class="stats-item"><div><b>მიღებული</b><div class="muted">${received.length} ჩანაწერი</div></div><span>${fmt(receivedAmount)} CNY</span></div>
      </div>
      <h3 class="stats-history-title">ოპერაციების ისტორია</h3>
      <div class="stats-list">
        ${ops.length ? ops.map(o => `
          <div class="stats-operation ${o.kind}">
            <div class="op-date">${opDate(o.date)}</div>
            <div><div class="op-type">${o.type}</div><b>${o.title}</b><div class="op-meta">${o.meta}</div></div>
            <div class="op-amount">${o.amount}</div>
          </div>
        `).join('') : '<div class="empty">ოპერაცია არ არის</div>'}
      </div>`;
  }
  function renderBankStats(){
    const id = document.getElementById('statsBank')?.value || '';
    const box = document.getElementById('statsBankResult');
    if(!box) return;
    if(!id){ box.innerHTML = '<div class="empty">აირჩიე ბანკი</div>'; return; }
    const b = (state.data.bankCards || []).find(x => x.bankId === id) || {};
    const deps = (state.data.bankDeposits || []).filter(d => d.BankID === id);
    const pays = (state.data.supplierPayments || []).filter(p => p.BankID === id);
    const depNet = deps.reduce((a,d)=>a+n(d.NetAmount),0);
    const depRaw = deps.reduce((a,d)=>a+n(d.Amount),0);
    const depFee = deps.reduce((a,d)=>a+n(d.Fee),0);
    const out = pays.reduce((a,p)=>a+n(p.BankOutAmount),0);
    const outFee = pays.reduce((a,p)=>a+n(p.BankFee),0);
    const totalOut = pays.reduce((a,p)=>a+n(p.BankTotalOut),0);
    box.innerHTML = `
      <div class="stats-cards">
        ${card('ბალანსი', fmt(b.balance), ' ' + (b.currency || ''))}
        ${card('ჩარიცხული bruto', fmt(depRaw), ' ' + (b.currency || ''))}
        ${card('ბალანსზე დაჯდა', fmt(depNet), ' ' + (b.currency || ''))}
        ${card('საკომისიოები', fmt(depFee + outFee), ' ' + (b.currency || ''))}
        ${card('მომწოდებლებზე გასული', fmt(out), ' ' + (b.currency || ''))}
        ${card('სულ გასული', fmt(totalOut), ' ' + (b.currency || ''))}
      </div>
      <div class="stats-list">
        ${deps.map(d=>`<div class="stats-item"><div><b>ჩარიცხვა</b><div class="muted">${d.DepositDate || ''} · საკომისიო ${fmt(d.Fee)}</div></div><span>+${fmt(d.NetAmount)} ${d.Currency || b.currency || ''}</span></div>`).join('')}
        ${pays.map(p=>`<div class="stats-item"><div><b>${p.SupplierName || 'მომწოდებელი'}</b><div class="muted">${p.PaymentDate || ''} · საკომისიო ${fmt(p.BankFee)}</div></div><span>-${fmt(p.BankTotalOut)} ${p.BankCurrency || b.currency || ''}</span></div>`).join('')}
      </div>`;
  }
  function renderStatistics(){
    if(!document.getElementById('statistics') || !state.data) return;
    ensureStatsOptions();
    renderShipmentStats();
    renderSupplierStats();
    renderBankStats();
  }
  function bindStatsEvents(){
    ['statsShipmentNo','statsSupplier','statsBank'].forEach(id => {
      const el = document.getElementById(id);
      if(el && !el.dataset.bound){
        el.dataset.bound = '1';
        el.addEventListener('change', () => renderStatistics());
      }
    });
  }
  window.addEventListener('DOMContentLoaded', () => {
    injectStatsStyles();
    if(typeof pages === 'object') pages.statistics = 'სტატისტიკა';
    setTimeout(() => { bindStatsEvents(); renderStatistics(); }, 300);
  });
  const prevRenderAll = window.renderAll;
  window.renderAll = function(){
    if(typeof prevRenderAll === 'function') prevRenderAll();
    bindStatsEvents();
    renderStatistics();
  };
  window.renderStatistics = renderStatistics;
})();