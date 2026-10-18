-- Money OS — initial schema
-- Single-owner finance app. Every row carries owner_id and is guarded by RLS.
-- Run this in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ───────────────────────── helpers ─────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  base_currency text not null default 'USD' check (base_currency in ('USD','MAD')),
  usd_to_mad numeric(10,4) not null default 10.0000 check (usd_to_mad > 0),
  rate_updated_at timestamptz,
  starting_capital numeric(14,2) not null default 5000.00,
  monthly_target numeric(14,2) not null default 0,
  target_metric text not null default 'net_profit' check (target_metric in ('net_profit','revenue')),
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: own select" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: own insert" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: own update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- ───────────────────────── accounts ─────────────────────────
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'bank' check (type in ('cash','bank','wallet','card','other')),
  currency text not null check (currency in ('USD','MAD')),
  color text,
  icon text,
  is_archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_owner_idx on public.accounts(owner_id);
alter table public.accounts enable row level security;
create policy "accounts: own all" on public.accounts for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger accounts_updated_at before update on public.accounts for each row execute function public.set_updated_at();

-- ───────────────────────── entities (Personal / businesses / Salary) ─────────────────────────
create table public.entities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  kind text not null default 'business' check (kind in ('personal','business','salary')),
  color text not null default '#788ED6',
  icon text,
  is_archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);
create index entities_owner_idx on public.entities(owner_id);
alter table public.entities enable row level security;
create policy "entities: own all" on public.entities for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger entities_updated_at before update on public.entities for each row execute function public.set_updated_at();

-- ───────────────────────── categories ─────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense')),
  entity_id uuid references public.entities(id) on delete set null,
  color text,
  icon text,
  is_archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_owner_idx on public.categories(owner_id);
create index categories_entity_idx on public.categories(entity_id);
create unique index categories_owner_name_kind_uq on public.categories(owner_id, lower(name), kind);
alter table public.categories enable row level security;
create policy "categories: own all" on public.categories for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();

-- ───────────────────────── transactions ─────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense','transfer')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (currency in ('USD','MAD')),
  fx_rate_to_base numeric(12,6) not null default 1,
  amount_base numeric(14,2) generated always as (round(amount * fx_rate_to_base, 2)) stored,
  account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  entity_id uuid references public.entities(id) on delete set null,
  occurred_on date not null default current_date,
  note text,
  source text not null default 'manual' check (source in ('manual','ingest','committed','recurring','opening','debt')),
  external_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'transfer' or to_account_id is not null)
);
create index transactions_owner_date_idx on public.transactions(owner_id, occurred_on desc);
create index transactions_account_idx on public.transactions(account_id);
create index transactions_to_account_idx on public.transactions(to_account_id);
create index transactions_entity_idx on public.transactions(entity_id);
create index transactions_category_idx on public.transactions(category_id);
create unique index transactions_external_uq on public.transactions(owner_id, external_id) where external_id is not null;
alter table public.transactions enable row level security;
create policy "transactions: own all" on public.transactions for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger transactions_updated_at before update on public.transactions for each row execute function public.set_updated_at();

