-- ============================================================================
-- Seed Virtus Lissone
-- ============================================================================

-- Sport
insert into sports (id, codice, nome, attivo) values
  ('00000000-0000-0000-0000-000000000001', 'calcio', 'Calcio', true),
  ('00000000-0000-0000-0000-000000000002', 'basket', 'Basket', false)
on conflict (codice) do nothing;

-- Stagione corrente 2024/2025 per calcio
insert into seasons (id, sport_id, etichetta, data_inizio, data_fine, corrente) values
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '2024/2025',
   '2024-09-01',
   '2025-06-30',
   true)
on conflict do nothing;

-- 8 squadre calcio (fisse)
insert into teams (sport_id, nome, ordine) values
  ('00000000-0000-0000-0000-000000000001', 'Under 10',    10),
  ('00000000-0000-0000-0000-000000000001', 'Under 11',    20),
  ('00000000-0000-0000-0000-000000000001', 'Under 13',    30),
  ('00000000-0000-0000-0000-000000000001', 'Under 15',    40),
  ('00000000-0000-0000-0000-000000000001', 'Juniores',    50),
  ('00000000-0000-0000-0000-000000000001', 'Open SBC',    60),
  ('00000000-0000-0000-0000-000000000001', 'Open NEW',    70),
  ('00000000-0000-0000-0000-000000000001', 'Open Bianca', 80)
on conflict (sport_id, nome) do nothing;
