package com.smartcard.backend.repositories;

import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.repositories.exam.ExamAttemptRepository;
import com.smartcard.backend.repositories.exam.ExamAttemptAnswerRepository;
import com.smartcard.backend.repositories.exam.ExamOptionRepository;
import com.smartcard.backend.repositories.exam.ExamQuestionRepository;
import com.smartcard.backend.repositories.exam.ExamRepository;
import com.smartcard.backend.service.exam.ExamService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@DataJpaTest
@Import(ExamService.class)
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ExamAttemptRepositoryTest {
    @Autowired
    private ExamAttemptRepository examAttemptRepository;
    @Autowired
    private ExamRepository examRepository;
    @Autowired
    private ExamQuestionRepository examQuestionRepository;
    @Autowired
    private ExamOptionRepository examOptionRepository;
    @Autowired
    private ExamAttemptAnswerRepository examAttemptAnswerRepository;
    @Autowired
    private ExamService examService;

    @Test
    void findsOnlySubmittedAttemptsForUserOrderedByStartTime() {
        Exam exam = new Exam();
        exam.setTitle("History exam");
        exam = examRepository.saveAndFlush(exam);

        ExamAttempt later = attempt(exam, "student", LocalDateTime.of(2026, 11, 24, 11, 0), true);
        ExamAttempt earlier = attempt(exam, "student", LocalDateTime.of(2026, 11, 24, 10, 0), true);
        ExamAttempt inProgress = attempt(exam, "student", LocalDateTime.of(2026, 11, 24, 9, 0), false);
        examAttemptRepository.saveAllAndFlush(List.of(later, earlier, inProgress));

        List<ExamAttempt> history = examAttemptRepository
                .findByUserIdAndExam_IdAndSubmittedAtIsNotNullOrderByStartedAtAscIdAsc("student", exam.getId());

        assertEquals(2, history.size());
        assertEquals(earlier.getId(), history.get(0).getId());
        assertEquals(later.getId(), history.get(1).getId());
    }

    @Test
    void deletingExamAlsoDeletesQuestionsOptionsAttemptsAndAnswers() {
        Exam exam = new Exam();
        exam.setTitle("Exam to delete");
        exam = examRepository.saveAndFlush(exam);

        ExamQuestion question = new ExamQuestion();
        question.setExam(exam);
        question.setContent("Question");
        question.setQuestionOrder(1);
        question = examQuestionRepository.saveAndFlush(question);

        ExamOption option = new ExamOption();
        option.setQuestion(question);
        option.setContent("Answer");
        option.setCorrect(true);
        option = examOptionRepository.saveAndFlush(option);

        ExamAttempt attempt = attempt(exam, "student", LocalDateTime.now(), true);
        attempt = examAttemptRepository.saveAndFlush(attempt);

        ExamAttemptAnswer answer = new ExamAttemptAnswer();
        answer.setAttempt(attempt);
        answer.setQuestion(question);
        answer.setSelectedOption(option);
        answer.setCorrectOption(option);
        answer.setCorrect(true);
        examAttemptAnswerRepository.saveAndFlush(answer);

        examService.deleteExam(exam.getId());

        assertFalse(examRepository.existsById(exam.getId()));
        assertFalse(examQuestionRepository.existsById(question.getId()));
        assertFalse(examOptionRepository.existsById(option.getId()));
        assertFalse(examAttemptRepository.existsById(attempt.getId()));
        assertFalse(examAttemptAnswerRepository.existsById(answer.getId()));
    }

    private ExamAttempt attempt(Exam exam, String user, LocalDateTime startedAt, boolean submitted) {
        ExamAttempt attempt = new ExamAttempt();
        attempt.setExam(exam);
        attempt.setUserId(user);
        attempt.setStartedAt(startedAt);
        if (submitted) {
            attempt.setSubmittedAt(startedAt.plusMinutes(5));
            attempt.setTotalQuestions(4);
        }
        return attempt;
    }
}
