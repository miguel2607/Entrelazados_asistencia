package com.entrelazados.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "nino_plan_congelacion")
public class NinoPlanCongelacionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "id_nino_plan", nullable = false)
    private Integer idNinoPlan;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private Integer dias;

    public NinoPlanCongelacionEntity() {}

    public NinoPlanCongelacionEntity(Integer idNinoPlan, LocalDate fecha, Integer dias) {
        this.idNinoPlan = idNinoPlan;
        this.fecha = fecha;
        this.dias = dias;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getIdNinoPlan() {
        return idNinoPlan;
    }

    public void setIdNinoPlan(Integer idNinoPlan) {
        this.idNinoPlan = idNinoPlan;
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
}
