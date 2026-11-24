package com.smartcard.backend.repositories.exam;

import com.smartcard.backend.entity.exam.ExamAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExamAttemptRepository extends JpaRepository<ExamAttempt, Long> {
    void deleteByExam_Id(Long examId);
    List<ExamAttempt> findByExam_IdOrderBySubmittedAtDesc(Long examId);
    List<ExamAttempt> findByUserIdAndExam_Id(String userId, Long examId);
    List<ExamAttempt> findByUserIdAndExam_IdAndSubmittedAtIsNotNullOrderByStartedAtAscIdAsc(
            String userId,
            Long examId);
}