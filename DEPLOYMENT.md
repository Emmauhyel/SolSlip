# SolSlip Deployment Guide

## Pre-Deployment Checklist

### 1. **Environment Configuration**

Before deploying, configure your environment variables:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your production values:
   ```env
   HELIUS_API_KEY=your_api_key_here
   SHARE_URL=https://yourdomain.com
   GITHUB_REPO_URL=https://github.com/yourusername/solslip
   RPC_ENDPOINT=https://api.mainnet-beta.solana.com
   ```

### 2. **Helius API Setup (Optional but Recommended)**

For **live swap parsing** (showing real on-chain swaps instead of mock data):

1. Create a free account at [Helius API](https://dev.helius.xyz)
2. Generate an API key from your dashboard
3. Add the key to your `.env` file: `HELIUS_API_KEY=your_key_here`
4. The app will automatically use live parsing when available

**Without Helius API Key:** The app falls back to mock data. Users can still use all features, but swaps will be illustrative rather than real.

### 3. **Update Configuration in index.html**

Before deployment, update the script block in `<head>`:

```html
<script>
  window.SOLSLIP_CONFIG = {
    heliusApiKey: 'YOUR_HELIUS_KEY_HERE',  // Leave blank for mock mode
    shareUrl: 'https://yourdomain.com',
    rpcEndpoint: 'https://api.mainnet-beta.solana.com',  // Or devnet for testing
  };
</script>
```

### 4. **Update GitHub Link**

In the header (`<a href="https://github.com/yourusername/solslip"`), replace:
- `yourusername` with your actual GitHub username

## Deployment Options

### **Option A: Static Hosting (Recommended)**

Since SolSlip is a **static site** (no backend needed), you can deploy to:

- **Vercel** (recommended)
- **Netlify**
- **GitHub Pages**
- **AWS S3 + CloudFront**
- **Cloudflare Pages**

#### Vercel Deployment:
```bash
npm install -g vercel
vercel
```

#### Netlify Deployment:
1. Connect your GitHub repo to Netlify
2. Set build command: (leave blank — it's static)
3. Set publish directory: `.` (root folder)

#### GitHub Pages:
1. Push to `main` branch
2. Enable Pages in repository settings
3. Set source to `main` branch

### **Option B: Docker Deployment**

If you want to serve via Docker:

```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t solslip .
docker run -p 80:80 solslip
```

## Post-Deployment Verification

1. ✅ Visit your domain
2. ✅ Click "Demo Wallet" — should load mock or real swaps
3. ✅ Paste a valid Solana address (e.g., `5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1`)
4. ✅ Click "Print Slip" — receipt should render
5. ✅ Test export buttons: Download PNG, Copy to clipboard, Share to X
6. ✅ Verify share link goes to your configured domain

## API Rate Limits

- **Helius API**: Free tier allows reasonable usage. Monitor at https://dev.helius.xyz/dashboard
- **Solana RPC**: Public endpoint is rate-limited. For production, consider:
  - QuickNode RPC (paid)
  - Alchemy RPC (paid)
  - Running your own validator

## Security Notes

1. **API Keys**: Never commit `.env` to git (it's in `.gitignore`)
2. **CORS**: Helius and RPC endpoints are public, so no CORS issues
3. **Client-side only**: All processing happens in the browser — no server-side storage
4. **Wallet data**: Only transactions on-chain are fetched; nothing is stored

## Monitoring & Analytics

Consider adding:
- **Sentry** for error tracking
- **Vercel Analytics** for performance monitoring
- **Simple analytics** or **Plausible** for privacy-respecting usage stats

## Troubleshooting

### "No API key configured" error
- Leave blank to use mock mode (works great!)
- Or set up Helius API and add your key to `.env`

### "Couldn't print a slip" error
- Check browser console for specific error
- Verify RPC endpoint is accessible
- Try with demo wallet first

### Sharing to X (Twitter) doesn't work
- Verify `shareUrl` is set to your actual domain
- Check that X hasn't blocked your domain
- Try opening share link manually in new window

## Version Updates

Keep SolSlip updated:
1. Pull latest from GitHub
2. Review `CHANGELOG.md` for breaking changes
3. Re-test with `.env` values
4. Redeploy

## Support

- GitHub Issues: Report bugs or request features
- Twitter: @solslip (if account exists)
- Solana DevNet: Try on devnet first if unsure

---

**Last Updated**: 2026-08-18  
**Status**: Production-ready ✓
