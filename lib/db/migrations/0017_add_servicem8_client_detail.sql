-- ServiceM8 client detail.
--
-- The ServiceM8 integration was only able to store a client's name, email,
-- phone, address and postcode, so the first/last name, mobile, website, ABN and
-- separate billing address returned by the API were discarded on import. It also
-- had nowhere to keep the full normalised ServiceM8 client (contacts, images,
-- badges, payment terms), nor the granted OAuth scopes needed to detect a
-- connection that predates a newly required scope.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS abn_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_postcode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS billing_attention VARCHAR(255);

ALTER TABLE servicem8_connections
  ADD COLUMN IF NOT EXISTS granted_scopes TEXT;

ALTER TABLE servicem8_client_mappings
  ADD COLUMN IF NOT EXISTS company_data JSONB,
  ADD COLUMN IF NOT EXISTS servicem8_edit_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

-- ServiceM8 contact details have always been the missing piece: the Company
-- endpoint does not return them. Ensure the connections we hold are the ones
-- allowed to read contacts, categories, materials and attachments.
CREATE INDEX IF NOT EXISTS idx_sm8_client_mappings_uuid_active
  ON servicem8_client_mappings (servicem8_company_uuid)
  WHERE sync_status <> 'error';

CREATE INDEX IF NOT EXISTS idx_customers_team_name
  ON customers (team_id, name);
