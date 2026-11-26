package com.smartcard.backend.repositories.exam;

import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ExamAttemptAnswerRepository extends JpaRepository<ExamAttemptAnswer, Long> {
    void deleteByAttempt_Exam_Id(Long examId);
    List<ExamAttemptAnswer> findByAttempt_Id(Long attemptId);
    Optional<ExamAttemptAnswer> findByAttempt_IdAndQuestion_Id(Long attemptId, Long questionId);
}