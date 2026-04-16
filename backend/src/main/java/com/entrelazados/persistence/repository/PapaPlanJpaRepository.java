package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.PapaPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface PapaPlanJpaRepository extends JpaRepository<PapaPlanEntity, Integer> {
    List<PapaPlanEntity> findByIdPapaOrderByFechaInicio(Integer idPapa);

    @Query("SELECT p FROM PapaPlanEntity p WHERE :fecha >= p.fechaInicio AND (p.fechaFin IS NULL OR :fecha <= p.fechaFin)")
    List<PapaPlanEntity> findVigentesEnFecha(LocalDate fecha);
}

