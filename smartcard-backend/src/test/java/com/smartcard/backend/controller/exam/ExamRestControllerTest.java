package com.smartcard.backend.controller.exam;

import com.smartcard.backend.dto.AIExamOptionDTO;
import com.smartcard.backend.dto.AIExamQuestionDTO;
import com.smartcard.backend.dto.ExamQuestionDetailsDTO;
import com.smartcard.backend.entity.User;
import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.service.AIService;
import com.smartcard.backend.service.exam.ExamOptionService;
import com.smartcard.backend.service.exam.ExamQuestionService;
import com.smartcard.backend.service.exam.ExamService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.http.ResponseEntity;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Map;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExamRestControllerTest {
    @Mock
    private ExamService examService;
    @Mock
    private ExamQuestionService examQuestionService;
    @Mock
    private ExamOptionService examOptionService;
    @Mock
    private AIService aiService;
    @InjectMocks
    private ExamRestController controller;

    @Test
    void ownerCanViewQuestionsAndCorrectOptions() {
        User user = new User();
        user.setUsername("owner");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loggedInUser", user);

        Exam exam = new Exam();
        exam.setId(7L);
        exam.setCreatedBy("owner");
        ExamQuestion question = new ExamQuestion();
        question.setId(11L);
        question.setExam(exam);
        question.setContent("Question");
        question.setQuestionOrder(1);
        ExamOption option = new ExamOption();
        option.setId(13L);
        option.setQuestion(question);
        option.setContent("Correct answer");
        option.setCorrect(true);

        when(examService.getExamById(7L)).thenReturn(Optional.of(exam));
        when(examQuestionService.getQuestionsByExam(exam)).thenReturn(List.of(question));
        when(examOptionService.getOptionsByQuestion(question)).thenReturn(List.of(option));

        ResponseEntity<?> response = controller.getExamQuestions(7L, session);

        assertEquals(200, response.getStatusCode().value());
        List<?> questions = assertInstanceOf(List.class, response.getBody());
        ExamQuestionDetailsDTO result = assertInstanceOf(ExamQuestionDetailsDTO.class, questions.get(0));
        assertEquals("Question", result.content());
        assertEquals("Correct answer", result.options().get(0).content());
        assertEquals(true, result.options().get(0).correct());
        verify(examOptionService).getOptionsByQuestion(question);
    }

    @Test
    void nonOwnerCannotViewQuestionsOrAnswers() {
        User user = new User();
        user.setUsername("another-user");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loggedInUser", user);

        Exam exam = new Exam();
        exam.setId(7L);
        exam.setCreatedBy("owner");
        when(examService.getExamById(7L)).thenReturn(Optional.of(exam));

        ResponseEntity<?> response = controller.getExamQuestions(7L, session);

        assertEquals(403, response.getStatusCode().value());
        verifyNoInteractions(examQuestionService, examOptionService);
    }

    @Test
    void createsExamAndQuestionsFromUploadedPdf() throws IOException {
        User user = new User();
        user.setUsername("owner");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loggedInUser", user);

        AIExamOptionDTO correctOption = new AIExamOptionDTO();
        correctOption.setContent("Option A");
        correctOption.setCorrect(true);
        AIExamOptionDTO incorrectOption = new AIExamOptionDTO();
        incorrectOption.setContent("Option B");
        incorrectOption.setCorrect(false);
        AIExamQuestionDTO generatedQuestion = new AIExamQuestionDTO();
        generatedQuestion.setContent("Generated question");
        generatedQuestion.setOptions(List.of(correctOption, incorrectOption));

        List<ExamQuestion> savedQuestions = new ArrayList<>();
        when(aiService.isConfigured()).thenReturn(true);
        when(aiService.analyzeExamQuestions(anyString())).thenReturn(List.of(generatedQuestion));
        when(examService.createExam(any(Exam.class))).thenAnswer(invocation -> {
            Exam exam = invocation.getArgument(0);
            exam.setId(7L);
            return exam;
        });
        when(examQuestionService.getQuestionsByExam(any(Exam.class))).thenAnswer(invocation -> savedQuestions);
        when(examQuestionService.addQuestion(any(ExamQuestion.class))).thenAnswer(invocation -> {
            ExamQuestion question = invocation.getArgument(0);
            question.setId(11L);
            savedQuestions.add(question);
            return question;
        });
        when(examOptionService.addOption(any(ExamOption.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "source.pdf",
                "application/pdf",
                createPdf("This source document contains enough text for AI exam question generation."));

        ResponseEntity<?> response = controller.createExamFromFile(
                "Generated exam",
                "Imported from PDF",
                30,
                true,
                file,
                session);

        assertEquals(201, response.getStatusCode().value());
        Map<?, ?> body = assertInstanceOf(Map.class, response.getBody());
        assertEquals(1, body.get("importedCount"));
        Exam exam = assertInstanceOf(Exam.class, body.get("exam"));
        assertEquals("Generated exam", exam.getTitle());
        assertEquals(1, exam.getTotalQuestions());
        assertEquals(1, savedQuestions.size());
        verify(examOptionService, times(2)).addOption(any(ExamOption.class));
    }

    private byte[] createPdf(String content) throws IOException {
        try (PDDocument document = new PDDocument();
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(PDType1Font.HELVETICA, 12);
                stream.newLineAtOffset(25, 700);
                stream.showText(content);
                stream.endText();
            }
            document.save(output);
            return output.toByteArray();
        }
    }
}
