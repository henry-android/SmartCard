package com.smartcard.backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.smartcard.backend.entity.QuizQuestion;
import com.smartcard.backend.entity.QuizQuestionResult;
import com.smartcard.backend.repositories.QuizQuestionResultRepository;

@Service
public class QuizQuestionResultService {

    @Autowired
    private QuizQuestionResultRepository quizQuestionResultRepository;

    public QuizQuestionResult saveResult(QuizQuestionResult result) {
        return quizQuestionResultRepository.save(result);
    }

    public List<QuizQuestionResult> getResultsByQuizQuestion(QuizQuestion quizQuestion) {
        return quizQuestionResultRepository.findByQuizQuestion(quizQuestion);
    }

    public Optional<QuizQuestionResult> getById(Integer id) {
        return quizQuestionResultRepository.findById(id);
    }

}
