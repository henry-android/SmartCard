package com.smartcard.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.smartcard.backend.entity.Flashcard;
import com.smartcard.backend.repositories.FlashcardRepository;

@Service
public class FlashcardService {
    @Autowired
    private FlashcardRepository flashcardRepository;

    public List<Flashcard> getAllFlashcards() {
        return flashcardRepository.findAll();
    }

    public Optional<Flashcard> getFlashcardById(Integer id) {
        return flashcardRepository.findById(id);
    }

    public List<Flashcard> getFlashcardsByDeckId(Integer deckId) {
        return flashcardRepository.findByDeckId(deckId);
    }

    public long getFlashcardCountByDeckId(Integer deckId) {
        return flashcardRepository.countByDeckId(deckId);
    }

    public Flashcard saveFlashcard(Flashcard flashcard) {
        return flashcardRepository.save(flashcard);
    }

    public void deleteFlashcard(Integer id) {
        flashcardRepository.deleteById(id);
    }

    public int countFlashcardsByMonthAndYear(int month, int year) {
        return flashcardRepository.countFlashcardsByMonthAndYear(month, year);
    }
}