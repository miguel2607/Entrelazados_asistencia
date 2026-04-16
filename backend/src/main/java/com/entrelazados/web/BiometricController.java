package com.entrelazados.web;

import com.entrelazados.service.AsistenciaService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/")
public class BiometricController {

    private static final Logger log = LoggerFactory.getLogger(BiometricController.class);
    private final AsistenciaService asistenciaService;

    public BiometricController(AsistenciaService asistenciaService) {
        this.asistenciaService = asistenciaService;
    }

    /**
     * Receptador universal de eventos del equipo Hikvision.
     * Lee el cuerpo crudo con HttpServletRequest para soportar cualquier Content-Type
     * (multipart, application/json, text/xml, etc.) que el dispositivo envíe.
     * Las peticiones de heartbeat (sin cuerpo) se ignoran silenciosamente.
     */
    @PostMapping(value = {"/events", "/biometric/events", "/api/v1/biometric/events", "/ISAPI/Event/notification/alertStream"})
    public ResponseEntity<Void> receiveEvent(HttpServletRequest request) {
        String body = null;
        try {
            String contentType = request.getContentType();
            if (contentType != null && contentType.startsWith("multipart/")) {
                // Spring ya consumió el InputStream para parsear el multipart. 
                // Hikvision suele enviar el JSON en el part llamado "event_log".
                body = request.getParameter("event_log");
                
                // Si getParameter es nulo, iteramos sobre los parts para encontrar el JSON manualmente
                if (body == null) {
                    for (var part : request.getParts()) {
                        log.debug("Multipart Part detectado - Name: {}, Size: {}, Type: {}", part.getName(), part.getSize(), part.getContentType());
                        if ("event_log".equals(part.getName()) || (part.getContentType() != null && part.getContentType().contains("json"))) {
                            body = new String(part.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                        }
                    }
                }
            } else {
                // Si no es multipart, leemos el body crudo
                byte[] bytes = request.getInputStream().readAllBytes();
                body = new String(bytes, StandardCharsets.UTF_8);
            }
            
            log.debug("Longitud del body detectado: {} caracteres", body != null ? body.length() : 0);
        } catch (Exception e) {
            log.warn("No se pudo leer el cuerpo del evento biométrico: {}", e.getMessage());
            return ResponseEntity.ok().build();
        }

        if (body == null || body.isBlank()) {
            log.debug("Petición vacía ignorada.");
            return ResponseEntity.ok().build();
        }

        if (esHeartbeat(body)) {
            log.debug("Heartbeat recibido desde dispositivo biométrico.");
            return ResponseEntity.ok().build();
        }

        log.info(">>> LLAMADA DESDE EL EQUIPO: {} {} (Content-Type: {})", request.getMethod(), request.getRequestURI(), request.getContentType());
        log.info("EVENTO RECIBIDO DEL EQUIPO: {}", body);

        try {
            String employeeId = extraerEmployeeId(body);
            if (employeeId != null && !employeeId.isBlank()) {
                log.info("ID biométrico detectado: {}", employeeId);
                asistenciaService.registrarAsistenciaBiometrica(employeeId);
            } else {
                log.debug("Evento sin employeeNoString/employeeNo, se ignora.");
            }
        } catch (Exception e) {
            log.error("Error al procesar el evento biométrico: {}", e.getMessage());
        }

        return ResponseEntity.ok().build();
    }

    private boolean esHeartbeat(String body) {
        java.util.regex.Pattern json = java.util.regex.Pattern.compile("\"eventType\"\\s*:\\s*\"heartBeat\"", java.util.regex.Pattern.CASE_INSENSITIVE);
        java.util.regex.Pattern xml = java.util.regex.Pattern.compile("<eventType>heartBeat</eventType>", java.util.regex.Pattern.CASE_INSENSITIVE);
        return json.matcher(body).find() || xml.matcher(body).find();
    }

    /**
     * Compatibilidad con distintos firmwares Hikvision:
     * - employeeNoString (JSON/XML)
     * - employeeNo (JSON/XML)
     */
    private String extraerEmployeeId(String body) {
        java.util.regex.Pattern[] patrones = new java.util.regex.Pattern[] {
                java.util.regex.Pattern.compile("\"employeeNoString\"\\s*:\\s*\"([^\"]+)\""),
                java.util.regex.Pattern.compile("\"employeeNo\"\\s*:\\s*\"([^\"]+)\""),
                java.util.regex.Pattern.compile("\"employeeNo\"\\s*:\\s*(\\d+)"),
                java.util.regex.Pattern.compile("<employeeNoString>([^<]+)</employeeNoString>", java.util.regex.Pattern.CASE_INSENSITIVE),
                java.util.regex.Pattern.compile("<employeeNo>([^<]+)</employeeNo>", java.util.regex.Pattern.CASE_INSENSITIVE)
        };
        for (java.util.regex.Pattern p : patrones) {
            java.util.regex.Matcher m = p.matcher(body);
            if (m.find()) {
                return m.group(1).trim();
            }
        }
        return null;
    }
}
