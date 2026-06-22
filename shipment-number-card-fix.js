// Moves shipment number selector inside each goods card header area.
// This file intentionally loads after supplier-transit-patch.js and overrides only visual placement.
(function () {
  const STYLE_ID = 'shipmentNumberCardFixStyles';
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .goods-card {
      position: relative !important;
      padding-top: 22px !important;
      overflow: visible;
    }

    .goods-card > b:first-of-type {
      display: block;
      max-width: calc(100% - 82px);
      line-height: 1.25;
    }

    .goods-card .shipment-number-wrap {
      position: absolute !important;
      top: 16px !important;
      right: 16px !important;
      z-index: 5;
      display: inline-flex !important;
      align-items: center;
      gap: 6px;
      height: 34px;
      min-width: 62px;
      padding: 4px 8px !important;
      border-radius: 14px !important;
      background: rgba(255,255,255,.94) !important;
      border: 1px solid color-mix(in srgb, var(--ship-color, #cbd5e1) 35%, rgba(15,23,42,.10)) !important;
      box-shadow: 0 10px 22px rgba(15,23,42,.10) !important;
      backdrop-filter: blur(12px);
    }

    .goods-card .shipment-number-select {
      min-width: 38px !important;
      height: 26px;
      border: 0 !important;
      background: transparent !important;
      font-size: 14px;
      font-weight: 900 !important;
      line-height: 1;
      color: #0f172a !important;
      cursor: pointer;
      outline: none;
    }

    .goods-card .shipment-number-dot {
      width: 10px !important;
      height: 10px !important;
      flex: 0 0 10px;
      border-radius: 999px;
      background: var(--ship-color, #cbd5e1) !important;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--ship-color, #cbd5e1) 18%, transparent);
    }

    .goods-card.has-ship-no {
      border: 1.5px solid color-mix(in srgb, var(--ship-color) 68%, white) !important;
      border-top: 4px solid var(--ship-color) !important;
      box-shadow: 0 18px 40px color-mix(in srgb, var(--ship-color) 18%, transparent) !important;
    }
  `;

  document.head.appendChild(style);
})();
