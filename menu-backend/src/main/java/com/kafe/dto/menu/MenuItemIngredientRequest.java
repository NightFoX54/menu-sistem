package com.kafe.dto.menu;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record MenuItemIngredientRequest(
        @NotNull Long ingredientId,
        @NotNull @DecimalMin("0.001") BigDecimal quantity
) {}
