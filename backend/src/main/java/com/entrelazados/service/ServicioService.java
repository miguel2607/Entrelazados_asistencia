package com.entrelazados.service;

import com.entrelazados.domain.Servicio;
import com.entrelazados.persistence.entity.ServicioEntity;
import com.entrelazados.persistence.repository.ServicioJpaRepository;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ServicioService {

    private final ServicioJpaRepository repo;

    public ServicioService(ServicioJpaRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<Servicio> listar() {
        return repo.findAll().stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public Servicio buscarPorId(Integer id) {
        return toDomain(repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Servicio no encontrado")));
    }

    @Transactional
    public Servicio crear(String nombre, java.math.BigDecimal precio, Integer cantidadDias) {
        ServicioEntity e = new ServicioEntity();
        e.setNombre(nombre);
        e.setPrecio(precio);
        e.setCantidadDias(cantidadDias != null ? cantidadDias : 1);
        e = repo.save(e);
        return toDomain(e);
    }

    @Transactional
    public Servicio actualizar(Integer id, String nombre, java.math.BigDecimal precio, Integer cantidadDias) {
        ServicioEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Servicio no encontrado"));
        e.setNombre(nombre);
        e.setPrecio(precio);
        e.setCantidadDias(cantidadDias != null ? cantidadDias : 1);
        return toDomain(repo.save(e));
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id)) throw new RecursoNoEncontradoException("Servicio no encontrado");
        repo.deleteById(id);
    }

    private Servicio toDomain(ServicioEntity e) {
        return new Servicio(e.getId(), e.getNombre(), e.getPrecio(), e.getCantidadDias());
    }
}
