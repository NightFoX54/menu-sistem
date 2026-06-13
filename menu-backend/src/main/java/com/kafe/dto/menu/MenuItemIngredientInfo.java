package com.kafe.dto.menu;

import com.kafe.domain.enums.IngredientUnit;

import java.math.BigDecimal;

public record MenuItemIngredientInfo(
        Long ingredientId,
        String ingredientName,
        IngredientUnit unit,
        BigDecimal quantity
) {}
