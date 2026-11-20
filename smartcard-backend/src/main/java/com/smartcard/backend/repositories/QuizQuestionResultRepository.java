package com.smartcard.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smartcard.backend.entity.QuizQuestion;
import com.smartcard.backend.entity.QuizQuestionResult;

public interface QuizQuestionResultRepository extends JpaRepository<QuizQuestionResult, Integer> {
    List<QuizQuestionResult> findByQuizQuestion(QuizQuestion quizQuestion);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(r) FROM QuizQuestionResult r WHERE r.quiz.user.id = :userId and r.isCorrect = true")
    int countFlashcardsLearnedByUserIdAndIsCorrect(
            @org.springframework.data.repository.query.Param("userId") Integer userId);

}
