package com.kafe.dto.menu;

import java.math.BigDecimal;

/**
 * Ürünün toplam besin değerleri (tüm malzemelerin katkısı toplanır).
 * Herhangi bir malzemenin besin verisi eksikse ilgili alan null gelir.
 */
public record NutritionInfo(
        BigDecimal calories,
        BigDecimal protein,
        BigDecimal fat,
        BigDecimal carbs
) {}
