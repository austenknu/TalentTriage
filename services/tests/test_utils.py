"""
Test utilities for TalentTriage backend services

This module contains test utilities and fixtures for testing the backend services.
"""
import os
import sys
import pytest
from unittest.mock import MagicMock, patch
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from shared.utils import (
    init_supabase_client, 
    calculate_jaccard_similarity,
    scale_experience_score,
    determine_category
)

# Test data
@pytest.fixture
def sample_skills():
    """Sample skills for testing"""
    return {
        "candidate": ["python", "javascript", "react", "fastapi", "sql"],
        "job": ["python", "fastapi", "postgresql", "docker", "aws"]
    }

@pytest.fixture
def sample_scores():
    """Sample scores for testing"""
    return {
        "semantic_score": 0.85,
        "skills_score": 0.6,
        "experience_score": 0.7,
        "education_score": 0.9
    }

# Mock Supabase client
@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing"""
    mock_client = MagicMock()
    
    # Mock from method
    mock_from = MagicMock()
    mock_client.from_.return_value = mock_from
    
    # Mock select method
    mock_select = MagicMock()
    mock_from.select.return_value = mock_select
    
    # Mock insert method
    mock_insert = MagicMock()
    mock_from.insert.return_value = mock_insert
    
    # Mock update method
    mock_update = MagicMock()
    mock_from.update.return_value = mock_update
    
    # Mock eq method
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    mock_update.eq.return_value = mock_eq
    
    # Mock execute method
    mock_execute = MagicMock()
    mock_eq.execute.return_value = mock_execute
    mock_insert.execute.return_value = mock_execute
    
    return mock_client

# Tests for utility functions
def test_jaccard_similarity(sample_skills):
    """Test Jaccard similarity calculation"""
    # Calculate Jaccard similarity
    similarity = calculate_jaccard_similarity(
        sample_skills["candidate"],
        sample_skills["job"]
    )
    
    # Expected: intersection / union = 2 / 8 = 0.25
    assert similarity == 0.25
    
    # Test with empty lists
    assert calculate_jaccard_similarity([], []) == 0.0
    
    # Test with no overlap
    assert calculate_jaccard_similarity(["a", "b"], ["c", "d"]) == 0.0
    
    # Test with complete overlap
    assert calculate_jaccard_similarity(["a", "b"], ["a", "b"]) == 1.0

def test_scale_experience_score():
    """Test experience score scaling"""
    # Test with experience matching requirement
    assert scale_experience_score(5, 5) == 1.0
    
    # Test with experience exceeding requirement
    assert scale_experience_score(10, 5) == 1.0
    
    # Test with experience below requirement
    assert scale_experience_score(3, 5) == 0.6  # 3/5 = 0.6
    
    # Test with zero requirement
    assert scale_experience_score(5, 0) == 1.0
    
    # Test with zero experience
    assert scale_experience_score(0, 5) == 0.0

def test_determine_category(sample_scores):
    """Test category determination based on composite score"""
    # Test top category (score >= 0.75)
    composite_score = 0.8
    assert determine_category(composite_score) == "top"
    
    # Test moderate category (0.5 <= score < 0.75)
    composite_score = 0.6
    assert determine_category(composite_score) == "moderate"
    
    # Test reject category (score < 0.5)
    composite_score = 0.4
    assert determine_category(composite_score) == "reject"
    
    # Test edge cases
    assert determine_category(0.75) == "top"
    assert determine_category(0.5) == "moderate"
    assert determine_category(0.0) == "reject"
    assert determine_category(1.0) == "top"

# Test with custom thresholds
def test_determine_category_custom_thresholds():
    """Test category determination with custom thresholds"""
    with patch.dict(os.environ, {
        "TOP_THRESHOLD": "0.8",
        "MODERATE_THRESHOLD": "0.6"
    }):
        # Should be moderate now (below new top threshold)
        assert determine_category(0.76) == "moderate"
        
        # Should be reject now (below new moderate threshold)
        assert determine_category(0.55) == "reject"
        
        # Should still be top
        assert determine_category(0.85) == "top"
