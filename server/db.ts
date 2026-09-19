import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg
const demoMode = !process.env.DATABASE_URL
const companyCodeCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export const pool = demoMode ? null : new Pool({ connectionString: process.env.DATABASE_URL })

export type RunSheetRow = {
  id: number
  name: string
}

export type CompanyRow = {
  companyName: string
  companyNumber: string
}

export type FundValTypeRow = {
  fundValType: string
  lastFundValDate?: string
  lastTotalUnitsExtractRunDate?: string
  openInvestmentGroups: number[]
}

export type ProcessRow = {
  name: string
  description: string
  notes: string | null
  investmentGroups: Array<{
    name: string
    state: boolean
  }>
}

export type EditorData = {
  companies: Array<{ id: number, company: string }>
  fundValTypes: Array<{ id: number, company: string, fundValType: string }>
  processes: Array<{ id: number, company: string, fundValType: string, process: string }>
  investmentGroups: Array<{ id: number, company: string, fundValType: string, process: string, investmentGroup: string | null }>
}

const demoRunSheets: RunSheetRow[] = [
  { id: 1, name: 'Fund Valuation Run Sheet Test 1' },
]

const demoCompanies: CompanyRow[] = [
  { companyName: 'Co 008', companyNumber: '008' },
]

const demoFundValTypes: FundValTypeRow[] = [
  {
    fundValType: 'Fund Valuation Only',
    lastFundValDate: '2026-08-27',
    lastTotalUnitsExtractRunDate: '2026-08-27',
    openInvestmentGroups: [101, 102, 205],
  },
]

function compareCompanyCodes(first: string, second: string) {
  return companyCodeCollator.compare(first, second) || first.localeCompare(second)
}

function compareInvestmentGroups(first: string | null, second: string | null) {
  const firstValue = first ?? ''
  const secondValue = second ?? ''
  const firstNumber = Number(firstValue)
  const secondNumber = Number(secondValue)

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) return firstNumber - secondNumber || firstValue.localeCompare(secondValue)
  if (Number.isFinite(firstNumber)) return -1
  if (Number.isFinite(secondNumber)) return 1
  return firstValue.localeCompare(secondValue)
}

export async function checkDatabase(): Promise<{ ok: true, mode: 'demo' | 'postgres' }> {
  if (!pool) return { ok: true, mode: 'demo' }

  await pool.query('select 1')
  return { ok: true, mode: 'postgres' }
}

export async function writeToProcessingLog(environment: string, companyName: string, fundValDate: Date, message: string): Promise<void> {
  const database = requireDatabase()
  await database.query(
    `insert into testops_portal.fund_valuation_processing_log
       (actual_date_time, environment, company_name, fund_val_date, message)
     values (current_timestamp, $1, $2, $3, $4)`,
    [environment, companyName, fundValDate, message],
  )
}

export async function listRunSheets(): Promise<RunSheetRow[]> {
  if (!pool) return demoRunSheets

  const actualSchemaQuery = await pool.query<{ id: number, name: string }>(
    'select id, run_sheet_name as name from testops_portal.fund_valuation_run_sheets order by sort_order asc nulls last, run_sheet_name asc',
  )

  if (actualSchemaQuery.rows.length > 0) return actualSchemaQuery.rows

  try {
    const legacyResult = await pool.query<{ id: number, name: string }>(
      'select id, name from run_sheets order by name',
    )

    if (legacyResult.rows.length > 0) return legacyResult.rows
  } catch {
    // No legacy run_sheets table present.
  }

  return demoRunSheets
}

export async function listCompanies(runSheetName: string): Promise<CompanyRow[]> {
  if (!pool) {
    if (runSheetName === 'Second Run Sheet') {
      return [
        { companyName: '01', companyNumber: '01' },
        { companyName: '004', companyNumber: '004' },
        { companyName: '011', companyNumber: '011' },
      ].sort((first, second) => compareCompanyCodes(first.companyNumber, second.companyNumber))
    }

    return demoRunSheets.some((item) => item.name === runSheetName)
      ? [...demoCompanies].sort((first, second) => compareCompanyCodes(first.companyNumber, second.companyNumber))
      : []
  }

  const result = await pool.query<{ company_name: string }>(
    `select company as company_name
     from testops_portal.run_sheet_companies
     where run_sheet_name = $1
     order by company`,
    [runSheetName],
  )

  return result.rows
    .map((row) => ({
      companyName: row.company_name,
      companyNumber: row.company_name,
    }))
    .sort((first, second) => compareCompanyCodes(first.companyNumber, second.companyNumber))
}

