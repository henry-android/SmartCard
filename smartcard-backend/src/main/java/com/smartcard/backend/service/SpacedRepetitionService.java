package com.smartcard.backend.service;

import com.smartcard.backend.entity.SpacedRepetition;
import com.smartcard.backend.repositories.SpacedRepetitionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class SpacedRepetitionService {
    @Autowired
    private SpacedRepetitionRepository spacedRepetitionRepository;

    public List<SpacedRepetition> getAllSpacedRepetitions() {
        return spacedRepetitionRepository.findAll();
    }

    public Optional<SpacedRepetition> getSpacedRepetitionById(Integer id) {
        return spacedRepetitionRepository.findById(id);
    }

    public SpacedRepetition saveSpacedRepetition(SpacedRepetition spacedRepetition) {
        return spacedRepetitionRepository.save(spacedRepetition);
    }

    public void deleteSpacedRepetition(Integer id) {
        spacedRepetitionRepository.deleteById(id);
    }
} 