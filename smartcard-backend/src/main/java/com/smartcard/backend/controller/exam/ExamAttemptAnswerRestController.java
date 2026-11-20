package com.smartcard.backend.controller.exam;

import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.service.exam.ExamAttemptAnswerService;
import com.smartcard.backend.service.exam.ExamAttemptService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/exam-attempt-answers")
public class ExamAttemptAnswerRestController {
    @Autowired
    private ExamAttemptAnswerService examAttemptAnswerService;
    @Autowired
    private ExamAttemptService examAttemptService;

    @PostMapping
    public ResponseEntity<ExamAttemptAnswer> saveAnswer(@RequestBody ExamAttemptAnswer answer) {
        return ResponseEntity.ok(examAttemptAnswerService.saveAnswer(answer));
    }

    @GetMapping("/by-attempt/{attemptId}")
    public ResponseEntity<List<ExamAttemptAnswer>> getAnswersByAttempt(@PathVariable Long attemptId) {
        return examAttemptService.getById(attemptId)
                .map(a -> ResponseEntity.ok(examAttemptAnswerService.getAnswersByAttempt(a)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}