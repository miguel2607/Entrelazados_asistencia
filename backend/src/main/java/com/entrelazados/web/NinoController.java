package com.entrelazados.web;

import com.entrelazados.domain.Acudiente;
import com.entrelazados.domain.Asistencia;
import com.entrelazados.domain.Nino;
import com.entrelazados.persistence.entity.NinoAcudienteEntity;
import com.entrelazados.service.AcudienteService;
import com.entrelazados.service.AsistenciaService;
import com.entrelazados.service.NinoAcudienteService;
import com.entrelazados.service.NinoPlanService;
import com.entrelazados.service.NinoService;
import com.entrelazados.web.dto.NinoRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("ninos")
public class NinoController {

    private final NinoService ninoService;
    private final AcudienteService acudienteService;
    private final NinoAcudienteService ninoAcudienteService;
    private final NinoPlanService ninoPlanService;
    private final AsistenciaService asistenciaService;

    public NinoController(NinoService ninoService, AcudienteService acudienteService, NinoAcudienteService ninoAcudienteService, NinoPlanService ninoPlanService, AsistenciaService asistenciaService) {
        this.ninoService = ninoService;
        this.acudienteService = acudienteService;
        this.ninoAcudienteService = ninoAcudienteService;
        this.ninoPlanService = ninoPlanService;
        this.asistenciaService = asistenciaService;
    }

    @GetMapping
    public List<Nino> listar(@RequestParam(required = false) String nombre) {
        return ninoService.listar(nombre);
    }

    @GetMapping("/{id}")
    public Nino obtener(@PathVariable Integer id) {
        return ninoService.buscarPorId(id);
    }

    @GetMapping("/{id}/detalle")
    public Map<String, Object> detalle(@PathVariable Integer id, @RequestParam(required = false) LocalDate fecha) {
        LocalDate f = fecha != null ? fecha : LocalDate.now();
        Nino nino = ninoService.buscarPorId(id);
        List<NinoAcudienteEntity> nas = ninoAcudienteService.listarPorNino(id);
        List<Map<String, Object>> acudientes = nas.stream().map(na -> {
            Acudiente a = acudienteService.buscarPorId(na.getIdAcudiente());
            return Map.<String, Object>of("id", a.id(), "nombre", a.nombre(), "telefono", a.telefono() != null ? a.telefono() : "", "cc", a.cc() != null ? a.cc() : "", "parentesco", na.getParentesco());
        }).collect(Collectors.toList());
        List<Map<String, Object>> planesActivos = ninoPlanService.listarPorNino(id).stream()
                .filter(p -> p.estaVigenteEn(f))
                .map(p -> Map.<String, Object>of("idNino", p.idNino(), "nombreNino", nino.nombre(), "tipo", p.tipo().name(), "nombre", ninoPlanService.getNombrePlan(p.id()) != null ? ninoPlanService.getNombrePlan(p.id()) : "", "servicios", List.of()))
                .collect(Collectors.toList());
        Object asistenciaHoy = null;
        var opt = asistenciaService.buscarPorNinoYFecha(id, f);
        if (opt.isPresent()) {
            Asistencia a = opt.get();
            Map<String, Object> ah = new HashMap<>();
            ah.put("id", a.id());
            ah.put("idNino", a.idNino());
            ah.put("idPlan", a.idPlan());
            ah.put("fecha", a.fecha().toString());
            ah.put("horaEntrada", a.horaEntrada() != null ? a.horaEntrada().toString() : null);
            ah.put("horaSalida", a.horaSalida() != null ? a.horaSalida().toString() : null);
            ah.put("observacion", a.observacion());
            asistenciaHoy = ah;
        }
        Map<String, Object> map = new HashMap<>();
        map.put("id", nino.id());
        map.put("nombre", nino.nombre());
        map.put("ti", nino.ti());
        map.put("fechaNacimiento", nino.fechaNacimiento().toString());
        map.put("acudientes", acudientes);
        map.put("planesActivos", planesActivos);
        map.put("asistenciaHoy", asistenciaHoy);
        return map;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Nino crear(@Valid @RequestBody NinoRequest request) {
        return ninoService.crear(request.nombre(), request.ti(), request.fechaNacimiento());
    }

    @PutMapping("/{id}")
    public Nino actualizar(@PathVariable Integer id, @Valid @RequestBody NinoRequest request) {
        return ninoService.actualizar(id, request.nombre(), request.ti(), request.fechaNacimiento());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        ninoService.eliminar(id);
    }
}
