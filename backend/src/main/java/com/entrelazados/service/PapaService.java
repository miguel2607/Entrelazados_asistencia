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
    private final HikvisionService hikvisionService;

    public PapaService(PapaJpaRepository repo, HikvisionService hikvisionService) {
        this.repo = repo;
        this.hikvisionService = hikvisionService;
    }

    @Transactional(readOnly = true)
    public long totalRegistrados() {
        return repo.count();
    }

    @Transactional(readOnly = true)
    public List<Papa> listar(String nombre) {
        List<PapaEntity> list = nombre != null && !nombre.isBlank()
                ? repo.findByNombreContainingIgnoreCaseOrderByNombreAsc(nombre.trim())
                : repo.findAllByOrderByNombreAsc();
        return list.stream().map(this::toDomain).toList();
    }

    @Transactional(readOnly = true)
    public Papa buscarPorId(Integer id) {
        return repo.findById(id).map(this::toDomain)
                .orElseThrow(() -> new RecursoNoEncontradoException("Padre no encontrado"));
    }

    @Transactional(readOnly = true)
    public PapaEntity buscarEntidadPorBiometricId(String biometricId) {
        return repo.findByBiometricId(biometricId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Padre no encontrado con ID biométrico: " + biometricId));
    }

    @Transactional(readOnly = true)
    public boolean existePorId(Integer id) {
        return repo.existsById(id);
    }

    @Transactional(readOnly = true)
    public PapaEntity buscarEntidadPorId(Integer id) {
        return repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Padre no encontrado"));
    }

    @Transactional
    public Papa crear(String nombre, String cedula, String ti, LocalDate fechaNacimiento, Integer semanasGestacion,
            String telefono, String biometricId, String grupo) {
        if (repo.existsByCedulaIgnoreCase(cedula.trim())) {
            throw new ConflictoException("Ya existe un padre con esa cédula.");
        }
        PapaEntity e = new PapaEntity();
        e.setNombre(nombre.trim());
        e.setCedula(cedula.trim());
        e.setTi(ti != null && !ti.isBlank() ? ti.trim() : null);
        e.setFechaNacimiento(fechaNacimiento);
        e.setSemanasGestacion(semanasGestacion);
        e.setTelefono(telefono != null && !telefono.isBlank() ? telefono.trim() : null);
        e.setBiometricId(biometricId != null && !biometricId.isBlank() ? biometricId.trim() : null);
        e.setGrupo(grupo != null && !grupo.isBlank() ? grupo.trim() : null);
        e.setEnabled(true);
        PapaEntity saved = repo.save(e);
        hikvisionService.sincronizarEmpleado(saved.getBiometricId(), saved.getNombre());
        return toDomain(saved);
    }

    @Transactional
    public Papa actualizar(Integer id, String nombre, String cedula, String ti, LocalDate fechaNacimiento,
            Integer semanasGestacion, String telefono, String biometricId, String grupo) {
        PapaEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Padre no encontrado"));
        if (repo.existsByCedulaIgnoreCaseAndIdNot(cedula.trim(), id)) {
            throw new ConflictoException("Ya existe otro padre con esa cédula.");
        }
        String bioOld = e.getBiometricId();
        e.setNombre(nombre.trim());
        e.setCedula(cedula.trim());
        e.setTi(ti != null && !ti.isBlank() ? ti.trim() : null);
        e.setFechaNacimiento(fechaNacimiento);
        e.setSemanasGestacion(semanasGestacion);
        e.setTelefono(telefono != null && !telefono.isBlank() ? telefono.trim() : null);
        e.setBiometricId(biometricId != null && !biometricId.isBlank() ? biometricId.trim() : null);
        e.setGrupo(grupo != null && !grupo.isBlank() ? grupo.trim() : null);
        PapaEntity saved = repo.save(e);
        if (bioOld != null && !bioOld.equals(saved.getBiometricId())) {
            hikvisionService.eliminarEmpleado(bioOld);
        }
        hikvisionService.sincronizarEmpleado(saved.getBiometricId(), saved.getNombre());
        return toDomain(saved);
    }

    @Transactional
    public void eliminar(Integer id) {
        PapaEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Padre no encontrado"));
        String bio = e.getBiometricId();
        repo.delete(e);
        hikvisionService.eliminarEmpleado(bio);
    }

    private Papa toDomain(PapaEntity e) {
        return new Papa(e.getId(), e.getNombre(), e.getCedula(), e.getTi(), e.getFechaNacimiento(),
                e.getSemanasGestacion(), e.getTelefono(), e.getBiometricId(), e.getGrupo(),
                Boolean.TRUE.equals(e.getEnabled()));
    }
}
