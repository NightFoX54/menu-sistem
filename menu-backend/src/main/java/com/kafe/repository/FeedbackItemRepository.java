package com.kafe.repository;

import com.kafe.domain.FeedbackItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedbackItemRepository extends JpaRepository<FeedbackItem, Long> {
    List<FeedbackItem> findAllByFeedback_Id(Long feedbackId);
}
