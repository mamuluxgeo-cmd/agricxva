// Form reset fix
// New registration opens with clean fields; edit opens with existing data only.
(function () {
  const defaults = {
    supplier: {
      Currency: 'CNY',
      Status: 'აქტიური',
      OpeningBalanceType: 'პლიუსი',
      OpeningBalance: '',
      Comment: '',
    },
    goods: {
      OrderDate: today(),
      Status: 'შეკვეთა',
      ShipmentGroupID: '',
      ShipmentGroupName: '',
      AmountCNY: '',
      Boxes: '',
      ReceivedAmountCNY: '',
      ReceivedBoxes: '',
      DifferenceComment: '',
      Comment: '',
    },
    shipment: {
      SentDate: today(),
      Status: 'გზაში',
      Comment: '',
    },
    charge: {
      ChargeDate: today(),
      AmountCNY: '',
      Comment: '',
    },
    bank: {
      Currency: 'USD',
      Status: 'აქტიური',
      OpeningBalance: '',
      Comment: '',
    },
    deposit: {
      DepositDate: today(),
      Amount: '',
      TransferCurrency: 'USD',
      FeePercent: '',
      Fee: '',
      NetTransferAmount: '',
      NetAmount: '',
      Currency: 'CNY',
      Comment: '',
    },
    payment: {
      PaymentDate: today(),
      BankOutAmount: '',
      BankFee: '',
      BankCurrency: 'USD',
      ReflectedCNY: '',
      Comment: '',
    },
  };

  function resetFormFields(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
  }

  function openClean(formKey, modalId, formId, editKey, row, fallback) {
    state.editing[editKey] = row?.ID || '';
    openModal(modalId);
    resetFormFields(formId);
    fillForm(formId, row?.ID ? row : (fallback || defaults[formKey] || {}));
  }

  window.openSupplierForm = function (id = '') {
    const row = (state.data?.suppliers || []).find(x => x.ID === id);
    openClean('supplier', 'supplierModal', 'supplierForm', 'supplier', row, defaults.supplier);
  };

  window.openGoodsForm = function (id = '') {
    const row = (state.data?.goods || []).find(x => x.ID === id);
    openClean('goods', 'goodsModal', 'goodsForm', 'goods', row, { ...defaults.goods, OrderDate: today() });
  };

  window.openShipmentForm = function (id = '') {
    const row = (state.data?.shipmentGroups || []).find(x => x.ID === id);
    openClean('shipment', 'shipmentModal', 'shipmentForm', 'shipment', row, { ...defaults.shipment, SentDate: today() });
  };

  window.openChargeForm = function (id = '') {
    const row = (state.data?.charges || []).find(x => x.ID === id);
    openClean('charge', 'chargeModal', 'chargeForm', 'charge', row, { ...defaults.charge, ChargeDate: today() });
  };

  window.openBankForm = function (id = '') {
    const row = (state.data?.banks || []).find(x => x.ID === id);
    openClean('bank', 'bankModal', 'bankForm', 'bank', row, defaults.bank);
  };

  window.openDepositForm = function (id = '') {
    const row = (state.data?.bankDeposits || []).find(x => x.ID === id);
    openClean('deposit', 'depositModal', 'depositForm', 'deposit', row, { ...defaults.deposit, DepositDate: today() });
    if (typeof calculateDeposit === 'function') calculateDeposit();
  };

  window.openPaymentForm = function (id = '') {
    const row = (state.data?.supplierPayments || []).find(x => x.ID === id);
    openClean('payment', 'paymentModal', 'paymentForm', 'payment', row, { ...defaults.payment, PaymentDate: today() });
  };
})();
