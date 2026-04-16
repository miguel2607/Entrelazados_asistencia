package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.PapaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PapaJpaRepository extends JpaRepository<PapaEntity, Integer> {
    List<PapaEntity> findByNombreContainingIgnoreCaseOrderByNombre(String nombre);
    List<PapaEntity> findAllByOrderByNombreAsc();
    Optional<PapaEntity> findByCedula(String cedula);
    Optional<PapaEntity> findByBiometricId(String biometricId);
}

