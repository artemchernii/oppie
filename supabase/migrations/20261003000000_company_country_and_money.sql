-- oppie.lab — companies get a country, and their money gets a unit.
--
-- Status: decided in DECISIONS.md #7, implemented here. Additive: two columns renamed, three added,
-- no row is touched, and the table is still empty.
--
-- How to apply: paste into the Supabase dashboard's SQL editor, as with the other two files. Every
-- statement is guarded, so re-running is harmless.
--
-- Why these columns and not others:
--
--   * `country` is two letters, not free text. A count by location over "UK", "United Kingdom" and
--     "London, UK" is three half-answers; `location` keeps the original wording beside the code so
--     nothing is lost by normalising.
--   * `currency` and `basis` exist so a figure can be grouped honestly. They do **not** exist so the
--     figures can be added to each other. A salary in pounds and a licence in dollars, per year
--     against per user against per project against a share of AUM, are not the same kind of quantity,
--     and no column here makes them one.
--   * `amount` and `amount_note` are renamed from `number` and `number_label`, because "number" does
--     not say what it holds and sat next to a currency column claiming to be one.
--   * There is deliberately no "money kind". `kind` already decides what `amount` means — `employer`
--     pays a salary, `vendor` charges for software, `bespoke` charges for the work by hand — and a
--     second column saying the same thing is a second column that can disagree.

-- ============================================================ rename

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'number'
  ) then
    alter table public.companies rename column number to amount;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'companies' and column_name = 'number_label'
  ) then
    alter table public.companies rename column number_label to amount_note;
  end if;
end $$;

-- ============================================================ new columns

alter table public.companies add column if not exists country  text not null default '';
alter table public.companies add column if not exists currency text not null default '';
alter table public.companies add column if not exists basis    text not null default '';

-- ============================================================ constraints

-- `check` constraints cannot be added `if not exists`, so each is added only when it is missing.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'company_country_is_two_letters') then
    alter table public.companies add constraint company_country_is_two_letters
      check (country ~ '^([A-Z]{2})?$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'company_currency_is_known') then
    alter table public.companies add constraint company_currency_is_known
      check (currency in ('', 'USD', 'GBP', 'EUR'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'company_basis_is_known') then
    alter table public.companies add constraint company_basis_is_known
      check (basis in ('', 'per_year', 'per_user_month', 'per_project', 'percent_of_aum', 'one_off'));
  end if;

  -- A currency with no figure is not a reading, it is a contradiction. Same for a basis. This is the
  -- storage half of "an empty field never becomes a value": a row that says USD and has no amount
  -- would render as a currency beside "Not added yet".
  if not exists (select 1 from pg_constraint where conname = 'company_currency_needs_an_amount') then
    alter table public.companies add constraint company_currency_needs_an_amount
      check (currency = '' or btrim(amount) <> '');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'company_basis_needs_an_amount') then
    alter table public.companies add constraint company_basis_needs_an_amount
      check (basis = '' or btrim(amount) <> '');
  end if;
end $$;

-- Not here, on purpose:
--
--   * A numeric `amount`. The figures are quoted and they are not one quantity — a range, a per-user
--     rate, a share of AUM, and "one bespoke build". A numeric column would force a parse, and the
--     parse would invent the unit.
--   * A `money kind` column, for the reason at the top.
--   * Any total, average or index over the money. Aggregates stay computed at read time, and only
--     where the quantities are the same kind as each other.
