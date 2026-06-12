-- ============================================================
--  Kafe / Restoran SaaS  —  V1 Initial Schema
--  Flyway migration: V1__initial_schema.sql
--  MySQL 8.0+
-- ============================================================


-- ── 1. TENANTS ────────────────────────────────────────────
--  Her kafe/restoran = bir tenant.
--  slug  → subdomain veya URL parçası (örn. "cafe-mavi")
--  latitude/longitude + geofence_radius_meters → konum doğrulama
--  theme → JSON: { "primaryColor": "#E63946", "logoUrl": "..." }
-- ----------------------------------------------------------
CREATE TABLE tenants (
    id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                   VARCHAR(100)  NOT NULL,
    slug                   VARCHAR(50)   NOT NULL UNIQUE,
    address                VARCHAR(255),
    latitude               DECIMAL(10,7),
    longitude              DECIMAL(10,7),
    geofence_radius_meters INT           NOT NULL DEFAULT 150,
    theme                  JSON,
    default_locale         VARCHAR(5)    NOT NULL DEFAULT 'tr',
    is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- ── 2. USERS ──────────────────────────────────────────────
--  Restoran çalışanları.
--  role → ADMIN (yönetici), WAITER (garson), KITCHEN (mutfak ekranı)
--  email: tenant içinde unique, farklı tenantlarda aynı email olabilir.
-- ----------------------------------------------------------
CREATE TABLE users (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id     BIGINT UNSIGNED NOT NULL,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(150)    NOT NULL,
    password_hash VARCHAR(255)    NOT NULL,
    role          ENUM('ADMIN','WAITER','KITCHEN') NOT NULL DEFAULT 'WAITER',
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_users_tenant_email (tenant_id, email),
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);


-- ── 3. TABLES (MASALAR) ───────────────────────────────────
--  qr_token → QR URL'e gömülü benzersiz token.
--  Müşteri bu token ile geldiğinde hangi masa/tenant olduğu bulunur.
-- ----------------------------------------------------------
CREATE TABLE tables (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id   BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(50)     NOT NULL,       -- "Masa 1", "Teras 4"
    qr_token    VARCHAR(64)     NOT NULL UNIQUE,
    capacity    TINYINT UNSIGNED         DEFAULT 4,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_tables_tenant (tenant_id),
    CONSTRAINT fk_tables_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);


-- ── 4. MENU_CATEGORIES ────────────────────────────────────
CREATE TABLE menu_categories (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id     BIGINT UNSIGNED NOT NULL,
    name          VARCHAR(100)    NOT NULL,
    display_order SMALLINT        NOT NULL DEFAULT 0,
    is_active     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_categories_tenant (tenant_id, is_active),
    CONSTRAINT fk_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);


-- ── 5. MENU_ITEMS ─────────────────────────────────────────
--  is_available → stok tükenince uygulama bu alanı FALSE yapar.
--  unit_price burada DECIMAL; sipariş anındaki fiyat order_items'a kopyalanır.
-- ----------------------------------------------------------
CREATE TABLE menu_items (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id     BIGINT UNSIGNED NOT NULL,
    category_id   BIGINT UNSIGNED NOT NULL,
    name          VARCHAR(150)    NOT NULL,
    description   TEXT,
    price         DECIMAL(10,2)   NOT NULL,
    image_url     VARCHAR(512),
    is_available  BOOLEAN         NOT NULL DEFAULT TRUE,
    display_order SMALLINT        NOT NULL DEFAULT 0,
    prep_time_mins TINYINT UNSIGNED         DEFAULT 10,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_items_tenant_avail (tenant_id, is_available),
    INDEX idx_items_category     (category_id),
    CONSTRAINT fk_items_tenant   FOREIGN KEY (tenant_id)   REFERENCES tenants(id),
    CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);


-- ── 6. INGREDIENTS (MALZEMELER) ───────────────────────────
--  stock_quantity → mevcut stok.
--  low_stock_threshold → bu değerin altına düşünce uyarı (opsiyonel).
--  0'a düşünce: ilgili menu_items.is_available = FALSE yapılır.
-- ----------------------------------------------------------
CREATE TABLE ingredients (
    id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id            BIGINT UNSIGNED NOT NULL,
    name                 VARCHAR(100)    NOT NULL,
    unit                 ENUM('GRAM','ML','PIECE','KG','LITRE') NOT NULL DEFAULT 'PIECE',
    stock_quantity       DECIMAL(10,3)   NOT NULL DEFAULT 0,
    low_stock_threshold  DECIMAL(10,3)   NOT NULL DEFAULT 0,
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_ingredients_tenant (tenant_id),
    CONSTRAINT fk_ingredients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);


-- ── 7. MENU_ITEM_INGREDIENTS (köprü tablo) ────────────────
--  "Kapuçino" → 18gr kahve, 150ml süt gibi.
--  Sipariş verilince bu quantity'ler stoktan düşülür.
-- ----------------------------------------------------------
CREATE TABLE menu_item_ingredients (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    menu_item_id  BIGINT UNSIGNED NOT NULL,
    ingredient_id BIGINT UNSIGNED NOT NULL,
    quantity      DECIMAL(10,3)   NOT NULL,

    UNIQUE KEY uq_item_ingredient (menu_item_id, ingredient_id),
    CONSTRAINT fk_mii_item       FOREIGN KEY (menu_item_id)  REFERENCES menu_items(id),
    CONSTRAINT fk_mii_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);


-- ── 8. TABLE_SESSIONS (masa oturumu) ─────────────────────
--  Masa boşken CLOSED, müşteri oturduğunda OPEN açılır.
--  Aynı masada aynı anda sadece bir OPEN session olur.
--  Hesap kesilince closed_at dolar, status = CLOSED.
-- ----------------------------------------------------------
CREATE TABLE table_sessions (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id   BIGINT UNSIGNED NOT NULL,
    table_id    BIGINT UNSIGNED NOT NULL,
    status      ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
    opened_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at   DATETIME,

    INDEX idx_sessions_tenant_status (tenant_id, status),
    INDEX idx_sessions_table         (table_id),
    CONSTRAINT fk_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_sessions_table  FOREIGN KEY (table_id)  REFERENCES tables(id)
);


-- ── 9. ORDERS ─────────────────────────────────────────────
--  Bir session birden fazla order içerebilir
--  (ilk sipariş, sonra "bir tane daha" gibi).
--  taken_by NULL → müşteri QR'dan verdi.
--  taken_by dolu → garson sisteme girip aldı.
-- ----------------------------------------------------------
CREATE TABLE orders (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id   BIGINT UNSIGNED NOT NULL,
    session_id  BIGINT UNSIGNED NOT NULL,
    taken_by    BIGINT UNSIGNED,                -- NULL = QR müşteri
    status      ENUM('PENDING','CONFIRMED','PREPARING','READY','SERVED','CANCELLED')
                NOT NULL DEFAULT 'PENDING',
    notes       VARCHAR(500),
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_orders_session       (session_id),
    INDEX idx_orders_tenant_status (tenant_id, status),
    CONSTRAINT fk_orders_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id),
    CONSTRAINT fk_orders_session FOREIGN KEY (session_id) REFERENCES table_sessions(id),
    CONSTRAINT fk_orders_user    FOREIGN KEY (taken_by)   REFERENCES users(id)
);


