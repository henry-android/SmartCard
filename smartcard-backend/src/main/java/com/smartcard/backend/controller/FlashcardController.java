package com.smartcard.backend.controller;

import com.smartcard.backend.entity.Flashcard;
import com.smartcard.backend.service.FlashcardService;
import com.smartcard.backend.service.DeckService;
import com.smartcard.backend.entity.Deck;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/flashcards")
public class FlashcardController {
    @Autowired
    private FlashcardService flashcardService;

    @Autowired
    private DeckService deckService;

    @GetMapping
    public List<Flashcard> getAllFlashcards() {
        return flashcardService.getAllFlashcards();
    }

    @GetMapping("/{id}")
    public Optional<Flashcard> getFlashcardById(@PathVariable Integer id) {
        return flashcardService.getFlashcardById(id);
    }

    @GetMapping("/by-deck/{deckId}")
    public List<Flashcard> getFlashcardsByDeck(@PathVariable Integer deckId) {
        return flashcardService.getFlashcardsByDeckId(deckId);
    }

    @PostMapping
    public Flashcard createFlashcard(@RequestBody Flashcard flashcard,
            @RequestParam(required = false) Integer deckId) {
        if (deckId != null) {
            Deck deck = deckService.getDeckById(deckId).orElse(null);
            flashcard.setDeck(deck);
        }
        return flashcardService.saveFlashcard(flashcard);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Flashcard> updateFlashcard(@PathVariable Integer id, @RequestBody Flashcard updated) {
        return flashcardService.getFlashcardById(id)
                .map(existing -> {
                    existing.setTerm(updated.getTerm());
                    existing.setDefinition(updated.getDefinition());
                    return ResponseEntity.ok(flashcardService.saveFlashcard(existing));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public void deleteFlashcard(@PathVariable Integer id) {
        flashcardService.deleteFlashcard(id);
    }

    
} 