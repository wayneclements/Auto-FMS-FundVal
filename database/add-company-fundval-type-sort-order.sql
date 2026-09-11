ALTER TABLE testops_portal.company_fundval_type
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

UPDATE testops_portal.company_fundval_type
SET sort_order = 0
WHERE sort_order IS NULL;

ALTER TABLE testops_portal.company_fundval_type
  ALTER COLUMN sort_order SET DEFAULT 0,
  ALTER COLUMN sort_order SET NOT NULL;