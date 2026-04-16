package com.entrelazados.web;

import com.entrelazados.domain.AsistenciaPapa;
import com.entrelazados.domain.Papa;
import com.entrelazados.service.AsistenciaPapaService;
import com.entrelazados.service.PapaService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("asistencia-papas")
public class AsistenciaPapaController {

    private final AsistenciaPapaService asistenciaPapaService;
    private final PapaService papaService;

    public AsistenciaPapaController(AsistenciaPapaService asistenciaPapaService, PapaService papaService) {
        this.asistenciaPapaService = asistenciaPapaService;
        this.papaService = papaService;
    }

    @PostMapping("/entrada")
    public Map<String, Object> registrarEntrada(
            @RequestParam Integer idPapa,
            @RequestParam(required = false) LocalDate fecha,
            @RequestParam(required = false) LocalTime horaEntrada,
            @RequestParam(required = false) String observacion,
            @RequestParam(required = false) String jornada,
            @RequestParam(required = false) Integer idPlan
    ) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        LocalTime h = horaEntrada != null ? horaEntrada : LocalTime.now();
        AsistenciaPapa a = asistenciaPapaService.registrarEntrada(idPapa, f, h, observacion, jornada, idPlan);
        return toMap(a);
    }

    @PostMapping("/salida")
    public Map<String, Object> registrarSalida(
            @RequestParam Integer idPapa,
            @RequestParam(required = false) LocalDate fecha,
            @RequestParam(required = false) LocalTime horaSalida,
            @RequestParam(required = false) String observacion
    ) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        LocalTime h = horaSalida != null ? horaSalida : LocalTime.now();
        AsistenciaPapa a = asistenciaPapaService.registrarSalida(idPapa, f, h, observacion);
        return toMap(a);
    }

    @GetMapping("/por-fecha")
    public List<Map<String, Object>> porFecha(@RequestParam LocalDate fecha) {
        return asistenciaPapaService.listarPorFecha(fecha).stream().map(a -> {
            Map<String, Object> m = toMap(a);
            Papa p = papaService.buscarPorId(a.idPapa());
            m.put("papa", Map.of(
                    "id", p.id(),
                    "nombre", p.nombre(),
                    "cedula", p.cedula(),
                    "fechaNacimiento", p.fechaNacimiento().toString()
            ));
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/historial")
    public List<Map<String, Object>> historial(
            @RequestParam Integer idPapa,
            @RequestParam(required = false) LocalDate desde,
            @RequestParam(required = false) LocalDate hasta
    ) {
        LocalDate d = desde != null ? desde : LocalDate.now().minusMonths(1);
        LocalDate h = hasta != null ? hasta : LocalDate.now();
        return asistenciaPapaService.historialPorPapaYRango(idPapa, d, h).stream()
                .map(this::toMap)
                .collect(Collectors.toList());
    }

    @PatchMapping("/{id}")
    public Map<String, Object> actualizarObservacion(@PathVariable Integer id, @RequestBody Map<String, String> body) {
        AsistenciaPapa a = asistenciaPapaService.actualizarObservacion(id, body.get("observacion"));
        return toMap(a);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> eliminar(@PathVariable Integer id) {
        asistenciaPapaService.eliminar(id);
        return Map.of("status", "ok");
    }

    private Map<String, Object> toMap(AsistenciaPapa a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.id());
        m.put("idPapa", a.idPapa());
        m.put("fecha", a.fecha().toString());
        m.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
        m.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
        m.put("observacion", a.observacion());
        m.put("jornada", a.jornada());
        m.put("idPlan", a.idPlan());
        m.put("nombrePlan", a.nombrePlan());
        return m;
    }
}
