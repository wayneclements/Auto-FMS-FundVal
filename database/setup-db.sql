-- Create user
CREATE USER testopsdb WITH PASSWORD 'Test@psSQLdb#25';

-- Create database
CREATE DATABASE testops_portal_db OWNER testopsdb;

-- Connect to the database
\c testops_portal_db

-- Create schema
CREATE SCHEMA testops_portal AUTHORIZATION testopsdb;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA testops_portal TO testopsdb;
ALTER USER testopsdb SET search_path TO testops_portal;
