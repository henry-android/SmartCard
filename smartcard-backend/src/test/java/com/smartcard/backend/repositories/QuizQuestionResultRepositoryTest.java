package com.smartcard.backend.repositories;

// import com.smartcard.backend.entity.QuizQuestion;
// import com.smartcard.backend.entity.QuizQuestionResult;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.*;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;
import static com.smartcard.backend.testsupport.DbReset.reset;
import org.springframework.transaction.annotation.Transactional;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class QuizQuestionResultRepositoryTest {

    @Autowired
    TestEntityManager tem;
    @Autowired
    QuizQuestionRepository quizQuestionRepository;
    @Autowired
    QuizQuestionResultRepository quizQuestionResultRepository;

    Integer quizQuestionId;

    @BeforeEach
    @Transactional
    void setUp() {
        reset(tem);
        // Seed 1 QuizQuestion
        com.smartcard.backend.entity.QuizQuestion qq = new com.smartcard.backend.entity.QuizQuestion();
        qq.setQuestionText("What is JVM?");
        qq.setCorrectAnswer("Java Virtual Machine");
        // Táº¡o flashcard giáº£ láº­p
        com.smartcard.backend.entity.Flashcard fc = new com.smartcard.backend.entity.Flashcard();
        fc.setTerm("JVM");
        fc.setDefinition("Java Virtual Machine");
        fc.setCreatedAt(new java.util.Date());
        tem.persist(fc);
        qq.setFlashcard(fc);
        tem.persist(qq);
        tem.flush();
        quizQuestionId = qq.getId();
        tem.clear();
    }

    private com.smartcard.backend.entity.QuizQuestionResult mkResult(
            com.smartcard.backend.entity.QuizQuestion qq, boolean correct, String userAnswer) {
        com.smartcard.backend.entity.QuizQuestionResult r = new com.smartcard.backend.entity.QuizQuestionResult();
        r.setQuizQuestion(qq);
        r.setIsCorrect(correct);
        r.setUserAnswer(userAnswer);
        return r;
    }

    @Test
    void save_and_findById_shouldWork() {
        var qq = quizQuestionRepository.findById(quizQuestionId).orElseThrow();
        var saved = quizQuestionResultRepository.save(mkResult(qq, true, "Java Virtual Machine"));
        assertThat(saved.getId()).isNotNull();
        var found = quizQuestionResultRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getIsCorrect()).isTrue();
        assertThat(found.get().getUserAnswer()).isEqualTo("Java Virtual Machine");
    }

    @Test
    void update_shouldPersistChanges() {
        var qq = quizQuestionRepository.findById(quizQuestionId).orElseThrow();
        var saved = quizQuestionResultRepository.save(mkResult(qq, false, "JVM"));
        saved.setIsCorrect(true);
        saved.setUserAnswer("Java Virtual Machine");
        quizQuestionResultRepository.saveAndFlush(saved);
        tem.clear();
        var reloaded = quizQuestionResultRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getIsCorrect()).isTrue();
        assertThat(reloaded.getUserAnswer()).isEqualTo("Java Virtual Machine");
    }

    @Test
    void findAll_shouldReturnSeeded() {
        var qq = quizQuestionRepository.findById(quizQuestionId).orElseThrow();
        quizQuestionResultRepository.save(mkResult(qq, true, "Java Virtual Machine"));
        quizQuestionResultRepository.save(mkResult(qq, false, "JVM"));
        var all = quizQuestionResultRepository.findAll();
        assertThat(all.size()).isGreaterThanOrEqualTo(2);
    }

    @Test
    void deleteById_shouldRemove() {
        var qq = quizQuestionRepository.findById(quizQuestionId).orElseThrow();
        var saved = quizQuestionResultRepository.save(mkResult(qq, true, "Java Virtual Machine"));
        Integer id = saved.getId();
        quizQuestionResultRepository.deleteById(id);
        assertThat(quizQuestionResultRepository.findById(id)).isEmpty();
    }

    @Test
    void findById_whenNotExists_shouldBeEmpty() {
        assertThat(quizQuestionResultRepository.findById(-1)).isEmpty();
    }
}
