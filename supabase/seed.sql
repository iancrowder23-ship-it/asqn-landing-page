-- Seed 23 US Army SF ranks (E-1 through O-6)
INSERT INTO public.ranks (name, abbreviation, sort_order)
SELECT * FROM (VALUES
  ('Private', 'PVT', 1),
  ('Private Second Class', 'PV2', 2),
  ('Private First Class', 'PFC', 3),
  ('Specialist', 'SPC', 4),
  ('Corporal', 'CPL', 5),
  ('Sergeant', 'SGT', 6),
  ('Staff Sergeant', 'SSG', 7),
  ('Sergeant First Class', 'SFC', 8),
  ('Master Sergeant', 'MSG', 9),
  ('First Sergeant', '1SG', 10),
  ('Sergeant Major', 'SGM', 11),
  ('Command Sergeant Major', 'CSM', 12),
  ('Warrant Officer 1', 'WO1', 13),
  ('Chief Warrant Officer 2', 'CW2', 14),
  ('Chief Warrant Officer 3', 'CW3', 15),
  ('Chief Warrant Officer 4', 'CW4', 16),
  ('Chief Warrant Officer 5', 'CW5', 17),
  ('Second Lieutenant', '2LT', 18),
  ('First Lieutenant', '1LT', 19),
  ('Captain', 'CPT', 20),
  ('Major', 'MAJ', 21),
  ('Lieutenant Colonel', 'LTC', 22),
  ('Colonel', 'COL', 23)
) AS v(name, abbreviation, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.ranks LIMIT 1);
