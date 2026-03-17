package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.AsistenciaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AsistenciaJpaRepository extends JpaRepository<AsistenciaEntity, Integer> {

    List<AsistenciaEntity> findByFechaOrderByIdNinoAscIdAsc(LocalDate fecha);

    Optional<AsistenciaEntity> findByIdNinoAndFechaAndIdPlan(Integer idNino, LocalDate fecha, Integer idPlan);

    boolean existsByIdNinoAndFechaAndIdPlan(Integer idNino, LocalDate fecha, Integer idPlan);

    List<AsistenciaEntity> findByIdNinoAndFechaOrderByIdAsc(Integer idNino, LocalDate fecha);

    List<AsistenciaEntity> findByIdNinoAndFechaBetweenOrderByFechaDesc(Integer idNino, LocalDate desde, LocalDate hasta);
}
