package com.smartcard.backend.repositories;

import com.smartcard.backend.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Autowired
    UserRepository userRepository;
    @Autowired
    RoleRepository roleRepository;
    @Autowired
    TestEntityManager tem;
    @Autowired
    EntityManager em;

    // Dá»n DB theo thá»© tá»± phá»¥ thuá»™c Ä‘á»ƒ trÃ¡nh FK (khÃ´ng sá»­a model)
    private void cleanup() {
        tem.flush();
        em.createNativeQuery("DELETE FROM quizzes").executeUpdate();
        em.createNativeQuery("DELETE FROM flashcards").executeUpdate();
        em.createNativeQuery("DELETE FROM decks").executeUpdate();
        em.createNativeQuery("DELETE FROM users").executeUpdate();
        em.createNativeQuery("DELETE FROM roles").executeUpdate();
        tem.clear();
    }

    @BeforeEach
    void setUp() {
        cleanup();
    }

    private User mkUser(String username, String email) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPassword("pw");
        u.setCreatedAt(new Date());
        u.setEnabled(true);
        return u;
    }

    // ======= 3 TEST PASS =======

    @Test
    void save_and_findById_shouldWork_PASS() {
        User saved = userRepository.save(mkUser("alice", "alice@example.com"));
        assertThat(userRepository.findById(saved.getId())).isPresent();
    }

    @Test
    void update_shouldPersistChanges_PASS() {
        User saved = userRepository.save(mkUser("bob", "bob@example.com"));
        saved.setEnabled(false);
        userRepository.saveAndFlush(saved);
        tem.clear();
        var reloaded = userRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getEnabled()).isFalse();
    }

    @Test
    void findById_whenNotExists_shouldBeEmpty_PASS() {
        assertThat(userRepository.findById(-1)).isEmpty(); // id lÃ  Integer
    }

    // ======= 3 TEST FAIL (Cá» Ã) =======

    @Test
    void wrongEmailExpectation_FAIL() {
        User saved = userRepository.save(mkUser("wrong", "wrong@example.com"));
        // Cá»‘ tÃ¬nh sai: mong Ä‘á»£i email khÃ¡c
        assertThat(saved.getEmail()).isEqualTo("not_the_same@example.com");
    }

    @Test
    void findAll_countTooHighExpectation_FAIL() {
        userRepository.save(mkUser("c1", "c1@example.com"));
        userRepository.save(mkUser("c2", "c2@example.com"));
        // Cá»‘ tÃ¬nh sai: Ä‘Ã²i >= 3 trong khi chá»‰ cÃ³ 2
        assertThat(userRepository.findAll().size()).isGreaterThanOrEqualTo(3);
    }

    @Test
    void delete_then_expectStillPresent_FAIL() {
        User saved = userRepository.save(mkUser("toDel", "toDel@example.com"));
        userRepository.deleteById(saved.getId());
        // Cá»‘ tÃ¬nh sai: mong Ä‘á»£i váº«n cÃ²n
        assertThat(userRepository.findById(saved.getId())).isPresent();
    }
}
