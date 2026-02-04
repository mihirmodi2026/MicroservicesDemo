# Cloudflare Tunnel Setup Guide

## Prerequisites
- Cloudflare account (free tier works)
- Domain added to Cloudflare
- cloudflared CLI installed locally

## Step 1: Install cloudflared

### Windows (PowerShell)
```powershell
winget install --id Cloudflare.cloudflared
```

### macOS
```bash
brew install cloudflared
```

### Linux
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/
```

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser to authenticate. Select your domain.

## Step 3: Create a Tunnel

```bash
cloudflared tunnel create microservices-tunnel
```

This creates:
- A tunnel with a unique ID
- A credentials file at `~/.cloudflared/<TUNNEL_ID>.json`

## Step 4: Configure DNS

```bash
# Point your domain to the tunnel
cloudflared tunnel route dns microservices-tunnel api.yourdomain.com
cloudflared tunnel route dns microservices-tunnel users.yourdomain.com
cloudflared tunnel route dns microservices-tunnel products.yourdomain.com
```

## Step 5: Update Configuration

1. Copy your tunnel ID and update `config.yml`:
   ```yaml
   tunnel: YOUR_ACTUAL_TUNNEL_ID
   ```

2. Copy credentials file:
   ```bash
   cp ~/.cloudflared/<TUNNEL_ID>.json ./cloudflare/credentials.json
   ```

3. Update hostnames in `config.yml` with your actual domain

## Step 6: Run with Docker

### Option A: Using environment variable (recommended)
```bash
# Get your tunnel token from Cloudflare Zero Trust dashboard
export CLOUDFLARE_TUNNEL_TOKEN=your-token-here
docker-compose --profile cloudflare up -d
```

### Option B: Using config file
```bash
docker-compose -f docker-compose.yml -f cloudflare/docker-compose.cloudflare.yml up -d
```

## Step 7: Verify

1. Check tunnel status:
   ```bash
   cloudflared tunnel info microservices-tunnel
   ```

2. Test your endpoints:
   ```bash
   curl https://api.yourdomain.com/health
   curl https://api.yourdomain.com/api/users
   curl https://api.yourdomain.com/api/products
   ```

## Cloudflare CDN Configuration

### Enable Caching (Optional)

In Cloudflare Dashboard:
1. Go to **Caching** > **Configuration**
2. Set **Caching Level** to **Standard**
3. Create a **Page Rule** for API caching:
   - URL: `api.yourdomain.com/api/products*`
   - Setting: **Cache Level** = Cache Everything
   - Setting: **Edge Cache TTL** = 1 hour

### Security Settings

1. Go to **Security** > **WAF**
2. Enable **Managed Rules** (free tier includes basic rules)
3. Go to **Security** > **Bots**
4. Enable **Bot Fight Mode** (free)

## Troubleshooting

### Check cloudflared logs
```bash
docker logs cloudflared
```

### Test locally first
```bash
cloudflared tunnel --config cloudflare/config.yml run
```

### Verify tunnel is connected
```bash
cloudflared tunnel info microservices-tunnel
```
