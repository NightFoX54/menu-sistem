package com.kafe.dto.feedback;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record FeedbackRequest(
        @NotNull Long sessionId,
        @NotNull @Min(1) @Max(5) Short rating,
        String comment,
        @Valid List<FeedbackItemRating> items
) {}