export async function listFundValTypes(runSheetName: string, companyName: string): Promise<FundValTypeRow[]> {
  if (!pool) {
    const hasRunSheet = demoRunSheets.some((item) => item.name === runSheetName)
    const hasCompany = demoCompanies.some((item) => item.companyName === companyName)
    return hasRunSheet && hasCompany ? demoFundValTypes : []
  }

  const result = await pool.query<{
    fund_val_type: string
    open_investment_groups: number[]
  }>(
    `select
       cfvt.fundval_type as fund_val_type,
       coalesce(array_agg(distinct pig.investment_group::integer order by pig.investment_group::integer)
         filter (where pig.investment_group ~ '^[0-9]+$'), '{}') as open_investment_groups
     from testops_portal.company_fundval_type cfvt
     left join testops_portal.fundval_type_process ftp
       on ftp.run_sheet_name = cfvt.run_sheet_name
      and ftp.company = cfvt.company
      and ftp.fundval_type = cfvt.fundval_type
     left join testops_portal.process_investment_group pig
       on pig.run_sheet_name = ftp.run_sheet_name
      and pig.company = ftp.company
      and pig.fundval_type = ftp.fundval_type
      and pig.process = ftp.process
     where cfvt.run_sheet_name = $1 and cfvt.company = $2
    group by cfvt.fundval_type, cfvt.sort_order
    order by cfvt.sort_order asc, cfvt.fundval_type asc`,
    [runSheetName, companyName],
  )

  return result.rows.map((row) => ({
    fundValType: row.fund_val_type,
    openInvestmentGroups: row.open_investment_groups,
  }))
}

export async function listProcesses(runSheetName: string, companyName: string, fundValTypeName: string): Promise<ProcessRow[]> {
  if (!pool) return []

  const result = await pool.query<{
    name: string
    notes: string | null
    investment_groups: Array<{ name: string, state: boolean }>
  }>(
    `select
       ftp.process as name,
       to_jsonb(ftp) ->> 'notes' as notes,
       coalesce(
         json_agg(json_build_object('name', pig.investment_group, 'state', pig.status) order by pig.investment_group::integer)
           filter (where pig.investment_group is not null),
         '[]'::json
       ) as investment_groups
     from testops_portal.fundval_type_process ftp
     left join testops_portal.process_investment_group pig
       on pig.run_sheet_name = ftp.run_sheet_name
      and pig.company = ftp.company
      and pig.fundval_type = ftp.fundval_type
      and pig.process = ftp.process
     where ftp.run_sheet_name = $1 and ftp.company = $2 and ftp.fundval_type = $3
    group by ftp.process, to_jsonb(ftp) ->> 'notes', ftp.sort_order
    order by ftp.sort_order asc, ftp.process asc`,
    [runSheetName, companyName, fundValTypeName],
  )

  return result.rows.map((row) => ({
    name: row.name,
    description: '',
    notes: row.notes,
    investmentGroups: row.investment_groups,
  }))
}

function requireDatabase() {
  if (!pool) throw new Error('Runsheet editing requires a PostgreSQL database connection.')
  return pool
}

export async function getEditorData(runSheetName: string): Promise<EditorData> {
  const database = requireDatabase()
  const [companies, fundValTypes, processes, investmentGroups] = await Promise.all([
    database.query<{ id: number, company: string }>('select id, company from testops_portal.run_sheet_companies where run_sheet_name = $1 order by company', [runSheetName]),
    database.query<{ id: number, company: string, fundval_type: string, sort_order: number }>('select id, company, fundval_type, sort_order from testops_portal.company_fundval_type where run_sheet_name = $1 order by company, sort_order, fundval_type', [runSheetName]),
    database.query<{ id: number, company: string, fundval_type: string, process: string, sort_order: number }>('select id, company, fundval_type, process, sort_order from testops_portal.fundval_type_process where run_sheet_name = $1 order by company, fundval_type, sort_order, process', [runSheetName]),
    database.query<{ id: number, company: string, fundval_type: string, process: string, investment_group: string | null }>('select id, company, fundval_type, process, investment_group from testops_portal.process_investment_group where run_sheet_name = $1 order by company, fundval_type, process, investment_group nulls first', [runSheetName]),
  ])

  return {
    companies: [...companies.rows].sort((first, second) => compareCompanyCodes(first.company, second.company)),
    fundValTypes: fundValTypes.rows
      .map((row) => ({ id: row.id, company: row.company, fundValType: row.fundval_type, sortOrder: row.sort_order }))
      .sort((first, second) => compareCompanyCodes(first.company, second.company) || first.sortOrder - second.sortOrder || first.fundValType.localeCompare(second.fundValType)),
    processes: processes.rows
      .map((row) => ({ id: row.id, company: row.company, fundValType: row.fundval_type, process: row.process, sortOrder: row.sort_order }))
      .sort((first, second) => compareCompanyCodes(first.company, second.company) || first.fundValType.localeCompare(second.fundValType) || first.sortOrder - second.sortOrder || first.process.localeCompare(second.process)),
    investmentGroups: investmentGroups.rows
      .map((row) => ({ id: row.id, company: row.company, fundValType: row.fundval_type, process: row.process, investmentGroup: row.investment_group }))
      .sort((first, second) => compareCompanyCodes(first.company, second.company) || first.fundValType.localeCompare(second.fundValType) || first.process.localeCompare(second.process) || compareInvestmentGroups(first.investmentGroup, second.investmentGroup)),
  }
}

