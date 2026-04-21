package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.NinoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NinoJpaRepository extends JpaRepository<NinoEntity, Integer> {

    List<NinoEntity> findByNombreContainingIgnoreCaseOrderByNombre(String nombre);

    List<NinoEntity> findAllByOrderByNombreAsc();

    boolean existsByGrupoIgnoreCase(String grupo);

    java.util.Optional<NinoEntity> findByBiometricId(String biometricId);

    @Query(value = """
            SELECT *
            FROM ninos n
            WHERE EXTRACT(MONTH FROM n.fecha_nacimiento) = :mes
              AND EXTRACT(DAY FROM n.fecha_nacimiento) = :dia
            ORDER BY n.nombre ASC
            """, nativeQuery = true)
    List<NinoEntity> findCumpleanosByMesAndDia(@Param("mes") int mes, @Param("dia") int dia);
}
