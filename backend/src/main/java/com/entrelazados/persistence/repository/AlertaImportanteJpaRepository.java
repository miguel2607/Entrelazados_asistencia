package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.AlertaImportanteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AlertaImportanteJpaRepository extends JpaRepository<AlertaImportanteEntity, Integer> {

    List<AlertaImportanteEntity> findTop100ByOrderByCreadaEnDesc();

    long countByEstado(String estado);

    Optional<AlertaImportanteEntity> findTopByEstadoOrderByCreadaEnDesc(String estado);

    long deleteByEstadoAndActualizadaEnBefore(String estado, LocalDateTime fechaCorte);
}
