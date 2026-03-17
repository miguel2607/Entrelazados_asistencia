package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.NinoAcudienteEntity;
import com.entrelazados.persistence.entity.NinoAcudientePk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NinoAcudienteJpaRepository extends JpaRepository<NinoAcudienteEntity, NinoAcudientePk> {

    List<NinoAcudienteEntity> findByIdNino(Integer idNino);

    List<NinoAcudienteEntity> findByIdAcudiente(Integer idAcudiente);

    void deleteByIdNinoAndIdAcudiente(Integer idNino, Integer idAcudiente);

    boolean existsByIdNinoAndIdAcudiente(Integer idNino, Integer idAcudiente);
}
