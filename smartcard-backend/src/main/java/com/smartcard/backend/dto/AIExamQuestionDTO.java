package com.smartcard.backend.dto;
import java.util.List;

public class AIExamQuestionDTO {
    private String content;
    private String explanation;
    private List<AIExamOptionDTO> options;

    public String getContent() {
        return content;
    }
    public void setContent(String content) {
        this.content = content;
    }
    public String getExplanation() {
        return explanation;
    }
    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }
    public List<AIExamOptionDTO> getOptions() {
        return options;
    }
    public void setOptions(List<AIExamOptionDTO> options) {
        this.options = options;
    }
}
