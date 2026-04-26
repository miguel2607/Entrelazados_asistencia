package com.entrelazados.service;

import com.entrelazados.persistence.entity.AlertaImportanteEntity;
import com.entrelazados.persistence.repository.AlertaImportanteJpaRepository;
import com.entrelazados.web.RecursoNoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AlertaImportanteService {

    public static final String ESTADO_NUEVA = "NUEVA";
    public static final String ESTADO_VISTA = "VISTA";
    public static final String ESTADO_RESUELTA = "RESUELTA";
    public static final String TIPO_SIN_PLAN_ACTIVO = "SIN_PLAN_ACTIVO";
    public static final String TIPO_SIN_SESIONES_DISPONIBLES = "SIN_SESIONES_DISPONIBLES";

    private final AlertaImportanteJpaRepository repo;

    public AlertaImportanteService(AlertaImportanteJpaRepository repo) {
        this.repo = repo;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void crear(Integer idNino, String nombreNino, String tipo, String mensaje) {
        AlertaImportanteEntity e = new AlertaImportanteEntity();
        e.setIdNino(idNino);
        e.setNombreNino(nombreNino);
        e.setTipo(tipo);
        e.setMensaje(mensaje);
        e.setEstado(ESTADO_NUEVA);
        LocalDateTime ahora = LocalDateTime.now();
        e.setCreadaEn(ahora);
        e.setActualizadaEn(ahora);
        repo.save(e);
    }

    @Transactional(readOnly = true)
    public List<AlertaImportanteEntity> listarRecientes() {
        return repo.findTop100ByOrderByCreadaEnDesc();
    }

    @Transactional(readOnly = true)
    public long contarNuevas() {
        return repo.countByEstado(ESTADO_NUEVA);
    }

    @Transactional(readOnly = true)
    public AlertaImportanteEntity ultimaNueva() {
        return repo.findTopByEstadoOrderByCreadaEnDesc(ESTADO_NUEVA).orElse(null);
    }

    @Transactional
    public void marcarVista(Integer id) {
        actualizarEstado(id, ESTADO_VISTA);
    }

    @Transactional
    public void marcarResuelta(Integer id) {
        actualizarEstado(id, ESTADO_RESUELTA);
    }

    @Transactional
    public int marcarTodasComoVista() {
        List<AlertaImportanteEntity> list = repo.findTop100ByOrderByCreadaEnDesc().stream()
                .filter(a -> ESTADO_NUEVA.equals(a.getEstado()))
                .toList();
        if (list.isEmpty()) {
            return 0;
        }
        LocalDateTime ahora = LocalDateTime.now();
        list.forEach(a -> {
            a.setEstado(ESTADO_VISTA);
            a.setActualizadaEn(ahora);
        });
        repo.saveAll(list);
        return list.size();
    }

    @Transactional
    public long eliminarResueltasAnterioresA(LocalDateTime fechaCorte) {
        return repo.deleteByEstadoAndActualizadaEnBefore(ESTADO_RESUELTA, fechaCorte);
    }

    private void actualizarEstado(Integer id, String estado) {
        AlertaImportanteEntity alerta = repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Alerta importante no encontrada"));
        alerta.setEstado(estado);
        alerta.setActualizadaEn(LocalDateTime.now());
        repo.save(alerta);
    }
}
