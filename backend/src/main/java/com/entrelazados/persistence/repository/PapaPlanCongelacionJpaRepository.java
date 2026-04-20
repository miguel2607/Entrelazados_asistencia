package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.PapaPlanCongelacionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PapaPlanCongelacionJpaRepository extends JpaRepository<PapaPlanCongelacionEntity, Integer> {

    List<PapaPlanCongelacionEntity> findByIdPapaPlanOrderByFechaDesc(Integer idPapaPlan);
}
