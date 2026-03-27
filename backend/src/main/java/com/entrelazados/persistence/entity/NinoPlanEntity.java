package com.entrelazados.persistence.entity;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "nino_plan")
public class NinoPlanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(name = "id_nino", nullable = false)
    private Integer idNino;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private com.entrelazados.domain.TipoPlan tipo;
    @Column(name = "id_servicio")
    private Integer idServicio;
    @Column(name = "id_paquete")
    private Integer idPaquete;
    @Column(name = "total_sesiones", nullable = false)
    private Integer totalSesiones = 1;
    @Column(name = "sesiones_consumidas", nullable = false)
    private Integer sesionesConsumidas = 0;
    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;
    @Column(name = "fecha_fin")
    private LocalDate fechaFin;
    @Column(name = "ultima_alerta_desestimada_en")
    private java.time.LocalDateTime ultimaAlertaDesestimadaEn;
    @Column(name = "precio_acordado")
    private java.math.BigDecimal precioAcordado;
    @Column(name = "porcentaje_descuento")
    private java.math.BigDecimal porcentajeDescuento = java.math.BigDecimal.ZERO;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getIdNino() {
        return idNino;
    }

    public void setIdNino(Integer idNino) {
        this.idNino = idNino;
    }

    public com.entrelazados.domain.TipoPlan getTipo() {
        return tipo;
    }

    public void setTipo(com.entrelazados.domain.TipoPlan tipo) {
        this.tipo = tipo;
    }

    public Integer getIdServicio() {
        return idServicio;
    }

    public void setIdServicio(Integer idServicio) {
        this.idServicio = idServicio;
    }

    public Integer getIdPaquete() {
        return idPaquete;
    }

    public void setIdPaquete(Integer idPaquete) {
        this.idPaquete = idPaquete;
    }

    public Integer getTotalSesiones() {
        return totalSesiones;
    }

    public void setTotalSesiones(Integer totalSesiones) {
        this.totalSesiones = totalSesiones;
    }

    public Integer getSesionesConsumidas() {
        return sesionesConsumidas;
    }

    public void setSesionesConsumidas(Integer sesionesConsumidas) {
        this.sesionesConsumidas = sesionesConsumidas;
    }

    public LocalDate getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDate fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDate getFechaFin() {
        return fechaFin;
    }

    public void setFechaFin(LocalDate fechaFin) {
        this.fechaFin = fechaFin;
    }

    public java.time.LocalDateTime getUltimaAlertaDesestimadaEn() {
        return ultimaAlertaDesestimadaEn;
    }

    public void setUltimaAlertaDesestimadaEn(java.time.LocalDateTime ultimaAlertaDesestimadaEn) {
        this.ultimaAlertaDesestimadaEn = ultimaAlertaDesestimadaEn;
    }

    public java.math.BigDecimal getPrecioAcordado() {
        return precioAcordado;
    }

    public void setPrecioAcordado(java.math.BigDecimal precioAcordado) {
        this.precioAcordado = precioAcordado;
    }

    public java.math.BigDecimal getPorcentajeDescuento() {
        return porcentajeDescuento;
    }

    public void setPorcentajeDescuento(java.math.BigDecimal porcentajeDescuento) {
        this.porcentajeDescuento = porcentajeDescuento;
    }
}
