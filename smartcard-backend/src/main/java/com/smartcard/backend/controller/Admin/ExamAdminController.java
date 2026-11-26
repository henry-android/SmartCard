package com.smartcard.backend.controller.Admin;

import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.User;
import com.smartcard.backend.service.exam.ExamService;
import com.smartcard.backend.util.PermissionUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpSession;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/exams")
public class ExamAdminController {
    @Autowired
    private ExamService examService;
    @Autowired
    private PermissionUtils permissionUtils;

    @GetMapping
    public List<Exam> getAllExams() {
        return examService.getPublicExams(); // hoặc getAllExams() nếu muốn lấy tất cả
    }

    @GetMapping("/{id}")
    public Exam getExamById(@PathVariable Long id) {
        Optional<Exam> exam = examService.getExamById(id);
        return exam.orElse(null);
    }

    @PostMapping
    public Exam createExam(@RequestBody Exam exam) {
        return examService.createExam(exam);
    }

    @PutMapping("/{id}")
    public Exam updateExam(@PathVariable Long id, @RequestBody Exam exam) {
        exam.setId(id);
        return examService.createExam(exam);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteExam(@PathVariable Long id, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Bạn cần đăng nhập với tài khoản quản trị."));
        }
        if (!permissionUtils.isAdmin(user)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chỉ quản trị viên mới được xóa đề qua API quản trị."));
        }
        if (examService.getExamById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        examService.deleteExam(id);
        return ResponseEntity.noContent().build();
    }
}