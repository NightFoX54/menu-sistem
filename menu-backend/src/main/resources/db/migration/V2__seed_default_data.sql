-- ============================================================
--  V2 Seed — demo tenant, kullanıcılar ve örnek veriler
--  Tüm kullanıcıların şifresi: Admin123!
--  BCrypt (strength 10): $2a$10$H2bKc7z3JlvjBVWVUAdAreDM/qXTS9JfSoZtwMEpew3XU8nS5lBE.
-- ============================================================

INSERT INTO tenants (name, slug, address, latitude, longitude, geofence_radius_meters, theme, default_locale, is_active)
VALUES (
    'Demo Kafe',
    'demo-kafe',
    'Kadıköy, İstanbul',
    40.9900000,
    29.0250000,
    150,
    JSON_OBJECT('primaryColor', '#E63946', 'logoUrl', NULL),
    'tr',
    TRUE
);

SET @tenant_id = LAST_INSERT_ID();

INSERT INTO users (tenant_id, name, email, password_hash, role, is_active) VALUES
(@tenant_id, 'Demo Admin',   'admin@demo.local',   '$2a$10$H2bKc7z3JlvjBVWVUAdAreDM/qXTS9JfSoZtwMEpew3XU8nS5lBE.', 'ADMIN',   TRUE),
(@tenant_id, 'Demo Garson',  'waiter@demo.local',  '$2a$10$H2bKc7z3JlvjBVWVUAdAreDM/qXTS9JfSoZtwMEpew3XU8nS5lBE.', 'WAITER',  TRUE),
(@tenant_id, 'Demo Mutfak',  'kitchen@demo.local', '$2a$10$H2bKc7z3JlvjBVWVUAdAreDM/qXTS9JfSoZtwMEpew3XU8nS5lBE.', 'KITCHEN', TRUE);

INSERT INTO tables (tenant_id, name, qr_token, capacity, is_active) VALUES
(@tenant_id, 'Masa 1', 'demo-masa-1', 4, TRUE),
(@tenant_id, 'Masa 2', 'demo-masa-2', 2, TRUE),
(@tenant_id, 'Teras 1', 'demo-teras-1', 6, TRUE);

INSERT INTO menu_categories (tenant_id, name, display_order, is_active) VALUES
(@tenant_id, 'İçecekler', 1, TRUE),
(@tenant_id, 'Yemekler',  2, TRUE);

SET @cat_drinks = (SELECT id FROM menu_categories WHERE tenant_id = @tenant_id AND name = 'İçecekler');
SET @cat_food   = (SELECT id FROM menu_categories WHERE tenant_id = @tenant_id AND name = 'Yemekler');

INSERT INTO menu_items (tenant_id, category_id, name, description, price, is_available, display_order, prep_time_mins) VALUES
(@tenant_id, @cat_drinks, 'Türk Kahvesi', 'Geleneksel Türk kahvesi',           45.00, TRUE, 1, 5),
(@tenant_id, @cat_drinks, 'Cappuccino',   'Espresso ve süt köpüğü',            65.00, TRUE, 2, 8),
(@tenant_id, @cat_drinks, 'Limonata',     'Taze sıkılmış limonata',            55.00, TRUE, 3, 3),
(@tenant_id, @cat_food,   'Hamburger',    'Dana köfte, marul, domates',       180.00, TRUE, 1, 15),
(@tenant_id, @cat_food,   'Margarita Pizza', 'Mozzarella ve domates sosu',    220.00, TRUE, 2, 20),
(@tenant_id, @cat_food,   'Sezar Salata', 'Tavuk, parmesan, kruton',          150.00, TRUE, 3, 10);

INSERT INTO ingredients (tenant_id, name, unit, stock_quantity, low_stock_threshold) VALUES
(@tenant_id, 'Kahve Çekirdeği', 'GRAM',  5000.000, 500.000),
(@tenant_id, 'Süt',             'ML',   10000.000, 1000.000),
(@tenant_id, 'Ekmek',           'PIECE',  100.000,  10.000);
