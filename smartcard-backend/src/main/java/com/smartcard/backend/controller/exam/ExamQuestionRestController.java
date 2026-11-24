package com.smartcard.backend.controller.exam;

import com.smartcard.backend.entity.User;
import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.service.exam.ExamQuestionService;
import com.smartcard.backend.service.exam.ExamService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/exam-questions")
public class ExamQuestionRestController {
    @Autowired
    private ExamQuestionService examQuestionService;
    @Autowired
    private ExamService examService;

    @PostMapping
    public ResponseEntity<?> addQuestion(@RequestBody ExamQuestion question, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        if (question.getExam() == null || question.getExam().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Đề thi không hợp lệ."));
        }
        Optional<Exam> exam = examService.getExamById(question.getExam().getId());
        if (exam.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!user.getUsername().equals(exam.get().getCreatedBy())) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền sửa đề thi này."));
        }
        question.setExam(exam.get());
        return ResponseEntity.ok(examQuestionService.addQuestion(question));
    }

    @GetMapping("/by-exam/{examId}")
    public ResponseEntity<?> getQuestionsByExam(@PathVariable Long examId, HttpSession session) {
        Optional<Exam> exam = examService.getExamById(examId);
        if (exam.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Object sessionUser = session.getAttribute("loggedInUser");
        boolean isOwner = sessionUser instanceof User user
                && user.getUsername().equals(exam.get().getCreatedBy());
        if (!exam.get().isPublic() && !isOwner) {
            return ResponseEntity.notFound().build();
        }
        List<ExamQuestion> questions = examQuestionService.getQuestionsByExam(exam.get());
        return ResponseEntity.ok(questions);
    }
}