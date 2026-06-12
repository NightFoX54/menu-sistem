package com.kafe.repository;

import com.kafe.domain.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    boolean existsBySession_Id(Long sessionId);

    List<Feedback> findAllByTenant_IdOrderByCreatedAtDesc(Long tenantId);
}
