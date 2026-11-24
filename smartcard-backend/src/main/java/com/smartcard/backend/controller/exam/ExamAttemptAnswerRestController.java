package com.smartcard.backend.controller.exam;

import com.smartcard.backend.entity.User;
import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.service.exam.ExamAttemptAnswerService;
import com.smartcard.backend.service.exam.ExamAttemptService;
import com.smartcard.backend.service.exam.ExamOptionService;
import com.smartcard.backend.service.exam.ExamQuestionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exam-attempt-answers")
public class ExamAttemptAnswerRestController {
    @Autowired
    private ExamAttemptAnswerService examAttemptAnswerService;
    @Autowired
    private ExamAttemptService examAttemptService;
    @Autowired
    private ExamQuestionService examQuestionService;
    @Autowired
    private ExamOptionService examOptionService;

    @PostMapping
    public ResponseEntity<?> saveAnswer(@RequestBody ExamAttemptAnswer answer, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        if (answer.getAttempt() == null || answer.getAttempt().getId() == null
                || answer.getQuestion() == null || answer.getQuestion().getId() == null
                || answer.getSelectedOption() == null || answer.getSelectedOption().getId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Câu trả lời không hợp lệ."));
        }

        var attempt = examAttemptService.getById(answer.getAttempt().getId());
        var question = examQuestionService.getById(answer.getQuestion().getId());
        var option = examOptionService.getById(answer.getSelectedOption().getId());
        if (attempt.isEmpty() || question.isEmpty() || option.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ExamAttempt examAttempt = attempt.get();
        ExamQuestion examQuestion = question.get();
        ExamOption selectedOption = option.get();
        if (!user.getUsername().equals(examAttempt.getUserId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền sửa câu trả lời này."));
        }
        if (examAttempt.getSubmittedAt() != null
                || !examAttempt.getExam().getId().equals(examQuestion.getExam().getId())
                || !examQuestion.getId().equals(selectedOption.getQuestion().getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Câu trả lời không thuộc bài thi đang làm."));
        }
        answer.setAttempt(examAttempt);
        answer.setQuestion(examQuestion);
        answer.setSelectedOption(selectedOption);
        answer.setId(null);
        answer.setCorrectOption(null);
        answer.setCorrect(selectedOption.isCorrect());
        examAttemptAnswerService.saveAnswer(answer);
        return ResponseEntity.ok(Map.of("message", "Đã lưu câu trả lời."));
    }

    @GetMapping("/by-attempt/{attemptId}")
    public ResponseEntity<?> getAnswersByAttempt(@PathVariable Long attemptId, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        var attempt = examAttemptService.getById(attemptId);
        if (attempt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ExamAttempt examAttempt = attempt.get();
        boolean isParticipant = user.getUsername().equals(examAttempt.getUserId());
        boolean isExamOwner = user.getUsername().equals(examAttempt.getExam().getCreatedBy());
        if (!isParticipant && !isExamOwner) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền xem các câu trả lời này."));
        }
        if (examAttempt.getSubmittedAt() == null) {
            return ResponseEntity.status(403).body(Map.of("message", "Câu trả lời chỉ được xem sau khi nộp bài."));
        }
        List<ExamAttemptAnswer> answers = examAttemptAnswerService.getAnswersByAttempt(examAttempt);
        return ResponseEntity.ok(answers);
    }
}