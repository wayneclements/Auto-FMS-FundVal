DO $$
DECLARE
	mapping RECORD;
BEGIN
	FOR mapping IN
		SELECT *
		FROM (VALUES
			(9, 'FMBALAN'),
			(10, 'FMPI'),
			(11, 'FMPRD'),
			(12, 'FMPID'),
			(13, 'FMPPPD'),
			(14, 'FMDC'),
			(15, 'FMITIH'),
			(16, 'FMDIH'),
			(17, 'FMATI'),
			(18, 'FMHAI'),
			(19, 'FMCP'),
			(20, 'FMTUE'),
			(21, 'FMDRM'),
			(22, 'FMCIA'),
			(23, 'FMDP'),
			(24, 'FMBS'),
			(25, 'FMPRPC'),
			(26, 'FMFCPS'),
			(27, 'FMRBFSR'),
			(28, 'FMPSM'),
			(29, 'FMPDDD'),
			(30, 'FMAR'),
			(31, 'FMTCFP'),
			(32, 'FMPIF'),
			(33, 'FMPMIP'),
			(34, 'FMRBRR'),
			(35, 'FMPRBMR'),
			(36, 'FMPDCD'),
			(37, 'FMMFRP'),
			(38, 'FMMFA'),
			(39, 'FMPASF'),
			(40, 'FMPPD'),
			(41, 'FMDIRM'),
			(42, 'FMPCP'),
			(43, 'FMPSMREP'),
			(44, 'FMPFBBR'),
			(45, 'FMPMIPD'),
			(46, 'FMSWG'),
			(47, 'FMPMFI'),
			(48, 'FMCFP'),
			(49, 'FMMFD'),
			(50, 'FMPDD'),
			(51, 'FMAPTP'),
			(52, 'FMEOYFG'),
			(53, 'FMEOYP'),
			(54, 'FMAPEOYP')
		) AS mappings(sort_order, process)
		ORDER BY sort_order
	LOOP
		UPDATE testops_portal.fundval_type_process
		SET process = mapping.process
		WHERE sort_order = mapping.sort_order;
	END LOOP;
END $$;

INSERT INTO testops_portal.process_investment_group (
	run_sheet_name,
	company,
	fundval_type,
	process,
	investment_group
)
SELECT
	'First Run Sheet',
	'001',
	'Fund Valuation Only',
	processes.process,
	investment_groups.investment_group
FROM (VALUES ('FMPRD'), ('FMPMIP')) AS processes(process)
CROSS JOIN (VALUES ('10'), ('11'), ('120'), ('50'), ('51'), ('65'), ('70'), ('90')) AS investment_groups(investment_group)
WHERE NOT EXISTS (
	SELECT 1
	FROM testops_portal.process_investment_group AS existing_groups
	WHERE existing_groups.run_sheet_name = 'First Run Sheet'
		AND existing_groups.company = '001'
		AND existing_groups.fundval_type = 'Fund Valuation Only'
		AND existing_groups.process = processes.process
		AND existing_groups.investment_group = investment_groups.investment_group
);
