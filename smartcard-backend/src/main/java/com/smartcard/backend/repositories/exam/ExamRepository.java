
package com.smartcard.backend.repositories.exam;

import com.smartcard.backend.entity.exam.Exam;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ExamRepository extends JpaRepository<Exam, Long> {
    Optional<Exam> findByCode(String code);
}