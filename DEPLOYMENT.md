# PFAP Deployment Guide

This guide covers deploying the Personal Finance Analytics Platform (PFAP) to production using Vercel (frontend) and Render (backend with PostgreSQL).

## Architecture

- **Frontend**: React + Vite deployed to Vercel
- **Backend**: FastAPI deployed to Render
- **Database**: PostgreSQL on Render (production), SQLite (development)

## Prerequisites

- Git repository with PFAP code
- Vercel account (free tier available)
- Render account (free tier available)
- GitHub account (for deployment integration)

## Environment Variables

### Backend Environment Variables

Create these in Render dashboard or `.env` for local development:

```bash
# Database (Render provides this automatically when linking database)
DATABASE_URL=postgresql+psycopg://user:password@host:port/dbname

# Application
ENVIRONMENT=production
SECRET_KEY=your-secret-key-generate-in-production
API_PORT=8000

# CORS (comma-separated list of allowed origins)
ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Logging
LOG_LEVEL=INFO
```

### Frontend Environment Variables

Create these in Vercel dashboard or `.env` for local development:

```bash
# API URL - Point to your deployed backend
VITE_API_URL=https://your-backend.onrender.com

# Application
VITE_APP_NAME=PFAP
VITE_ENVIRONMENT=production
```

## Deployment Steps

### 1. Deploy Backend to Render

1. **Push code to GitHub** (if not already done)
2. **Create Render account** at [render.com](https://render.com)
3. **Create new Web Service**:
   - Connect your GitHub repository
   - Select the `backend` folder as root directory
   - Runtime: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Create PostgreSQL Database**:
   - In Render dashboard, create a new PostgreSQL database
   - Link it to your web service (Render will automatically set `DATABASE_URL`)
5. **Set Environment Variables**:
   - `ENVIRONMENT=production`
   - `SECRET_KEY` (generate a secure random string)
   - `ALLOWED_ORIGINS=https://your-frontend.vercel.app` (update after frontend deployment)
   - `LOG_LEVEL=INFO`
6. **Deploy**: Render will automatically deploy on push to main branch

### 2. Deploy Frontend to Vercel

1. **Create Vercel account** at [vercel.com](https://vercel.com)
2. **Import Project**:
   - Connect your GitHub repository
   - Select the `frontend` folder as root directory
   - Framework: Vite
3. **Set Environment Variables**:
   - `VITE_API_URL=https://your-backend.onrender.com` (use your Render backend URL)
   - `VITE_APP_NAME=PFAP`
   - `VITE_ENVIRONMENT=production`
4. **Deploy**: Vercel will automatically deploy on push to main branch

### 3. Update CORS Configuration

After deploying both frontend and backend:

1. Go to Render dashboard → your backend service
2. Update `ALLOWED_ORIGINS` environment variable to include your Vercel frontend URL
3. Redeploy the backend service

## Database Migrations

For production, use Alembic migrations instead of `create_all`:

```bash
cd backend

# Generate migration
alembic revision --autogenerate -m "Initial migration"

# Apply migration
alembic upgrade head
```

The application automatically uses Alembic in production mode (when `ENVIRONMENT=production`).

## Seed Data

Seed data runs automatically on application startup. It is idempotent (checks before inserting) so it's safe to run multiple times.

Default seed data includes:
- Categories: Food, Transport, Shopping, Bills, Entertainment, Health, Other
- Payment Methods: Cash, UPI, Debit Card, Credit Card
- Account: Primary
- Income Sources: Salary, Freelance, Refund, Interest, Other
- Investment Types: Mutual Fund, Stocks, Fixed Deposit, PPF, Gold, Other

## Local Development Setup

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.development .env

# Run development server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Run development server
npm run dev
```

## Monitoring

### Health Check

Both deployments have a health endpoint:

- Backend: `https://your-backend.onrender.com/health`
- Returns: `{ "status": "healthy", "database": "connected", "version": "0.1.0", "environment": "production" }`

### Logs

- **Render**: View logs in Render dashboard under your service
- **Vercel**: View logs in Vercel dashboard under your project

## Rollback

### Backend Rollback

1. Go to Render dashboard → your service
2. Click on "Deployments"
3. Find the previous successful deployment
4. Click "Rollback" to redeploy that commit

### Frontend Rollback

1. Go to Vercel dashboard → your project
2. Click on "Deployments"
3. Find the previous successful deployment
4. Click "..." menu → "Promote to Production"

## Troubleshooting

### Backend Issues

**Database connection failed**:
- Check `DATABASE_URL` environment variable
- Ensure PostgreSQL database is running
- Verify database credentials

**CORS errors**:
- Check `ALLOWED_ORIGINS` includes your frontend URL
- Ensure frontend URL is correct (no trailing slash)

**Seed data not loading**:
- Check logs for seed errors
- Verify database connection is working

### Frontend Issues

**API connection failed**:
- Check `VITE_API_URL` environment variable
- Ensure backend is deployed and accessible
- Verify CORS configuration on backend

**Build errors**:
- Check for TypeScript errors locally: `npm run build`
- Verify all dependencies are installed

## Security Checklist

- [ ] Change `SECRET_KEY` to a secure random string in production
- [ ] Use HTTPS for all URLs (Vercel and Render provide this automatically)
- [ ] Restrict `ALLOWED_ORIGINS` to your actual frontend domain
- [ ] Enable database connection encryption (Render provides this)
- [ ] Never commit `.env` files to git
- [ ] Rotate secrets periodically
- [ ] Monitor logs for suspicious activity

## Cost Estimate

- **Vercel (Frontend)**: Free tier (100GB bandwidth/month)
- **Render (Backend)**: Free tier (750 hours/month)
- **Render (PostgreSQL)**: Free tier (90 days, then $7/month for basic plan)

Total estimated cost: $0-7/month depending on database usage.

## Support

For issues or questions:
- Check logs in Render/Vercel dashboards
- Review this deployment guide
- Check application health endpoint status
