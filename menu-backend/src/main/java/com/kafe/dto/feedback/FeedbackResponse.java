package com.kafe.dto.feedback;

import java.time.LocalDateTime;
import java.util.List;

public record FeedbackResponse(
        Long id,
        Long sessionId,
        String tableName,
        short rating,
        String comment,
        List<FeedbackItemResponse> items,
        LocalDateTime createdAt
) {}
