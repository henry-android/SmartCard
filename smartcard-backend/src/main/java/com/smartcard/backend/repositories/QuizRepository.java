package com.smartcard.backend.repositories;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.smartcard.backend.entity.Quiz;
import com.smartcard.backend.entity.User;

public interface QuizRepository extends JpaRepository<Quiz, Integer> {
    Optional<Quiz> findTopByUserIdAndDeckIdOrderByCreatedAtDesc(Integer userId, Integer deckId);

    @Query("SELECT COUNT(qr) FROM QuizQuestion qr WHERE qr.flashcard.deck.id = :deckId")
    int countQuestionsByDeckId(@Param("deckId") Integer deckId);

    List<Quiz> findByUserId(Integer userId);

    List<Quiz> findByUserAndCreatedAtBetween(User user, Date startDate, Date endDate);
}