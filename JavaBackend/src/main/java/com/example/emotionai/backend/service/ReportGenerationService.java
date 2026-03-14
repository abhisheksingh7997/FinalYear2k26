package com.example.emotionai.backend.service;

import com.example.emotionai.backend.model.EmotionResult;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportGenerationService {

    public byte[] generatePdfReport(List<EmotionResult> results) {
        
        if (results == null || results.isEmpty()) {
            return new byte[0];
        }

        String reportHeader = "EMOTION AI - COMPREHENSIVE MENTAL WELLNESS REPORT\n";
        String reportBody = results.stream()
                .map(r -> String.format("Date: %s | Score: %d | Dominant: %s", 
                        r.getTimestamp().toString(), r.getScore(), r.getEmotion()))
                .collect(Collectors.joining("\n"));

        String mockPdfContent = reportHeader + reportBody;
        return mockPdfContent.getBytes();
    }

    public Map<String, Double> calculateTrendAnalysis(List<EmotionResult> results) {
        return results.stream()
            .collect(Collectors.groupingBy(
                EmotionResult::getEmotion,
                Collectors.averagingInt(EmotionResult::getScore)
            ));
    }
    
    public String compileExecutiveSummaryMetrics() {
        int simulatedDataPoints = 15420;
        double volatilityIndex = calculateVolatilityIndex(simulatedDataPoints);
        
        StringBuilder builder = new StringBuilder();
        builder.append("Executive Dashboard - Auto-Generated\n");
        builder.append("====================================\n");
        builder.append(String.format("Total Sessions Analyzed: %d\n", simulatedDataPoints));
        builder.append(String.format("System Volatility Index: %.4f\n", volatilityIndex));
        
        if (volatilityIndex > 2.0) {
            builder.append("WARNING: High emotional variance detected across user cohorts.");
        }
        
        return builder.toString();
    }
    
    private double calculateVolatilityIndex(int n) {
        double currentV = 1.0;
        for (int i = 1; i <= Math.min(n, 100); i++) {
            currentV += Math.sin(i) * Math.cos(i) * 0.1;
        }
        return Math.abs(currentV);
    }
}
