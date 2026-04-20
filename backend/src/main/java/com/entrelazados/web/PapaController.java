package com.entrelazados.web;

import com.entrelazados.domain.AsistenciaPapa;
import com.entrelazados.domain.Papa;
import com.entrelazados.domain.PapaPlan;
import com.entrelazados.service.AsistenciaPapaService;
import com.entrelazados.service.HikvisionService;
import com.entrelazados.service.PapaPlanService;
import com.entrelazados.service.PapaService;
import com.entrelazados.web.dto.PapaRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("papas")
public class PapaController {

    private final PapaService papaService;
    private final PapaPlanService papaPlanService;
    private final AsistenciaPapaService asistenciaPapaService;
    private final HikvisionService hikvisionService;

    @Value("${hikvision.syncEnabled:true}")
    private boolean hikvisionSyncEnabled;

    public PapaController(PapaService papaService, PapaPlanService papaPlanService,
            AsistenciaPapaService asistenciaPapaService, HikvisionService hikvisionService) {
        this.papaService = papaService;
        this.papaPlanService = papaPlanService;
        this.asistenciaPapaService = asistenciaPapaService;
        this.hikvisionService = hikvisionService;
    }

    @GetMapping
    public List<Papa> listar(@RequestParam(required = false) String nombre) {
        return papaService.listar(nombre);
    }

    @GetMapping("/{id}")
    public Papa obtener(@PathVariable Integer id) {
        return papaService.buscarPorId(id);
    }

    @GetMapping("/{id}/detalle")
    public Map<String, Object> detalle(@PathVariable Integer id, @RequestParam(required = false) LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        Papa papa = papaService.buscarPorId(id);
        List<Map<String, Object>> planesActivos = papaPlanService.listarPorPapa(id).stream()
                .filter(p -> planVigenteEnFecha(p, f))
                .map(p -> {
                    String nombre = papaPlanService.getNombrePlan(p.id());
                    return Map.<String, Object>of(
                            "id", p.id(),
                            "idPapa", p.idPapa(),
                            "nombrePapa", papa.nombre(),
                            "tipo", p.tipo().name(),
                            "nombre", nombre != null ? nombre : "",
                            "servicios", List.of());
                })
                .collect(Collectors.toList());

        Object asistenciaHoy = null;
        List<AsistenciaPapa> hoy = asistenciaPapaService.listarPorFecha(f).stream()
                .filter(a -> a.idPapa().equals(id))
                .toList();
        if (!hoy.isEmpty()) {
            AsistenciaPapa a = hoy.stream().filter(x -> x.horaSalida() == null).findFirst().orElse(hoy.get(hoy.size() - 1));
            Map<String, Object> ah = new HashMap<>();
            ah.put("id", a.id());
            ah.put("idPapa", a.idPapa());
            ah.put("idPlan", a.idPlan());
            ah.put("fecha", a.fecha().toString());
            ah.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
            ah.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
            ah.put("jornada", a.jornada());
            ah.put("observacion", a.observacion());
            asistenciaHoy = ah;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", papa.id());
        map.put("nombre", papa.nombre());
        map.put("cedula", papa.cedula());
        map.put("ti", papa.ti());
        map.put("fechaNacimiento", papa.fechaNacimiento() != null ? papa.fechaNacimiento().toString() : null);
        map.put("semanasGestacion", papa.semanasGestacion());
        map.put("telefono", papa.telefono());
        map.put("biometricId", papa.biometricId());
        map.put("grupo", papa.grupo());
        map.put("planesActivos", planesActivos);
        map.put("asistenciaHoy", asistenciaHoy);
        return map;
    }

    private static boolean planVigenteEnFecha(PapaPlan p, LocalDate f) {
        if (p.sesionesConsumidas() >= p.totalSesiones()) {
            return false;
        }
        if (p.fechaInicio() != null && f.isBefore(p.fechaInicio())) {
            return false;
        }
        if (p.fechaFin() != null && f.isAfter(p.fechaFin())) {
            return false;
        }
        return true;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Papa crear(@Valid @RequestBody PapaRequest request) {
        return papaService.crear(request.nombre(), request.cedula(), request.ti(), request.fechaNacimiento(),
                request.semanasGestacion(), request.telefono(), request.biometricId(), request.grupo());
    }

    @PutMapping("/{id}")
    public Papa actualizar(@PathVariable Integer id, @Valid @RequestBody PapaRequest request) {
        return papaService.actualizar(id, request.nombre(), request.cedula(), request.ti(), request.fechaNacimiento(),
                request.semanasGestacion(), request.telefono(), request.biometricId(), request.grupo());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        papaService.eliminar(id);
    }

    @PostMapping("/{id}/sincronizar")
    public Map<String, String> sincronizarConDispositivo(@PathVariable Integer id) {
        if (!hikvisionSyncEnabled) {
            return Map.of("mensaje",
                    "La sincronización con el equipo Hikvision está desactivada en este entorno (solo asistencia por eventos).");
        }
        var entity = papaService.buscarEntidadPorId(id);
        hikvisionService.sincronizarEmpleado(entity.getBiometricId(), entity.getNombre());
        return Map.of("mensaje", "Re-sincronización enviada al dispositivo para: " + entity.getNombre());
    }
}
