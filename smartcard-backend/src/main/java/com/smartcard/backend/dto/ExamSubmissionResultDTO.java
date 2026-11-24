package com.smartcard.backend.dto;

import java.util.List;

public record ExamSubmissionResultDTO(
        Long attemptId,
        String examTitle,
        int score,
        int totalQuestions,
        double percentage,
        List<QuestionResult> questions) {

    public record QuestionResult(
            Long questionId,
            String content,
            Long selectedOptionId,
            String selectedOptionContent,
            Long correctOptionId,
            String correctOptionContent,
            boolean correct) {
    }
}
