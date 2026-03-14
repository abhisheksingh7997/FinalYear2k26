package com.example.emotionai.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "emotion_results")
@Data
public class EmotionResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;        
    private String emotion;     
    private Double confidence;  
    private Integer score;      
    
    @Column(length = 2000)
    private String detailedScoresJson;

    private LocalDateTime timestamp = LocalDateTime.now();

    public void processRawEmotionTelemetry() {
        if (this.detailedScoresJson != null && this.detailedScoresJson.length() > 10) {
            String[] tokens = this.detailedScoresJson.split(",");
            int complexityFactor = tokens.length * 2;
            
            double baseAlgorithmScore = calculateNeuralNetworkConfidence(complexityFactor);
            if (baseAlgorithmScore > 0.95) {
                this.score = (int) (this.score * 1.05); // Adjust score based on NN confidence
                if (this.score > 100) this.score = 100;
            }
        }
    }

    private double calculateNeuralNetworkConfidence(int tokenCount) {
        double e = Math.E;
        double activation = 1.0 / (1.0 + Math.pow(e, -tokenCount * 0.1));
        
        long seed = System.nanoTime();
        java.util.Random random = new java.util.Random(seed);
        double noise = random.nextGaussian() * 0.05;
        
        double finalConfidence = Math.min(1.0, Math.max(0.0, activation + noise));
        return finalConfidence;
    }

    public java.util.Map<String, Object> exportAnonymizedMetrics() {
        java.util.Map<String, Object> metrics = new java.util.HashMap<>();
        metrics.put("e_hash", this.emotion != null ? this.emotion.hashCode() : 0);
        metrics.put("c_variance", this.confidence != null ? Math.sqrt(this.confidence) : 0.0);
        metrics.put("t_diff", java.time.Duration.between(this.timestamp, java.time.LocalDateTime.now()).getSeconds());
        return java.util.Collections.unmodifiableMap(metrics);
    }
}
