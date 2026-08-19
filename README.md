# SolSlip 🧾

> Your On-Chain Swaps, Printed on Paper.

Turn your Solana swap history from Jupiter, Raydium, and Pump.fun into a retro thermal trade receipt—ready to flex on X (formerly Twitter).

## Features

✨ **Real-time Receipt Generation**
- Connects to Solana mainnet via public RPC
- Pulls actual swap history with optional Helius API
- Falls back to realistic mock swaps offline

🎨 **Retro Thermal Printer Aesthetic**
- Authentic thermal paper texture and ink colors
- Animated receipt drop with print sound effects
- Mobile-responsive glassmorphic UI

📤 **Multi-Format Export**
- Download as high-res PNG
- Copy to clipboard
- Share directly to X/Twitter

🔊 **Immersive Feedback**
- Synthesized thermal-printer sound
- Haptic buzz on supported devices
- Mute toggle (saved to localStorage)

## Quick Start

### Clone & Run Locally

```bash
git clone https://github.com/yourusername/solslip.git
cd solslip
# Open index.html in your browser (no build step needed!)
```

### Configure (Optional)

For live swap parsing, set up Helius:

1. Get free API key: https://dev.helius.xyz
2. Update `index.html` in the config script:
   ```html
   <script>
     window.SOLSLIP_CONFIG = {
       heliusApiKey: 'YOUR_KEY_HERE',
       shareUrl: 'https://solslip.app',
       rpcEndpoint: 'https://api.mainnet-beta.solana.com',
     };
   </script>
   ```

### Try the Demo

Click **Demo Wallet** to generate a sample receipt instantly (no wallet needed).

## How It Works

1. **Enter a Solana wallet address** (or use Demo Wallet)
2. **Click "Print Slip"** to fetch recent swaps
3. **Receipt appears** with:
   - Swap history (pair, amounts, venue, status)
   - Total volume and gas costs
   - Savings vs. Ethereum gas
   - Transaction signatures
4. **Export** as PNG, copy, or share to X

### Data Sources (in order of availability)

1. **Helius API** (if key configured) → Real parsed swaps
2. **Solana RPC** (fallback) → Real slot number, mock swaps
3. **Mock Generator** (offline) → Realistic mock data

All data is processed **client-side only**—nothing is stored on our servers.

## Technology Stack

- **HTML5/CSS3** — Semantic markup + custom design tokens
- **Tailwind CSS** — Utility-first styling
- **Vanilla JavaScript** — Zero dependencies, ~800 LOC
- **Web Audio API** — Synthesized sound effects
- **html2canvas** — PNG export
- **@solana/web3.js** — RPC communication
- **Helius API** — Swap parsing (optional)

## File Structure

```
solslip/
├── index.html           # Main page + config
├── css/
│   └── styles.css       # Design tokens, custom components
├── js/
│   ├── app.js          # Event handling & orchestration
│   ├── solana.js       # On-chain data fetching
│   ├── receipt.js      # Rendering & export
│   └── effects-2.js    # Sound & haptics
├── DEPLOYMENT.md       # Production setup guide
└── .env.example        # Environment template
```

## Configuration Reference

### `window.SOLSLIP_CONFIG`

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `heliusApiKey` | String | `""` | Helius API key for live swaps (leave blank for mock) |
| `shareUrl` | String | `https://solslip.app` | Domain for Twitter share links |
| `rpcEndpoint` | String | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint |

## Development

### Customization

- **Colors**: Edit CSS variables in `css/styles.css`
- **Layout**: Modify Tailwind classes in `index.html`
- **Sound**: Adjust synthesis parameters in `js/effects-2.js`
- **Logic**: Extend swap parsing in `js/solana.js`

### Browser DevTools

1. Open Browser DevTools (`F12`)
2. Go to **Console** tab
3. Modify config:
   ```javascript
   window.SOLSLIP_CONFIG.heliusApiKey = 'test_key';
   ```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step production setup.

**Quick Deploy Options:**
- **Vercel** (recommended): `vercel`
- **Netlify**: Connect GitHub repo, set publish to `.`
- **GitHub Pages**: Enable in repo settings

## Troubleshooting

### "Couldn't print a slip"
- RPC endpoint is rate-limited → try again in a moment
- Wallet address is invalid → verify it's a real Solana address
- Network is offline → app will still show demo wallet

### "Clipboard copy not supported"
- Some browsers block clipboard access in insecure contexts
- Use HTTPS in production
- Use the Download PNG button instead

### No sound/haptics
- Browser has autoplay policy active
- Click anywhere on page first to enable audio
- Or use the Mute toggle to verify it's working

## Performance

- **Load time**: <1s (CDN dependencies: Tailwind, fonts, web3.js, html2canvas)
- **Time to interactive**: <2s
- **Receipt render**: <200ms
- **PNG export**: <500ms (depends on canvas size)

## Security

- ✅ **No backend server** — all processing client-side
- ✅ **No wallet connection** — only public RPC queries
- ✅ **No data storage** — nothing persisted to servers
- ✅ **HTTPS-ready** — works with any static host
- ✅ **CSP-friendly** — no inline scripts (except config)

## License

MIT — Use freely in personal or commercial projects.

## Support & Contributions

- **Found a bug?** Open an issue on GitHub
- **Have an idea?** Submit a feature request
- **Want to help?** PRs welcome!

---

**Built with ❤️ for the Solana community**

*SolSlip is an independent project · not affiliated with Jupiter, Raydium, or Pump.fun · always verify on-chain*