export async function createEditorRow(table: 'companies' | 'fund-val-types' | 'processes' | 'investment-groups', values: Record<string, string>) {
  const database = requireDatabase()
  if (table === 'fund-val-types') {
    await database.query(
      `insert into testops_portal.company_fundval_type (run_sheet_name, company, fundval_type, sort_order)
       select $1, $2, $3, coalesce(max(sort_order), 0) + 1
       from testops_portal.company_fundval_type
       where run_sheet_name = $1 and company = $2`,
      [values.runSheetName, values.company, values.fundValType],
    )
    return
  }
  if (table === 'processes') {
    const client = await database.connect()
    try {
      await client.query('begin')
      await client.query(
        'select 1 from testops_portal.company_fundval_type where run_sheet_name = $1 and company = $2 and fundval_type = $3 for update',
        [values.runSheetName, values.company, values.fundValType],
      )
      await client.query(
        `with previous_process as (
           select process
           from testops_portal.fundval_type_process
           where run_sheet_name = $1 and company = $2 and fundval_type = $3
           order by sort_order desc nulls last, id desc
           limit 1
         ), next_sort_order as (
           select coalesce(max(sort_order), 0) + 1 as sort_order
           from testops_portal.fundval_type_process
           where run_sheet_name = $1 and company = $2 and fundval_type = $3
         ), new_process as (
           insert into testops_portal.fundval_type_process (run_sheet_name, company, fundval_type, process, sort_order)
           select $1, $2, $3, $4, sort_order from next_sort_order
           returning process
         )
         insert into testops_portal.process_investment_group (run_sheet_name, company, fundval_type, process, investment_group)
         select $1, $2, $3, new_process.process, investment_groups.investment_group
         from testops_portal.process_investment_group as investment_groups
         cross join new_process
         where investment_groups.run_sheet_name = $1
           and investment_groups.company = $2
           and investment_groups.fundval_type = $3
           and investment_groups.process = (select process from previous_process)`,
        [values.runSheetName, values.company, values.fundValType, values.process],
      )
      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
    return
  }

  if (table === 'investment-groups' && !values.investmentGroup) throw new Error('Investment group is required.')

  const queries = {
    companies: ['insert into testops_portal.run_sheet_companies (run_sheet_name, company) values ($1, $2)', [values.runSheetName, values.company]],
    'investment-groups': ['insert into testops_portal.process_investment_group (run_sheet_name, company, fundval_type, process, investment_group) values ($1, $2, $3, $4, $5)', [values.runSheetName, values.company, values.fundValType, values.process, values.investmentGroup]],
  } as const
  const [query, parameters] = queries[table]
  await database.query(query, [...parameters])
}

export async function updateEditorRow(table: 'companies' | 'fund-val-types' | 'processes' | 'investment-groups', id: number, values: Record<string, string>) {
  const database = requireDatabase()
  if (table === 'investment-groups' && !values.investmentGroup) throw new Error('Investment group is required.')

  const queries = {
    companies: ['update testops_portal.run_sheet_companies set company = $1 where id = $2', [values.company, id]],
    'fund-val-types': ['update testops_portal.company_fundval_type set fundval_type = $1 where id = $2', [values.fundValType, id]],
    processes: ['update testops_portal.fundval_type_process set process = $1 where id = $2', [values.process, id]],
    'investment-groups': ['update testops_portal.process_investment_group set investment_group = $1 where id = $2', [values.investmentGroup, id]],
  } as const
  const [query, parameters] = queries[table]
  const result = await database.query(query, [...parameters])
  if (result.rowCount === 0) throw new Error('Editor row was not found.')
}

export async function deleteEditorRow(table: 'companies' | 'fund-val-types' | 'processes' | 'investment-groups', id: number) {
  const database = requireDatabase()
  const tables = {
    companies: 'testops_portal.run_sheet_companies',
    'fund-val-types': 'testops_portal.company_fundval_type',
    processes: 'testops_portal.fundval_type_process',
    'investment-groups': 'testops_portal.process_investment_group',
  } as const
  const result = await database.query(`delete from ${tables[table]} where id = $1`, [id])
  if (result.rowCount === 0) throw new Error('Editor row was not found.')
}
