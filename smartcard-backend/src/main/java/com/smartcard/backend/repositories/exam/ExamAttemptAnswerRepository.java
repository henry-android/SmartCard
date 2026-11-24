package com.smartcard.backend.repositories.exam;

import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExamAttemptAnswerRepository extends JpaRepository<ExamAttemptAnswer, Long> {
    List<ExamAttemptAnswer> findByAttempt_Id(Long attemptId);
    void deleteByAttempt_Id(Long attemptId);
}