package com.entrelazados.service;

import com.entrelazados.domain.Nino;
import com.entrelazados.persistence.entity.NinoEntity;
import com.entrelazados.persistence.repository.NinoJpaRepository;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class NinoService {

    private final NinoJpaRepository repo;

    public NinoService(NinoJpaRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<Nino> listar(String nombre) {
        List<NinoEntity> list = nombre != null && !nombre.isBlank()
                ? repo.findByNombreContainingIgnoreCaseOrderByNombre(nombre)
                : repo.findAllByOrderByNombreAsc();
        return list.stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public Nino buscarPorId(Integer id) {
        return toDomain(repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Niño no encontrado")));
    }

    @Transactional
    public Nino crear(String nombre, String ti, LocalDate fechaNacimiento) {
        NinoEntity e = new NinoEntity();
        e.setNombre(nombre);
        e.setTi(ti);
        e.setFechaNacimiento(fechaNacimiento);
        e = repo.save(e);
        return toDomain(e);
    }

    @Transactional
    public Nino actualizar(Integer id, String nombre, String ti, LocalDate fechaNacimiento) {
        NinoEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Niño no encontrado"));
        e.setNombre(nombre);
        e.setTi(ti);
        e.setFechaNacimiento(fechaNacimiento);
        return toDomain(repo.save(e));
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id)) throw new RecursoNoEncontradoException("Niño no encontrado");
        repo.deleteById(id);
    }

    public boolean existePorId(Integer id) {
        return repo.existsById(id);
    }

    Nino toDomain(NinoEntity e) {
        return new Nino(e.getId(), e.getNombre(), e.getTi(), e.getFechaNacimiento());
    }
}
