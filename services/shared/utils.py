"""
Shared utilities for TalentTriage services.

This module contains common functionality used across all services.
"""
import os
from typing import Any, Dict, List, Optional, Union

import dotenv
from loguru import logger
from supabase import Client, create_client

# Load environment variables
dotenv.load_dotenv()

# Configure logger
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.getenv("LOG_FILE", "logs/talentriage.log")

logger.remove()  # Remove default handler
logger.add(LOG_FILE, rotation="50 MB", level=LOG_LEVEL)
logger.add(lambda msg: print(msg), level=LOG_LEVEL)  # Console output

# Initialize Supabase client
def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    
    Returns:
        Client: Initialized Supabase client
    
    Raises:
        ValueError: If Supabase credentials are not configured
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("Supabase credentials not found in environment variables")
        raise ValueError("Supabase credentials not configured")
    
    return create_client(url, key)

# Helper functions for database operations
def upsert_record(client: Client, table: str, record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Insert or update a record in the specified table.
    
    Args:
        client: Supabase client
        table: Table name
        record: Record data
    
    Returns:
        Dict: The inserted/updated record
    """
    logger.debug(f"Upserting record to {table}: {record}")
    response = client.table(table).upsert(record).execute()
    
    if hasattr(response, 'error') and response.error:
        logger.error(f"Error upserting to {table}: {response.error}")
        raise Exception(f"Database error: {response.error}")
    
    return response.data[0] if response.data else {}

def update_record(client: Client, table: str, id_value: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a record by ID.
    
    Args:
        client: Supabase client
        table: Table name
        id_value: Primary key value
        updates: Fields to update
    
    Returns:
        Dict: The updated record
    """
    logger.debug(f"Updating {table} record {id_value}: {updates}")
    response = client.table(table).update(updates).eq("id", id_value).execute()
    
    if hasattr(response, 'error') and response.error:
        logger.error(f"Error updating {table}: {response.error}")
        raise Exception(f"Database error: {response.error}")
    
    return response.data[0] if response.data else {}

def get_record_by_id(client: Client, table: str, id_value: str) -> Optional[Dict[str, Any]]:
    """
    Get a record by ID.
    
    Args:
        client: Supabase client
        table: Table name
        id_value: Primary key value
    
    Returns:
        Dict or None: The record if found, None otherwise
    """
    logger.debug(f"Getting {table} record {id_value}")
    response = client.table(table).select("*").eq("id", id_value).execute()
    
    if hasattr(response, 'error') and response.error:
        logger.error(f"Error getting {table} record: {response.error}")
        raise Exception(f"Database error: {response.error}")
    
    return response.data[0] if response.data else None

def execute_sql(client: Client, sql: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Execute raw SQL with parameters.
    
    Args:
        client: Supabase client
        sql: SQL query
        params: Query parameters
    
    Returns:
        List: Query results
    """
    logger.debug(f"Executing SQL: {sql} with params: {params}")
    response = client.table("parsed_resume").execute_sql(sql, params)
    
    if hasattr(response, 'error') and response.error:
        logger.error(f"Error executing SQL: {response.error}")
        raise Exception(f"Database error: {response.error}")
    
    return response.data if response.data else []

# Scoring helpers
def calculate_jaccard_similarity(set1: List[str], set2: List[str]) -> float:
    """
    Calculate Jaccard similarity between two sets of strings.
    
    Args:
        set1: First set of strings
        set2: Second set of strings
    
    Returns:
        float: Jaccard similarity score (0-1)
    """
    if not set1 or not set2:
        return 0.0
    
    set1_lower = {s.lower() for s in set1}
    set2_lower = {s.lower() for s in set2}
    
    intersection = len(set1_lower.intersection(set2_lower))
    union = len(set1_lower.union(set2_lower))
    
    return intersection / union if union > 0 else 0.0

def scale_experience_years(years: float, target_years: float = 5.0) -> float:
    """
    Scale experience years to a 0-1 score.
    
    Args:
        years: Candidate's years of experience
        target_years: Job's required years (default: 5)
    
    Returns:
        float: Scaled score (0-1)
    """
    if years >= target_years:
        return 1.0
    elif years <= 0:
        return 0.0
    else:
        return years / target_years

def determine_category(score: float) -> str:
    """
    Determine candidate category based on composite score.
    
    Args:
        score: Composite score (0-1)
    
    Returns:
        str: Category ('top', 'moderate', or 'reject')
    """
    top_threshold = float(os.getenv("TOP_THRESHOLD", "0.75"))
    moderate_threshold = float(os.getenv("MODERATE_THRESHOLD", "0.5"))
    
    if score >= top_threshold:
        return "top"
    elif score >= moderate_threshold:
        return "moderate"
    else:
        return "reject"
