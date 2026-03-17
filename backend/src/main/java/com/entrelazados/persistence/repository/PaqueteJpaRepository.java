package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.PaqueteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaqueteJpaRepository extends JpaRepository<PaqueteEntity, Integer> {}
