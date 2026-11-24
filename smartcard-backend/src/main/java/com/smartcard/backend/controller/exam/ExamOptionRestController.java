package com.smartcard.backend.controller.exam;

import com.smartcard.backend.entity.User;
import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.service.exam.ExamOptionService;
import com.smartcard.backend.service.exam.ExamQuestionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam-options")
public class ExamOptionRestController {
    @Autowired
    private ExamOptionService examOptionService;
    @Autowired
    private ExamQuestionService examQuestionService;

    @PostMapping
    public ResponseEntity<?> addOption(@RequestBody ExamOption option, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        if (option.getQuestion() == null || option.getQuestion().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Câu hỏi không hợp lệ."));
        }
        var question = examQuestionService.getById(option.getQuestion().getId());
        if (question.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Exam exam = question.get().getExam();
        if (!user.getUsername().equals(exam.getCreatedBy())) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền sửa đề thi này."));
        }
        option.setQuestion(question.get());
        return ResponseEntity.ok(examOptionService.addOption(option));
    }

    @GetMapping("/by-question/{questionId}")
    public ResponseEntity<?> getOptionsByQuestion(@PathVariable Long questionId, HttpSession session) {
        var question = examQuestionService.getById(questionId);
        if (question.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Object sessionUser = session.getAttribute("loggedInUser");
        boolean isOwner = sessionUser instanceof User user
                && user.getUsername().equals(question.get().getExam().getCreatedBy());
        if (!isOwner) {
            return ResponseEntity.status(403).body(Map.of("message", "Chỉ chủ đề thi mới được xem đáp án."));
        }
        List<ExamOption> options = examOptionService.getOptionsByQuestion(question.get());
        return ResponseEntity.ok(options);
    }
}