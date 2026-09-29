CREATE TABLE IF NOT EXISTS app_settings (
  key varchar(150) PRIMARY KEY,
  value text,
  updated_at timestamp NOT NULL DEFAULT now(),
  updated_by integer REFERENCES users(id) ON DELETE SET NULL
);
