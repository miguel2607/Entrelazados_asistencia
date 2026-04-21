package com.entrelazados.web.dto;

import jakarta.validation.constraints.NotBlank;

public record SubgrupoRequest(@NotBlank String nombre) {}
