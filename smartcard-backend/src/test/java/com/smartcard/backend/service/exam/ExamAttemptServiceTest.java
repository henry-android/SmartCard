package com.smartcard.backend.service.exam;

import com.smartcard.backend.dto.ExamSubmissionResultDTO;
import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.repositories.exam.ExamAttemptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExamAttemptServiceTest {
    @Mock
    private ExamAttemptRepository examAttemptRepository;
    @Mock
    private ExamQuestionService examQuestionService;
    @Mock
    private ExamOptionService examOptionService;
    @Mock
    private ExamAttemptAnswerService examAttemptAnswerService;
    @Mock
    private ExamService examService;
    @InjectMocks
    private ExamAttemptService examAttemptService;

    private Exam exam;
    private ExamQuestion question;
    private ExamOption correctOption;
    private ExamOption incorrectOption;
    private ExamAttempt attempt;

    @BeforeEach
    void setUp() {
        exam = new Exam();
        exam.setId(5L);
        exam.setTitle("Public exam");
        exam.setDuration(30);
        exam.setTotalAttempts(0);

        question = new ExamQuestion();
        question.setId(10L);
        question.setExam(exam);
        question.setContent("Question");

        correctOption = option(20L, true);
        incorrectOption = option(21L, false);

        attempt = new ExamAttempt();
        attempt.setId(30L);
        attempt.setExam(exam);
        attempt.setUserId("student");

    }

    @Test
    void calculatesScoreAndRevealsCorrectAnswerOnlyInSubmissionResult() {
        List<ExamAttemptAnswer> savedAnswers = new ArrayList<>();
        when(examOptionService.getById(correctOption.getId())).thenReturn(Optional.of(correctOption));
        when(examQuestionService.getQuestionsByExam(exam)).thenReturn(List.of(question));
        when(examAttemptAnswerService.getAnswersByAttempt(attempt)).thenReturn(savedAnswers);
        when(examAttemptAnswerService.saveAnswer(any())).thenAnswer(invocation -> {
            ExamAttemptAnswer answer = invocation.getArgument(0);
            savedAnswers.add(answer);
            return answer;
        });
        when(examService.createExam(exam)).thenReturn(exam);
        when(examAttemptRepository.save(attempt)).thenReturn(attempt);
        when(examOptionService.getOptionsByQuestion(question)).thenReturn(List.of(correctOption, incorrectOption));

        Optional<ExamSubmissionResultDTO> result = examAttemptService.submitAttempt(
                attempt,
                Map.of(question.getId(), correctOption.getId()),
                900);

        assertTrue(result.isPresent());
        assertEquals(1, result.get().score());
        assertEquals(1, result.get().totalQuestions());
        assertEquals(100.0, result.get().percentage());
        assertTrue(result.get().questions().get(0).correct());
        assertEquals("Correct", result.get().questions().get(0).correctOptionContent());
        verify(examAttemptAnswerService).saveAnswer(any());
    }

    @Test
    void rejectsAnswerOptionThatBelongsToAnotherQuestion() {
        ExamQuestion anotherQuestion = new ExamQuestion();
        anotherQuestion.setId(11L);
        ExamOption foreignOption = option(22L, true);
        foreignOption.setQuestion(anotherQuestion);
        when(examQuestionService.getQuestionsByExam(exam)).thenReturn(List.of(question));
        when(examOptionService.getById(foreignOption.getId())).thenReturn(Optional.of(foreignOption));

        Optional<ExamSubmissionResultDTO> result = examAttemptService.submitAttempt(
                attempt,
                Map.of(question.getId(), foreignOption.getId()),
                900);

        assertFalse(result.isPresent());
    }

    @Test
    void rejectsSubmittingAttemptMoreThanOnce() {
        attempt.setSubmittedAt(java.time.LocalDateTime.now());

        Optional<ExamSubmissionResultDTO> result = examAttemptService.submitAttempt(
                attempt,
                Map.of(),
                900);

        assertFalse(result.isPresent());
    }

    private ExamOption option(Long id, boolean correct) {
        ExamOption option = new ExamOption();
        option.setId(id);
        option.setQuestion(question);
        option.setContent(correct ? "Correct" : "Incorrect");
        option.setCorrect(correct);
        return option;
    }
}
