package com.smartcard.backend.repositories.exam;

import com.smartcard.backend.entity.exam.ExamOption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExamOptionRepository extends JpaRepository<ExamOption, Long> {
    void deleteByQuestion_Exam_Id(Long examId);
    List<ExamOption> findByQuestion_Id(Long questionId);
}