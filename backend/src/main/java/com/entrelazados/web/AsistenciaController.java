package com.entrelazados.web;

import com.entrelazados.domain.Asistencia;
import com.entrelazados.domain.Nino;
import com.entrelazados.persistence.repository.ServicioJpaRepository;
import com.entrelazados.service.AsistenciaService;
import com.entrelazados.service.NinoPlanService;
import com.entrelazados.service.NinoService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("asistencia")
public class AsistenciaController {

    private final AsistenciaService asistenciaService;
    private final NinoService ninoService;
    private final NinoPlanService ninoPlanService;
    private final ServicioJpaRepository servicioRepo;

    public AsistenciaController(AsistenciaService asistenciaService, NinoService ninoService,
            NinoPlanService ninoPlanService, ServicioJpaRepository servicioRepo) {
        this.asistenciaService = asistenciaService;
        this.ninoService = ninoService;
        this.ninoPlanService = ninoPlanService;
        this.servicioRepo = servicioRepo;
    }

    @PostMapping("/entrada")
    public Map<String, Object> registrarEntrada(@RequestParam Integer idNino,
            @RequestParam(required = false) Integer idPlan,
            @RequestParam(required = false) Integer idServicio,
            @RequestParam(required = false) LocalDate fecha,
            @RequestParam(required = false) LocalTime horaEntrada,
            @RequestParam(required = false) String jornada,
            @RequestParam(required = false) String observacion) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        LocalTime h = horaEntrada != null ? horaEntrada : LocalTime.now();
        Asistencia a = asistenciaService.registrarEntrada(idNino, idPlan, idServicio, f, h, jornada, observacion);
        return toMap(a);
    }

    @PostMapping("/salida")
    public Map<String, Object> registrarSalida(@RequestParam Integer idNino,
            @RequestParam(required = false) Integer idPlan,
            @RequestParam(required = false) LocalDate fecha,
            @RequestParam(required = false) LocalTime horaSalida,
            @RequestParam(required = false) String observacion) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        LocalTime h = horaSalida != null ? horaSalida : LocalTime.now();
        Asistencia a = asistenciaService.registrarSalida(idNino, idPlan, f, h, observacion);
        return toMap(a);
    }

    @GetMapping("/por-fecha")
    public List<Map<String, Object>> porFecha(@RequestParam LocalDate fecha) {
        return asistenciaService.listarPorFecha(fecha).stream().map(a -> {
            Map<String, Object> m = toMap(a);
            Nino n = ninoService.buscarPorId(a.idNino());
            m.put("nombrePlan", ninoPlanService.getNombrePlan(a.idPlan()));
            m.put("nino", Map.of("id", n.id(), "nombre", n.nombre(), "ti", n.ti() != null ? n.ti() : "",
                    "fechaNacimiento", n.fechaNacimiento().toString()));
            // Nombre del servicio utilizado (cuando viene de un paquete con servicio
            // específico)
            if (a.idServicio() != null) {
                String nombreServicio = servicioRepo.findById(a.idServicio())
                        .map(s -> s.getNombre()).orElse(null);
                m.put("nombreServicio", nombreServicio);
            }
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/historial")
    public List<Map<String, Object>> historial(@RequestParam Integer idNino,
            @RequestParam(required = false) LocalDate desde, @RequestParam(required = false) LocalDate hasta) {
        LocalDate d = desde != null ? desde : LocalDate.now().minusMonths(1);
        LocalDate h = hasta != null ? hasta : LocalDate.now();
        return asistenciaService.historialPorNinoYRango(idNino, d, h).stream().map(this::toMap)
                .collect(Collectors.toList());
    }

    @PatchMapping("/{id}")
    public Map<String, Object> actualizarObservacion(@PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        String observacion = body != null && body.containsKey("observacion") ? body.get("observacion") : null;
        Asistencia a = asistenciaService.actualizarObservacion(id, observacion);
        return toMap(a);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        asistenciaService.eliminar(id);
    }

    private Map<String, Object> toMap(Asistencia a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.id());
        m.put("idNino", a.idNino());
        m.put("idPlan", a.idPlan());
        m.put("idServicio", a.idServicio());
        m.put("fecha", a.fecha().toString());
        m.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
        m.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
        m.put("observacion", a.observacion());
        return m;
    }
}
