package com.kafe.service;

import com.kafe.domain.Table;
import com.kafe.domain.TableSession;
import com.kafe.domain.Tenant;
import com.kafe.domain.enums.SessionStatus;
import com.kafe.dto.table.CreateTableRequest;
import com.kafe.dto.table.QrResolveResponse;
import com.kafe.dto.table.TableResponse;
import com.kafe.exception.ResourceNotFoundException;
import com.kafe.exception.TenantAccessException;
import com.kafe.repository.TableRepository;
import com.kafe.repository.TableSessionRepository;
import com.kafe.repository.TenantRepository;
import com.kafe.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QrService {

    private final TableRepository tableRepository;
    private final TableSessionRepository sessionRepository;
    private final TenantRepository tenantRepository;

    public String generateQrToken() {
        return UUID.randomUUID().toString().replace("-", "")
             + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * QR taraması: masayı çözer, aktif session yoksa açar, tek DTO döner.
     * @Transactional içinde lazy tenant yüklemesi güvenli.
     */
    @Transactional
    public QrResolveResponse resolveQr(String token) {
        Table table = tableRepository.findByQrToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("QR token ile masa bulunamadı: " + token));

        if (!table.isActive()) {
            throw new ResourceNotFoundException("Bu masa aktif değil");
        }

        TableSession session = sessionRepository
                .findByTable_IdAndStatus(table.getId(), SessionStatus.OPEN)
                .orElseGet(() -> sessionRepository.save(
                        TableSession.builder()
                                .tenant(table.getTenant())
                                .table(table)
                                .status(SessionStatus.OPEN)
                                .build()
                ));

        Tenant tenant = table.getTenant();
        return new QrResolveResponse(
                table.getId(),
                table.getName(),
                tenant.getId(),
                tenant.getSlug(),
                tenant.getName(),
                session.getId(),
                session.getStatus().name()
        );
    }

    @Transactional
    public TableResponse createTable(CreateTableRequest request) {
        Long tenantId = TenantContext.getTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));

        Table table = tableRepository.save(Table.builder()
                .tenant(tenant)
                .name(request.name())
                .capacity(request.capacity())
                .qrToken(generateQrToken())
                .isActive(true)
                .build());

        return toResponse(table, null);
    }

    @Transactional(readOnly = true)
    public List<TableResponse> getAllTables() {
        Long tenantId = TenantContext.getTenantId();
        return tableRepository.findAllByTenant_IdOrderByNameAsc(tenantId)
                .stream()
                .map(t -> {
                    Long activeSessionId = sessionRepository
                            .findByTable_IdAndStatus(t.getId(), SessionStatus.OPEN)
                            .map(TableSession::getId)
                            .orElse(null);
                    return toResponse(t, activeSessionId);
                })
                .toList();
    }

    @Transactional
    public void toggleTable(Long id) {
        Table table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Table", id));
        if (!table.getTenant().getId().equals(TenantContext.getTenantId())) {
            throw new TenantAccessException();
        }
        table.setActive(!table.isActive());
        tableRepository.save(table);
    }

    private TableResponse toResponse(Table t, Long activeSessionId) {
        return new TableResponse(t.getId(), t.getName(), t.getQrToken(),
                t.getCapacity(), t.isActive(), activeSessionId);
    }
}
