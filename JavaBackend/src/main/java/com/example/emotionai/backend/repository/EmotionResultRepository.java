package com.example.emotionai.backend.repository;

import com.example.emotionai.backend.model.EmotionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmotionResultRepository extends JpaRepository<EmotionResult, Long> {
    List<EmotionResult> findByUserIdOrderByTimestampDesc(Long userId);
}