-- ───────────────────────── committed payables ─────────────────────────
create table public.committed_payables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (currency in ('USD','MAD')),
  entity_id uuid references public.entities(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  due_on date,
  status text not null default 'open' check (status in ('open','paid','cancelled')),
  paid_transaction_id uuid references public.transactions(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index committed_owner_status_idx on public.committed_payables(owner_id, status);
create index committed_entity_idx on public.committed_payables(entity_id);
create index committed_category_idx on public.committed_payables(category_id);
create index committed_account_idx on public.committed_payables(account_id);
create index committed_paid_tx_idx on public.committed_payables(paid_transaction_id);
alter table public.committed_payables enable row level security;
create policy "committed: own all" on public.committed_payables for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger committed_updated_at before update on public.committed_payables for each row execute function public.set_updated_at();

-- ───────────────────────── recurring rules ─────────────────────────
create table public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('income','expense')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (currency in ('USD','MAD')),
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  entity_id uuid references public.entities(id) on delete set null,
  cadence text not null default 'monthly' check (cadence in ('weekly','monthly','yearly')),
  next_run_on date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recurring_owner_idx on public.recurring_rules(owner_id, is_active, next_run_on);
create index recurring_account_idx on public.recurring_rules(account_id);
create index recurring_category_idx on public.recurring_rules(category_id);
create index recurring_entity_idx on public.recurring_rules(entity_id);
alter table public.recurring_rules enable row level security;
create policy "recurring: own all" on public.recurring_rules for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger recurring_updated_at before update on public.recurring_rules for each row execute function public.set_updated_at();

-- ───────────────────────── budgets ─────────────────────────
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null, -- first day of month
  amount_base numeric(14,2) not null check (amount_base >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, category_id, month)
);
create index budgets_owner_month_idx on public.budgets(owner_id, month);
create index budgets_category_idx on public.budgets(category_id);
alter table public.budgets enable row level security;
create policy "budgets: own all" on public.budgets for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger budgets_updated_at before update on public.budgets for each row execute function public.set_updated_at();

-- ───────────────────────── goals ─────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  target_amount_base numeric(14,2) not null check (target_amount_base > 0),
  current_amount_base numeric(14,2) not null default 0,
  deadline date,
  color text,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_owner_idx on public.goals(owner_id);
alter table public.goals enable row level security;
create policy "goals: own all" on public.goals for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger goals_updated_at before update on public.goals for each row execute function public.set_updated_at();

-- ───────────────────────── debts ─────────────────────────
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  counterparty text not null,
  direction text not null check (direction in ('owed_to_me','i_owe')),
  principal numeric(14,2) not null check (principal > 0),
  currency text not null check (currency in ('USD','MAD')),
  due_on date,
  note text,
  status text not null default 'open' check (status in ('open','settled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index debts_owner_idx on public.debts(owner_id, status);
alter table public.debts enable row level security;
create policy "debts: own all" on public.debts for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger debts_updated_at before update on public.debts for each row execute function public.set_updated_at();

create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  transaction_id uuid references public.transactions(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index debt_payments_debt_idx on public.debt_payments(debt_id);
create index debt_payments_owner_idx on public.debt_payments(owner_id);
create index debt_payments_tx_idx on public.debt_payments(transaction_id);
alter table public.debt_payments enable row level security;
create policy "debt_payments: own all" on public.debt_payments for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- ───────────────────────── tasks ─────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  entity_id uuid references public.entities(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_on date,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  done_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_owner_status_idx on public.tasks(owner_id, status, due_on);
create index tasks_entity_idx on public.tasks(entity_id);
alter table public.tasks enable row level security;
create policy "tasks: own all" on public.tasks for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();

-- ───────────────────────── api keys (ingest) ─────────────────────────
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index api_keys_owner_idx on public.api_keys(owner_id);
alter table public.api_keys enable row level security;
create policy "api_keys: own all" on public.api_keys for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

-- ───────────────────────── views ─────────────────────────
-- Balance per account in the account's own currency (derived, never stored).
create view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.owner_id,
  a.currency,
  coalesce(sum(
    case
      when t.type = 'income' and t.account_id = a.id then t.amount
      when t.type = 'expense' and t.account_id = a.id then -t.amount
      when t.type = 'transfer' and t.account_id = a.id then -t.amount
      when t.type = 'transfer' and t.to_account_id = a.id
        then round(t.amount * case when t.currency = a.currency then 1
                                   when t.currency = 'USD' then (select p.usd_to_mad from public.profiles p where p.id = a.owner_id)
                                   else 1 / (select p.usd_to_mad from public.profiles p where p.id = a.owner_id) end, 2)
      else 0
    end), 0)::numeric(14,2) as balance
from public.accounts a
left join public.transactions t on (t.account_id = a.id or t.to_account_id = a.id)
group by a.id, a.owner_id, a.currency;

-- ───────────────────────── first-login setup ─────────────────────────
-- Seeds the profile, default entities, categories, two accounts and the
-- $5,000 opening balance. Idempotent: safe to call on every login.
create or replace function public.setup_owner()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  acc_usd uuid;
  e_personal uuid; e_cod uuid; e_saas uuid; e_digital uuid; e_salary uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id) values (uid) on conflict (id) do nothing;

  if exists (select 1 from public.entities where owner_id = uid) then
    return; -- already seeded
  end if;

  insert into public.entities (owner_id, name, slug, kind, color, sort_order) values
    (uid, 'Personal', 'personal', 'personal', '#788ED6', 0) returning id into e_personal;
  insert into public.entities (owner_id, name, slug, kind, color, sort_order) values
    (uid, 'COD Africa', 'cod-africa', 'business', '#B45600', 1) returning id into e_cod;
  insert into public.entities (owner_id, name, slug, kind, color, sort_order) values
    (uid, 'SaaS', 'saas', 'business', '#0098D4', 2) returning id into e_saas;
  insert into public.entities (owner_id, name, slug, kind, color, sort_order) values
    (uid, 'Digital Products', 'digital-products', 'business', '#C65B93', 4) returning id into e_digital;
  insert into public.entities (owner_id, name, slug, kind, color, sort_order) values
    (uid, 'Salary', 'salary', 'salary', '#00855B', 3) returning id into e_salary;

  -- global categories
  insert into public.categories (owner_id, name, kind, sort_order) values
    (uid, 'Sales', 'income', 0),
    (uid, 'Salary', 'income', 1),
    (uid, 'Refunds received', 'income', 2),
    (uid, 'Other income', 'income', 3),
    (uid, 'Ads', 'expense', 10),
    (uid, 'Product cost', 'expense', 11),
    (uid, 'Shipping & delivery', 'expense', 12),
    (uid, 'Tools & software', 'expense', 13),
    (uid, 'Hosting & servers', 'expense', 14),
    (uid, 'Fees & commissions', 'expense', 15),
    (uid, 'Refunds given', 'expense', 16),
    (uid, 'Rent', 'expense', 20),
    (uid, 'Food', 'expense', 21),
    (uid, 'Transport', 'expense', 22),
    (uid, 'Subscriptions', 'expense', 23),
    (uid, 'Health', 'expense', 24),
    (uid, 'Shopping', 'expense', 25),
    (uid, 'Family', 'expense', 26),
    (uid, 'Other expense', 'expense', 29);

  insert into public.accounts (owner_id, name, type, currency, sort_order) values
    (uid, 'Main USD', 'bank', 'USD', 0) returning id into acc_usd;
  insert into public.accounts (owner_id, name, type, currency, sort_order) values
    (uid, 'Cash MAD', 'cash', 'MAD', 1);

  insert into public.transactions (owner_id, type, amount, currency, fx_rate_to_base, account_id, entity_id, occurred_on, note, source)
  values (uid, 'income', 5000.00, 'USD', 1, acc_usd, e_personal, current_date, 'Opening balance — starting capital', 'opening');
end;
$$;

revoke all on function public.setup_owner() from public;
grant execute on function public.setup_owner() to authenticated;

-- ───────────────────────── grants (Data API exposure) ─────────────────────────
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.account_balances to authenticated;

-- ───────────────────────── integrity: transaction currency must match its account ─────────────────────────
create or replace function public.enforce_tx_currency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  acc_cur text;
begin
  select currency into acc_cur from public.accounts where id = new.account_id;
  if acc_cur is null then
    raise exception 'account not found';
  end if;
  if new.currency <> acc_cur then
    raise exception 'transaction currency (%) must match account currency (%)', new.currency, acc_cur
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger transactions_currency_check
  before insert or update of account_id, currency on public.transactions
  for each row execute function public.enforce_tx_currency();

-- Recurring rules keep the day they were anchored on (so the 31st doesn't drift to the 28th).
alter table public.recurring_rules add column day_of_month int check (day_of_month between 1 and 31);

-- ───────────────────────── atomic flows ─────────────────────────
-- Pay a committed item: creates the expense (converted into the account currency when needed)
-- and closes the item, in one transaction. Runs as the caller (RLS applies).
create or replace function public.pay_committed(p_id uuid, p_account uuid, p_paid_on date, p_amount numeric default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c public.committed_payables%rowtype;
  acc public.accounts%rowtype;
  prof public.profiles%rowtype;
  amt numeric(14,2);
  fx numeric(12,6);
  tx_id uuid;
begin
  select * into c from public.committed_payables where id = p_id and status = 'open';
  if not found then raise exception 'committed item not found or not open'; end if;
  select * into acc from public.accounts where id = p_account;
  if not found then raise exception 'account not found'; end if;
  select * into prof from public.profiles where id = c.owner_id;

  amt := coalesce(p_amount, c.amount);
  -- convert the committed amount into the paying account's currency
  if c.currency <> acc.currency then
    amt := case when acc.currency = 'MAD' then round(amt * prof.usd_to_mad, 2) else round(amt / prof.usd_to_mad, 2) end;
  end if;
  fx := case when acc.currency = prof.base_currency then 1
             when acc.currency = 'USD' then prof.usd_to_mad
             else 1 / prof.usd_to_mad end;

  insert into public.transactions (owner_id, type, amount, currency, fx_rate_to_base, account_id, category_id, entity_id, occurred_on, note, source)
  values (c.owner_id, 'expense', amt, acc.currency, fx, acc.id, c.category_id, c.entity_id, p_paid_on, c.title, 'committed')
  returning id into tx_id;

  update public.committed_payables
     set status = 'paid', paid_transaction_id = tx_id, account_id = acc.id
   where id = c.id;
  return tx_id;
end;
$$;

-- Reopen a paid item: removes the expense it created so nothing is double counted.
create or replace function public.reopen_committed(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c public.committed_payables%rowtype;
begin
  select * into c from public.committed_payables where id = p_id;
  if not found then raise exception 'committed item not found'; end if;
  update public.committed_payables set status = 'open', paid_transaction_id = null where id = c.id;
  if c.paid_transaction_id is not null then
    delete from public.transactions where id = c.paid_transaction_id;
  end if;
end;
$$;

-- Record a debt payment, optionally booking the matching income/expense, atomically.
create or replace function public.record_debt_payment(p_debt uuid, p_amount numeric, p_paid_on date, p_account uuid default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  d public.debts%rowtype;
  acc public.accounts%rowtype;
  prof public.profiles%rowtype;
  amt numeric(14,2);
  fx numeric(12,6);
  tx_id uuid;
  paid_total numeric;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be above zero'; end if;
  select * into d from public.debts where id = p_debt;
  if not found then raise exception 'debt not found'; end if;

  if p_account is not null then
    select * into acc from public.accounts where id = p_account;
    if not found then raise exception 'account not found'; end if;
    select * into prof from public.profiles where id = d.owner_id;
    amt := p_amount;
    if d.currency <> acc.currency then
      amt := case when acc.currency = 'MAD' then round(amt * prof.usd_to_mad, 2) else round(amt / prof.usd_to_mad, 2) end;
    end if;
    fx := case when acc.currency = prof.base_currency then 1
               when acc.currency = 'USD' then prof.usd_to_mad
               else 1 / prof.usd_to_mad end;
    insert into public.transactions (owner_id, type, amount, currency, fx_rate_to_base, account_id, occurred_on, note, source)
    values (d.owner_id, case when d.direction = 'owed_to_me' then 'income' else 'expense' end, amt, acc.currency, fx, acc.id, p_paid_on,
            case when d.direction = 'owed_to_me' then 'Repayment from ' else 'Repayment to ' end || d.counterparty, 'debt')
    returning id into tx_id;
  end if;

  insert into public.debt_payments (owner_id, debt_id, amount, paid_on, transaction_id)
  values (d.owner_id, d.id, p_amount, p_paid_on, tx_id);

  select coalesce(sum(amount), 0) into paid_total from public.debt_payments where debt_id = d.id;
  if paid_total >= d.principal - 0.005 then
    update public.debts set status = 'settled' where id = d.id;
  end if;
end;
$$;

revoke all on function public.pay_committed(uuid, uuid, date, numeric) from public;
revoke all on function public.reopen_committed(uuid) from public;
revoke all on function public.record_debt_payment(uuid, numeric, date, uuid) from public;
grant execute on function public.pay_committed(uuid, uuid, date, numeric) to authenticated;
grant execute on function public.reopen_committed(uuid) to authenticated;
grant execute on function public.record_debt_payment(uuid, numeric, date, uuid) to authenticated;
