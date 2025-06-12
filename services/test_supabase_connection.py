"""
Test Supabase connection for TalentTriage

This script tests the connection to Supabase and verifies that the
required tables and storage bucket exist.
"""
import os
import sys
from dotenv import load_dotenv
from loguru import logger

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load environment variables
load_dotenv()

# Check if environment variables are set
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
storage_bucket = os.getenv("STORAGE_BUCKET", "resumes")

if not supabase_url or not supabase_key:
    logger.error("SUPABASE_URL and SUPABASE_KEY environment variables must be set")
    sys.exit(1)

# Import Supabase client
try:
    from supabase import create_client, Client
except ImportError:
    logger.error("supabase-py package not installed. Run 'pip install supabase-py'")
    sys.exit(1)

# Initialize Supabase client
logger.info(f"Connecting to Supabase at {supabase_url}")
supabase: Client = create_client(supabase_url, supabase_key)

# Test database connection by querying the tables
try:
    # Check if job table exists
    response = supabase.table("job").select("id").limit(1).execute()
    logger.info(f"Successfully connected to job table: {response}")
    
    # Check if uploads table exists
    response = supabase.table("uploads").select("id").limit(1).execute()
    logger.info(f"Successfully connected to uploads table: {response}")
    
    # Check if parsed_resume table exists
    response = supabase.table("parsed_resume").select("candidate_id").limit(1).execute()
    logger.info(f"Successfully connected to parsed_resume table: {response}")
    
    # Check if candidate_score table exists
    response = supabase.table("candidate_score").select("id").limit(1).execute()
    logger.info(f"Successfully connected to candidate_score table: {response}")
    
    logger.success("Database connection and tables verified successfully!")
except Exception as e:
    logger.error(f"Error connecting to database: {e}")
    sys.exit(1)

# Test storage bucket
try:
    # List files in the storage bucket
    response = supabase.storage.from_(storage_bucket).list()
    logger.info(f"Successfully connected to storage bucket '{storage_bucket}': {response}")
    
    logger.success("Storage bucket verified successfully!")
except Exception as e:
    logger.error(f"Error connecting to storage bucket '{storage_bucket}': {e}")
    sys.exit(1)

logger.success("Supabase connection test completed successfully!")
