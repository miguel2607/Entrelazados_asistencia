package com.entrelazados.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "papa_plan_congelacion")
public class PapaPlanCongelacionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "id_papa_plan", nullable = false)
    private Integer idPapaPlan;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private Integer dias;

    @Column(length = 500)
    private String motivo;

    public PapaPlanCongelacionEntity() {}

    public PapaPlanCongelacionEntity(Integer idPapaPlan, LocalDate fecha, Integer dias, String motivo) {
        this.idPapaPlan = idPapaPlan;
        this.fecha = fecha;
        this.dias = dias;
        this.motivo = motivo;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getIdPapaPlan() {
        return idPapaPlan;
    }

    public void setIdPapaPlan(Integer idPapaPlan) {
        this.idPapaPlan = idPapaPlan;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public void setFecha(LocalDate fecha) {
        this.fecha = fecha;
    }

    public Integer getDias() {
        return dias;
    }

    public void setDias(Integer dias) {
        this.dias = dias;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }
}
