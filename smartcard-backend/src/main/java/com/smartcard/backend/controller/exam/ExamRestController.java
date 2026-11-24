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
import com.smartcard.backend.dto.AIExamOptionDTO;
import com.smartcard.backend.dto.ExamQuestionDetailsDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;

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
    public ResponseEntity<?> createExam(@RequestBody Exam exam, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập để tạo đề thi."));
        }
        exam.setCreatedBy(user.getUsername());
        exam.setCreatedAt(java.time.LocalDateTime.now());
        exam.setTotalQuestions(0);
        exam.setTotalAttempts(0);
        return ResponseEntity.ok(examService.createExam(exam));
    }

    @GetMapping
    public ResponseEntity<List<Exam>> getPublicExams() {
        return ResponseEntity.ok(examService.getPublicExams());
    }

    @GetMapping("/mine")
    public ResponseEntity<?> getMyExams(HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        return ResponseEntity.ok(examService.getExamsByCreator(user.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getExam(@PathVariable Long id, HttpSession session) {
        Optional<Exam> exam = examService.getExamById(id);
        if (exam.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Exam value = exam.get();
        Object sessionUser = session.getAttribute("loggedInUser");
        boolean isOwner = sessionUser instanceof User user && user.getUsername().equals(value.getCreatedBy());
        if (!value.isPublic() && !isOwner) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(value);
    }

    @GetMapping("/{id}/questions")
    public ResponseEntity<?> getExamQuestions(@PathVariable Long id, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }

        Optional<Exam> examOpt = examService.getExamById(id);
        if (examOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Exam exam = examOpt.get();
        if (!user.getUsername().equals(exam.getCreatedBy())) {
            return ResponseEntity.status(403).body(Map.of("message", "Bạn không có quyền xem đáp án đề này."));
        }

        List<ExamQuestionDetailsDTO> questions = examQuestionService.getQuestionsByExam(exam).stream()
                .map(question -> new ExamQuestionDetailsDTO(
                        question.getId(),
                        question.getContent(),
                        question.getQuestionOrder(),
                        examOptionService.getOptionsByQuestion(question).stream()
                                .map(option -> new ExamQuestionDetailsDTO.Option(
                                        option.getId(),
                                        option.getContent(),
                                        option.isCorrect()))
                                .toList()))
                .toList();
        return ResponseEntity.ok(questions);
    }

    @PostMapping(value = "/ai-import", consumes = "multipart/form-data")
    @Transactional
    public ResponseEntity<?> createExamFromFile(
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(defaultValue = "30") int duration,
            @RequestParam(defaultValue = "true") boolean isPublic,
            @RequestParam("file") MultipartFile file,
            HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(401).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        if (title == null || title.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập tên đề thi."));
        }
        if (duration < 1) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thời gian làm bài phải lớn hơn 0."));
        }

        List<AIExamQuestionDTO> questions;
        try {
            questions = analyzeFile(file);
        } catch (ExamImportException e) {
            return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
        }

        Exam exam = new Exam();
        exam.setTitle(title.trim());
        exam.setDescription(description == null ? "" : description.trim());
        exam.setDuration(duration);
        exam.setPublic(isPublic);
        exam.setCreatedBy(user.getUsername());
        exam.setCreatedAt(java.time.LocalDateTime.now());
        exam.setTotalAttempts(0);
        exam.setTotalQuestions(0);
        exam = examService.createExam(exam);

        int importedCount = saveQuestions(exam, questions);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Đã tạo đề thi và import thành công " + importedCount + " câu hỏi.",
                "importedCount", importedCount,
                "exam", exam));
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

        List<AIExamQuestionDTO> questions;
        try {
            questions = analyzeFile(file);
        } catch (ExamImportException e) {
            return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
        }

        int importedCount = saveQuestions(exam, questions);
        return ResponseEntity.ok(Map.of(
                "message", "Đã import thành công " + importedCount + " câu hỏi.",
                "importedCount", importedCount));
    }

    private List<AIExamQuestionDTO> analyzeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, "Vui lòng chọn file đề thi.");
        }

        String text;
        try {
            text = extractText(file);
        } catch (IllegalArgumentException e) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, "Không thể đọc file: " + e.getMessage());
        }

        if (text == null || text.trim().length() < 20) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, "File không có đủ nội dung để AI phân tích.");
        }

        if (!aiService.isConfigured()) {
            throw new ExamImportException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "AI chưa được cấu hình. Vui lòng thiết lập OPENROUTER_API_KEY.");
        }

        List<AIExamQuestionDTO> questions = aiService.analyzeExamQuestions(text);
        if (questions == null || questions.isEmpty()) {
            String aiError = aiService.getLastAnalysisError();
            String message = aiError == null || aiError.isBlank()
                    ? "AI không phân tích được đề thi hoặc file không đúng định dạng."
                    : aiError;
            throw new ExamImportException(HttpStatus.BAD_REQUEST, message);
        }

        List<AIExamQuestionDTO> validQuestions = questions.stream()
                .filter(this::isValidQuestion)
                .toList();
        if (validQuestions.isEmpty()) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, "AI không tạo được câu hỏi trắc nghiệm hợp lệ.");
        }
        return validQuestions;
    }

    private boolean isValidQuestion(AIExamQuestionDTO question) {
        if (question == null || question.getContent() == null || question.getContent().isBlank()
                || question.getOptions() == null) {
            return false;
        }

        boolean hasCorrectOption = false;
        boolean hasValidOption = false;
        for (AIExamOptionDTO option : question.getOptions()) {
            if (option != null && option.getContent() != null && !option.getContent().isBlank()) {
                hasValidOption = true;
                hasCorrectOption |= option.isCorrect();
            }
        }
        return hasValidOption && hasCorrectOption;
    }

    private int saveQuestions(Exam exam, List<AIExamQuestionDTO> questions) {
        int order = examQuestionService.getQuestionsByExam(exam).size() + 1;
        for (AIExamQuestionDTO questionDto : questions) {
            ExamQuestion question = new ExamQuestion();
            question.setExam(exam);
            question.setContent(questionDto.getContent().trim());
            question.setQuestionOrder(order++);
            question = examQuestionService.addQuestion(question);

            for (AIExamOptionDTO optionDto : questionDto.getOptions()) {
                if (optionDto == null || optionDto.getContent() == null || optionDto.getContent().isBlank()) {
                    continue;
                }
                ExamOption option = new ExamOption();
                option.setQuestion(question);
                option.setContent(optionDto.getContent().trim());
                option.setCorrect(optionDto.isCorrect());
                examOptionService.addOption(option);
            }
        }

        exam.setTotalQuestions(examQuestionService.getQuestionsByExam(exam).size());
        examService.createExam(exam);
        return questions.size();
    }

    private static class ExamImportException extends RuntimeException {
        private final HttpStatus status;

        private ExamImportException(HttpStatus status, String message) {
            super(message);
            this.status = status;
        }
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
                for (XWPFTable table : document.getTables()) {
                    for (XWPFTableRow row : table.getRows()) {
                        for (XWPFTableCell cell : row.getTableCells()) {
                            for (XWPFParagraph paragraph : cell.getParagraphs()) {
                                text.append(paragraph.getText()).append('\n');
                            }
                        }
                    }
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