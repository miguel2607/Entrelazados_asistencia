package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.GrupoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GrupoJpaRepository extends JpaRepository<GrupoEntity, Integer> {

    List<GrupoEntity> findAllByOrderByNombreAsc();

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Integer id);

    Optional<GrupoEntity> findByNombreIgnoreCase(String nombre);
}
