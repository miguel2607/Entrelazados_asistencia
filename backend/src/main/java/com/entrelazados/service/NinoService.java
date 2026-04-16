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
    private final HikvisionService hikvisionService;

    public NinoService(NinoJpaRepository repo, HikvisionService hikvisionService) {
        this.repo = repo;
        this.hikvisionService = hikvisionService;
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
    public Nino crear(String nombre, String ti, LocalDate fechaNacimiento, String biometricId, String grupo) {
        NinoEntity e = new NinoEntity();
        e.setNombre(nombre);
        e.setTi(ti);
        e.setFechaNacimiento(fechaNacimiento);
        e.setBiometricId(biometricId);
        e.setGrupo(grupo);
        e = repo.save(e);
        hikvisionService.sincronizarNino(e);
        return toDomain(e);
    }

    @Transactional
    public Nino actualizar(Integer id, String nombre, String ti, LocalDate fechaNacimiento, String biometricId, String grupo) {
        NinoEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Niño no encontrado"));
        e.setNombre(nombre);
        e.setTi(ti);
        e.setFechaNacimiento(fechaNacimiento);
        e.setBiometricId(biometricId);
        e.setGrupo(grupo);
        NinoEntity saved = repo.save(e);
        hikvisionService.sincronizarNino(saved);
        return toDomain(saved);
    }

    @Transactional
    public void eliminar(Integer id) {
        NinoEntity e = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Niño no encontrado"));
        String bioId = e.getBiometricId();
        repo.delete(e);
        hikvisionService.eliminarNino(bioId);
    }

    public boolean existePorId(Integer id) {
        return repo.existsById(id);
    }

    @Transactional(readOnly = true)
    public boolean existePorBiometricId(String biometricId) {
        return repo.findByBiometricId(biometricId).isPresent();
    }

    @Transactional(readOnly = true)
    public NinoEntity buscarEntidadPorId(Integer id) {
        return repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Niño no encontrado"));
    }

    @Transactional(readOnly = true)
    public NinoEntity buscarEntidadPorBiometricId(String biometricId) {
        return repo.findByBiometricId(biometricId)
                .orElseThrow(
                        () -> new RecursoNoEncontradoException("Niño no encontrado con ID biométrico: " + biometricId));
    }

    @Transactional(readOnly = true)
    public List<Nino> listarCumpleanosEnFecha(LocalDate fecha) {
        return repo.findAllByOrderByNombreAsc().stream()
                .filter(n -> n.getFechaNacimiento() != null
                        && n.getFechaNacimiento().getMonthValue() == fecha.getMonthValue()
                        && n.getFechaNacimiento().getDayOfMonth() == fecha.getDayOfMonth())
                .map(this::toDomain)
                .toList();
    }

    Nino toDomain(NinoEntity e) {
        return new Nino(e.getId(), e.getNombre(), e.getTi(), e.getFechaNacimiento(), e.getBiometricId(), e.getGrupo());
    }
}
