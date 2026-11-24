package com.smartcard.backend.service.exam;

import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.repositories.exam.ExamOptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ExamOptionService {
    @Autowired
    private ExamOptionRepository examOptionRepository;

    public ExamOption addOption(ExamOption option) {
        return examOptionRepository.save(option);
    }

    public List<ExamOption> getOptionsByQuestion(ExamQuestion question) {
        return examOptionRepository.findByQuestion_Id(question.getId());
    }

    public Optional<ExamOption> getById(Long id) {
        return examOptionRepository.findById(id);
    }

    public void deleteOption(Long id) {
        examOptionRepository.deleteById(id);
    }
}