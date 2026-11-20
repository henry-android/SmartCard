package com.smartcard.backend.controller;

import com.smartcard.backend.entity.Deck;
import com.smartcard.backend.service.DeckService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/decks")
public class DeckController {
    @Autowired
    private DeckService deckService;

    @GetMapping
    public List<Deck> getAllDecks() {
        return deckService.getAllDecks();
    }

    @GetMapping("/{id}")
    public Optional<Deck> getDeckById(@PathVariable Integer id) {
        return deckService.getDeckById(id);
    }

    @PostMapping
    public Deck createDeck(@RequestBody Deck deck) {
        return deckService.saveDeck(deck);
    }

    @PutMapping("/{id}")
    public Deck updateDeck(@PathVariable Integer id, @RequestBody Deck deck) {
        deck.setId(id);
        return deckService.saveDeck(deck);
    }

    @DeleteMapping("/{id}")
    public void deleteDeck(@PathVariable Integer id) {
        deckService.deleteDeck(id);
    }
} 