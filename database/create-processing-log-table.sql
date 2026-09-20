CREATE TABLE IF NOT EXISTS testops_portal.processing_log (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username text NOT NULL,
  message text NOT NULL,
  company_fund_val_type text NOT NULL,
  environment text NOT NULL,
  company text NOT NULL,
  fund_val_date date NOT NULL,
  status text NOT NULL,
  process text NOT NULL,
  investment_group text,
  actual_date_time timestamp NOT NULL DEFAULT current_timestamp
);
