package com.entrelazados.web;

import com.entrelazados.domain.AsistenciaPapa;
import com.entrelazados.domain.Papa;
import com.entrelazados.service.AsistenciaPapaService;
import com.entrelazados.service.PapaPlanService;
import com.entrelazados.service.PapaService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("asistencia-papa")
public class AsistenciaPapaController {

    private final AsistenciaPapaService asistenciaPapaService;
    private final PapaService papaService;
    private final PapaPlanService papaPlanService;

    public AsistenciaPapaController(AsistenciaPapaService asistenciaPapaService, PapaService papaService,
            PapaPlanService papaPlanService) {
        this.asistenciaPapaService = asistenciaPapaService;
        this.papaService = papaService;
        this.papaPlanService = papaPlanService;
    }

    @PostMapping("/entrada")
    public Map<String, Object> registrarEntrada(@RequestParam Integer idPapa,
            @RequestParam(required = false) Integer idPlan,
            @RequestParam(required = false) LocalDate fecha,
            @RequestParam(required = false) LocalTime horaEntrada,
            @RequestParam(required = false) String jornada,
            @RequestParam(required = false) String observacion) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        LocalTime h = horaEntrada != null ? horaEntrada : LocalTime.now();
        AsistenciaPapa a = asistenciaPapaService.registrarEntrada(idPapa, idPlan, f, h, jornada, observacion);
        return toMap(a);
    }

    @PostMapping("/salida")
    public Map<String, Object> registrarSalida(@RequestParam Integer idPapa,
            @RequestParam(required = false) Integer idPlan,
            @RequestParam(required = false) LocalDate fecha,
            @RequestParam(required = false) LocalTime horaSalida,
            @RequestParam(required = false) String observacion) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        LocalTime h = horaSalida != null ? horaSalida : LocalTime.now();
        AsistenciaPapa a = asistenciaPapaService.registrarSalida(idPapa, idPlan, f, h, observacion);
        return toMap(a);
    }

    @GetMapping("/por-fecha")
    public List<Map<String, Object>> porFecha(@RequestParam LocalDate fecha) {
        return asistenciaPapaService.listarPorFecha(fecha).stream().map(this::toMapEnriquecido).collect(Collectors.toList());
    }

    @GetMapping("/por-rango")
    public List<Map<String, Object>> porRango(@RequestParam LocalDate desde, @RequestParam LocalDate hasta) {
        return asistenciaPapaService.listarPorRango(desde, hasta).stream().map(this::toMapEnriquecido)
                .collect(Collectors.toList());
    }

    @GetMapping("/historial")
    public List<Map<String, Object>> historial(@RequestParam Integer idPapa,
            @RequestParam(required = false) LocalDate desde, @RequestParam(required = false) LocalDate hasta) {
        LocalDate d = desde != null ? desde : LocalDate.now().minusMonths(1);
        LocalDate h = hasta != null ? hasta : LocalDate.now();
        return asistenciaPapaService.historialPorPapaYRango(idPapa, d, h).stream().map(this::toMap)
                .collect(Collectors.toList());
    }

    @PatchMapping("/{id}")
    public Map<String, Object> actualizarObservacion(@PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        String observacion = body != null && body.containsKey("observacion") ? body.get("observacion") : null;
        AsistenciaPapa a = asistenciaPapaService.actualizarObservacion(id, observacion);
        return toMap(a);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        asistenciaPapaService.eliminar(id);
    }

    private Map<String, Object> toMap(AsistenciaPapa a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.id());
        m.put("idPapa", a.idPapa());
        m.put("idPlan", a.idPlan());
        m.put("fecha", a.fecha().toString());
        m.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
        m.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
        m.put("jornada", a.jornada());
        m.put("observacion", a.observacion());
        return m;
    }

    private Map<String, Object> toMapEnriquecido(AsistenciaPapa a) {
        Map<String, Object> m = toMap(a);
        Papa p = papaService.buscarPorId(a.idPapa());
        m.put("nombrePlan", papaPlanService.getNombrePlan(a.idPlan()));
        Map<String, Object> papaMap = new HashMap<>();
        papaMap.put("id", p.id());
        papaMap.put("nombre", p.nombre());
        papaMap.put("cedula", p.cedula() != null ? p.cedula() : "");
        papaMap.put("semanasGestacion", p.semanasGestacion());
        m.put("papa", papaMap);
        return m;
    }
}
