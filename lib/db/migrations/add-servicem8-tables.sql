-- ServiceM8 Integration Tables
-- Stores OAuth connections, job mappings, and client mappings

CREATE TABLE IF NOT EXISTS servicem8_connections (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP,
  servicem8_account_uuid VARCHAR(255),
  servicem8_company_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction VARCHAR(20) DEFAULT 'bidirectional',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicem8_job_mappings (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  certificate_id INTEGER NOT NULL REFERENCES certificates(id),
  servicem8_job_uuid VARCHAR(255) NOT NULL,
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicem8_client_mappings (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  servicem8_company_uuid VARCHAR(255) NOT NULL,
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sm8_connections_team ON servicem8_connections(team_id);
CREATE INDEX IF NOT EXISTS idx_sm8_job_mappings_team ON servicem8_job_mappings(team_id);
CREATE INDEX IF NOT EXISTS idx_sm8_job_mappings_cert ON servicem8_job_mappings(certificate_id);
CREATE INDEX IF NOT EXISTS idx_sm8_job_mappings_uuid ON servicem8_job_mappings(servicem8_job_uuid);
CREATE INDEX IF NOT EXISTS idx_sm8_client_mappings_team ON servicem8_client_mappings(team_id);
CREATE INDEX IF NOT EXISTS idx_sm8_client_mappings_customer ON servicem8_client_mappings(customer_id);
CREATE INDEX IF NOT EXISTS idx_sm8_client_mappings_uuid ON servicem8_client_mappings(servicem8_company_uuid);
