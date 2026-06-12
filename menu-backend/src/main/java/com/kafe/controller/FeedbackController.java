package com.kafe.controller;

import com.kafe.dto.feedback.FeedbackRequest;
import com.kafe.dto.feedback.FeedbackResponse;
import com.kafe.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping("/api/feedback")
    public ResponseEntity<FeedbackResponse> create(@RequestBody @Valid FeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(feedbackService.create(request));
    }

    @GetMapping("/api/admin/feedback")
    public ResponseEntity<List<FeedbackResponse>> getAll() {
        return ResponseEntity.ok(feedbackService.getAllForAdmin());
    }
}
