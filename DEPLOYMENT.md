# TalentTriage Deployment Guide

This document provides instructions for deploying the TalentTriage application in both development and production environments.

## Prerequisites

- Python 3.9+
- Node.js 16+
- Redis server
- Supabase account
- Git

## Local Development Deployment

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/TalentTriage.git
cd TalentTriage
```

### 2. Set Up Supabase

1. Create a new Supabase project at [https://app.supabase.io](https://app.supabase.io)
2. Create a storage bucket named `resumes` with the following policies:
   - Allow authenticated users to upload files
   - Allow authenticated users to read files
3. Run the SQL migrations in the `sql/` directory:
   - First run `001_enable_pgvector.sql` to enable the vector extension
   - Then run `002_schema.sql` to create the database schema

### 3. Configure Environment Variables

1. For backend services:
```bash
cd services
cp .env.example .env
# Edit .env with your Supabase credentials
```

2. For frontend:
```bash
cd frontend/nextjs_dashboard
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Set Up Backend Services

1. Create and activate a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Start Redis server:
```bash
redis-server
```

4. Start the ingest service:
```bash
cd services/ingest_service
uvicorn main:app --reload --port 8000
```

5. Start the worker manager (in a new terminal):
```bash
cd services
python worker_manager.py
```

### 5. Set Up Frontend

1. Install frontend dependencies:
```bash
cd frontend/nextjs_dashboard
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Access the application at [http://localhost:3000](http://localhost:3000)

## Production Deployment

### Option 1: Docker Deployment

#### 1. Build Docker Images

```bash
# Build backend image
docker build -f Dockerfile.backend -t talenttriage-backend .

# Build frontend image
docker build -f Dockerfile.frontend -t talenttriage-frontend .
```

#### 2. Deploy with Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3'

services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: always

  backend:
    image: talenttriage-backend
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - STORAGE_BUCKET=${STORAGE_BUCKET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: always

  worker:
    image: talenttriage-backend
    command: python worker_manager.py
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - STORAGE_BUCKET=${STORAGE_BUCKET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - backend
    restart: always

  frontend:
    image: talenttriage-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
    restart: always

volumes:
  redis-data:
```

Deploy with:

```bash
docker-compose up -d
```

### Option 2: Cloud Deployment

#### Backend Services

1. **Supabase**: Use Supabase Cloud for database and storage
2. **FastAPI Service**: Deploy to a cloud provider:
   - **Heroku**:
     ```bash
     heroku create talenttriage-api
     heroku config:set SUPABASE_URL=your_supabase_url
     heroku config:set SUPABASE_KEY=your_supabase_key
     heroku config:set STORAGE_BUCKET=resumes
     git subtree push --prefix services heroku main
     ```
   - **AWS Elastic Beanstalk**:
     - Create an Elastic Beanstalk environment
     - Configure environment variables
     - Deploy the services directory
   - **Google Cloud Run**:
     - Build and push the Docker image
     - Deploy to Cloud Run with environment variables
3. **Worker Processes**: Deploy to a cloud provider:
   - **Heroku Worker Dynos**
   - **AWS ECS**
   - **Google Cloud Run**
4. **Redis**: Use a managed Redis service:
   - **Redis Labs**
   - **AWS ElastiCache**
   - **Google Cloud Memorystore**

#### Frontend

1. **Vercel** (recommended for Next.js):
   ```bash
   cd frontend/nextjs_dashboard
   vercel
   ```
   Configure environment variables in the Vercel dashboard.

2. **Netlify**:
   ```bash
   cd frontend/nextjs_dashboard
   netlify deploy
   ```
   Configure environment variables in the Netlify dashboard.

3. **AWS Amplify**:
   - Connect your repository
   - Configure build settings
   - Set environment variables

## Scaling Considerations

### Database Scaling

- Enable connection pooling in Supabase
- Consider upgrading to a higher tier Supabase plan for production workloads
- Monitor database performance and optimize queries as needed

### Worker Scaling

- Scale worker processes based on queue size
- Use multiple worker instances for high-volume processing
- Consider using auto-scaling based on queue metrics

### API Service Scaling

- Use a load balancer for multiple API instances
- Implement caching for frequently accessed data
- Consider using a CDN for static assets

## Monitoring and Maintenance

### Logging

- Configure centralized logging:
  - **ELK Stack** (Elasticsearch, Logstash, Kibana)
  - **Datadog**
  - **New Relic**

### Monitoring

- Set up health check endpoints
- Monitor API response times
- Track worker queue size and processing times
- Set up alerts for error rates and performance issues

### Backup and Recovery

- Schedule regular database backups
- Implement a disaster recovery plan
- Test restoration procedures periodically

## Security Considerations

1. **Authentication**: Implement Supabase Auth for user authentication
2. **Authorization**: Set up row-level security in Supabase
3. **API Security**:
   - Rate limiting
   - Input validation
   - CORS configuration
4. **File Security**:
   - Validate file types and sizes
   - Scan uploads for malware
   - Use signed URLs for file access

## CI/CD Pipeline

Set up a CI/CD pipeline using GitHub Actions:

```yaml
name: TalentTriage CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - name: Run tests
        run: |
          pytest

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to production
        # Add deployment steps based on your chosen hosting platform
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**:
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure IP allowlisting is configured

2. **Worker Processing Issues**:
   - Check Redis connection
   - Verify worker logs for errors
   - Ensure required dependencies are installed

3. **File Upload Issues**:
   - Check storage bucket permissions
   - Verify file size limits
   - Check network connectivity

### Support Resources

- GitHub Issues: [https://github.com/yourusername/TalentTriage/issues](https://github.com/yourusername/TalentTriage/issues)
- Documentation: [https://github.com/yourusername/TalentTriage/wiki](https://github.com/yourusername/TalentTriage/wiki)
