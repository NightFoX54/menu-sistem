package com.kafe.repository;

import com.kafe.domain.MenuCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategory, Long> {

    List<MenuCategory> findAllByTenant_IdAndIsActiveTrueOrderByDisplayOrderAsc(Long tenantId);

    List<MenuCategory> findAllByTenant_IdOrderByDisplayOrderAsc(Long tenantId);
}
