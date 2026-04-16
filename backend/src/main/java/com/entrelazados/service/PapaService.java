package com.entrelazados.service;

import com.entrelazados.domain.Papa;
import com.entrelazados.persistence.entity.PapaEntity;
import com.entrelazados.persistence.repository.PapaJpaRepository;
import com.entrelazados.web.ConflictoException;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class PapaService {

    private final PapaJpaRepository repo;

    public PapaService(PapaJpaRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<Papa> listar(String nombre) {
        List<PapaEntity> list = nombre != null && !nombre.isBlank()
                ? repo.findByNombreContainingIgnoreCaseOrderByNombre(nombre)
                : repo.findAllByOrderByNombreAsc();
        return list.stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public Papa buscarPorId(Integer id) {
        return toDomain(repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Papá no encontrado")));
    }

    @Transactional(readOnly = true)
    public boolean existePorId(Integer id) {
        return repo.existsById(id);
    }

    @Transactional(readOnly = true)
    public boolean existePorBiometricId(String biometricId) {
        return repo.findByBiometricId(biometricId).isPresent();
    }

    @Transactional(readOnly = true)
    public PapaEntity buscarEntidadPorBiometricId(String biometricId) {
        return repo.findByBiometricId(biometricId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Papá no encontrado con ID biométrico: " + biometricId));
    }

    @Transactional
    public Papa crear(String nombre, String cedula, LocalDate fechaNacimiento, Integer semanasGestacion, String telefono, String biometricId, Boolean enabled) {
        validarUnicidad(null, cedula, biometricId);
        PapaEntity e = new PapaEntity();
        e.setNombre(nombre);
        e.setCedula(cedula);
        e.setFechaNacimiento(fechaNacimiento != null ? fechaNacimiento : LocalDate.now());
        e.setSemanasGestacion(semanasGestacion);
        e.setTelefono(telefono);
        e.setBiometricId(biometricId);
        e.setEnabled(enabled == null || enabled);
        return toDomain(repo.save(e));
    }

    @Transactional
    public Papa actualizar(Integer id, String nombre, String cedula, LocalDate fechaNacimiento, Integer semanasGestacion, String telefono, String biometricId, Boolean enabled) {
        PapaEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Papá no encontrado"));
        validarUnicidad(id, cedula, biometricId);
        e.setNombre(nombre);
        e.setCedula(cedula);
        if (fechaNacimiento != null) e.setFechaNacimiento(fechaNacimiento);
        e.setSemanasGestacion(semanasGestacion);
        e.setTelefono(telefono);
        e.setBiometricId(biometricId);
        e.setEnabled(enabled != null ? enabled : e.getEnabled());
        return toDomain(repo.save(e));
    }

    @Transactional
    public void eliminar(Integer id) {
        if (!repo.existsById(id)) throw new RecursoNoEncontradoException("Papá no encontrado");
        repo.deleteById(id);
    }

    private void validarUnicidad(Integer idActual, String cedula, String biometricId) {
        repo.findByCedula(cedula).ifPresent(p -> {
            if (idActual == null || !p.getId().equals(idActual)) {
                throw new ConflictoException("Ya existe un papá con esa cédula.");
            }
        });
        if (biometricId != null && !biometricId.isBlank()) {
            repo.findByBiometricId(biometricId).ifPresent(p -> {
                if (idActual == null || !p.getId().equals(idActual)) {
                    throw new ConflictoException("Ya existe un papá con ese ID biométrico.");
                }
            });
        }
    }

    private Papa toDomain(PapaEntity e) {
        return new Papa(
                e.getId(),
                e.getNombre(),
                e.getCedula(),
                e.getFechaNacimiento(),
                e.getSemanasGestacion(),
                e.getTelefono(),
                e.getBiometricId(),
                e.getEnabled()
        );
    }
}

