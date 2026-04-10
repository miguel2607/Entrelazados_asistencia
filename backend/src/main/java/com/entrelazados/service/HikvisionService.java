package com.entrelazados.service;

import com.entrelazados.persistence.entity.NinoEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.client5.http.config.RequestConfig;

import java.util.HashMap;
import java.util.Map;
import jakarta.annotation.PostConstruct;

@Service
public class HikvisionService {

    private static final Logger log = LoggerFactory.getLogger(HikvisionService.class);

    @Value("${hikvision.ip}")
    private String deviceIp;

    @Value("${hikvision.username}")
    private String username;

    @Value("${hikvision.password}")
    private String password;

    @Value("${hikvision.attendanceCheckOnly:true}")
    private boolean attendanceCheckOnly;

    @Value("${hikvision.syncEnabled:true}")
    private boolean syncEnabled;

    private RestTemplate restTemplate;

@PostConstruct
    public void init() {
        BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
        credentialsProvider.setCredentials(
                new AuthScope(null, -1),
                new UsernamePasswordCredentials(username, password.toCharArray()));

        // Configuración idéntica a Postman (mínima y robusta)
        RequestConfig requestConfig = RequestConfig.custom()
            .setExpectContinueEnabled(false)
            .setConnectTimeout(org.apache.hc.core5.util.Timeout.ofSeconds(10))
            .setResponseTimeout(org.apache.hc.core5.util.Timeout.ofSeconds(10))
            .build();

        CloseableHttpClient httpClient = HttpClients.custom()
                .setDefaultCredentialsProvider(credentialsProvider)
                .setDefaultRequestConfig(requestConfig)
                .disableAutomaticRetries() 
                .disableContentCompression()
                .setUserAgent("PostmanRuntime/7.36.1") 
                .setConnectionReuseStrategy((request, response, context) -> false) // No reutilizar conexiones (vital para equipos inestables)
                .build();

        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        factory.setConnectTimeout(10000);
        factory.setBufferRequestBody(true); // VITAL para Digest (permite enviar el cuerpo dos veces)
        this.restTemplate = new RestTemplate(factory);
    }

    private HttpHeaders getHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    /**
     * Sincroniza un niño con el equipo Hikvision.
     * Si el usuario ya existe en el dispositivo (employeeNoAlreadyExist),
     * se usa el endpoint de modificación (PUT /UserInfo/Modify) en lugar del de creación.
     * En ambos casos se asignan los permisos de acceso al final.
     */
    public void sincronizarNino(NinoEntity nino) {
        if (nino.getBiometricId() == null || nino.getBiometricId().isEmpty()) {
            return;
        }
        if (!syncEnabled) {
            log.debug("Sincronización Hikvision desactivada (hikvision.syncEnabled=false); no se llama al equipo.");
            return;
        }

        String nombre = nino.getNombre();
        if (nombre != null && nombre.length() > 20) {
            nombre = nombre.substring(0, 20);
        }

        String jsonBody = String.format(
            "{\"UserInfo\":{\"employeeNo\":\"%s\",\"name\":\"%s\",\"userType\":\"normal\"," +
            "\"checkUser\":%s,\"Valid\":{\"enable\":true,\"beginTime\":\"2010-01-01T00:00:00\"," +
            "\"endTime\":\"2036-03-31T23:59:59\",\"timeType\":\"local\"}}}",
            nino.getBiometricId(), nombre, attendanceCheckOnly
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "*/*");
        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

        try {
            // Intento 1: Crear usuario nuevo (POST)
            String createUrl = String.format("http://%s/ISAPI/AccessControl/UserInfo/Record?format=json", deviceIp);
            log.info("Creando usuario ID {} ({}) en Hikvision...", nino.getBiometricId(), nombre);
            var response = restTemplate.exchange(createUrl, HttpMethod.POST, entity, String.class);
            log.info("Usuario creado. Respuesta: {}", response.getBody());

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            if (responseBody.contains("employeeNoAlreadyExist")) {
                // El usuario ya existe → actualizarlo con PUT
                log.info("Usuario {} ya existe en el dispositivo. Actualizando con PUT...", nino.getBiometricId());
                try {
                    String updateUrl = String.format("http://%s/ISAPI/AccessControl/UserInfo/Modify?format=json", deviceIp);
                    restTemplate.exchange(updateUrl, HttpMethod.PUT, entity, String.class);
                    log.info("Usuario {} actualizado correctamente.", nino.getBiometricId());
                } catch (Exception ex) {
                    log.warn("No se pudo actualizar el usuario {} en el dispositivo: {}", nino.getBiometricId(), ex.getMessage());
                }
            } else {
                log.error("Error HTTP al sincronizar con Hikvision: {} — {}", e.getStatusCode(), responseBody);
            }
        } catch (Exception e) {
            log.error("Error inesperado al sincronizar con Hikvision: {}", e.getMessage());
        }

        // Siempre asignar permisos, sin importar si fue crear o actualizar
        asignarPermisosAcceso(nino.getBiometricId());
    }

