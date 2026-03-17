package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.NinoPlanEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface NinoPlanJpaRepository extends JpaRepository<NinoPlanEntity, Integer> {

    List<NinoPlanEntity> findByIdNinoOrderByFechaInicio(Integer idNino);

    @Query("SELECT p FROM NinoPlanEntity p WHERE :fecha >= p.fechaInicio AND (p.fechaFin IS NULL OR :fecha <= p.fechaFin)")
    List<NinoPlanEntity> findVigentesEnFecha(LocalDate fecha);

    @Query("SELECT p FROM NinoPlanEntity p WHERE p.fechaFin BETWEEN :desde AND :hasta")
    List<NinoPlanEntity> findByFechaFinBetween(LocalDate desde, LocalDate hasta);

    @Query("SELECT p FROM NinoPlanEntity p WHERE p.totalSesiones - p.sesionesConsumidas <= :umbral AND p.totalSesiones > p.sesionesConsumidas")
    List<NinoPlanEntity> findPorAgotarse(int umbral);

    @Query("SELECT p FROM NinoPlanEntity p WHERE p.sesionesConsumidas < p.totalSesiones")
    List<NinoPlanEntity> findConSesionesDisponibles();
}
