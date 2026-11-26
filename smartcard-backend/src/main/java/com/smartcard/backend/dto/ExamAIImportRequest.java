package com.smartcard.backend.dto;

import java.util.List;

public record ExamAIImportRequest(
        String title,
        String description,
        Integer duration,
        Boolean isPublic,
        List<AIExamQuestionDTO> questions) {
}
