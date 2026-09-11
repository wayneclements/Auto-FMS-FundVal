CREATE TABLE IF NOT EXISTS testops_portal.fund_valuation_processing_log (
  actual_date_time timestamp NOT NULL,
  environment text NOT NULL,
  company_name text NOT NULL,
  fund_val_date timestamp NOT NULL,
  message text NOT NULL
);