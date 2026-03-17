package com.entrelazados.service;

import com.entrelazados.domain.Paquete;
import com.entrelazados.domain.Servicio;
import com.entrelazados.persistence.entity.PaqueteEntity;
import com.entrelazados.persistence.repository.PaqueteJpaRepository;
import com.entrelazados.persistence.repository.ServicioJpaRepository;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class PaqueteService {

    private final PaqueteJpaRepository repo;
    private final ServicioJpaRepository servicioRepo;

    public PaqueteService(PaqueteJpaRepository repo, ServicioJpaRepository servicioRepo) {
        this.repo = repo;
        this.servicioRepo = servicioRepo;
    }

    @Transactional(readOnly = true)
    public List<Paquete> listar() {
        return repo.findAll().stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public Paquete buscarPorIdConServicios(Integer id) {
        return toDomain(repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Paquete no encontrado")));
    }

    @Transactional
    public Paquete crear(String nombre, java.math.BigDecimal precio, int cantidadDias, List<Integer> idServicios) {
        PaqueteEntity e = new PaqueteEntity();
        e.setNombre(nombre);
        e.setPrecio(precio);
        e.setCantidadDias(cantidadDias);
        if (idServicios != null && !idServicios.isEmpty()) {
            e.setServicios(servicioRepo.findAllById(idServicios));
        }
        e = repo.save(e);
        return toDomain(e);
    }

    @Transactional
    public Paquete actualizar(Integer id, String nombre, java.math.BigDecimal precio, int cantidadDias, List<Integer> idServicios) {
        PaqueteEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Paquete no encontrado"));
        e.setNombre(nombre);
        e.setPrecio(precio);
        e.setCantidadDias(cantidadDias);
        e.setServicios(idServicios != null && !idServicios.isEmpty() ? servicioRepo.findAllById(idServicios) : new ArrayList<>());
        return toDomain(repo.save(e));
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id)) throw new RecursoNoEncontradoException("Paquete no encontrado");
        repo.deleteById(id);
    }

    private Paquete toDomain(PaqueteEntity e) {
        List<Servicio> servicios = e.getServicios() == null ? List.of() : e.getServicios().stream()
                .map(s -> new Servicio(s.getId(), s.getNombre(), s.getPrecio(), s.getCantidadDias()))
                .toList();
        return new Paquete(e.getId(), e.getNombre(), e.getPrecio(), e.getCantidadDias(), servicios);
    }
}