    /**
     * Asigna permisos de acceso al usuario en el equipo Hikvision.
     * Este paso es OBLIGATORIO después de crear el usuario con UserInfo,
     * de lo contrario el dispositivo rechaza la verificación con
     * "Person Not Assigned with Permission".
     * Prueba múltiples endpoints ya que varían según el modelo del dispositivo.
     */
    private void asignarPermisosAcceso(String employeeNo) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Accept", "*/*");

        // Intento 1: PUT /ISAPI/AccessControl/UserRight (formato lista — soportado en K series)
        try {
            String url = String.format("http://%s/ISAPI/AccessControl/UserRight?format=json", deviceIp);
            // planTemplateNo "1" = horario siempre activo. doorNo 1 = puerta del terminal.
            String jsonBody = String.format(
                "{\"UserRightList\":[{\"employeeNo\":\"%s\",\"doorNo\":1,\"planTemplateNo\":\"1\"}]}",
                employeeNo
            );
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
            var response = restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
            log.info("Permisos asignados a {} via UserRight — Respuesta: {}", employeeNo, response.getBody());
            return; // Éxito → no intentar el siguiente
        } catch (Exception e) {
            log.warn("UserRight falló para {}: {} — intentando siguiente endpoint...", employeeNo, e.getMessage());
        }

        // Intento 2: POST /ISAPI/AccessControl/AcsCfg/UserRight (algunos modelos K y T series)
        try {
            String url = String.format("http://%s/ISAPI/AccessControl/AcsCfg/UserRight?format=json", deviceIp);
            String jsonBody = String.format(
                "{\"employeeNo\":\"%s\",\"doorNo\":1,\"planTemplateNo\":\"1\"}",
                employeeNo
            );
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
            var response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            log.info("Permisos asignados a {} via AcsCfg/UserRight — Respuesta: {}", employeeNo, response.getBody());
            return;
        } catch (Exception e) {
            log.warn("AcsCfg/UserRight también falló para {}: {}", employeeNo, e.getMessage());
        }

        // Intento 3: PUT /ISAPI/AccessControl/AccessGroupInfo/1 (Último firmware MinMoe V3)
        try {
            String url = String.format("http://%s/ISAPI/AccessControl/AccessGroupInfo/1?format=json", deviceIp);
            String jsonBody = String.format(
                "{\"AccessGroupInfo\":{\"accessGroupId\":\"1\",\"accessGroupName\":\"Acceso General\",\"employeeNoList\":[{\"employeeNo\":\"%s\"}]}}",
                employeeNo
            );
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
            restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
            log.info("Permisos asignados a {} via AccessGroupInfo/1", employeeNo);
            return;
        } catch (Exception e) {
            log.warn("AccessGroupInfo falló para {}: {}", employeeNo, e.getMessage());
        }

        // Intento 4: PUT /ISAPI/AccessControl/AccessGroup/1 (Variante de algunos modelos K/T)
        try {
            String url = String.format("http://%s/ISAPI/AccessControl/AccessGroup/1?format=json", deviceIp);
            String jsonBody = String.format(
                "{\"AccessGroup\":{\"id\":\"1\",\"employeeNoList\":[{\"employeeNo\":\"%s\"}]}}",
                employeeNo
            );
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
            restTemplate.exchange(url, HttpMethod.PUT, entity, String.class);
            log.info("Permisos asignados a {} via AccessGroup/1", employeeNo);
            return;
        } catch (Exception e) {
            log.warn("AccessGroup también falló para {}: {}", employeeNo, e.getMessage());
        }

        log.debug("Dispositivo {} no soporta ningún método de asignación de permisos conocido vía API.", employeeNo);
    }



    /**
     * Elimina un niño del equipo Hikvision.
     */
    public void eliminarNino(String biometricId) {
        if (biometricId == null || biometricId.isEmpty())
            return;
        if (!syncEnabled) {
            log.debug("Sincronización Hikvision desactivada; no se elimina usuario en el equipo.");
            return;
        }

        try {
            String url = String.format("http://%s/ISAPI/AccessControl/UserInfo/Delete?format=json", deviceIp);
            log.info("Removiendo usuario {} del equipo...", biometricId);

            Map<String, Object> detail = new HashMap<>();
            detail.put("employeeNo", biometricId);

            Map<String, Object> root = new HashMap<>();
            root.put("UserInfoDetailList", java.util.List.of(detail));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(root, getHeaders());
            restTemplate.exchange(url, HttpMethod.PUT, entity, String.class); // Hikvision suele usar PUT para borrar
                                                                              // masivamente con cuerpo
        } catch (Exception e) {
            log.warn("No se pudo eliminar del equipo: {}", e.getMessage());
        }
    }
}
