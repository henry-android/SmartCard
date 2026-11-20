package com.smartcard.backend.repositories.exam;

import com.smartcard.backend.entity.exam.ExamQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ExamQuestionRepository extends JpaRepository<ExamQuestion, Long> {
    Optional<ExamQuestion> findByExamId(Long id);
}