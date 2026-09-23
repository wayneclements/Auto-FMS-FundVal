\set ON_ERROR_STOP on

BEGIN;

CREATE SCHEMA IF NOT EXISTS testops_portal;

CREATE TABLE IF NOT EXISTS testops_portal.fund_valuation_run_sheets (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_sheet_name varchar(256) NOT NULL UNIQUE,
  sort_order integer,
  notes text,
  created_at timestamp NOT NULL DEFAULT current_timestamp,
  updated_at timestamp NOT NULL DEFAULT current_timestamp
);

CREATE TABLE IF NOT EXISTS testops_portal.run_sheet_companies (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_sheet_name varchar(256) NOT NULL,
  company text NOT NULL,
  CONSTRAINT run_sheet_companies_run_sheet_fk
    FOREIGN KEY (run_sheet_name)
    REFERENCES testops_portal.fund_valuation_run_sheets (run_sheet_name)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT run_sheet_companies_unique UNIQUE (run_sheet_name, company)
);

CREATE TABLE IF NOT EXISTS testops_portal.company_fundval_type (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_sheet_name varchar(256) NOT NULL,
  company text NOT NULL,
  fundval_type text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT company_fundval_type_company_fk
    FOREIGN KEY (run_sheet_name, company)
    REFERENCES testops_portal.run_sheet_companies (run_sheet_name, company)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT company_fundval_type_unique
    UNIQUE (run_sheet_name, company, fundval_type)
);

CREATE TABLE IF NOT EXISTS testops_portal.fundval_type_process (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_sheet_name varchar(256) NOT NULL,
  company text NOT NULL,
  fundval_type text NOT NULL,
  process text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  CONSTRAINT fundval_type_process_fundval_type_fk
    FOREIGN KEY (run_sheet_name, company, fundval_type)
    REFERENCES testops_portal.company_fundval_type (run_sheet_name, company, fundval_type)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fundval_type_process_unique
    UNIQUE (run_sheet_name, company, fundval_type, process)
);

CREATE TABLE IF NOT EXISTS testops_portal.process_investment_group (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_sheet_name varchar(256) NOT NULL,
  company text NOT NULL,
  fundval_type text NOT NULL,
  process text NOT NULL,
  investment_group text NOT NULL,
  status boolean NOT NULL DEFAULT true,
  CONSTRAINT process_investment_group_process_fk
    FOREIGN KEY (run_sheet_name, company, fundval_type, process)
    REFERENCES testops_portal.fundval_type_process (run_sheet_name, company, fundval_type, process)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT process_investment_group_unique
    UNIQUE (run_sheet_name, company, fundval_type, process, investment_group),
  CONSTRAINT process_investment_group_numeric
    CHECK (investment_group ~ '^[0-9]+$')
);

CREATE TABLE IF NOT EXISTS testops_portal.fund_valuation_processing_log (
  actual_date_time timestamp NOT NULL DEFAULT current_timestamp,
  environment text NOT NULL,
  company_name text NOT NULL,
  fund_val_date timestamp NOT NULL,
  message text NOT NULL
);

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

CREATE INDEX IF NOT EXISTS fund_valuation_run_sheets_sort_order_idx
  ON testops_portal.fund_valuation_run_sheets (sort_order, run_sheet_name);

CREATE INDEX IF NOT EXISTS company_fundval_type_sort_order_idx
  ON testops_portal.company_fundval_type (run_sheet_name, company, sort_order, fundval_type);

CREATE INDEX IF NOT EXISTS fundval_type_process_sort_order_idx
  ON testops_portal.fundval_type_process (run_sheet_name, company, fundval_type, sort_order, process);

COMMIT;
