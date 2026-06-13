package com.kafe.repository;

import com.kafe.domain.MenuItemIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface MenuItemIngredientRepository extends JpaRepository<MenuItemIngredient, Long> {

    @Query("SELECT mii FROM MenuItemIngredient mii JOIN FETCH mii.ingredient WHERE mii.menuItem.id = :menuItemId")
    List<MenuItemIngredient> findAllByMenuItemIdWithIngredient(@Param("menuItemId") Long menuItemId);

    @Query("SELECT mii FROM MenuItemIngredient mii JOIN FETCH mii.ingredient WHERE mii.menuItem.id IN :ids")
    List<MenuItemIngredient> findAllByMenuItemIdsWithIngredient(@Param("ids") Collection<Long> ids);

    @Modifying
    @Query("DELETE FROM MenuItemIngredient mii WHERE mii.menuItem.id = :menuItemId")
    void deleteAllByMenuItemId(@Param("menuItemId") Long menuItemId);
}
