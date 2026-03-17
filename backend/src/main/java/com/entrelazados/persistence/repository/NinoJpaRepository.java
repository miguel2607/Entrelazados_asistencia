package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.NinoEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NinoJpaRepository extends JpaRepository<NinoEntity, Integer> {

    List<NinoEntity> findByNombreContainingIgnoreCaseOrderByNombre(String nombre);

    List<NinoEntity> findAllByOrderByNombreAsc();
}
