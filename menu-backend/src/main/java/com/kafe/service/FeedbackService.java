package com.kafe.service;

import com.kafe.domain.Feedback;
import com.kafe.domain.FeedbackItem;
import com.kafe.domain.TableSession;
import com.kafe.dto.feedback.FeedbackItemResponse;
import com.kafe.dto.feedback.FeedbackRequest;
import com.kafe.dto.feedback.FeedbackResponse;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.exception.TenantAccessException;
import com.kafe.repository.FeedbackItemRepository;
import com.kafe.repository.FeedbackRepository;
import com.kafe.repository.MenuItemRepository;
import com.kafe.repository.TableSessionRepository;
import com.kafe.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final FeedbackItemRepository feedbackItemRepository;
    private final TableSessionRepository sessionRepository;
    private final MenuItemRepository menuItemRepository;

    @Transactional
    public FeedbackResponse create(FeedbackRequest req) {
        if (feedbackRepository.existsBySession_Id(req.sessionId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu oturum için zaten yorum bırakıldı");
        }

        TableSession session = sessionRepository.findById(req.sessionId())
                .orElseThrow(() -> new ResourceNotFoundException("TableSession", req.sessionId()));

        Long tenantId = TenantContext.getTenantId();
        if (tenantId != null && !session.getTenant().getId().equals(tenantId)) {
            throw new TenantAccessException();
        }

        Feedback feedback = feedbackRepository.save(Feedback.builder()
                .tenant(session.getTenant())
                .session(session)
                .rating(req.rating())
                .comment(req.comment())
                .build());

        if (req.items() != null) {
            for (var ir : req.items()) {
                menuItemRepository.findById(ir.menuItemId()).ifPresent(menuItem ->
                        feedbackItemRepository.save(FeedbackItem.builder()
                                .feedback(feedback)
                                .menuItem(menuItem)
                                .liked(ir.liked())
                                .build())
                );
            }
        }

        return toResponse(feedback);
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> getAllForAdmin() {
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null) throw new TenantAccessException();
        return feedbackRepository.findAllByTenant_IdOrderByCreatedAtDesc(tenantId)
                .stream().map(this::toResponse).toList();
    }

    private FeedbackResponse toResponse(Feedback f) {
        List<FeedbackItemResponse> itemResponses = feedbackItemRepository
                .findAllByFeedback_Id(f.getId())
                .stream()
                .map(i -> new FeedbackItemResponse(
                        i.getMenuItem().getId(),
                        i.getMenuItem().getName(),
                        i.isLiked()))
                .toList();

        return new FeedbackResponse(
                f.getId(),
                f.getSession().getId(),
                f.getSession().getTable().getName(),
                f.getRating(),
                f.getComment(),
                itemResponses,
                f.getCreatedAt());
    }
}
