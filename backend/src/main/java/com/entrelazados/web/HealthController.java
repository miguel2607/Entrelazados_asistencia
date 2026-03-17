package com.entrelazados.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> health() {
        return Map.of(
                "status", "ok",
                "timestamp", Instant.now().toString()
        );
    }
}

