create table if not exists run_sheets (
  id integer generated always as identity primary key,
  name text not null unique
);

create table if not exists company_fund_val_types (
  id integer generated always as identity primary key,
  run_sheet_id integer not null references run_sheets(id) on delete cascade,
  company_name text not null,
  company_number text not null,
  fund_val_type text not null,
  last_fund_val_date date not null,
  last_total_units_extract_run_date date not null,
  unique (run_sheet_id, company_name, fund_val_type)
);

create table if not exists open_investment_groups (
  company_fund_val_type_id integer not null references company_fund_val_types(id) on delete cascade,
  investment_group integer not null,
  primary key (company_fund_val_type_id, investment_group)
);

create table if not exists process_functions (
  id integer generated always as identity primary key,
  company_fund_val_type_id integer not null references company_fund_val_types(id) on delete cascade,
  fms_function text not null,
  process text not null,
  description text not null default '',
  display_order integer not null default 0
);

insert into run_sheets (name)
values ('Fund Valuation Run Sheet Test 1')
on conflict (name) do nothing;

with run_sheet as (
  select id from run_sheets where name = 'Fund Valuation Run Sheet Test 1'
), inserted as (
  insert into company_fund_val_types (
    run_sheet_id,
    company_name,
    company_number,
    fund_val_type,
    last_fund_val_date,
    last_total_units_extract_run_date
  )
  select id, 'Co 008', '008', 'Fund Valuation Only', date '2026-08-27', date '2026-08-27'
  from run_sheet
  on conflict (run_sheet_id, company_name, fund_val_type) do update set
    last_fund_val_date = excluded.last_fund_val_date,
    last_total_units_extract_run_date = excluded.last_total_units_extract_run_date
  returning id
)
insert into open_investment_groups (company_fund_val_type_id, investment_group)
select id, investment_group
from inserted
cross join (values (101), (102), (205)) as groups(investment_group)
on conflict do nothing;
