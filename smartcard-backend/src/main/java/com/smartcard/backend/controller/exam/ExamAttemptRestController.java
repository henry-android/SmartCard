package com.smartcard.backend.controller.exam;

import com.smartcard.backend.dto.ExamSubmissionResultDTO;
import com.smartcard.backend.dto.ExamTakeDTO;
import com.smartcard.backend.entity.User;
import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.service.exam.ExamQuestionService;
import com.smartcard.backend.service.exam.ExamAttemptService;
import com.smartcard.backend.service.exam.ExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpSession;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/exam-attempts")
public class ExamAttemptRestController {
    @Autowired
    private ExamAttemptService examAttemptService;
    @Autowired
    private ExamService examService;
    @Autowired
    private ExamQuestionService examQuestionService;

    @PostMapping("/create")
    public ResponseEntity<?> createAttempt(@RequestParam Long examId, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập để làm bài."));
        }

        Optional<Exam> examOpt = examService.getExamById(examId);
        if (examOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Exam exam = examOpt.get();
        if (!exam.isPublic() && !user.getUsername().equals(exam.getCreatedBy())) {
            return ResponseEntity.status(403).body(Map.of("message", "Đề thi này không được công khai."));
        }
        if (examQuestionService.getQuestionsByExam(exam).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Đề thi chưa có câu hỏi."));
        }

        Optional<ExamAttempt> attemptOpt = examAttemptService.createAttempt(exam, user.getUsername());
        if (attemptOpt.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        Optional<ExamTakeDTO> examForAttempt = examAttemptService.getExamForAttempt(exam, attemptOpt.get());
        return examForAttempt.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitExam(
            @RequestParam Long attemptId,
            @RequestBody Map<Long, Long> answers,
            @RequestParam(required = false) Integer remainingTime,
            HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }

        Optional<ExamAttempt> attemptOpt = examAttemptService.getById(attemptId);
        if (attemptOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ExamAttempt attempt = attemptOpt.get();
        if (!user.getUsername().equals(attempt.getUserId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền nộp bài này."));
        }
        Optional<ExamSubmissionResultDTO> submitted = examAttemptService.submitAttempt(attempt, answers, remainingTime);
        return submitted.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().body(Map.of(
                        "message", "Bài thi đã nộp hoặc câu trả lời không hợp lệ.")));
    }

    @GetMapping("/{attemptId}/result")
    public ResponseEntity<?> getResult(@PathVariable Long attemptId, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }

        Optional<ExamAttempt> attemptOpt = examAttemptService.getById(attemptId);
        if (attemptOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ExamAttempt attempt = attemptOpt.get();
        if (!user.getUsername().equals(attempt.getUserId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền xem kết quả này."));
        }
        Optional<ExamSubmissionResultDTO> result = examAttemptService.getResult(attempt);
        return result.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.badRequest().body(Map.of("message", "Bài thi chưa được nộp.")));
    }

    @GetMapping("/by-exam/{examId}")
    public ResponseEntity<?> getAttemptsByExam(@PathVariable Long examId, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        Optional<Exam> examOpt = examService.getExamById(examId);
        if (examOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!user.getUsername().equals(examOpt.get().getCreatedBy())) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền xem kết quả đề thi này."));
        }
        List<ExamAttempt> attempts = examAttemptService.getAttemptsByExam(examOpt.get());
        return ResponseEntity.ok(attempts);
    }
}