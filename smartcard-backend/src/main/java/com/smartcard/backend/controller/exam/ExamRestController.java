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
import com.smartcard.backend.dto.ExamAIImportRequest;
import com.smartcard.backend.dto.ExamQuestionDetailsDTO;
import com.smartcard.backend.dto.ExamVisibilityUpdateRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;

import java.io.IOException;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
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
    @Value("${TESSERACT_CMD:tesseract}")
    private String tesseractCommand;
    @Value("${TESSERACT_LANGUAGE:vie+eng}")
    private String ocrLanguage;

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

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<?> updateExamVisibility(
            @PathVariable Long id,
            @RequestBody ExamVisibilityUpdateRequest request,
            HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Bạn cần đăng nhập để chỉnh sửa đề thi."));
        }
        if (request == null || request.isPublic() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng chọn chế độ công khai hoặc riêng tư."));
        }

        Optional<Exam> examOpt = examService.getExamById(id);
        if (examOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Exam exam = examOpt.get();
        if (!user.getUsername().equals(exam.getCreatedBy())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chỉ người tạo đề mới được chỉnh sửa quyền riêng tư."));
        }

        exam.setPublic(request.isPublic());
        examService.updateExam(exam);
        return ResponseEntity.ok(Map.of(
                "message", exam.isPublic()
                        ? "Đã chuyển đề thi sang chế độ công khai."
                        : "Đã chuyển đề thi sang chế độ riêng tư.",
                "isPublic", exam.isPublic()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteExam(@PathVariable Long id, HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Bạn cần đăng nhập để xóa đề thi."));
        }

        Optional<Exam> exam = examService.getExamById(id);
        if (exam.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!user.getUsername().equals(exam.get().getCreatedBy())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Chỉ người tạo đề mới được xóa đề thi."));
        }

        examService.deleteExam(id);
        return ResponseEntity.noContent().build();
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
                        question.getExplanation(),
                        examOptionService.getOptionsByQuestion(question).stream()
                                .map(option -> new ExamQuestionDetailsDTO.Option(
                                        option.getId(),
                                        option.getContent(),
                                        option.isCorrect()))
                                .toList()))
                .toList();
        return ResponseEntity.ok(questions);
    }

    @PostMapping(value = "/ai-import/preview", consumes = "multipart/form-data")
    public ResponseEntity<?> previewExamFromFile(
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

        AnalysisResult analysis;
        try {
            analysis = analyzeFile(file);
        } catch (ExamImportException e) {
            return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
        }

        return ResponseEntity.ok(Map.of(
                "questions", analysis.questions(),
                "rejectedCount", analysis.rejectedCount()));
    }

    @PostMapping(value = "/{id}/ai-import/preview", consumes = "multipart/form-data")
    public ResponseEntity<?> previewImportToExam(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        Optional<Exam> examOpt = examService.getExamById(id);
        if (examOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!user.getUsername().equals(examOpt.get().getCreatedBy())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Bạn không có quyền import đề này."));
        }

        try {
            AnalysisResult analysis = analyzeFile(file);
            return ResponseEntity.ok(Map.of(
                    "questions", analysis.questions(),
                    "rejectedCount", analysis.rejectedCount()));
        } catch (ExamImportException e) {
            return ResponseEntity.status(e.status).body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/ai-import/confirm")
    @Transactional
    public ResponseEntity<?> confirmNewExamImport(
            @RequestBody ExamAIImportRequest request,
            HttpSession session) {
        Object sessionUser = session.getAttribute("loggedInUser");
        if (!(sessionUser instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Bạn cần đăng nhập."));
        }
        if (request.title() == null || request.title().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập tên đề thi."));
        }
        if (request.duration() == null || request.duration() < 1) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thời gian làm bài phải lớn hơn 0."));
        }
        String validationError = validateQuestions(request.questions());
        if (validationError != null) {
            return ResponseEntity.badRequest().body(Map.of("message", validationError));
        }

        Exam exam = new Exam();
        exam.setTitle(request.title().trim());
        exam.setDescription(request.description() == null ? "" : request.description().trim());
        exam.setDuration(request.duration());
        exam.setPublic(Boolean.TRUE.equals(request.isPublic()));
        exam.setCreatedBy(user.getUsername());
        exam.setCreatedAt(java.time.LocalDateTime.now());
        exam.setTotalAttempts(0);
        exam.setTotalQuestions(0);
        exam = examService.createExam(exam);

        int importedCount = saveQuestions(exam, request.questions());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Đã tạo đề thi và lưu " + importedCount + " câu hỏi.",
                "importedCount", importedCount,
                "exam", exam));
    }

    @PostMapping("/{id}/ai-import/confirm")
    @Transactional
    public ResponseEntity<?> confirmImportToExam(
            @PathVariable Long id,
            @RequestBody List<AIExamQuestionDTO> questions,
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

        String validationError = validateQuestions(questions);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(Map.of("message", validationError));
        }

        int importedCount = saveQuestions(exam, questions);
        return ResponseEntity.ok(Map.of(
                "message", "Đã import thành công " + importedCount + " câu hỏi.",
                "importedCount", importedCount));
    }

    private AnalysisResult analyzeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, "Vui lòng chọn file đề thi.");
        }

        String text;
        try {
            text = extractText(file);
        } catch (ExamImportException e) {
            throw e;
        } catch (IllegalArgumentException e) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, "Không thể đọc file: " + e.getMessage());
        }

        if (text == null || text.trim().length() < 20) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, "File không có đủ nội dung để AI phân tích.");
        }
        if (text.length() > 120_000) {
            throw new ExamImportException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Tài liệu quá dài. Hãy chia nhỏ tài liệu thành các file ngắn hơn rồi import lần lượt.");
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

        int rejectedCount = (int) questions.stream().filter(question -> question == null).count();
        List<AIExamQuestionDTO> candidates = questions.stream()
                .filter(question -> question != null)
                .map(this::normalizeQuestion)
                .toList();
        if (candidates.isEmpty()) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, "AI không tạo được câu hỏi để xem trước.");
        }
        return new AnalysisResult(candidates, rejectedCount);
    }

    private AIExamQuestionDTO normalizeQuestion(AIExamQuestionDTO question) {
        if (question.getContent() == null) {
            question.setContent("");
        }
        if (question.getExplanation() == null) {
            question.setExplanation("");
        }
        List<AIExamOptionDTO> options = new ArrayList<>();
        if (question.getOptions() != null) {
            for (AIExamOptionDTO option : question.getOptions()) {
                if (option == null) {
                    AIExamOptionDTO emptyOption = new AIExamOptionDTO();
                    emptyOption.setContent("");
                    options.add(emptyOption);
                } else {
                    if (option.getContent() == null) {
                        option.setContent("");
                    }
                    options.add(option);
                }
            }
        }
        question.setOptions(options);
        return question;
    }

    private int saveQuestions(Exam exam, List<AIExamQuestionDTO> questions) {
        String validationError = validateQuestions(questions);
        if (validationError != null) {
            throw new ExamImportException(HttpStatus.BAD_REQUEST, validationError);
        }
        int order = examQuestionService.getQuestionsByExam(exam).size() + 1;
        for (AIExamQuestionDTO questionDto : questions) {
            ExamQuestion question = new ExamQuestion();
            question.setExam(exam);
            question.setContent(questionDto.getContent().trim());
            question.setExplanation(questionDto.getExplanation() == null ? "" : questionDto.getExplanation().trim());
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

    private String validateQuestions(List<AIExamQuestionDTO> questions) {
        if (questions == null || questions.isEmpty()) {
            return "Cần ít nhất một câu hỏi trước khi lưu đề.";
        }
        for (int questionIndex = 0; questionIndex < questions.size(); questionIndex++) {
            AIExamQuestionDTO question = questions.get(questionIndex);
            if (question == null || question.getContent() == null || question.getContent().isBlank()) {
                return "Câu " + (questionIndex + 1) + " chưa có nội dung.";
            }
            if (question.getOptions() == null) {
                return "Câu " + (questionIndex + 1) + " cần ít nhất hai đáp án.";
            }
            long validOptions = question.getOptions().stream()
                    .filter(option -> option != null && option.getContent() != null && !option.getContent().isBlank())
                    .count();
            long correctOptions = question.getOptions().stream()
                    .filter(option -> option != null && option.getContent() != null
                            && !option.getContent().isBlank() && option.isCorrect())
                    .count();
            if (validOptions < 2) {
                return "Câu " + (questionIndex + 1) + " cần ít nhất hai đáp án có nội dung.";
            }
            if (validOptions > 5) {
                return "Câu " + (questionIndex + 1) + " chỉ được có tối đa năm đáp án.";
            }
            if (correctOptions != 1) {
                return "Câu " + (questionIndex + 1) + " phải có chính xác một đáp án đúng.";
            }
        }
        return null;
    }

    private record AnalysisResult(List<AIExamQuestionDTO> questions, int rejectedCount) {
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
                String extractedText = new PDFTextStripper().getText(document);
                if (extractedText != null && extractedText.trim().length() >= 20) {
                    return extractedText;
                }
                return extractPdfWithOcr(document);
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

    private String extractPdfWithOcr(PDDocument document) throws IOException {
        if (document.getNumberOfPages() > 10) {
            throw new ExamImportException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "PDF scan vượt quá giới hạn OCR 10 trang. Hãy chia nhỏ file rồi import từng phần.");
        }
        if (tesseractCommand == null || tesseractCommand.isBlank()) {
            throw new ExamImportException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "PDF này cần OCR. Cài Tesseract và cấu hình TESSERACT_CMD.");
        }

        PDFRenderer renderer = new PDFRenderer(document);
        StringBuilder text = new StringBuilder();
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(60);
        for (int page = 0; page < document.getNumberOfPages(); page++) {
            Path imagePath = null;
            Path outputPath = null;
            Path errorPath = null;
            Process process = null;
            try {
                imagePath = Files.createTempFile("smartcard-ocr-", ".png");
                outputPath = Files.createTempFile("smartcard-ocr-", ".txt");
                errorPath = Files.createTempFile("smartcard-ocr-", ".log");
                BufferedImage image = renderer.renderImageWithDPI(page, 150, ImageType.RGB);
                if (!ImageIO.write(image, "png", imagePath.toFile())) {
                    throw new ExamImportException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể chuẩn bị trang PDF để OCR.");
                }

                process = new ProcessBuilder(
                        tesseractCommand,
                        imagePath.toAbsolutePath().toString(),
                        "stdout",
                        "-l",
                        ocrLanguage,
                        "--psm",
                        "6")
                        .redirectOutput(outputPath.toFile())
                        .redirectError(errorPath.toFile())
                        .start();
                long remainingNanos = deadline - System.nanoTime();
                if (remainingNanos <= 0 || !process.waitFor(remainingNanos, TimeUnit.NANOSECONDS)) {
                    process.destroyForcibly();
                    process.waitFor();
                    throw new ExamImportException(HttpStatus.GATEWAY_TIMEOUT, "OCR vượt quá giới hạn 60 giây.");
                }
                if (process.exitValue() != 0) {
                    throw new ExamImportException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "OCR không thành công. Kiểm tra Tesseract và gói ngôn ngữ đã cài.");
                }
                text.append(Files.readString(outputPath)).append('\n');
            } catch (IOException e) {
                throw new ExamImportException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Không chạy được Tesseract. Cài Tesseract hoặc cấu hình TESSERACT_CMD.");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ExamImportException(HttpStatus.GATEWAY_TIMEOUT, "OCR đã bị gián đoạn.");
            } finally {
                if (process != null && process.isAlive()) {
                    process.destroyForcibly();
                }
                if (imagePath != null) {
                    Files.deleteIfExists(imagePath);
                }
                if (outputPath != null) {
                    Files.deleteIfExists(outputPath);
                }
                if (errorPath != null) {
                    Files.deleteIfExists(errorPath);
                }
            }
        }
        return text.toString();
    }
}