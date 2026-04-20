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

    @Query("SELECT p FROM PapaPlanEntity p WHERE p.sesionesConsumidas < p.totalSesiones")
    List<PapaPlanEntity> findConSesionesDisponibles();

    @Query("SELECT p FROM PapaPlanEntity p WHERE (p.totalSesiones - p.sesionesConsumidas) <= :umbral AND p.sesionesConsumidas < p.totalSesiones")
    List<PapaPlanEntity> findPorAgotarse(int umbral);
}
