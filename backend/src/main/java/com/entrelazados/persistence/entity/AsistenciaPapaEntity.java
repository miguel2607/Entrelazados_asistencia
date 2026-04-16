package com.entrelazados.persistence.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "asistencia_papa")
public class AsistenciaPapaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "id_papa", nullable = false)
    private Integer idPapa;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_entrada")
    private LocalTime horaEntrada;

    @Column(name = "hora_salida")
    private LocalTime horaSalida;

    private String observacion;

    private String jornada;

    @Column(name = "id_plan")
    private Integer idPlan;

    @Column(name = "nombre_plan")
    private String nombrePlan;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getIdPapa() { return idPapa; }
    public void setIdPapa(Integer idPapa) { this.idPapa = idPapa; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public LocalTime getHoraEntrada() { return horaEntrada; }
    public void setHoraEntrada(LocalTime horaEntrada) { this.horaEntrada = horaEntrada; }
    public LocalTime getHoraSalida() { return horaSalida; }
    public void setHoraSalida(LocalTime horaSalida) { this.horaSalida = horaSalida; }
    public String getObservacion() { return observacion; }
    public void setObservacion(String observacion) { this.observacion = observacion; }
    public String getJornada() { return jornada; }
    public void setJornada(String jornada) { this.jornada = jornada; }
    public Integer getIdPlan() { return idPlan; }
    public void setIdPlan(Integer idPlan) { this.idPlan = idPlan; }
    public String getNombrePlan() { return nombrePlan; }
    public void setNombrePlan(String nombrePlan) { this.nombrePlan = nombrePlan; }
}
