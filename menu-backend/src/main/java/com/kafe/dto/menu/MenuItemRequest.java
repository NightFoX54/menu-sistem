package com.kafe.dto.menu;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record MenuItemRequest(
        @NotNull Long categoryId,
        @NotBlank @Size(max = 150) String name,
        String description,
        @NotNull @DecimalMin("0.01") BigDecimal price,
        Short prepTimeMins,
        short displayOrder,
        @Valid List<MenuItemIngredientRequest> ingredients
) {}
