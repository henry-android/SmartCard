package com.smartcard.backend.dto;

import java.util.List;

public record ExamQuestionDetailsDTO(
        Long id,
        String content,
        int questionOrder,
        List<Option> options) {

    public record Option(Long id, String content, boolean correct) {
    }
}
