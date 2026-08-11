CREATE TABLE IF NOT EXISTS approval_scheme_types (
  id serial PRIMARY KEY,
  code varchar(100) NOT NULL UNIQUE,
  label varchar(255) NOT NULL,
  short_label varchar(100) NOT NULL,
  description text,
  accent_color varchar(20) NOT NULL DEFAULT '#1d4ed8',
  text_color varchar(20) NOT NULL DEFAULT '#ffffff',
  symbol varchar(20) NOT NULL DEFAULT '',
  logo_src text,
  logo_alt text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

INSERT INTO approval_scheme_types (
  code,
  label,
  short_label,
  description,
  accent_color,
  text_color,
  symbol,
  logo_src,
  logo_alt,
  sort_order,
  is_active
)
VALUES
  ('gas-safe', 'Gas Safe', 'Gas Safe', 'Gas safety registrations', '#f59e0b', '#111827', 'GS', '/gas-safe-vector-6231473.webp', 'Gas Safe Register logo', 10, true),
  ('niceic', 'NICEIC', 'NICEIC', 'Electrical contracting', '#1d4ed8', '#ffffff', 'NC', NULL, NULL, 20, true),
  ('napit', 'NAPIT', 'NAPIT', 'Electrical and building', '#15803d', '#ffffff', 'NP', '/NAPIT-Member-Logo.webp', 'NAPIT Member logo', 30, true),
  ('elecsa', 'ELECSA', 'ELECSA', 'Domestic electrical certification', '#7c3aed', '#ffffff', 'EL', NULL, NULL, 40, true),
  ('stroma', 'Stroma', 'Stroma', 'Inspection and compliance', '#0f766e', '#ffffff', 'ST', NULL, NULL, 50, true),
  ('select', 'SELECT', 'SELECT', 'Scottish electrical trade', '#0f172a', '#ffffff', 'SL', NULL, NULL, 60, true),
  ('bafe', 'BAFE', 'BAFE', 'Fire safety certification', '#b91c1c', '#ffffff', 'BF', '/BAFE-Logo.webp', 'BAFE logo', 70, true),
  ('chas', 'CHAS', 'CHAS', 'Contractor health and safety compliance', '#0f4c81', '#ffffff', 'CH', '/logos/chas.png', 'Veriforce CHAS logo', 80, true),
  ('safecontractor', 'SafeContractor', 'SafeContractor', 'Health, safety and supply chain certification', '#006837', '#ffffff', 'SC', '/logos/safecontractor.png', 'SafeContractor logo', 90, true),
  ('iso-9001', 'ISO 9001', 'ISO 9001', 'Quality management systems', '#111827', '#ffffff', 'QMS', '/logos/iso-9001.png', 'ISO 9001 badge', 100, true),
  ('iso-14001', 'ISO 14001', 'ISO 14001', 'Environmental management systems', '#14532d', '#ffffff', 'EMS', '/logos/iso-14001.png', 'ISO 14001 badge', 110, true),
  ('iso-45001', 'ISO 45001', 'ISO 45001', 'Occupational health and safety management', '#7f1d1d', '#ffffff', 'OHS', '/logos/iso-45001.png', 'ISO 45001 badge', 120, true)
ON CONFLICT (code) DO NOTHING;