-- ── 10. ORDER_ITEMS ───────────────────────────────────────
--  unit_price: sipariş anındaki fiyatın snapshot'ı.
--  Yarın fiyat değişirse geçmiş siparişler etkilenmesin.
--  notes: "az şeker", "soğansız" vb. müşteri notu.
-- ----------------------------------------------------------
CREATE TABLE order_items (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id     BIGINT UNSIGNED NOT NULL,
    menu_item_id BIGINT UNSIGNED NOT NULL,
    quantity     TINYINT UNSIGNED         NOT NULL DEFAULT 1,
    unit_price   DECIMAL(10,2)   NOT NULL,
    notes        VARCHAR(255),
    status       ENUM('PENDING','PREPARING','READY','SERVED','CANCELLED')
                 NOT NULL DEFAULT 'PENDING',
    created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_oi_order (order_id),
    INDEX idx_oi_item  (menu_item_id),
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id)     REFERENCES orders(id),
    CONSTRAINT fk_oi_item  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);


-- ── 11. FEEDBACK ──────────────────────────────────────────
--  Oturum kapandıktan sonra genel değerlendirme.
-- ----------------------------------------------------------
CREATE TABLE feedback (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id   BIGINT UNSIGNED NOT NULL,
    session_id  BIGINT UNSIGNED NOT NULL,
    rating      TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY  uq_session_feedback (session_id),
    CONSTRAINT  fk_feedback_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id),
    CONSTRAINT  fk_feedback_session FOREIGN KEY (session_id) REFERENCES table_sessions(id)
);


-- ── 12. FEEDBACK_ITEMS ────────────────────────────────────
--  Oturum içinde sipariş edilen her ürün için thumbs up/down.
--  menu_item_id bağlantısı → aynı ürün N kez sipariş edilse bile
--  müşteriye bir kez sorulur, aggregation temiz kalır.
-- ----------------------------------------------------------
CREATE TABLE feedback_items (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    feedback_id  BIGINT UNSIGNED NOT NULL,
    menu_item_id BIGINT UNSIGNED NOT NULL,
    liked        BOOLEAN         NOT NULL,   -- TRUE = 👍  FALSE = 👎

    UNIQUE KEY  uq_feedback_item (feedback_id, menu_item_id),
    CONSTRAINT  fk_fi_feedback  FOREIGN KEY (feedback_id)  REFERENCES feedback(id),
    CONSTRAINT  fk_fi_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);