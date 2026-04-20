package com.entrelazados.persistence.entity;

import com.entrelazados.domain.TipoPlan;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "papa_plan")
public class PapaPlanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "id_papa", nullable = false)
    private Integer idPapa;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoPlan tipo;

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

    @Column(name = "precio_acordado")
    private BigDecimal precioAcordado;

    @Column(name = "porcentaje_descuento")
    private BigDecimal porcentajeDescuento = BigDecimal.ZERO;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getIdPapa() {
        return idPapa;
    }

    public void setIdPapa(Integer idPapa) {
        this.idPapa = idPapa;
    }

    public TipoPlan getTipo() {
        return tipo;
    }

    public void setTipo(TipoPlan tipo) {
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

    public BigDecimal getPrecioAcordado() {
        return precioAcordado;
    }

    public void setPrecioAcordado(BigDecimal precioAcordado) {
        this.precioAcordado = precioAcordado;
    }

    public BigDecimal getPorcentajeDescuento() {
        return porcentajeDescuento;
    }

    public void setPorcentajeDescuento(BigDecimal porcentajeDescuento) {
        this.porcentajeDescuento = porcentajeDescuento;
    }
}
