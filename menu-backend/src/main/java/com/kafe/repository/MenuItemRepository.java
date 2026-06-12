package com.kafe.repository;

import com.kafe.domain.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findAllByCategory_IdAndIsAvailableTrueOrderByDisplayOrderAsc(Long categoryId);

    List<MenuItem> findAllByCategory_IdOrderByDisplayOrderAsc(Long categoryId);

    List<MenuItem> findAllByTenant_IdAndIsAvailableTrueOrderByDisplayOrderAsc(Long tenantId);

    // stok otomasyonu: malzeme tükenenin hangi ürünleri etkilediğini bulmak için
    @Query("SELECT mii.menuItem FROM MenuItemIngredient mii WHERE mii.ingredient.id = :ingredientId")
    List<MenuItem> findAllByIngredientId(@Param("ingredientId") Long ingredientId);
}
