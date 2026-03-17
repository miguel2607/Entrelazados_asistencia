package com.entrelazados.service;

import com.entrelazados.persistence.entity.NinoAcudienteEntity;
import com.entrelazados.persistence.repository.NinoAcudienteJpaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NinoAcudienteService {

    private final NinoAcudienteJpaRepository repo;

    public NinoAcudienteService(NinoAcudienteJpaRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public NinoAcudienteEntity asociar(Integer idNino, Integer idAcudiente, String parentesco) {
        NinoAcudienteEntity e = new NinoAcudienteEntity();
        e.setIdNino(idNino);
        e.setIdAcudiente(idAcudiente);
        e.setParentesco(parentesco != null ? parentesco : "acudiente");
        return repo.save(e);
    }

    @Transactional(readOnly = true)
    public List<NinoAcudienteEntity> listarPorNino(Integer idNino) {
        return repo.findByIdNino(idNino);
    }

    @Transactional(readOnly = true)
    public List<NinoAcudienteEntity> listarPorAcudiente(Integer idAcudiente) {
        return repo.findByIdAcudiente(idAcudiente);
    }

    @Transactional
    public void desasociar(Integer idNino, Integer idAcudiente) {
        repo.deleteByIdNinoAndIdAcudiente(idNino, idAcudiente);
    }
}
