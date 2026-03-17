package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.AcudienteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AcudienteJpaRepository extends JpaRepository<AcudienteEntity, Integer> {

    List<AcudienteEntity> findByNombreContainingIgnoreCaseOrderByNombre(String nombre);

    List<AcudienteEntity> findAllByOrderByNombreAsc();
}
