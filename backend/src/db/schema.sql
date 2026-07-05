-- KasiCart database schema (SRS Section 6: Data Requirements)
-- Idempotent: safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS vendors (
  vendor_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name      TEXT        NOT NULL,
  phone_number       TEXT        NOT NULL,
  momo_merchant_code TEXT        NOT NULL,
  store_slug         TEXT        NOT NULL UNIQUE,
  management_token   TEXT,                             -- legacy; auth now via password
  password_hash      TEXT,
  language           TEXT        NOT NULL DEFAULT 'en',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrations for databases created before auth was added.
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE vendors ALTER COLUMN management_token DROP NOT NULL;

-- Phone number is the login identity, so it must be unique.
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_phone ON vendors (phone_number);
CREATE INDEX IF NOT EXISTS idx_vendors_store_slug ON vendors (store_slug);

CREATE TABLE IF NOT EXISTS items (
  item_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID        NOT NULL REFERENCES vendors (vendor_id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  price      INTEGER     NOT NULL CHECK (price >= 0),   -- unit price in whole RWF
  photo_url  TEXT,
  available  BOOLEAN     NOT NULL DEFAULT TRUE,
  position   INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_items_vendor ON items (vendor_id);

-- Order log (SRS 3.8): a record is created at each checkout so the vendor can
-- see who bought what, run analytics, and reconcile MoMo payments (Paid/Pending).
CREATE TABLE IF NOT EXISTS orders (
  order_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID        NOT NULL REFERENCES vendors (vendor_id) ON DELETE CASCADE,
  order_ref      TEXT        NOT NULL,
  buyer_tag      TEXT,                              -- e.g. B-4487
  buyer_name     TEXT,
  buyer_location TEXT,
  payer_name     TEXT,
  items          JSONB       NOT NULL,              -- snapshot at time of order
  total          INTEGER     NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending',  -- pending | paid | cancelled
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders (vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (vendor_id, status);
