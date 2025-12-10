# 🚀 MindSphere Backend - Fly.io Deployment Guide

## Prerequisites
1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Login to Fly.io: `flyctl auth login`

## Deployment Steps

### 1️⃣ First-Time Setup
```bash
cd backend

# Launch your app (this will create/update fly.toml)
flyctl launch --copy-config --now

# Set your environment variables (from .env file)
flyctl secrets set OPENAI_API_KEY=your_key_here
flyctl secrets set MONGODB_URL=your_mongodb_connection_string
flyctl secrets set SECRET_KEY=your_secret_key

# Add any other secrets from your .env file:
# flyctl secrets set VARIABLE_NAME=value
```

### 2️⃣ Deploy Updates
```bash
# Deploy your app
flyctl deploy

# Check deployment status
flyctl status

# View logs
flyctl logs
```

### 3️⃣ Verify Deployment
```bash
# Open your app in browser
flyctl open

# OR visit:
# https://mindsphere-backend.fly.dev
```

## Essential Commands

### Monitoring
```bash
# Real-time logs
flyctl logs -f

# SSH into your app
flyctl ssh console

# Check app info
flyctl info
```

### Scaling
```bash
# Scale machines
flyctl scale count 2

# Scale VM resources
flyctl scale vm shared-cpu-1x --memory 512
```

### Troubleshooting
```bash
# Restart your app
flyctl apps restart

# Check health
flyctl checks list

# View deployment history
flyctl releases
```

## Production Checklist

- [ ] Set all environment variables via `flyctl secrets set`
- [ ] Update CORS origins in `main.py` (line 42) to your frontend domain
- [ ] Configure MongoDB Atlas IP whitelist to allow Fly.io IPs
- [ ] Test all endpoints after deployment
- [ ] Set up custom domain (optional): `flyctl certs add yourdomain.com`
- [ ] Enable auto-scaling if needed
- [ ] Set up monitoring/alerts

## Environment Variables Required

```bash
flyctl secrets set OPENAI_API_KEY=sk-...
flyctl secrets set MONGODB_URL=mongodb+srv://...
flyctl secrets set SECRET_KEY=your-secret-key
flyctl secrets set PROJECT_NAME="MindSphere API"
# Add any other vars from your .env
```

## Notes

- Your app will be available at: `https://mindsphere-backend.fly.dev`
- Logs are critical for debugging - use `flyctl logs -f` frequently
- First deployment may take 5-10 minutes (downloading dependencies)
- Subsequent deploys are faster (~2-3 minutes)

## Support
- Fly.io Docs: https://fly.io/docs/
- Community Forum: https://community.fly.io/
