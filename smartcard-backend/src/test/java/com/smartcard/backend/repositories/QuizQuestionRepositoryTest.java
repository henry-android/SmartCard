package com.smartcard.backend.repositories;

import com.smartcard.backend.entity.Deck;
import com.smartcard.backend.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)

class QuizQuestionRepositoryTest {

    @Autowired
    QuizQuestionRepository quizQuestionRepository;
    @Autowired
    DeckRepository deckRepository;
    @Autowired
    UserRepository userRepository;
    @Autowired
    TestEntityManager tem;

    Integer deckId;

    private void cleanup() {
        quizQuestionRepository.deleteAllInBatch();
        // xÃ³a flashcards thuá»™c deck trÆ°á»›c khi xÃ³a deck Ä‘á»ƒ trÃ¡nh FK
        // vÃ¬ khÃ´ng cÃ³ FlashcardRepository á»Ÿ Ä‘Ã¢y, dÃ¹ng native query qua
        // TestEntityManager
        var em = tem.getEntityManager();
        try {
            em.joinTransaction();
        } catch (Exception ignore) {
        }
        em.createNativeQuery("DELETE FROM flashcards").executeUpdate();
        deckRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
        em.flush();
    }

    @BeforeEach
    @Transactional
    void setUp() {
        cleanup();

        User u = new User();
        u.setUsername("tester");
        u.setEmail("tester@example.com");
        u.setPassword("pw");
        u.setCreatedAt(new Date());
        tem.persist(u);

        Deck d = new Deck();
        d.setTitle("Quiz Deck");
        d.setDescription("desc");
        d.setSubject("Java");
        d.setIsPublic(true);
        d.setCreatedAt(new Date());
        d.setUser(u);
        tem.persist(d);

        tem.flush();
        deckId = d.getId();
        tem.clear();
    }

    private com.smartcard.backend.entity.QuizQuestion mkQuizQuestion(Deck deck) {
        // Táº¡o Flashcard liÃªn káº¿t vá»›i Deck (báº¯t buá»™c vÃ¬ QuizQuestion.flashcard
        // nullable=false)
        com.smartcard.backend.entity.Flashcard fc = new com.smartcard.backend.entity.Flashcard();
        fc.setDeck(deck);
        fc.setTerm("JVM");
        fc.setDefinition("Java Virtual Machine");
        fc.setCreatedAt(new java.util.Date());
        tem.persist(fc);

        com.smartcard.backend.entity.QuizQuestion qq = new com.smartcard.backend.entity.QuizQuestion();
        qq.setFlashcard(fc);
        qq.setQuestionText("What is JVM?");
        qq.setCorrectAnswer("Java Virtual Machine");
        return qq;
    }

    @Test
    void save_and_findById_shouldWork() {
        var deck = deckRepository.findById(deckId).orElseThrow();
        var qq = mkQuizQuestion(deck);
        var saved = quizQuestionRepository.save(qq);
        assertThat(quizQuestionRepository.findById(saved.getId())).isPresent();
    }

    @Test
    void update_shouldPersistChanges() {
        var deck = deckRepository.findById(deckId).orElseThrow();
        var qq = quizQuestionRepository.save(mkQuizQuestion(deck));
        qq.setQuestionText("What is JDK?");
        quizQuestionRepository.saveAndFlush(qq);
        tem.clear();
        var reloaded = quizQuestionRepository.findById(qq.getId()).orElseThrow();
        assertThat(reloaded.getQuestionText()).isEqualTo("What is JDK?");
    }

    @Test
    void findAll_shouldReturn() {
        var deck = deckRepository.findById(deckId).orElseThrow();
        quizQuestionRepository.save(mkQuizQuestion(deck));
        quizQuestionRepository.save(mkQuizQuestion(deck));
        assertThat(quizQuestionRepository.findAll().size()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void deleteById_shouldRemove() {
        var deck = deckRepository.findById(deckId).orElseThrow();
        var qq = quizQuestionRepository.save(mkQuizQuestion(deck));
        quizQuestionRepository.deleteById(qq.getId());
        assertThat(quizQuestionRepository.findById(qq.getId())).isEmpty();
    }

    @Test
    void findById_whenNotExists_shouldBeEmpty() {
        assertThat(quizQuestionRepository.findById(-1)).isEmpty();
    }
}
