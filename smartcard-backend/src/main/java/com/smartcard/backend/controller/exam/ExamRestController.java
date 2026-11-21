package com.smartcard.backend.controller.exam;

import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.User;
import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.service.exam.ExamService;
import com.smartcard.backend.service.exam.ExamQuestionService;
import com.smartcard.backend.service.exam.ExamOptionService;
import com.smartcard.backend.service.AIService;
import com.smartcard.backend.dto.AIExamQuestionDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/exams")
public class ExamRestController {
    @Autowired
    private ExamService examService;
    @Autowired
    private ExamQuestionService examQuestionService;
    @Autowired
    private ExamOptionService examOptionService;
    @Autowired
    private AIService aiService;

    @PostMapping
    public ResponseEntity<Exam> createExam(@RequestBody Exam exam) {
        return ResponseEntity.ok(examService.createExam(exam));
    }

    @GetMapping
    public ResponseEntity<List<Exam>> getPublicExams() {
        return ResponseEntity.ok(examService.getPublicExams());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Exam> getExam(@PathVariable Long id) {
        Optional<Exam> exam = examService.getExamById(id);
        return exam.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping(value = "/{id}/ai-import", consumes = "multipart/form-data")
    @Transactional
    public ResponseEntity<?> aiImportExam(@PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }

        Optional<Exam> examOpt = examService.getExamById(id);
        if (examOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("message", "Không tìm thấy đề thi."));
        }

        Exam exam = examOpt.get();
        if (!user.getUsername().equals(exam.getCreatedBy())) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền import đề này."));
        }

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn file đề thi."));
        }

        String text;
        try {
            text = extractText(file);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không thể đọc file: " + e.getMessage()));
        }

        if (text == null || text.trim().length() < 20) {
            return ResponseEntity.badRequest().body(Map.of("message", "File không có đủ nội dung để AI phân tích."));
        }

        List<AIExamQuestionDTO> questions = aiService.analyzeExamQuestions(text);
        if (questions == null || questions.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "AI không phân tích được đề thi hoặc file không đúng định dạng."));
        }

        int order = examQuestionService.getQuestionsByExam(exam).size() + 1;
        int importedCount = 0;
        for (AIExamQuestionDTO questionDto : questions) {
            if (questionDto == null || questionDto.getContent() == null
                    || questionDto.getContent().trim().isEmpty()
                    || questionDto.getOptions() == null
                    || questionDto.getOptions().isEmpty()) {
                continue;
            }

            boolean hasValidOption = false;
            boolean hasCorrectOption = false;
            for (var optionDto : questionDto.getOptions()) {
                if (optionDto != null && optionDto.getContent() != null
                        && !optionDto.getContent().trim().isEmpty()) {
                    hasValidOption = true;
                    hasCorrectOption |= optionDto.isCorrect();
                }
            }
            if (!hasValidOption || !hasCorrectOption) {
                continue;
            }

            ExamQuestion question = new ExamQuestion();
            question.setExam(exam);
            question.setContent(questionDto.getContent().trim());
            question.setQuestionOrder(order++);
            question = examQuestionService.addQuestion(question);

            for (var optionDto : questionDto.getOptions()) {
                if (optionDto == null || optionDto.getContent() == null
                        || optionDto.getContent().trim().isEmpty()) {
                    continue;
                }
                ExamOption option = new ExamOption();
                option.setQuestion(question);
                option.setContent(optionDto.getContent().trim());
                option.setCorrect(optionDto.isCorrect());
                examOptionService.addOption(option);
            }
            importedCount++;
        }

        if (importedCount == 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "AI không tạo được câu hỏi trắc nghiệm hợp lệ."));
        }

        exam.setTotalQuestions(examQuestionService.getQuestionsByExam(exam).size());
        examService.createExam(exam);
        return ResponseEntity.ok(Map.of(
                "message", "Đã import thành công " + importedCount + " câu hỏi.",
                "importedCount", importedCount));
    }

    private String extractText(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("File không có tên.");
        }

        String lowerName = filename.toLowerCase();
        if (lowerName.endsWith(".pdf")) {
            try (PDDocument document = PDDocument.load(file.getInputStream())) {
                return new PDFTextStripper().getText(document);
            }
        }
        if (lowerName.endsWith(".docx")) {
            try (XWPFDocument document = new XWPFDocument(file.getInputStream())) {
                StringBuilder text = new StringBuilder();
                for (XWPFParagraph paragraph : document.getParagraphs()) {
                    text.append(paragraph.getText()).append('\n');
                }
                return text.toString();
            }
        }
        if (lowerName.endsWith(".doc")) {
            try (HWPFDocument document = new HWPFDocument(file.getInputStream());
                    WordExtractor extractor = new WordExtractor(document)) {
                return extractor.getText();
            }
        }
        throw new IllegalArgumentException("Chỉ hỗ trợ file PDF, DOC hoặc DOCX.");
    }
}