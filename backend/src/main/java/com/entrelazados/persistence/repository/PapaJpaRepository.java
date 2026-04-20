package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.PapaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PapaJpaRepository extends JpaRepository<PapaEntity, Integer> {

    List<PapaEntity> findByNombreContainingIgnoreCaseOrderByNombreAsc(String nombre);

    List<PapaEntity> findAllByOrderByNombreAsc();

    Optional<PapaEntity> findByBiometricId(String biometricId);

    boolean existsByCedulaIgnoreCaseAndIdNot(String cedula, Integer id);

    boolean existsByCedulaIgnoreCase(String cedula);
}
