package com.entrelazados.web;

import com.entrelazados.domain.Grupo;
import com.entrelazados.domain.Subgrupo;
import com.entrelazados.service.GrupoService;
import com.entrelazados.web.dto.GrupoRequest;
import com.entrelazados.web.dto.SubgrupoRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("grupos")
public class GrupoController {

    private final GrupoService service;

    public GrupoController(GrupoService service) {
        this.service = service;
    }

    @GetMapping
    public List<Grupo> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Grupo crear(@Valid @RequestBody GrupoRequest request) {
        return service.crear(request.nombre(), request.color());
    }

    @PutMapping("/{id}")
    public Grupo actualizar(@PathVariable Integer id, @Valid @RequestBody GrupoRequest request) {
        return service.actualizar(id, request.nombre(), request.color());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Integer id) {
        service.eliminar(id);
    }

    @GetMapping("/{idGrupo}/subgrupos")
    public List<Subgrupo> listarSubgrupos(@PathVariable Integer idGrupo) {
        return service.listarSubgrupos(idGrupo);
    }

    @PostMapping("/{idGrupo}/subgrupos")
    @ResponseStatus(HttpStatus.CREATED)
    public Subgrupo crearSubgrupo(@PathVariable Integer idGrupo, @Valid @RequestBody SubgrupoRequest request) {
        return service.crearSubgrupo(idGrupo, request.nombre());
    }
}
