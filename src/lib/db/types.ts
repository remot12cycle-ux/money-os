/**
 * Hand-maintained database types mirroring supabase/migrations/0001_init.sql.
 * Keep in sync when the schema changes.
 */

export type Currency = "USD" | "MAD";
export type TxType = "income" | "expense" | "transfer";
export type TxSource = "manual" | "ingest" | "committed" | "recurring" | "opening" | "debt";
export type EntityKind = "personal" | "business" | "salary";
export type CategoryKind = "income" | "expense";
export type AccountType = "cash" | "bank" | "wallet" | "card" | "other";
export type CommittedStatus = "open" | "paid" | "cancelled";
export type Cadence = "weekly" | "monthly" | "yearly";
export type DebtDirection = "owed_to_me" | "i_owe";
export type DebtStatus = "open" | "settled";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "doing" | "done";
export type TargetMetric = "net_profit" | "revenue";
export type Theme = "dark" | "light" | "system";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  base_currency: Currency;
  usd_to_mad: number;
  rate_updated_at: string | null;
  starting_capital: number;
  monthly_target: number;
  target_metric: TargetMetric;
  theme: Theme;
  display_name: string | null;
};

export type AccountRow = Timestamps & {
  id: string;
  owner_id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  color: string | null;
  icon: string | null;
  is_archived: boolean;
  sort_order: number;
};

export type EntityRow = Timestamps & {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  kind: EntityKind;
  color: string;
  icon: string | null;
  is_archived: boolean;
  sort_order: number;
};

export type CategoryRow = Timestamps & {
  id: string;
  owner_id: string;
  name: string;
  kind: CategoryKind;
  entity_id: string | null;
  color: string | null;
  icon: string | null;
  is_archived: boolean;
  sort_order: number;
};

export type TransactionRow = Timestamps & {
  id: string;
  owner_id: string;
  type: TxType;
  amount: number;
  currency: Currency;
  fx_rate_to_base: number;
  amount_base: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  entity_id: string | null;
  occurred_on: string;
  note: string | null;
  source: TxSource;
  external_id: string | null;
  meta: Json;
};

export type CommittedRow = Timestamps & {
  id: string;
  owner_id: string;
  title: string;
  amount: number;
  currency: Currency;
  entity_id: string | null;
  category_id: string | null;
  account_id: string | null;
  due_on: string | null;
  status: CommittedStatus;
  paid_transaction_id: string | null;
  note: string | null;
};

export type RecurringRow = Timestamps & {
  id: string;
  owner_id: string;
  title: string;
  type: "income" | "expense";
  amount: number;
  currency: Currency;
  account_id: string;
  category_id: string | null;
  entity_id: string | null;
  cadence: Cadence;
  next_run_on: string;
  is_active: boolean;
};

export type BudgetRow = Timestamps & {
  id: string;
  owner_id: string;
  category_id: string;
  month: string;
  amount_base: number;
};

export type GoalRow = Timestamps & {
  id: string;
  owner_id: string;
  title: string;
  target_amount_base: number;
  current_amount_base: number;
  deadline: string | null;
  color: string | null;
  is_done: boolean;
};

export type DebtRow = Timestamps & {
  id: string;
  owner_id: string;
  counterparty: string;
  direction: DebtDirection;
  principal: number;
  currency: Currency;
  due_on: string | null;
  note: string | null;
  status: DebtStatus;
};

export type DebtPaymentRow = {
  id: string;
  owner_id: string;
  debt_id: string;
  amount: number;
  paid_on: string;
  transaction_id: string | null;
  note: string | null;
  created_at: string;
};

export type TaskRow = Timestamps & {
  id: string;
  owner_id: string;
  title: string;
  notes: string | null;
  entity_id: string | null;
  priority: TaskPriority;
  due_on: string | null;
  status: TaskStatus;
  done_at: string | null;
  sort_order: number;
};

export type ApiKeyRow = {
  id: string;
  owner_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type AccountBalanceRow = {
  account_id: string;
  owner_id: string;
  currency: Currency;
  balance: number;
};

/* ───────── supabase-js Database shape ───────── */

type Generated = "id" | "owner_id" | "created_at" | "updated_at" | "amount_base";

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Partial<Row>, Generated | Required> &
    Partial<Pick<Row, Extract<Generated, keyof Row>>> &
    Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "id">;
      accounts: Table<AccountRow, "name" | "currency">;
      entities: Table<EntityRow, "name" | "slug">;
      categories: Table<CategoryRow, "name" | "kind">;
      transactions: Table<TransactionRow, "type" | "amount" | "currency" | "account_id">;
      committed_payables: Table<CommittedRow, "title" | "amount" | "currency">;
      recurring_rules: Table<
        RecurringRow,
        "title" | "type" | "amount" | "currency" | "account_id" | "next_run_on"
      >;
      budgets: Table<BudgetRow, "category_id" | "month" | "amount_base">;
      goals: Table<GoalRow, "title" | "target_amount_base">;
      debts: Table<DebtRow, "counterparty" | "direction" | "principal" | "currency">;
      debt_payments: Table<DebtPaymentRow, "debt_id" | "amount">;
      tasks: Table<TaskRow, "title">;
      api_keys: Table<ApiKeyRow, "name" | "key_hash" | "key_prefix">;
    };
    Views: {
      account_balances: { Row: AccountBalanceRow; Relationships: [] };
    };
    Functions: {
      setup_owner: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
