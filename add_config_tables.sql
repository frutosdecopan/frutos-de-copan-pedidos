-- =============================================
-- Frutos de Copán - Configuration Tables
-- Phase 6: Admin Configuration Panel
-- =============================================

-- Table: destinations
-- Purpose: Manage delivery destinations (currently hardcoded in constants.ts)
CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: product_categories
-- Purpose: Manage product categories (currently text field in products)
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SEED DATA
-- =============================================

-- Insert destinations from constants.ts
INSERT INTO destinations (name, active) VALUES
  ('Villanueva', TRUE),
  ('San Pedro Sula', TRUE),
  ('Puerto Cortés', TRUE),
  ('La Ceiba', TRUE),
  ('Copán Ruinas', TRUE),
  ('La Entrada Copán', TRUE),
  ('Tegucigalpa', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert product categories
INSERT INTO product_categories (name, active) VALUES
  ('Frutas', TRUE),
  ('Cítricos', TRUE)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_destinations_active ON destinations(active);
CREATE INDEX IF NOT EXISTS idx_categories_active ON product_categories(active);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Enable read access for all users" ON destinations
  FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON product_categories
  FOR SELECT USING (true);

-- Only authenticated users can insert/update/delete (will be refined later)
CREATE POLICY "Enable insert for authenticated users" ON destinations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON destinations
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON destinations
  FOR DELETE USING (true);

CREATE POLICY "Enable insert for authenticated users" ON product_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON product_categories
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON product_categories
  FOR DELETE USING (true);

-- =============================================
-- VERIFICATION QUERY
-- =============================================

-- Run this to verify tables were created successfully
SELECT 
  'destinations' as table_name, COUNT(*) as records FROM destinations
UNION ALL
SELECT 'product_categories', COUNT(*) FROM product_categories
ORDER BY table_name;
