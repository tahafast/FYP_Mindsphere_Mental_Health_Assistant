# MindSphere Backend Deployment Guide

## Fly.io Deployment

### Prerequisites
- [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Fly.io account configured

### Environment Secrets

Set the required secrets on Fly.io:

```bash
# MongoDB connection (required)
flyctl secrets set MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority" --app mindsphere-mental-health-assistant

# OpenAI API Key (required)
flyctl secrets set OPENAI_API_KEY="sk-your-openai-api-key" --app mindsphere-mental-health-assistant

# Database name (optional, defaults to 'mindsphere')
flyctl secrets set MONGODB_DB_NAME="mental_health_db" --app mindsphere-mental-health-assistant
```

### Deploy

```bash
cd backend
flyctl deploy --ha=false
```

### Restart Application

If you need to restart the application:

```bash
flyctl apps restart mindsphere-mental-health-assistant --strategy immediate
```

### Check Logs

```bash
flyctl logs --app mindsphere-mental-health-assistant
```

### Check Status

```bash
flyctl status --app mindsphere-mental-health-assistant
```

## MongoDB Atlas Configuration

### Required Settings
1. **Network Access**: Ensure your MongoDB Atlas cluster allows connections from `0.0.0.0/0` (or Fly.io's IP ranges)
2. **Database User**: Create a database user with read/write permissions
3. **Connection String**: Use the SRV connection string format

### Troubleshooting Connection Issues

If MongoDB connection fails:

1. **Check secrets are set**:
   ```bash
   flyctl secrets list --app mindsphere-mental-health-assistant
   ```

2. **Verify connection string format**:
   - Must start with `mongodb+srv://`
   - Special characters in password must be URL-encoded

3. **Check Atlas network access**:
   - Add `0.0.0.0/0` to IP whitelist for Fly.io compatibility

4. **View detailed logs**:
   ```bash
   flyctl logs --app mindsphere-mental-health-assistant --no-tail
   ```

## Health Checks

The API provides these health endpoints:

- `GET /` - Basic health check
- `GET /health` - Detailed health status

Expected response:
```json
{"status": "ok", "message": "MindSphere API is running"}
```
