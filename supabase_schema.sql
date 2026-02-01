-- =============================================
-- Frutos de Copán - Database Schema (Safe Version)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS (with IF NOT EXISTS logic)
-- =============================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Vendedor', 'Bodega', 'Producción', 'Administrador', 'Repartidor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'Borrador',
    'Enviado',
    'En Revisión',
    'En Producción',
    'En Despacho',
    'Entregado',
    'Cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_type AS ENUM (
    'Venta',
    'Degustación',
    'Cambio',
    'Muestra',
    'Promoción',
    'Donación'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE warehouse_type AS ENUM ('Local', 'Principal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLES
-- =============================================

-- Cities
CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouses
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  type warehouse_type NOT NULL DEFAULT 'Local',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role user_role NOT NULL,
  assigned_cities UUID[] DEFAULT '{}',
  unavailable_dates DATE[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  available BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presentations
CREATE TABLE IF NOT EXISTS presentations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  weight_kg NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, -- ORD-001, ORD-002, etc.
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  origin_city_name TEXT NOT NULL,
  order_type order_type NOT NULL DEFAULT 'Venta',
  destination_name TEXT NOT NULL,
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  city_name TEXT NOT NULL,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  warehouse_name TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'Borrador',
  assigned_delivery_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  presentation_id UUID REFERENCES presentations(id) ON DELETE SET NULL,
  presentation_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Logs
CREATE TABLE IF NOT EXISTS order_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  message TEXT NOT NULL,
  user_name TEXT NOT NULL
);

-- =============================================
-- INDEXES (only create if not exists)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_city_id ON orders(city_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_order_id ON order_logs(order_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SEED DATA
-- =============================================

-- Insert Cities
INSERT INTO cities (id, name) VALUES
  ('a1a1a1a1-b1b1-c1c1-d1d1-e1e1e1e1e1e1', 'La Ceiba'),
  ('a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2', 'San Pedro Sula'),
  ('a3a3a3a3-b3b3-c3c3-d3d3-e3e3e3e3e3e3', 'Puerto Cortés'),
  ('a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4', 'Copán'),
  ('a5a5a5a5-b5b5-c5c5-d5d5-e5e5e5e5e5e5', 'Roatán')
ON CONFLICT (name) DO NOTHING;

-- Insert Warehouses
INSERT INTO warehouses (id, name, city_id, type) VALUES
  ('f1f1f1f1-a1a1-b1b1-c1c1-d1d1d1d1d1d1', 'Bodega Ceiba Centro', 'a1a1a1a1-b1b1-c1c1-d1d1-e1e1e1e1e1e1', 'Local'),
  ('f2f2f2f2-a2a2-b2b2-c2c2-d2d2d2d2d2d2', 'Bodega SPS Sur', 'a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2', 'Local'),
  ('f3f3f3f3-a3a3-b3b3-c3c3-d3d3d3d3d3d3', 'Bodega Puerto', 'a3a3a3a3-b3b3-c3c3-d3d3-e3e3e3e3e3e3', 'Local'),
  ('f4f4f4f4-a4a4-b4b4-c4c4-d4d4d4d4d4d4', 'Bodega Principal Copán', 'a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4', 'Principal'),
  ('f5f5f5f5-a5a5-b5b5-c5c5-d5d5d5d5d5d5', 'Bodega Roatán', 'a5a5a5a5-b5b5-c5c5-d5d5-e5e5e5e5e5e5', 'Local')
ON CONFLICT DO NOTHING;

-- Insert Products
INSERT INTO products (id, name, category, available) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Mango', 'Frutas', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'Piña', 'Frutas', TRUE),
  ('33333333-3333-3333-3333-333333333333', 'Fresa', 'Frutas', TRUE),
  ('44444444-4444-4444-4444-444444444444', 'Maracuyá Semilla', 'Frutas', TRUE),
  ('55555555-5555-5555-5555-555555555555', 'Maracuyá Premium', 'Frutas', TRUE),
  ('66666666-6666-6666-6666-666666666666', 'Tamarindo', 'Frutas', TRUE),
  ('77777777-7777-7777-7777-777777777777', 'Tamarindo Fruta', 'Frutas', TRUE),
  ('88888888-8888-8888-8888-888888888888', 'Limón', 'Cítricos', TRUE),
  ('99999999-9999-9999-9999-999999999999', 'Nance', 'Frutas', TRUE),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mora', 'Frutas', TRUE)
ON CONFLICT DO NOTHING;

-- Insert Presentations
INSERT INTO presentations (id, name, weight_kg) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Libra', 0.45),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Medio Galón', 1.8),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Galón', 3.7)
ON CONFLICT (name) DO NOTHING;

-- Insert Mock Users
INSERT INTO users (id, name, email, role, assigned_cities, unavailable_dates) VALUES
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'Juan Vendedor (SPS)', 'juan@frutos.com', 'Vendedor', ARRAY['a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2']::UUID[], '{}'),
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'Maria Bodega (SPS)', 'maria@frutos.com', 'Bodega', ARRAY['a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2']::UUID[], '{}'),
  ('e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', 'Carlos Producción', 'carlos@frutos.com', 'Producción', ARRAY['a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4']::UUID[], '{}'),
  ('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'Admin General', 'admin@frutos.com', 'Administrador', ARRAY['a1a1a1a1-b1b1-c1c1-d1d1-e1e1e1e1e1e1', 'a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2', 'a3a3a3a3-b3b3-c3c3-d3d3-e3e3e3e3e3e3', 'a4a4a4a4-b4b4-c4c4-d4d4-e4e4e4e4e4e4', 'a5a5a5a5-b5b5-c5c5-d5d5-e5e5e5e5e5e5']::UUID[], '{}'),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'Pedro Reparto (SPS)', 'pedro@frutos.com', 'Repartidor', ARRAY['a2a2a2a2-b2b2-c2c2-d2d2-e2e2e2e2e2e2']::UUID[], '{}'),
  ('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', 'Luis Reparto (Ceiba)', 'luis@frutos.com', 'Repartidor', ARRAY['a1a1a1a1-b1b1-c1c1-d1d1-e1e1e1e1e1e1']::UUID[], ARRAY[CURRENT_DATE]::DATE[])
ON CONFLICT (email) DO NOTHING;

-- =============================================
-- VERIFICATION QUERY
-- =============================================

-- Run this to verify everything was created successfully
SELECT 
  'cities' as table_name, COUNT(*) as records FROM cities
UNION ALL
SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'presentations', COUNT(*) FROM presentations
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'order_logs', COUNT(*) FROM order_logs
ORDER BY table_name;
