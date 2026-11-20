package com.smartcard.backend.repositories.exam;

import com.smartcard.backend.entity.exam.ExamOption;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExamOptionRepository extends JpaRepository<ExamOption, Long> {
}