package com.entrelazados;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class AsistenciaApplication {

    public static void main(String[] args) {
        SpringApplication.run(AsistenciaApplication.class, args);
    }

    @PostConstruct
    public void init() {
        // Establecer la zona horaria predeterminada para toda la aplicación
        TimeZone.setDefault(TimeZone.getTimeZone("America/Bogota"));
    }
}
