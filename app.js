/**
 * SolSlip — js/app.js
 * -----------------------------------------------------------------------
 * Top-level controller. Wires up DOM events and orchestrates the two
 * other modules:
 *   - window.SolSlipChain    (js/solana.js)   data layer
 *   - window.SolSlipReceipt  (js/receipt.js)  render + export layer
 * -----------------------------------------------------------------------
 */

(function () {
  "use strict";

  const { isValidPublicKey, fetchWalletActivity, DEMO_WALLET } = window.SolSlipChain;
  const { renderReceipt, exportReceiptAsPng, copyReceiptToClipboard } = window.SolSlipReceipt;
  const { playPrintSequence, isMuted, toggleMuted } = window.SolSlipEffects;

  const form = document.getElementById("wallet-form");
  const input = document.getElementById("wallet-input");
  const errorEl = document.getElementById("wallet-error");
  const printBtn = document.getElementById("print-btn");
  const demoBtn = document.getElementById("demo-btn");
  const downloadBtn = document.getElementById("download-btn");
  const copyBtn = document.getElementById("copy-btn");
  const shareBtn = document.getElementById("share-btn");
  const resetBtn = document.getElementById("reset-btn");
  const muteToggle = document.getElementById("mute-toggle");
  const muteIconOn = document.getElementById("mute-icon-on");
  const muteIconOff = document.getElementById("mute-icon-off");
  const emptyState = document.getElementById("empty-state");
  const receiptWrap = document.getElementById("receipt-wrap");
  const fabControls = document.getElementById("fab-controls");
  const toastEl = document.getElementById("toast");

  let currentActivity = null; // last successfully rendered activity, for share text

  /* ------------------------------ toast -------------------------------- */

  let toastTimer = null;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
  }

  /* ---------------------------- form errors ----------------------------- */

  function setError(message) {
    if (!message) {
      errorEl.classList.add("hidden");
      errorEl.textContent = "";
      input.classList.remove("border-rose-400/60");
      return;
    }
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
    input.classList.add("border-rose-400/60");
  }

  /* ------------------------------ loading -------------------------------- */

  function setLoading(isLoading) {
    printBtn.disabled = isLoading;
    demoBtn.disabled = isLoading;
    printBtn.textContent = isLoading ? "Printing…" : "Print Slip";
    printBtn.style.opacity = isLoading ? "0.7" : "1";
  }

  /* ------------------------------ core flow ------------------------------ */

  async function printSlipFor(walletAddress) {
    const trimmed = walletAddress.trim();

    if (!isValidPublicKey(trimmed)) {
      setError("That doesn't look like a valid Solana address. Double-check and try again.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const activity = await fetchWalletActivity(trimmed);
      currentActivity = activity;
      renderReceipt(activity);
      playPrintSequence(); // synthesized thermal-printer sound + haptic buzz
      showToast("Slip printed ✦");
      // Smooth-scroll the fresh receipt into view on small screens
      receiptWrap.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      console.error("[SolSlip] Failed to print slip:", err);
      setError("Couldn't print a slip right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------ event wiring ---------------------------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    printSlipFor(input.value);
  });

  input.addEventListener("input", () => setError(null));

  demoBtn.addEventListener("click", () => {
    input.value = DEMO_WALLET;
    printSlipFor(DEMO_WALLET);
  });

  downloadBtn.addEventListener("click", async () => {
    try {
      await exportReceiptAsPng(`solslip-${Date.now()}.png`);
      showToast("Downloaded ✦");
    } catch (err) {
      console.error(err);
      showToast("Download failed — try again");
    }
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await copyReceiptToClipboard();
      showToast("Copied to clipboard ✦");
    } catch (err) {
      console.error(err);
      showToast("Clipboard copy not supported here");
    }
  });

  shareBtn.addEventListener("click", () => {
    const volume = currentActivity
      ? window.SolSlipChain.formatUsd(currentActivity.totals.volumeUsd)
      : "some serious";
    const text = `Just printed my SolSlip 🧾 — ${volume} swapped on Solana, gas paid in fractions of a cent. Print yours:`;
    const url = (window.SOLSLIP_CONFIG && window.SOLSLIP_CONFIG.shareUrl) || "https://solslip.app";
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=520");
  });

  resetBtn.addEventListener("click", () => {
    currentActivity = null;
    input.value = "";
    setError(null);
    receiptWrap.classList.add("hidden");
    fabControls.classList.add("hidden");
    emptyState.classList.remove("hidden");
  });

  /* ------------------------------ mute toggle ---------------------------- */

  function syncMuteButton() {
    const muted = isMuted();
    muteToggle.setAttribute("aria-pressed", String(muted));
    muteToggle.title = muted ? "Unmute print sound" : "Mute print sound";
    muteIconOn.classList.toggle("hidden", muted);
    muteIconOff.classList.toggle("hidden", !muted);
  }

  muteToggle.addEventListener("click", () => {
    toggleMuted();
    syncMuteButton();
  });

  syncMuteButton(); // reflect persisted preference on load
})();
