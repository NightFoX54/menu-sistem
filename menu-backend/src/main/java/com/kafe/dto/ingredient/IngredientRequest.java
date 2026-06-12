package com.kafe.dto.ingredient;

import com.kafe.domain.enums.IngredientUnit;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record IngredientRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull IngredientUnit unit,
        @NotNull @DecimalMin("0") BigDecimal stockQuantity,
        @NotNull @DecimalMin("0") BigDecimal lowStockThreshold
) {}
