-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS "vector";

-- Comment: This extension allows us to store and query vector embeddings efficiently
-- It adds the vector data type and similarity operators (<->, <#>, etc.)
