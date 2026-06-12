package com.kafe.service;

import com.kafe.domain.Table;
import com.kafe.domain.TableSession;
import com.kafe.domain.enums.SessionStatus;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.repository.TableRepository;
import com.kafe.repository.TableSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final TableSessionRepository sessionRepository;
    private final TableRepository tableRepository;

    /**
     * Masada OPEN session varsa döner, yoksa yeni açar.
     */
    @Transactional
    public TableSession openSession(Long tableId) {
        return sessionRepository
                .findByTable_IdAndStatus(tableId, SessionStatus.OPEN)
                .orElseGet(() -> {
                    Table table = tableRepository.findById(tableId)
                            .orElseThrow(() -> new ResourceNotFoundException("Table", tableId));
                    return sessionRepository.save(TableSession.builder()
                            .tenant(table.getTenant())
                            .table(table)
                            .status(SessionStatus.OPEN)
                            .build());
                });
    }

    @Transactional
    public void closeSession(Long sessionId) {
        TableSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("TableSession", sessionId));
        session.setStatus(SessionStatus.CLOSED);
        session.setClosedAt(LocalDateTime.now());
        sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public Optional<TableSession> getActiveSession(Long tableId) {
        return sessionRepository.findByTable_IdAndStatus(tableId, SessionStatus.OPEN);
    }

    @Transactional(readOnly = true)
    public Optional<TableSession> findById(Long sessionId) {
        return sessionRepository.findById(sessionId);
    }
}
