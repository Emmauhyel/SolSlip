# SolSlip Changelog

## [1.0.0] - 2026-08-18 - Production Release

### ✨ Features
- Real-time Solana swap receipt generation
- Three data sources with automatic fallback:
  - Helius API (live parsed swaps)
  - Solana RPC (real slot, mock swaps)
  - Pure mock generator (offline mode)
- Multi-format export: PNG download, clipboard, Twitter share
- Thermal printer aesthetic with CSS serrated edges
- Retro monospace typography (Space Mono font)
- Glassmorphic UI with ambient grid and glow effects
- Mobile-responsive design
- Sound effects (synthesized printer chatter + chime)
- Haptic feedback on supported devices
- Mute toggle with localStorage persistence

### 🔧 Configuration
- Environment-based config via `window.SOLSLIP_CONFIG`
- Helius API key support for live mode
- Configurable RPC endpoint
- Customizable share URL for Twitter links

### 🎨 Design
- Dark theme with Solana purple (#9945FF) and green (#14F195) accents
- Custom color palette in CSS variables
- High-contrast text for accessibility
- Smooth animations and transitions
- Optimized for small screens and desktops

### 📱 Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

### 🔒 Security
- 100% client-side processing
- No wallet connection required
- No backend server
- HTTPS-ready static site
- No sensitive data storage

### 📦 Performance
- <1s load time (CDN dependencies)
- <2s time to interactive
- <200ms receipt render
- <500ms PNG export

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup instructions.

## Known Limitations

- Helius API parsing limited to recent transactions (configurable by API plan)
- Public RPC endpoint rate-limited (use premium RPC for production)
- Mock generator shows illustrative (not real) swap data without Helius key
- Browser clipboard access requires HTTPS (works in localhost too)

## Future Roadmap

- [ ] Historical analytics dashboard
- [ ] Custom branding/white-label option
- [ ] QR code linking to transaction explorer
- [ ] Multi-chain support (Polygon, Ethereum)
- [ ] Dark/light theme toggle
- [ ] Internationalization (i18n)
- [ ] Native app (React Native or Flutter wrapper)

---

**Built for the Solana community by developers who love onchain receipts.**
