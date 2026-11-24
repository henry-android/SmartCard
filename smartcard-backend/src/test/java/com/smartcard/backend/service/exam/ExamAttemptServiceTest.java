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
import java.time.LocalDateTime;

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
        ExamQuestion addedLater = new ExamQuestion();
        addedLater.setId(11L);
        addedLater.setExam(exam);
        addedLater.setContent("Added after attempt started");
        ExamAttemptAnswer snapshotAnswer = new ExamAttemptAnswer();
        snapshotAnswer.setAttempt(attempt);
        snapshotAnswer.setQuestion(question);
        snapshotAnswer.setCorrectOption(correctOption);
        List<ExamAttemptAnswer> savedAnswers = new ArrayList<>(List.of(snapshotAnswer));
        attempt.setTotalQuestions(1);
        when(examOptionService.getById(correctOption.getId())).thenReturn(Optional.of(correctOption));
        when(examQuestionService.getQuestionsByExam(exam)).thenReturn(List.of(question, addedLater));
        when(examAttemptAnswerService.getAnswersByAttempt(attempt)).thenReturn(savedAnswers);
        when(examAttemptAnswerService.saveAnswer(any())).thenAnswer(invocation -> {
            ExamAttemptAnswer answer = invocation.getArgument(0);
            savedAnswers.removeIf(saved -> saved.getQuestion().getId().equals(answer.getQuestion().getId()));
            savedAnswers.add(answer);
            return answer;
        });
        when(examService.createExam(exam)).thenReturn(exam);
        when(examAttemptRepository.save(attempt)).thenReturn(attempt);

        Optional<ExamSubmissionResultDTO> result = examAttemptService.submitAttempt(
                attempt,
                Map.of(question.getId(), correctOption.getId()),
                900);

        assertTrue(result.isPresent());
        assertEquals(1, result.get().score());
        assertEquals(1, result.get().totalQuestions());
        assertEquals(100.0, result.get().percentage());
        assertEquals(1, result.get().questions().size());
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

    @Test
    void returnsCompletedAttemptsInNumberedOrderWithTimeSpent() {
        ExamAttempt firstAttempt = completedAttempt(
                31L,
                LocalDateTime.of(2026, 11, 24, 10, 0),
                LocalDateTime.of(2026, 11, 24, 10, 5),
                1,
                2);
        ExamAttempt secondAttempt = completedAttempt(
                32L,
                LocalDateTime.of(2026, 11, 24, 11, 0),
                LocalDateTime.of(2026, 11, 24, 11, 3),
                2,
                2);
        when(examAttemptRepository.findByUserIdAndExam_IdAndSubmittedAtIsNotNullOrderByStartedAtAscIdAsc(
                "student", 5L)).thenReturn(List.of(firstAttempt, secondAttempt));

        var history = examAttemptService.getHistoryForUserAndExam("student", 5L);

        assertEquals(2, history.size());
        assertEquals(1, history.get(0).attemptNumber());
        assertEquals(300, history.get(0).timeSpentSeconds());
        assertEquals(2, history.get(1).attemptNumber());
        assertEquals(180, history.get(1).timeSpentSeconds());
        assertEquals(100.0, history.get(1).percentage());
    }

    @Test
    void snapshotsQuestionCountAndCorrectOptionsWhenAttemptStarts() {
        when(examQuestionService.getQuestionsByExam(exam)).thenReturn(List.of(question));
        when(examOptionService.getOptionsByQuestion(question)).thenReturn(List.of(correctOption, incorrectOption));
        when(examAttemptRepository.save(any(ExamAttempt.class))).thenAnswer(invocation -> {
            ExamAttempt saved = invocation.getArgument(0);
            saved.setId(31L);
            return saved;
        });
        when(examAttemptAnswerService.saveAnswer(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Optional<ExamAttempt> created = examAttemptService.createAttempt(exam, "student");

        assertTrue(created.isPresent());
        assertEquals(1, created.get().getTotalQuestions());
        org.mockito.ArgumentCaptor<ExamAttemptAnswer> answerCaptor =
                org.mockito.ArgumentCaptor.forClass(ExamAttemptAnswer.class);
        verify(examAttemptAnswerService).saveAnswer(answerCaptor.capture());
        assertEquals(correctOption, answerCaptor.getValue().getCorrectOption());
    }

    private ExamAttempt completedAttempt(
            Long id,
            LocalDateTime startedAt,
            LocalDateTime submittedAt,
            int score,
            int totalQuestions) {
        ExamAttempt completed = new ExamAttempt();
        completed.setId(id);
        completed.setExam(exam);
        completed.setUserId("student");
        completed.setStartedAt(startedAt);
        completed.setSubmittedAt(submittedAt);
        completed.setCorrectCount(score);
        completed.setTotalQuestions(totalQuestions);
        return completed;
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
