package com.smartcard.backend.repositories.exam;

import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExamAttemptAnswerRepository extends JpaRepository<ExamAttemptAnswer, Long> {
}