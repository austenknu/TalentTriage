# TalentTriage - AI Resume Screener & Ranker

TalentTriage is an AI-powered resume screening and ranking system that helps recruiters efficiently process candidate resumes and match them against job descriptions.

## Features

- **Resume Processing**: Upload and parse PDF/DOCX resumes into structured data
- **AI-Powered Analysis**: Generate embeddings and score candidates against job requirements
- **Candidate Ranking**: Automatically categorize candidates as top, moderate, or reject
- **Interactive Dashboard**: View candidate scores, comparisons, and visualizations
- **Job Management**: Create and manage job descriptions with required skills

## Architecture

TalentTriage is built with a modular architecture consisting of:

1. **Ingest Service**: FastAPI service for uploading resumes to Supabase Storage
2. **Parse Worker**: Background worker for extracting text and structured data from resumes
3. **Embedding Worker**: Background worker for generating vector embeddings
4. **Scoring Worker**: Background worker for calculating multi-factor scores
5. **Next.js Dashboard**: Frontend for recruiters to interact with the system
6. **Supabase Backend**: PostgreSQL database with pgvector for vector similarity search

## Tech Stack

### Backend
- Python 3.9+
- FastAPI
- RQ (Redis Queue)
- Supabase Python Client
- Sentence Transformers
- PyResparser
- Apache Tika, PDFPlumber, python-docx

### Frontend
- Next.js
- React
- TypeScript
- Material UI
- Chart.js
- TanStack Table
- Supabase JS Client

### Database & Storage
- Supabase PostgreSQL
- pgvector extension
- Supabase Storage

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- Redis server
- Supabase account (free tier works for development)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/TalentTriage.git
   cd TalentTriage
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL migrations in the `sql/` directory
   - Create a storage bucket named `resumes`

5. Configure environment variables:
   ```bash
   cp services/.env.example services/.env
   # Edit .env with your Supabase credentials and other settings
   ```

6. Start the services:
   ```bash
   # Terminal 1: Start the ingest service
   cd services/ingest_service
   uvicorn main:app --reload --port 8000
   
   # Terminal 2: Start the worker manager
   cd services
   python worker_manager.py
   ```

### Frontend Setup

1. Install frontend dependencies:
   ```bash
   cd frontend/nextjs_dashboard
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Create a Job**: Add a new job with title, description, and required skills
2. **Upload Resumes**: Upload candidate resumes for the job
3. **View Results**: See ranked candidates with scores and categories
4. **Explore Details**: View detailed candidate information and comparisons

## Database Schema

The database consists of the following tables:

- **job**: Stores job descriptions and requirements
- **uploads**: Tracks uploaded resume files and processing status
- **parsed_resume**: Contains structured data extracted from resumes
- **candidate_score**: Stores score components and final category

## Scoring Methodology

Candidates are scored based on multiple factors:

1. **Semantic Similarity** (50%): Vector similarity between resume and job description
2. **Skills Match** (30%): Jaccard similarity between candidate skills and required skills
3. **Experience** (15%): Scaling based on years of experience vs. requirements
4. **Education** (5%): Matching education keywords

The composite score determines the candidate category:
- **Top**: Score ≥ 0.75
- **Moderate**: Score ≥ 0.5
- **Reject**: Score < 0.5

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Sentence Transformers](https://www.sbert.net/) for embedding generation
- [PyResparser](https://github.com/OmkarPathak/pyresparser) for resume parsing
- [Supabase](https://supabase.io/) for database and storage
- [FastAPI](https://fastapi.tiangolo.com/) for API development
- [Next.js](https://nextjs.org/) for frontend development
