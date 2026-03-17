package com.entrelazados.domain;

import java.math.BigDecimal;
import java.util.List;

public record Paquete(Integer id, String nombre, BigDecimal precio, int cantidadDias, List<Servicio> servicios) {}
