package com.kafe.repository;

import com.kafe.domain.TableSession;
import com.kafe.domain.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TableSessionRepository extends JpaRepository<TableSession, Long> {

    Optional<TableSession> findByTable_IdAndStatus(Long tableId, SessionStatus status);

    long countByTenant_IdAndStatus(Long tenantId, SessionStatus status);
}
