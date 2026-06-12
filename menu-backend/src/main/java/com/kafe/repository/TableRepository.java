package com.kafe.repository;

import com.kafe.domain.Table;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TableRepository extends JpaRepository<Table, Long> {

    Optional<Table> findByQrToken(String qrToken);

    List<Table> findAllByTenant_IdOrderByNameAsc(Long tenantId);
}
