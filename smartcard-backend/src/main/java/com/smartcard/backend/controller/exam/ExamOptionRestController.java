package com.smartcard.backend.controller.exam;

import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.service.exam.ExamOptionService;
import com.smartcard.backend.service.exam.ExamQuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/exam-options")
public class ExamOptionRestController {
    @Autowired
    private ExamOptionService examOptionService;
    @Autowired
    private ExamQuestionService examQuestionService;

    @PostMapping
    public ResponseEntity<ExamOption> addOption(@RequestBody ExamOption option) {
        return ResponseEntity.ok(examOptionService.addOption(option));
    }

    @GetMapping("/by-question/{questionId}")
    public ResponseEntity<List<ExamOption>> getOptionsByQuestion(@PathVariable Long questionId) {
        return examQuestionService.getById(questionId)
                .map(q -> ResponseEntity.ok(examOptionService.getOptionsByQuestion(q)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}