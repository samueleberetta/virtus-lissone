-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table sports             enable row level security;
alter table seasons            enable row level security;
alter table users              enable row level security;
alter table teams              enable row level security;
alter table coaches            enable row level security;
alter table coach_team_roles   enable row level security;
alter table coach_certificates enable row level security;
alter table athletes           enable row level security;
alter table athlete_seasons    enable row level security;
alter table documents          enable row level security;
alter table payments           enable row level security;
alter table training_sessions  enable row level security;
alter table attendance         enable row level security;
alter table matches            enable row level security;
alter table convocations       enable row level security;
alter table activity_logs      enable row level security;

-- ----------------------------------------------------------------------------
-- sports / seasons / teams: lettura a tutti gli autenticati,
-- scrittura al superadmin
-- ----------------------------------------------------------------------------

create policy sports_select on sports
  for select to authenticated using (true);
create policy sports_write on sports
  for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

create policy seasons_select on seasons
  for select to authenticated using (true);
create policy seasons_write on seasons
  for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

create policy teams_select on teams
  for select to authenticated using (true);
create policy teams_write on teams
  for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

-- ----------------------------------------------------------------------------
-- users: ognuno legge il proprio profilo, il superadmin tutto
-- ----------------------------------------------------------------------------

create policy users_select_self on users
  for select to authenticated
  using (id = auth.uid() or is_superadmin());

create policy users_write_superadmin on users
  for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

create policy users_update_self on users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and ruolo = (select ruolo from users where id = auth.uid()));

-- ----------------------------------------------------------------------------
-- coaches + coach_team_roles + coach_certificates:
-- lettura superadmin/segretario, scrittura superadmin.
-- L'allenatore vede solo se stesso.
-- ----------------------------------------------------------------------------

create policy coaches_select on coaches
  for select to authenticated
  using (is_staff() or user_id = auth.uid());

create policy coaches_write on coaches
  for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

create policy coach_team_roles_select on coach_team_roles
  for select to authenticated
  using (
    is_staff()
    or exists (select 1 from coaches c where c.id = coach_id and c.user_id = auth.uid())
  );

create policy coach_team_roles_write on coach_team_roles
  for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

create policy coach_certificates_select on coach_certificates
  for select to authenticated
  using (
    is_staff()
    or exists (select 1 from coaches c where c.id = coach_id and c.user_id = auth.uid())
  );

create policy coach_certificates_write on coach_certificates
  for all to authenticated
  using (is_superadmin()) with check (is_superadmin());

-- ----------------------------------------------------------------------------
-- athletes: lo staff vede tutto, l'allenatore solo i suoi (per team_id)
-- ----------------------------------------------------------------------------

create policy athletes_select on athletes
  for select to authenticated
  using (
    is_staff()
    or exists (
      select 1 from athlete_seasons ats
      where ats.athlete_id = athletes.id
        and ats.team_id in (select coach_team_ids())
    )
  );

create policy athletes_write on athletes
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- ----------------------------------------------------------------------------
-- athlete_seasons
-- ----------------------------------------------------------------------------

create policy athlete_seasons_select on athlete_seasons
  for select to authenticated
  using (
    is_staff() or team_id in (select coach_team_ids())
  );

create policy athlete_seasons_write on athlete_seasons
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- ----------------------------------------------------------------------------
-- documents
-- ----------------------------------------------------------------------------

create policy documents_select on documents
  for select to authenticated
  using (
    is_staff()
    or exists (
      select 1 from athlete_seasons ats
      where ats.athlete_id = documents.athlete_id
        and ats.team_id in (select coach_team_ids())
    )
  );

create policy documents_write on documents
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- ----------------------------------------------------------------------------
-- payments: lo staff gestisce, l'allenatore NON vede le quote
-- ----------------------------------------------------------------------------

create policy payments_select on payments
  for select to authenticated using (is_staff());

create policy payments_write on payments
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- ----------------------------------------------------------------------------
-- training_sessions + attendance: lo staff gestisce, l'allenatore vede le sue
-- ----------------------------------------------------------------------------

create policy training_sessions_select on training_sessions
  for select to authenticated
  using (is_staff() or team_id in (select coach_team_ids()));

create policy training_sessions_write on training_sessions
  for all to authenticated
  using (is_staff()) with check (is_staff());

create policy attendance_select on attendance
  for select to authenticated
  using (
    is_staff()
    or exists (
      select 1 from training_sessions ts
      where ts.id = attendance.session_id
        and ts.team_id in (select coach_team_ids())
    )
  );

create policy attendance_write on attendance
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- ----------------------------------------------------------------------------
-- matches + convocations
-- ----------------------------------------------------------------------------

create policy matches_select on matches
  for select to authenticated
  using (is_staff() or team_id in (select coach_team_ids()));

create policy matches_write on matches
  for all to authenticated
  using (is_staff()) with check (is_staff());

create policy convocations_select on convocations
  for select to authenticated
  using (
    is_staff()
    or exists (
      select 1 from matches m
      where m.id = convocations.match_id
        and m.team_id in (select coach_team_ids())
    )
  );

create policy convocations_write on convocations
  for all to authenticated
  using (is_staff()) with check (is_staff());

-- ----------------------------------------------------------------------------
-- activity_logs: solo superadmin
-- ----------------------------------------------------------------------------

create policy activity_logs_select on activity_logs
  for select to authenticated using (is_superadmin());

create policy activity_logs_insert on activity_logs
  for insert to authenticated
  with check (auth.uid() is not null);
