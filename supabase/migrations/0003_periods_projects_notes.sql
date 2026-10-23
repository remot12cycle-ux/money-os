-- Money OS — custom finance month, business projects, notes.

-- ───────────────────────── custom finance month ─────────────────────────
-- The owner's "month" can start on any day (e.g. the 25th, payday). A period
-- keyed "2026-10" then runs 25 Oct → 24 Nov. 28 is the max so every month has it.
alter table public.profiles
  add column period_start_day int not null default 1 check (period_start_day between 1 and 28);

-- ───────────────────────── projects (inside a business) ─────────────────────────
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  slug text not null,
  status text not null default 'active' check (status in ('idea','active','paused','archived')),
  description text,
  url text,
  color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, entity_id, slug)
);
create index projects_owner_idx on public.projects(owner_id);
create index projects_entity_idx on public.projects(entity_id);
alter table public.projects enable row level security;
create policy "projects: own all" on public.projects for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

alter table public.transactions add column project_id uuid references public.projects(id) on delete set null;
create index transactions_project_idx on public.transactions(project_id);
alter table public.tasks add column project_id uuid references public.projects(id) on delete set null;
create index tasks_project_idx on public.tasks(project_id);

-- A row tagged with a project always belongs to that project's business.
create or replace function public.sync_project_entity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ent uuid;
begin
  if new.project_id is not null then
    select entity_id into ent from public.projects where id = new.project_id;
    if ent is null then
      raise exception 'project not found';
    end if;
    new.entity_id := ent;
  end if;
  return new;
end;
$$;
create trigger transactions_project_entity before insert or update of project_id, entity_id on public.transactions
  for each row execute function public.sync_project_entity();
create trigger tasks_project_entity before insert or update of project_id, entity_id on public.tasks
  for each row execute function public.sync_project_entity();

-- ───────────────────────── notes (ideas per business / project) ─────────────────────────
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_id uuid references public.entities(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text check (title is null or length(title) <= 200),
  body text not null default '' check (length(body) <= 20000),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (entity_id is not null or project_id is not null)
);
create index notes_owner_idx on public.notes(owner_id, updated_at desc);
create index notes_entity_idx on public.notes(entity_id);
create index notes_project_idx on public.notes(project_id);
alter table public.notes enable row level security;
create policy "notes: own all" on public.notes for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create trigger notes_updated_at before update on public.notes for each row execute function public.set_updated_at();
create trigger notes_project_entity before insert or update of project_id, entity_id on public.notes
  for each row execute function public.sync_project_entity();

-- ───────────────────────── grants ─────────────────────────
grant select, insert, update, delete on public.projects, public.notes to authenticated, service_role;
