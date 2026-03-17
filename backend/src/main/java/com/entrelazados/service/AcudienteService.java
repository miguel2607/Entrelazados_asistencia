package com.entrelazados.service;

import com.entrelazados.domain.Acudiente;
import com.entrelazados.persistence.entity.AcudienteEntity;
import com.entrelazados.persistence.repository.AcudienteJpaRepository;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AcudienteService {

    private final AcudienteJpaRepository repo;

    public AcudienteService(AcudienteJpaRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<Acudiente> listar(String nombre) {
        List<AcudienteEntity> list = nombre != null && !nombre.isBlank()
                ? repo.findByNombreContainingIgnoreCaseOrderByNombre(nombre)
                : repo.findAllByOrderByNombreAsc();
        return list.stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public Acudiente buscarPorId(Integer id) {
        return toDomain(repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Acudiente no encontrado")));
    }

    @Transactional
    public Acudiente crear(String nombre, String telefono, String cc) {
        AcudienteEntity e = new AcudienteEntity();
        e.setNombre(nombre);
        e.setTelefono(telefono);
        e.setCc(cc);
        e = repo.save(e);
        return toDomain(e);
    }

    @Transactional
    public Acudiente actualizar(Integer id, String nombre, String telefono, String cc) {
        AcudienteEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Acudiente no encontrado"));
        e.setNombre(nombre);
        e.setTelefono(telefono);
        e.setCc(cc);
        return toDomain(repo.save(e));
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id)) throw new RecursoNoEncontradoException("Acudiente no encontrado");
        repo.deleteById(id);
    }

    private Acudiente toDomain(AcudienteEntity e) {
        return new Acudiente(e.getId(), e.getNombre(), e.getTelefono(), e.getCc());
    }
}
