package com.kafe.dto.table;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTableRequest(
        @NotBlank @Size(max = 50) String name,
        Short capacity
) {}
