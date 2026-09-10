-- Runs automatically once, the first time the postgres container starts.
CREATE DATABASE trackflow_vectors;

\connect trackflow_vectors
CREATE EXTENSION IF NOT EXISTS vector;