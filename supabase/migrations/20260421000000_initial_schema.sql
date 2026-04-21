-- ============================================================================
-- Virtus Lissone — Schema iniziale
-- Gestionale multi-sport (calcio, basket in futuro) con RLS
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUM
-- ============================================================================

create type user_role as enum ('superadmin', 'segretario', 'allenatore');
create type athlete_status as enum ('attivo', 'sospeso', 'ritirato');
create type payment_mode as enum ('unico', 'rate');
create type payment_status as enum ('non_pagato', 'parziale', 'pagato');
create type payment_method as enum ('contanti', 'bonifico');
create type coach_role as enum ('principale', 'secondo', 'dirigente');
create type document_kind as enum ('certificato_medico', 'documento_identita', 'foto_tessera', 'altro');
create type certificate_kind as enum ('dae', 'patentino_csi');
create type attendance_state as enum ('presente', 'assente', 'giustificato');
create type activity_action as enum (
  'upload_documento',
  'modifica_atleta',
  'modifica_quota',
  'modifica_allenatore',
  'modifica_certificato',
  'nuova_convocazione',
  'nuova_presenza'
);

-- ============================================================================
-- SPORTS (multi-sport: ora calcio, futuro basket)
-- ============================================================================

create table sports (
  id uuid primary key default uuid_generate_v4(),
  codice text not null unique,
  nome text not null,
  attivo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- SEASONS (anno sportivo)
-- ============================================================================

create table seasons (
  id uuid primary key default uuid_generate_v4(),
  sport_id uuid not null references sports(id) on delete restrict,
  etichetta text not null,              -- es. "2024/2025"
  data_inizio date not null,
  data_fine date not null,
  corrente boolean not null default false,
  created_at timestamptz not null default now(),
  unique (sport_id, etichetta)
);

create unique index seasons_unique_current
  on seasons (sport_id) where corrente = true;

-- ============================================================================
-- USERS (profilo legato a auth.users di Supabase)
-- ============================================================================

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text,
  cognome text,
  ruolo user_role not null default 'allenatore',
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- TEAMS (fisse, non cambiano ogni anno)
-- ============================================================================

create table teams (
  id uuid primary key default uuid_generate_v4(),
  sport_id uuid not null references sports(id) on delete restrict,
  nome text not null,
  ordine int not null default 0,
  attiva boolean not null default true,
  created_at timestamptz not null default now(),
  unique (sport_id, nome)
);

-- ============================================================================
-- COACHES
-- ============================================================================

create table coaches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  nome text not null,
  cognome text not null,
  email text,
  telefono text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table coach_team_roles (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references coaches(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  ruolo coach_role not null,
  created_at timestamptz not null default now(),
  unique (coach_id, team_id, season_id, ruolo)
);

create index coach_team_roles_team_season_idx
  on coach_team_roles (team_id, season_id);

create table coach_certificates (
  id uuid primary key default uuid_generate_v4(),
  coach_id uuid not null references coaches(id) on delete cascade,
  tipo certificate_kind not null,
  data_scadenza date not null,
  file_path text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coach_id, tipo)
);

-- ============================================================================
-- ATHLETES
-- ============================================================================

create table athletes (
  id uuid primary key default uuid_generate_v4(),
  sport_id uuid not null references sports(id) on delete restrict,
  nome text not null,
  cognome text not null,
  data_nascita date not null,
  codice_fiscale text unique,
  indirizzo text,
  citta text,
  cap text,
  provincia text,
  telefono text,
  email text,
  genitore_nome text,
  genitore_email text,
  genitore_telefono text,
  foto_path text,
  stato athlete_status not null default 'attivo',
  consenso_gdpr boolean not null default false,
  data_consenso_gdpr date,
  scheduled_deletion_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index athletes_sport_idx on athletes (sport_id);
create index athletes_stato_idx on athletes (stato);

-- Iscrizione atleta per stagione in una squadra
create table athlete_seasons (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  team_id uuid not null references teams(id) on delete restrict,
  numero_maglia int,
  data_iscrizione date not null default current_date,
  created_at timestamptz not null default now(),
  unique (athlete_id, season_id)
);

create index athlete_seasons_team_idx on athlete_seasons (team_id, season_id);
create index athlete_seasons_season_idx on athlete_seasons (season_id);

-- ============================================================================
-- DOCUMENTS (atleti)
-- ============================================================================

create table documents (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  tipo document_kind not null,
  etichetta text,
  file_path text not null,
  file_name text,
  mime_type text,
  file_size bigint,
  data_scadenza date,  -- obbligatoria per certificato medico
  uploaded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_athlete_idx on documents (athlete_id);
create index documents_tipo_idx on documents (tipo);

-- ============================================================================
-- PAYMENTS (quote di iscrizione)
-- ============================================================================

create table payments (
  id uuid primary key default uuid_generate_v4(),
  athlete_id uuid not null references athletes(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  importo_totale numeric(10,2) not null default 0,
  modalita payment_mode not null default 'unico',
  stato payment_status not null default 'non_pagato',

  -- Pagamento unico
  unico_importo numeric(10,2),
  unico_data date,
  unico_metodo payment_method,

  -- Prima rata
  rata1_importo numeric(10,2),
  rata1_data date,
  rata1_metodo payment_method,

  -- Seconda rata
  rata2_importo numeric(10,2),
  rata2_data date,
  rata2_metodo payment_method,

  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, season_id)
);

create index payments_season_idx on payments (season_id);
create index payments_stato_idx on payments (stato);

-- ============================================================================
-- TRAINING SESSIONS + ATTENDANCE
-- ============================================================================

create table training_sessions (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  data date not null,
  orario_inizio time,
  orario_fine time,
  luogo text,
  note text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index training_sessions_team_idx on training_sessions (team_id, data);

create table attendance (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  stato attendance_state not null default 'presente',
  note text,
  created_at timestamptz not null default now(),
  unique (session_id, athlete_id)
);

-- ============================================================================
-- MATCHES + CONVOCAZIONI
-- ============================================================================

create table matches (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  data date not null,
  orario time,
  luogo text,
  avversario text,
  casa_trasferta text check (casa_trasferta in ('casa', 'trasferta')),
  note text,
  created_at timestamptz not null default now()
);

create index matches_team_idx on matches (team_id, data);

create table convocations (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  convocato boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (match_id, athlete_id)
);

-- ============================================================================
-- ACTIVITY LOG
-- ============================================================================

create table activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  azione activity_action not null,
  entity_type text,
  entity_id uuid,
  descrizione text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_created_idx on activity_logs (created_at desc);
create index activity_logs_user_idx on activity_logs (user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Ruolo dell'utente corrente
create or replace function current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select ruolo from users where id = auth.uid()
$$;

-- È superadmin?
create or replace function is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select ruolo = 'superadmin' from users where id = auth.uid()), false)
$$;

-- È segretario o superadmin?
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select ruolo in ('superadmin', 'segretario') from users where id = auth.uid()),
    false
  )
$$;

-- Squadre di cui l'utente corrente è allenatore (nella stagione corrente)
create or replace function coach_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ctr.team_id
  from coach_team_roles ctr
  join coaches c on c.id = ctr.coach_id
  join seasons s on s.id = ctr.season_id and s.corrente = true
  where c.user_id = auth.uid()
$$;

-- Trigger updated_at
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at before update on users
  for each row execute function set_updated_at();
create trigger coaches_updated_at before update on coaches
  for each row execute function set_updated_at();
create trigger coach_certificates_updated_at before update on coach_certificates
  for each row execute function set_updated_at();
create trigger athletes_updated_at before update on athletes
  for each row execute function set_updated_at();
create trigger documents_updated_at before update on documents
  for each row execute function set_updated_at();
create trigger payments_updated_at before update on payments
  for each row execute function set_updated_at();

-- Auto-crea profilo users alla registrazione auth
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, ruolo)
  values (new.id, new.email, 'allenatore')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
