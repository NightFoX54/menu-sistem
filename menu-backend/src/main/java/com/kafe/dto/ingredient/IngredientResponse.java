package com.kafe.dto.ingredient;

import com.kafe.domain.enums.IngredientUnit;

import java.math.BigDecimal;

public record IngredientResponse(
        Long id,
        String name,
        IngredientUnit unit,
        BigDecimal stockQuantity,
        BigDecimal lowStockThreshold
) {}
