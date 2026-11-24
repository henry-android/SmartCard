package com.smartcard.backend.service.exam;

import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.repositories.exam.ExamAttemptAnswerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExamAttemptAnswerService {
    @Autowired
    private ExamAttemptAnswerRepository examAttemptAnswerRepository;

    public ExamAttemptAnswer saveAnswer(ExamAttemptAnswer answer) {
        if (answer.getId() == null && answer.getAttempt() != null && answer.getQuestion() != null) {
            ExamAttemptAnswer existing = examAttemptAnswerRepository
                    .findByAttempt_IdAndQuestion_Id(
                            answer.getAttempt().getId(),
                            answer.getQuestion().getId())
                    .orElse(null);
            if (existing != null) {
                existing.setSelectedOption(answer.getSelectedOption());
                existing.setCorrect(answer.isCorrect());
                if (answer.getCorrectOption() != null) {
                    existing.setCorrectOption(answer.getCorrectOption());
                }
                answer = existing;
            }
        }
        return examAttemptAnswerRepository.save(answer);
    }

    public List<ExamAttemptAnswer> getAnswersByAttempt(ExamAttempt attempt) {
        return examAttemptAnswerRepository.findByAttempt_Id(attempt.getId());
    }
}