package com.kafe.repository;

import com.kafe.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndTenant_Id(String email, Long tenantId);

    List<User> findAllByTenant_IdOrderByCreatedAtDesc(Long tenantId);

    boolean existsByEmailAndTenant_Id(String email, Long tenantId);
}
