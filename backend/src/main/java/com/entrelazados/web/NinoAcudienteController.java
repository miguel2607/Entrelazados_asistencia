package com.entrelazados.web;

import com.entrelazados.domain.Acudiente;
import com.entrelazados.persistence.entity.NinoAcudienteEntity;
import com.entrelazados.service.AcudienteService;
import com.entrelazados.service.NinoAcudienteService;
import com.entrelazados.web.dto.NinoAcudienteRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("ninos-acudientes")
public class NinoAcudienteController {

    private final NinoAcudienteService ninoAcudienteService;
    private final AcudienteService acudienteService;

    public NinoAcudienteController(NinoAcudienteService ninoAcudienteService, AcudienteService acudienteService) {
        this.ninoAcudienteService = ninoAcudienteService;
        this.acudienteService = acudienteService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> asociar(@Valid @RequestBody NinoAcudienteRequest request) {
        NinoAcudienteEntity na = ninoAcudienteService.asociar(request.idNino(), request.idAcudiente(), request.parentesco());
        Acudiente a = acudienteService.buscarPorId(na.getIdAcudiente());
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.id());
        map.put("nombre", a.nombre());
        map.put("telefono", a.telefono());
        map.put("cc", a.cc());
        map.put("parentesco", na.getParentesco());
        return map;
    }

    @GetMapping("/nino/{idNino}")
    public List<Map<String, Object>> porNino(@PathVariable Integer idNino) {
        return ninoAcudienteService.listarPorNino(idNino).stream().map(na -> {
            Acudiente a = acudienteService.buscarPorId(na.getIdAcudiente());
            Map<String, Object> m = new HashMap<>();
            m.put("id", a.id());
            m.put("nombre", a.nombre());
            m.put("telefono", a.telefono());
            m.put("cc", a.cc());
            m.put("parentesco", na.getParentesco());
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/acudiente/{idAcudiente}")
    public List<Integer> porAcudiente(@PathVariable Integer idAcudiente) {
        return ninoAcudienteService.listarPorAcudiente(idAcudiente).stream().map(NinoAcudienteEntity::getIdNino).toList();
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desasociar(@RequestParam Integer idNino, @RequestParam Integer idAcudiente) {
        ninoAcudienteService.desasociar(idNino, idAcudiente);
    }
}
