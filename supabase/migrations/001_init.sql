-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FreshTrack — Schéma initial
-- Colle ce contenu dans Supabase > SQL Editor > New query > Run
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Restaurants
CREATE TABLE IF NOT EXISTS restaurants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  plan         TEXT DEFAULT 'essential' CHECK (plan IN ('essential', 'pro')),
  alert_email  TEXT,
  alert_days   INTEGER DEFAULT 3,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  barcode       TEXT,
  category      TEXT DEFAULT 'Autre',
  expiry_date   DATE NOT NULL,
  quantity      INTEGER DEFAULT 1,
  unit          TEXT DEFAULT 'unité',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Alert logs
CREATE TABLE IF NOT EXISTS alert_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
  alert_type    TEXT NOT NULL,
  sent_at       TIMESTAMPTZ DEFAULT now()
);

-- ━━ Indexes ━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_products_expiry ON products(expiry_date);
CREATE INDEX IF NOT EXISTS idx_restaurants_user ON restaurants(user_id);

-- ━━ updated_at trigger ━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON products;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ━━ Row Level Security ━━━━━━━━━━━━━━━
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs   ENABLE ROW LEVEL SECURITY;

-- Restaurants policies
CREATE POLICY "users_own_restaurant" ON restaurants
  FOR ALL USING (auth.uid() = user_id);

-- Products policies (via restaurant)
CREATE POLICY "users_own_products" ON products
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );

-- Alert logs policies
CREATE POLICY "users_own_alerts" ON alert_logs
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE user_id = auth.uid()
    )
  );
