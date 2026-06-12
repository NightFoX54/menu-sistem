package com.kafe.repository;

import com.kafe.domain.MenuItemIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MenuItemIngredientRepository extends JpaRepository<MenuItemIngredient, Long> {

    /**
     * Bir menü ürününün tüm malzemelerini, ingredient lazy-load olmadan getirir.
     * StockService.deductStock ve allIngredientsInStock kontrolü için kullanılır.
     */
    @Query("SELECT mii FROM MenuItemIngredient mii JOIN FETCH mii.ingredient WHERE mii.menuItem.id = :menuItemId")
    List<MenuItemIngredient> findAllByMenuItemIdWithIngredient(@Param("menuItemId") Long menuItemId);
}
