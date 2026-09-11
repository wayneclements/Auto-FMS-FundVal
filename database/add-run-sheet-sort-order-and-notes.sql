ALTER TABLE testops_portal.fund_valuation_run_sheets
  ADD COLUMN IF NOT EXISTS sort_order INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT;