-- Схема базы данных для приложения Яндекс Маркет
-- Выполнить в SQL Editor Supabase

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  confirmation_code TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица магазинов
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_id INTEGER NOT NULL,
  api_key TEXT NOT NULL,
  campaign_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица товаров
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  instruction TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица ключей (цифровых товаров)
CREATE TABLE IF NOT EXISTS keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sent')),
  order_id UUID,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id_ym TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  total_keys INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'PROCESSING',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица items заказа (связка ключ-заказ)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  key_id UUID NOT NULL REFERENCES keys(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_shops_user ON shops(user_id);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_keys_product ON keys(product_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id_ym ON orders(order_id_ym);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- RLS политики
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Политики (пользователь видит только свои данные)
CREATE POLICY users_self ON users FOR ALL USING (id = auth.uid());

-- Для shops, products, keys, orders используем service_role на сервере
-- (RLS обходится через supabaseAdmin клиент)