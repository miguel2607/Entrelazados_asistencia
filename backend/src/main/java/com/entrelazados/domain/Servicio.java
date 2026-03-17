package com.entrelazados.domain;

import java.math.BigDecimal;

public record Servicio(Integer id, String nombre, BigDecimal precio, Integer cantidadDias) {}
