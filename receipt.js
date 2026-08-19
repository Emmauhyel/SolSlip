/**
 * SolSlip — js/receipt.js
 * -----------------------------------------------------------------------
 * Takes the activity object produced by js/solana.js's fetchWalletActivity()
 * and paints it into the #receipt DOM defined in index.html. Also owns the
 * html2canvas export-to-PNG pipeline.
 *
 * Connects to:
 *   - js/app.js   calls renderReceipt(activity) then exportReceiptAsPng()
 *   - js/solana.js provides formatSol/formatUsd/truncateAddress helpers
 * -----------------------------------------------------------------------
 */

(function () {
  "use strict";

  const { formatSol, formatUsd, truncateAddress, lamportsToSol } = window.SolSlipChain;

  function $(id) {
    return document.getElementById(id);
  }

  /**
   * Populates every field in the #receipt element from an activity object:
   *   { wallet, slot, swaps: [...], totals: { volumeUsd, gasLamports, gasSol, gasUsd, gasSavedUsd } }
   */
  function renderReceipt(activity) {
    const now = new Date();

    // ---- Header meta ----
    $("r-date").textContent = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    $("r-time").textContent = now.toLocaleTimeString("en-US", { hour12: false });
    $("r-slot").textContent = `#${activity.slot.toLocaleString("en-US")}`;
    $("r-wallet").textContent = truncateAddress(activity.wallet);

    // ---- Swap table ----
    const rowsHtml = activity.swaps
      .map((swap) => {
        const statusClass = swap.status === "FILLED" ? "status-ok" : "status-fail";
        const pairLabel = `${swap.soldSymbol}→${swap.boughtSymbol}`;
        return `
          <tr>
            <td>${pairLabel}<span class="receipt__pair-sub">${escapeHtml(swap.venue)}</span></td>
            <td>${formatQty(swap.soldAmount)} ${swap.soldSymbol}</td>
            <td>${formatQty(swap.boughtAmount)} ${swap.boughtSymbol}</td>
            <td>${formatQty(swap.executedPrice, 4)}</td>
            <td class="${statusClass}">${swap.status}</td>
          </tr>
        `;
      })
      .join("");
    $("r-swap-rows").innerHTML = rowsHtml;

    // ---- Network highlights ----
    const { totals } = activity;
    // Live Helius data doesn't include USD pricing (no price feed wired up),
    // so show a plain dash rather than a misleading $0.00.
    $("r-volume").textContent = totals.volumeUsd > 0 ? formatUsd(totals.volumeUsd) : "— (live mode)";
    $("r-gas-sol").textContent = formatSol(totals.gasSol, 6);
    $("r-gas-lamports").textContent = `${totals.gasLamports.toLocaleString("en-US")} lamports`;
    $("r-gas-saved").textContent = `~${formatUsd(totals.gasSavedUsd)} 🔥`;

    // ---- Footer ----
    const lastSig = activity.swaps[activity.swaps.length - 1]?.signature || "N/A";
    $("r-tx-id").textContent = `TXN ID ${truncateAddress(lastSig, 6, 6)}`;

    // Barcode / QR are pure-CSS pattern placeholders (see styles.css);
    // re-seed a pseudo-random width so each slip's barcode looks unique.
    $("r-barcode").style.backgroundSize = `${6 + (activity.slot % 5)}px 100%`;
    $("r-qr").style.backgroundSize = `${5 + (activity.slot % 4)}px ${5 + (activity.slot % 4)}px`;

    // Reveal
    $("empty-state").classList.add("hidden");
    $("receipt-wrap").classList.remove("hidden");
    $("fab-controls").classList.remove("hidden");
  }

  function formatQty(n, maxDigits = 3) {
    if (n === undefined || n === null || Number.isNaN(n)) return "—";
    if (n < 0.001) return n.toExponential(2);
    return n.toLocaleString("en-US", { maximumFractionDigits: maxDigits });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Rasterizes #receipt to a high-resolution PNG using html2canvas.
   * Returns a Promise<HTMLCanvasElement>.
   */
  async function captureReceiptCanvas() {
    const node = $("receipt");
    document.body.classList.add("is-exporting");
    try {
      const canvas = await html2canvas(node, {
        scale: 3, // high-res export for crisp X/Twitter posting
        backgroundColor: "#F5F5F0",
        useCORS: true,
        logging: false,
      });
      return canvas;
    } finally {
      document.body.classList.remove("is-exporting");
    }
  }

  /** Downloads the receipt as a PNG file. */
  async function exportReceiptAsPng(filename = "solslip-receipt.png") {
    const canvas = await captureReceiptCanvas();
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  /** Copies the rendered receipt PNG to the clipboard, where supported. */
  async function copyReceiptToClipboard() {
    const canvas = await captureReceiptCanvas();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not generate image blob");
    if (!navigator.clipboard || !window.ClipboardItem) {
      throw new Error("Clipboard image copy not supported in this browser");
    }
    await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
  }

  window.SolSlipReceipt = {
    renderReceipt,
    captureReceiptCanvas,
    exportReceiptAsPng,
    copyReceiptToClipboard,
  };
})();
