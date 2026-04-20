package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.AsistenciaPapaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AsistenciaPapaJpaRepository extends JpaRepository<AsistenciaPapaEntity, Integer> {

    List<AsistenciaPapaEntity> findByFechaOrderByIdPapaAscIdAsc(LocalDate fecha);

    Optional<AsistenciaPapaEntity> findTopByIdPapaAndFechaAndHoraSalidaIsNullOrderByIdDesc(Integer idPapa, LocalDate fecha);

    boolean existsByIdPapaAndFecha(Integer idPapa, LocalDate fecha);

    boolean existsByIdPapaAndFechaAndJornada(Integer idPapa, LocalDate fecha, String jornada);

    List<AsistenciaPapaEntity> findByIdPapaAndFechaBetweenOrderByFechaDesc(Integer idPapa, LocalDate desde, LocalDate hasta);

    Optional<AsistenciaPapaEntity> findTopByIdPapaAndFechaAndHoraSalidaIsNotNullOrderByHoraSalidaDesc(Integer idPapa,
            LocalDate fecha);

    List<AsistenciaPapaEntity> findByFechaBetweenOrderByFechaAscIdAsc(LocalDate desde, LocalDate hasta);
}
