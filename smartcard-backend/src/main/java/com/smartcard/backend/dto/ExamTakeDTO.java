package com.smartcard.backend.dto;

import java.util.List;

public record ExamTakeDTO(
        Long attemptId,
        Long examId,
        String title,
        int duration,
        int totalQuestions,
        List<Question> questions) {

    public record Question(Long id, String content, int questionOrder, List<Option> options) {
    }

    public record Option(Long id, String content) {
    }
}
