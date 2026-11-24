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
        return examAttemptAnswerRepository.save(answer);
    }

    public List<ExamAttemptAnswer> getAnswersByAttempt(ExamAttempt attempt) {
        return examAttemptAnswerRepository.findByAttempt_Id(attempt.getId());
    }

    public void deleteAnswersByAttempt(ExamAttempt attempt) {
        examAttemptAnswerRepository.deleteByAttempt_Id(attempt.getId());
    }
}