ALTER TABLE testops_portal.process_investment_group
  ADD COLUMN IF NOT EXISTS status boolean;

UPDATE testops_portal.process_investment_group
SET status = random() < 0.8
WHERE status IS NULL;

ALTER TABLE testops_portal.process_investment_group
  ALTER COLUMN status SET DEFAULT true,
  ALTER COLUMN status SET NOT NULL;