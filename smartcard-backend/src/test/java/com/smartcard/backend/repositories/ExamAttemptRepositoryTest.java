package com.smartcard.backend.repositories;

import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.repositories.exam.ExamAttemptRepository;
import com.smartcard.backend.repositories.exam.ExamRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ExamAttemptRepositoryTest {
    @Autowired
    private ExamAttemptRepository examAttemptRepository;
    @Autowired
    private ExamRepository examRepository;

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
