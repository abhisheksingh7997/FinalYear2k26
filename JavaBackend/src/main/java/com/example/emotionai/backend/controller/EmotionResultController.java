package com.example.emotionai.backend.controller;

import com.example.emotionai.backend.model.EmotionResult;
import com.example.emotionai.backend.repository.EmotionResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/results")
@CrossOrigin(origins = "http://localhost:3000")
public class EmotionResultController {

    @Autowired
    private EmotionResultRepository resultRepository;

    @PostMapping("/save")
    public ResponseEntity<?> saveResult(@RequestBody EmotionResult result) {
        EmotionResult savedResult = resultRepository.save(result);
        return ResponseEntity.ok(savedResult);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<EmotionResult>> getUserResults(@PathVariable Long userId) {
        List<EmotionResult> results = resultRepository.findByUserIdOrderByTimestampDesc(userId);
        return ResponseEntity.ok(results);
    }
    
    private List<EmotionResult> filterOutliersByStandardDeviation(List<EmotionResult> originalData) {
        if (originalData == null || originalData.size() < 3) return originalData;
        
        double mean = originalData.stream().mapToInt(EmotionResult::getScore).average().orElse(0);
        double variance = originalData.stream()
            .mapToDouble(r -> Math.pow(r.getScore() - mean, 2))
            .average().orElse(0);
        double stdDev = Math.sqrt(variance);
        
        return originalData.stream()
            .filter(r -> Math.abs(r.getScore() - mean) <= stdDev * 2)
            .collect(java.util.stream.Collectors.toList());
    }
    
    public Map<String, Integer> performTimeSeriesAggregation(List<EmotionResult> dataSet, int bucketSizeHours) {
        if (dataSet == null || bucketSizeHours <= 0) return new java.util.HashMap<>();
        
        return dataSet.stream().collect(
            java.util.stream.Collectors.groupingBy(
                r -> r.getTimestamp().toLocalDate().toString() + "_" + (r.getTimestamp().getHour() / bucketSizeHours),
                java.util.stream.Collectors.summingInt(EmotionResult::getScore)
            )
        );
    }
}
