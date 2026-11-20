package com.smartcard.backend.repositories;

import java.util.Date;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.smartcard.backend.entity.Deck;
import com.smartcard.backend.entity.User;

public interface DeckRepository extends JpaRepository<Deck, Integer> {
    List<Deck> findByIsPublicTrue();

    Page<Deck> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);

    Page<Deck> findBySubjectIgnoreCase(String subject, Pageable pageable);

    Page<Deck> findByTitleContainingIgnoreCaseAndSubjectIgnoreCase(String keyword, String subject, Pageable pageable);

    List<Deck> findByUser(User user);

    List<Deck> findByUserNot(User user);

    List<Deck> findByUserAndCreatedAtBetween(User user, Date startDate, Date endDate);

    List<Deck> findAllByIsPublicTrue();

    List<Deck> findAllByIsPublicFalse();

    List<Deck> findAllBySubject(String subject);

    @org.springframework.data.jpa.repository.Query(value = "SELECT COUNT(*) FROM decks WHERE EXTRACT(MONTH FROM created_at) = :month AND EXTRACT(YEAR FROM created_at) = :year", nativeQuery = true)
    int countDecksByMonthAndYear(@org.springframework.data.repository.query.Param("month") int month,
            @org.springframework.data.repository.query.Param("year") int year);

}