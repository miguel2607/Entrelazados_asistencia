package com.entrelazados.service;

import com.entrelazados.domain.Grupo;
import com.entrelazados.domain.Subgrupo;
import com.entrelazados.persistence.entity.GrupoEntity;
import com.entrelazados.persistence.entity.SubgrupoEntity;
import com.entrelazados.persistence.repository.GrupoJpaRepository;
import com.entrelazados.persistence.repository.NinoJpaRepository;
import com.entrelazados.persistence.repository.PapaJpaRepository;
import com.entrelazados.persistence.repository.SubgrupoJpaRepository;
import com.entrelazados.web.ConflictoException;
import com.entrelazados.web.RecursoNoEncontradoException;
import com.entrelazados.web.ValidacionException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class GrupoService {

    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9A-Fa-f]{6}$");

    private final GrupoJpaRepository repo;
    private final SubgrupoJpaRepository subgrupoRepo;
    private final NinoJpaRepository ninoRepo;
    private final PapaJpaRepository papaRepo;

    public GrupoService(GrupoJpaRepository repo, SubgrupoJpaRepository subgrupoRepo, NinoJpaRepository ninoRepo, PapaJpaRepository papaRepo) {
        this.repo = repo;
        this.subgrupoRepo = subgrupoRepo;
        this.ninoRepo = ninoRepo;
        this.papaRepo = papaRepo;
    }

    @Transactional(readOnly = true)
    public List<Grupo> listar() {
        return repo.findAllByOrderByNombreAsc().stream().map(this::toDomain).toList();
    }

    @Transactional
    public Grupo crear(String nombre, String color) {
        String nombreNormalizado = normalizeNombre(nombre);
        String colorNormalizado = normalizeColor(color);

        if (repo.existsByNombreIgnoreCase(nombreNormalizado)) {
            throw new ConflictoException("Ya existe un grupo con ese nombre.");
        }

        GrupoEntity entity = new GrupoEntity();
        entity.setNombre(nombreNormalizado);
        entity.setColor(colorNormalizado);
        return toDomain(repo.save(entity));
    }

    @Transactional
    public Grupo actualizar(Integer id, String nombre, String color) {
        GrupoEntity entity = repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Grupo no encontrado."));

        String nombreNormalizado = normalizeNombre(nombre);
        String colorNormalizado = normalizeColor(color);

        if (repo.existsByNombreIgnoreCaseAndIdNot(nombreNormalizado, id)) {
            throw new ConflictoException("Ya existe un grupo con ese nombre.");
        }

        entity.setNombre(nombreNormalizado);
        entity.setColor(colorNormalizado);
        return toDomain(repo.save(entity));
    }

    @Transactional
    public void eliminar(Integer id) {
        GrupoEntity entity = repo.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("Grupo no encontrado."));

        String nombreGrupo = entity.getNombre();
        boolean enUso = ninoRepo.existsByGrupoIgnoreCase(nombreGrupo) || papaRepo.existsByGrupoIgnoreCase(nombreGrupo);
        if (enUso) {
            throw new ConflictoException("No puedes eliminar este grupo porque está asignado a estudiantes o padres.");
        }

        repo.delete(entity);
    }

    @Transactional(readOnly = true)
    public List<Subgrupo> listarSubgrupos(Integer idGrupo) {
        validarGrupoExiste(idGrupo);
        return subgrupoRepo.findByIdGrupoOrderByNombreAsc(idGrupo).stream()
                .map(this::toDomain)
                .toList();
    }

    @Transactional
    public Subgrupo crearSubgrupo(Integer idGrupo, String nombre) {
        validarGrupoExiste(idGrupo);
        String nombreNormalizado = normalizeNombre(nombre);
        if (subgrupoRepo.existsByIdGrupoAndNombreIgnoreCase(idGrupo, nombreNormalizado)) {
            throw new ConflictoException("Ya existe ese subgrupo para el grupo seleccionado.");
        }
        SubgrupoEntity entity = new SubgrupoEntity();
        entity.setIdGrupo(idGrupo);
        entity.setNombre(nombreNormalizado);
        return toDomain(subgrupoRepo.save(entity));
    }

    @Transactional(readOnly = true)
    public void asegurarSubgrupoEnGrupo(String grupoNombre, String subgrupoNombre) {
        if (grupoNombre == null || grupoNombre.isBlank() || subgrupoNombre == null || subgrupoNombre.isBlank()) {
            return;
        }
        GrupoEntity grupo = repo.findByNombreIgnoreCase(grupoNombre.trim())
                .orElseThrow(() -> new ValidacionException("El grupo seleccionado no existe."));
        String subgrupoNormalizado = normalizeNombre(subgrupoNombre);
        if (!subgrupoRepo.existsByIdGrupoAndNombreIgnoreCase(grupo.getId(), subgrupoNormalizado)) {
            throw new ValidacionException("El subgrupo no pertenece al grupo seleccionado.");
        }
    }

    private void validarGrupoExiste(Integer idGrupo) {
        if (!repo.existsById(idGrupo)) throw new RecursoNoEncontradoException("Grupo no encontrado.");
    }

    private String normalizeNombre(String value) {
        if (value == null) throw new ValidacionException("El nombre del grupo es obligatorio.");
        String normalized = value.trim().replaceAll("\\s+", " ");
        if (normalized.isBlank()) throw new ValidacionException("El nombre del grupo es obligatorio.");
        if (normalized.length() > 100) throw new ValidacionException("El nombre del grupo no puede superar 100 caracteres.");
        return normalized;
    }

    private String normalizeColor(String value) {
        if (value == null) throw new ValidacionException("El color es obligatorio.");
        String normalized = value.trim();
        if (!HEX_COLOR.matcher(normalized).matches()) {
            throw new ValidacionException("El color debe tener formato hexadecimal, por ejemplo #2563EB.");
        }
        return normalized.toUpperCase(Locale.ROOT);
    }

    private Grupo toDomain(GrupoEntity entity) {
        return new Grupo(entity.getId(), entity.getNombre(), entity.getColor());
    }

    private Subgrupo toDomain(SubgrupoEntity entity) {
        return new Subgrupo(entity.getId(), entity.getIdGrupo(), entity.getNombre());
    }
}
