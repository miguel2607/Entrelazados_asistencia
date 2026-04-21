package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.SubgrupoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubgrupoJpaRepository extends JpaRepository<SubgrupoEntity, Integer> {

    List<SubgrupoEntity> findByIdGrupoOrderByNombreAsc(Integer idGrupo);

    boolean existsByIdGrupoAndNombreIgnoreCase(Integer idGrupo, String nombre);
}
