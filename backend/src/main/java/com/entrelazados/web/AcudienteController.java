package com.entrelazados.web;

import com.entrelazados.domain.Acudiente;
import com.entrelazados.service.AcudienteService;
import com.entrelazados.web.dto.AcudienteRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("acudientes")
public class AcudienteController {

    private final AcudienteService service;

    public AcudienteController(AcudienteService service) {
        this.service = service;
    }

    @GetMapping
    public List<Acudiente> listar(@RequestParam(required = false) String nombre) {
        return service.listar(nombre);
    }

    @GetMapping("/{id}")
    public Acudiente obtener(@PathVariable Integer id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Acudiente crear(@Valid @RequestBody AcudienteRequest request) {
        return service.crear(request.nombre(), request.telefono(), request.cc());
    }

    @PutMapping("/{id}")
    public Acudiente actualizar(@PathVariable Integer id, @Valid @RequestBody AcudienteRequest request) {
        return service.actualizar(id, request.nombre(), request.telefono(), request.cc());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        service.eliminar(id);
    }
}
