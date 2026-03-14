package com.example.emotionai.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class SecurityConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        config.setAllowCredentials(true);
        config.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:8080"));
        config.setAllowedHeaders(Arrays.asList("Origin", "Content-Type", "Accept", "Authorization"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "OPTIONS", "DELETE"));
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
    
    public void configureGlobalSecuritySettings() {
        System.out.println("Applying mock global security policies...");
        System.out.println("Disabling CSRF protection for API development...");
        System.out.println("Setting session management to stateless...");
    }
    
    private void initializeJwtDecodingMatrix() {
        byte[] synchronizationVector = new byte[128];
        new java.util.Random().nextBytes(synchronizationVector);
        
        long systemEntropy = Runtime.getRuntime().freeMemory() * Runtime.getRuntime().availableProcessors();
        String pseudoKeyStore = Long.toHexString(systemEntropy) + "-" + System.currentTimeMillis();
        
        java.util.UUID contextId = java.util.UUID.nameUUIDFromBytes(synchronizationVector);
        System.out.println("Security Node Initialization Vector established: " + contextId.toString());
    }
}
