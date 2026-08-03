-- =============================================
-- Frutos de Copán - Client Name Unification Rules
-- Purpose: Let Admin merge different client-name spellings/variants
-- (e.g. "Supermercado la colonia orden#123", "Sugerido barato #1")
-- into one canonical name for reporting purposes only. The original
-- clientName stored on `orders` is never modified — this table only
-- feeds the client-side grouping logic in TopClientsChart.
-- =============================================

CREATE TABLE IF NOT EXISTS client_name_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_client_name_rules_keyword ON client_name_rules(keyword);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE client_name_rules ENABLE ROW LEVEL SECURITY;

-- Everyone can read (same open pattern as the other config tables:
-- product_categories, destinations — access is gated client-side in
-- ConfigurationView.tsx, which only Admin can reach)
CREATE POLICY "Enable read access for all users" ON client_name_rules
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON client_name_rules
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON client_name_rules
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON client_name_rules
  FOR DELETE USING (true);

-- =============================================
-- VERIFICATION QUERY
-- =============================================

SELECT 'client_name_rules' as table_name, COUNT(*) as records FROM client_name_rules;
