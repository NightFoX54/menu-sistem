-- ── Besin değerleri: her malzeme birimine göre (100g / 100ml / 1 adet) ──────────
ALTER TABLE ingredients
    ADD COLUMN calories_per DECIMAL(8,2) NULL COMMENT 'kcal per 100g / 100ml / 1 piece',
    ADD COLUMN protein_per  DECIMAL(8,2) NULL COMMENT 'g protein per 100g / 100ml / 1 piece',
    ADD COLUMN fat_per      DECIMAL(8,2) NULL COMMENT 'g fat per 100g / 100ml / 1 piece',
    ADD COLUMN carbs_per    DECIMAL(8,2) NULL COMMENT 'g carbs per 100g / 100ml / 1 piece';
