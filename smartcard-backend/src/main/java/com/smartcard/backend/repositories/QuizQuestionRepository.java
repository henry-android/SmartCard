package com.smartcard.backend.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smartcard.backend.entity.QuizQuestion;

public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Integer> {
    List<QuizQuestion> findByFlashcard_Deck_Id(Integer deckId);

    int countByFlashcard_Deck_Id(Integer deckId);

    List<QuizQuestion> findByFlashcard_Id(Integer flashcardId);
}