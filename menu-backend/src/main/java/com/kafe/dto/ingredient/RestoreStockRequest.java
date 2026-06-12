package com.kafe.dto.ingredient;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RestoreStockRequest(
        @NotNull @DecimalMin("0.001") BigDecimal amount
) {}
