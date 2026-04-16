package com.entrelazados.web;

import com.entrelazados.domain.Papa;
import com.entrelazados.service.PapaService;
import com.entrelazados.web.dto.PapaRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("papas")
public class PapaController {

    private final PapaService service;

    public PapaController(PapaService service) {
        this.service = service;
    }

    @GetMapping
    public List<Papa> listar(@RequestParam(required = false) String nombre) {
        return service.listar(nombre);
    }

    @GetMapping("/{id}")
    public Papa obtener(@PathVariable Integer id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Papa crear(@Valid @RequestBody PapaRequest request) {
        return service.crear(
                request.nombre(),
                request.cedula(),
                request.fechaNacimiento(),
                request.semanasGestacion(),
                request.telefono(),
                request.biometricId(),
                request.enabled()
        );
    }

    @PutMapping("/{id}")
    public Papa actualizar(@PathVariable Integer id, @Valid @RequestBody PapaRequest request) {
        return service.actualizar(
                id,
                request.nombre(),
                request.cedula(),
                request.fechaNacimiento(),
                request.semanasGestacion(),
                request.telefono(),
                request.biometricId(),
                request.enabled()
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        service.eliminar(id);
    }
}

