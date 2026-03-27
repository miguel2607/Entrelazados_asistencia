package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.NinoPlanCongelacionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NinoPlanCongelacionJpaRepository extends JpaRepository<NinoPlanCongelacionEntity, Integer> {
    List<NinoPlanCongelacionEntity> findByIdNinoPlanOrderByFechaDesc(Integer idNinoPlan);
}
