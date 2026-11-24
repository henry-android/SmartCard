package com.smartcard.backend.dto;

import java.time.LocalDateTime;

public record ExamAttemptHistoryDTO(
        Long attemptId,
        int attemptNumber,
        LocalDateTime startedAt,
        LocalDateTime submittedAt,
        long timeSpentSeconds,
        int score,
        int totalQuestions,
        double percentage) {
}
