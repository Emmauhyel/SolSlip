/**
 * SolSlip — js/solana.js
 * -----------------------------------------------------------------------
 * Everything that talks (or pretends to talk) to the Solana chain lives
 * here. Exposes `window.SolSlipChain` which js/app.js and js/receipt.js
 * both consume.
 *
 * Connects to:
 *   - js/app.js     calls fetchWalletActivity() on submit / demo click
 *   - js/receipt.js calls formatSol() / lamportsToSol() when rendering
 * -----------------------------------------------------------------------
 */

(function () {
  "use strict";

  // A public RPC endpoint. Public endpoints are aggressively rate-limited,
  // so every real call is wrapped in a try/catch that falls back to the
  // mock generator below — the app should never feel "broken" offline.
  const RPC_ENDPOINT = (window.SOLSLIP_CONFIG && window.SOLSLIP_CONFIG.rpcEndpoint) || "https://api.mainnet-beta.solana.com";

  // ---------------------------------------------------------------------
  // OPTIONAL: real swap parsing via Helius's Enhanced Transactions API.
  // Plain Solana RPC only returns raw instructions — actually decoding a
  // Jupiter/Raydium/Pump.fun swap route requires an indexer. Helius parses
  // these for you and is the fastest path to genuine on-chain receipts.
  //
  // To go live:
  //   1. Grab a free API key at https://dev.helius.xyz
  //   2. Paste it below (or set window.SOLSLIP_CONFIG.heliusApiKey before
  //      this script loads, e.g. from a server-rendered value).
  // Leave it blank to run entirely on the RPC-anchored mock generator —
  // the app works great either way.
  // ---------------------------------------------------------------------
  const HELIUS_CONFIG = {
    apiKey: (window.SOLSLIP_CONFIG && window.SOLSLIP_CONFIG.heliusApiKey) || "",
    baseUrl: "https://api.helius.xyz/v0",
  };

  // Known mint addresses → display symbol/decimals, for turning raw Helius
  // token balance changes into the pairs the receipt shows. Extend freely.
  const KNOWN_MINTS = {
    So11111111111111111111111111111111111111112: { symbol: "SOL", decimals: 9 },
    DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: "BONK", decimals: 5 },
    JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: "JUP", decimals: 6 },
    EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: { symbol: "WIF", decimals: 6 },
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": { symbol: "RAY", decimals: 6 },
    HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: { symbol: "PYTH", decimals: 6 },
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", decimals: 6 },
  };

  // Realistic Solana-ecosystem pairs used by the mock trade generator.
  const MOCK_TOKENS = [
    { symbol: "SOL", decimals: 9, priceRangeUsd: [130, 210] },
    { symbol: "BONK", decimals: 5, priceRangeUsd: [0.000014, 0.000034] },
    { symbol: "JUP", decimals: 6, priceRangeUsd: [0.55, 1.1] },
    { symbol: "WIF", decimals: 6, priceRangeUsd: [1.2, 3.4] },
    { symbol: "RAY", decimals: 6, priceRangeUsd: [2.1, 4.8] },
    { symbol: "PYTH", decimals: 6, priceRangeUsd: [0.2, 0.5] },
  ];

  const VENUES = ["Jupiter", "Raydium", "Pump.fun"];

  const LAMPORTS_PER_SOL = 1_000_000_000;

  // Rough, illustrative comparison only — not a live gas oracle.
  // Used purely for the receipt's "flex" line, not financial advice.
  const AVG_ETH_SWAP_GAS_USD = 8.5;

  /* ----------------------------- helpers ------------------------------ */

  /** Base58 alphabet Solana uses (Bitcoin alphabet, no 0/O/I/l). */
  const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  /**
   * Validates that a string is a syntactically-plausible Solana public key:
   * base58 alphabet, correct length range. Does not guarantee the account
   * exists on-chain.
   */
  function isValidPublicKey(address) {
    if (typeof address !== "string") return false;
    const trimmed = address.trim();
    if (!BASE58_RE.test(trimmed)) return false;

    // If the web3.js CDN bundle loaded, double-check with its own decoder
    // for a stronger guarantee (catches checksum-shaped-but-invalid keys).
    try {
      if (window.solanaWeb3 && window.solanaWeb3.PublicKey) {
        // eslint-disable-next-line no-new
        new window.solanaWeb3.PublicKey(trimmed);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function truncateAddress(address, head = 4, tail = 4) {
    if (!address || address.length <= head + tail + 3) return address;
    return `${address.slice(0, head)}…${address.slice(-tail)}`;
  }

  function lamportsToSol(lamports) {
    return lamports / LAMPORTS_PER_SOL;
  }

  function formatSol(amount, maxFractionDigits = 4) {
    return `${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxFractionDigits,
    })} SOL`;
  }

  function formatUsd(amount) {
    if (amount < 0.01) return `$${amount.toExponential(2)}`;
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* --------------------------- RPC attempt ----------------------------- */

  /**
   * Attempts to pull real recent signatures for a wallet from the public
   * RPC, just enough to compute a slot number and rough tx count. Public
   * RPC does NOT reliably expose parsed swap instructions without a paid
   * indexer (Jupiter/Raydium program parsing is non-trivial), so this is
   * intentionally best-effort: on any failure/rate-limit we fall back to
   * generateMockActivity() so the UI always has something great to show.
   */
  async function tryFetchRealSlotAndSignatures(pubkeyStr) {
    if (!window.solanaWeb3) throw new Error("web3.js not loaded");

    const connection = new window.solanaWeb3.Connection(RPC_ENDPOINT, "confirmed");
    const pubkey = new window.solanaWeb3.PublicKey(pubkeyStr);

    const [slot, signatures] = await Promise.all([
      connection.getSlot(),
      connection.getSignaturesForAddress(pubkey, { limit: 5 }),
    ]);

    return { slot, signatures };
  }

  /* ------------------------- real swap parsing (Helius) ------------------ */

  /**
   * Pulls real recent transactions for a wallet from Helius's Enhanced
   * Transactions API and extracts the ones that are parsed swaps, then
   * reshapes them into the same swap-record shape the mock generator
   * produces so renderReceipt() doesn't need to know the difference.
   *
   * Throws on any failure (missing key, rate limit, no swaps found) —
   * the caller decides how to fall back.
   */
  async function tryFetchRealSwapsFromHelius(walletAddress) {
    if (!HELIUS_CONFIG.apiKey) throw new Error("No Helius API key configured");

    const url = `${HELIUS_CONFIG.baseUrl}/addresses/${walletAddress}/transactions?api-key=${HELIUS_CONFIG.apiKey}&type=SWAP&limit=10`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Helius request failed: ${res.status}`);

    const txs = await res.json();
    if (!Array.isArray(txs) || txs.length === 0) throw new Error("No parsed swaps found");

    const swaps = [];
    let totalGasLamports = 0;
    let totalVolumeUsd = 0; // best-effort; Helius doesn't return USD pricing directly

    for (const tx of txs) {
      const swapEvent = tx.events && tx.events.swap;
      if (!swapEvent) continue;

      const soldLeg = swapEvent.tokenInputs?.[0] || swapEvent.nativeInput;
      const boughtLeg = swapEvent.tokenOutputs?.[0] || swapEvent.nativeOutput;
      if (!soldLeg || !boughtLeg) continue;

      const sold = resolveMint(soldLeg.mint, soldLeg.tokenAmount ?? lamportsToSol(Number(soldLeg.amount || 0)));
      const bought = resolveMint(boughtLeg.mint, boughtLeg.tokenAmount ?? lamportsToSol(Number(boughtLeg.amount || 0)));

      const gasLamports = Number(tx.fee || 5000);
      totalGasLamports += gasLamports;

      swaps.push({
        venue: tx.source ? titleCase(tx.source) : "Solana DEX",
        soldSymbol: sold.symbol,
        boughtSymbol: bought.symbol,
        soldAmount: sold.amount,
        boughtAmount: bought.amount,
        executedPrice: sold.amount > 0 ? bought.amount / sold.amount : 0,
        usdSize: 0, // unavailable without a price feed; receipt shows "—" gracefully
        gasLamports,
        status: tx.transactionError ? "FAILED" : "FILLED",
        signature: tx.signature || generateFakeSignature(),
      });
    }

    if (swaps.length === 0) throw new Error("No decodable swap legs in recent transactions");

    const gasSol = lamportsToSol(totalGasLamports);
    const gasUsd = gasSol * 180; // rough anchor price for the "saved vs Ethereum" flex line
    const gasSavedUsd = Math.max(0, AVG_ETH_SWAP_GAS_USD * swaps.length - gasUsd);

    return {
      source: "helius-live",
      wallet: walletAddress,
      slot: txs[0].slot || 0,
      swaps,
      totals: { volumeUsd: totalVolumeUsd, gasLamports: totalGasLamports, gasSol, gasUsd, gasSavedUsd },
    };
  }

  function resolveMint(mint, amount) {
    const known = mint && KNOWN_MINTS[mint];
    return {
      symbol: known ? known.symbol : mint ? truncateAddress(mint, 3, 0).replace("…", "") : "SOL",
      amount: Number(amount) || 0,
    };
  }

  function titleCase(str) {
    return str.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /* --------------------------- mock generator -------------------------- */

  /**
   * Builds a believable set of 3–6 swaps across SOL/BONK/JUP/WIF/RAY,
   * with gas costs in lamports, used whenever live parsing isn't available.
   */
  function generateMockActivity(walletAddress) {
    const tradeCount = Math.floor(randomBetween(3, 7));
    const swaps = [];
    let totalVolumeUsd = 0;
    let totalGasLamports = 0;

    for (let i = 0; i < tradeCount; i++) {
      let sold = pick(MOCK_TOKENS);
      let bought = pick(MOCK_TOKENS.filter((t) => t.symbol !== sold.symbol));

      const soldPrice = randomBetween(...sold.priceRangeUsd);
      const boughtPrice = randomBetween(...bought.priceRangeUsd);

      const usdSize = randomBetween(15, 2400);
      const soldAmount = usdSize / soldPrice;
      const boughtAmount = (usdSize * randomBetween(0.985, 0.999)) / boughtPrice; // minus slippage/fees

      const gasLamports = Math.floor(randomBetween(5000, 25000)); // realistic priority-fee range
      totalGasLamports += gasLamports;
      totalVolumeUsd += usdSize;

      swaps.push({
        venue: pick(VENUES),
        soldSymbol: sold.symbol,
        boughtSymbol: bought.symbol,
        soldAmount,
        boughtAmount,
        executedPrice: boughtPrice / soldPrice,
        usdSize,
        gasLamports,
        status: Math.random() > 0.08 ? "FILLED" : "FAILED",
        signature: generateFakeSignature(),
      });
    }

    const gasSol = lamportsToSol(totalGasLamports);
    const gasUsd = gasSol * randomBetween(130, 210);
    const gasSavedUsd = Math.max(0, AVG_ETH_SWAP_GAS_USD * tradeCount - gasUsd);

    return {
      source: "mock",
      wallet: walletAddress,
      slot: Math.floor(randomBetween(295_000_000, 300_000_000)),
      swaps,
      totals: {
        volumeUsd: totalVolumeUsd,
        gasLamports: totalGasLamports,
        gasSol,
        gasUsd,
        gasSavedUsd,
      },
    };
  }

  function generateFakeSignature() {
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let out = "";
    for (let i = 0; i < 64; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  /* ------------------------------ public API ---------------------------- */

  /**
   * Main entry point used by app.js. Always resolves (never rejects).
   * Tries three tiers, each falling back to the next:
   *   1. Helius-parsed real swaps   (genuine on-chain receipt, needs API key)
   *   2. RPC-anchored mock          (real slot number, illustrative swaps)
   *   3. Plain mock                 (RPC unreachable too — still demo-able)
   */
  async function fetchWalletActivity(walletAddress) {
    try {
      return await tryFetchRealSwapsFromHelius(walletAddress);
    } catch (heliusErr) {
      console.info("[SolSlip] Live swap parsing unavailable, falling back:", heliusErr.message);
    }

    try {
      const { slot } = await tryFetchRealSlotAndSignatures(walletAddress);
      // Public RPC gives us a real slot + confirms the address is live,
      // but real parsed swap history needs an indexer — so we anchor the
      // mock data to this real slot for authenticity.
      const activity = generateMockActivity(walletAddress);
      activity.slot = slot;
      activity.source = "rpc-anchored";
      return activity;
    } catch (rpcErr) {
      console.warn("[SolSlip] RPC unavailable, using mock generator:", rpcErr.message);
      return generateMockActivity(walletAddress);
    }
  }

  window.SolSlipChain = {
    isValidPublicKey,
    truncateAddress,
    lamportsToSol,
    formatSol,
    formatUsd,
    fetchWalletActivity,
    generateMockActivity,
    LAMPORTS_PER_SOL,
    DEMO_WALLET: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // well-known devnet-safe demo address
  };
})();
