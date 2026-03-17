package com.entrelazados.persistence.repository;

import com.entrelazados.persistence.entity.ServicioEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServicioJpaRepository extends JpaRepository<ServicioEntity, Integer> {}
