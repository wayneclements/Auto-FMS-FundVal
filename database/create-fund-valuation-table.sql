-- Create fund_valuation_run_sheets table in testops_portal schema
CREATE TABLE testops_portal.fund_valuation_run_sheets (
    id SERIAL PRIMARY KEY,
    run_sheet_name VARCHAR(256) NOT NULL,
    sort_order INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on run_sheet_name for faster lookups
CREATE INDEX idx_run_sheet_name ON testops_portal.fund_valuation_run_sheets(run_sheet_name);

-- Grant permissions to testopsdb user
GRANT ALL PRIVILEGES ON testops_portal.fund_valuation_run_sheets TO testopsdb;
GRANT USAGE, SELECT ON SEQUENCE testops_portal.fund_valuation_run_sheets_id_seq TO testopsdb;
