package com.smartcard.backend.service.exam;

import com.smartcard.backend.dto.ExamAttemptHistoryDTO;
import com.smartcard.backend.dto.ExamSubmissionResultDTO;
import com.smartcard.backend.dto.ExamTakeDTO;
import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.entity.exam.ExamOption;
import com.smartcard.backend.entity.exam.ExamAttemptAnswer;
import com.smartcard.backend.repositories.exam.ExamAttemptRepository;
import com.smartcard.backend.service.exam.ExamQuestionService;
import com.smartcard.backend.service.exam.ExamOptionService;
import com.smartcard.backend.service.exam.ExamAttemptAnswerService;
import com.smartcard.backend.service.exam.ExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Optional;

@Service
public class ExamAttemptService {
    @Autowired
    private ExamAttemptRepository examAttemptRepository;
    @Autowired
    private ExamQuestionService examQuestionService;
    @Autowired
    private ExamOptionService examOptionService;
    @Autowired
    private ExamAttemptAnswerService examAttemptAnswerService;
    @Autowired
    private ExamService examService;

    public Optional<ExamAttempt> getById(Long id) {
        return examAttemptRepository.findById(id);
    }

    public Optional<ExamAttempt> getByIdForUserAndExam(String userId, Long examId) {
        return examAttemptRepository.findByUserIdAndExam_Id(userId, examId).stream().findFirst();
    }

    @Transactional
    public Optional<ExamAttempt> createAttempt(Exam exam, String userId) {
        if (exam == null || userId == null) {
            return Optional.empty();
        }

        ExamAttempt attempt = new ExamAttempt();
        attempt.setExam(exam);
        attempt.setUserId(userId);
        java.util.List<ExamQuestion> questions = examQuestionService.getQuestionsByExam(exam);
        attempt.setTotalQuestions(questions.size());

        // Đảm bảo thời gian bắt đầu được lưu chính xác với múi giờ Việt Nam
        ZoneId vietnamZone = ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime vietnamTime = ZonedDateTime.now(vietnamZone);
        LocalDateTime startTime = vietnamTime.toLocalDateTime();
        attempt.setStartedAt(startTime);

        // Debug: In ra thời gian bắt đầu
        System.out.println("=== DEBUG: Tạo attempt mới ===");
        System.out.println("User: " + userId);
        System.out.println("Exam: " + exam.getTitle());
        System.out.println("StartedAt: " + startTime);
        System.out.println("=== END DEBUG ===");

        ExamAttempt savedAttempt = examAttemptRepository.save(attempt);
        for (ExamQuestion question : questions) {
            ExamAttemptAnswer answer = new ExamAttemptAnswer();
            answer.setAttempt(savedAttempt);
            answer.setQuestion(question);
            answer.setCorrectOption(examOptionService.getOptionsByQuestion(question).stream()
                    .filter(ExamOption::isCorrect)
                    .findFirst()
                    .orElse(null));
            answer.setCorrect(false);
            examAttemptAnswerService.saveAnswer(answer);
        }
        return Optional.of(savedAttempt);
    }

    @Transactional
    public Optional<ExamSubmissionResultDTO> submitAttempt(
            ExamAttempt attempt,
            Map<Long, Long> answers,
            Integer remainingTime) {
        if (attempt == null || answers == null) {
            return Optional.empty();
        }
        if (attempt.getSubmittedAt() != null) {
            return Optional.empty();
        }

        java.util.Map<Long, ExamAttemptAnswer> savedAnswers = examAttemptAnswerService
                .getAnswersByAttempt(attempt).stream()
                .collect(java.util.stream.Collectors.toMap(
                        answer -> answer.getQuestion().getId(),
                        answer -> answer,
                        (first, ignored) -> first));
        java.util.List<ExamQuestion> questions = examQuestionService.getQuestionsByExam(attempt.getExam());
        if (attempt.getTotalQuestions() != null && !savedAnswers.isEmpty()) {
            questions = questions.stream()
                    .filter(question -> savedAnswers.containsKey(question.getId()))
                    .limit(attempt.getTotalQuestions())
                    .toList();
        }
        java.util.Map<Long, ExamQuestion> questionsById = questions.stream()
                .collect(java.util.stream.Collectors.toMap(ExamQuestion::getId, question -> question));
        java.util.Map<Long, ExamOption> selectedOptions = new java.util.HashMap<>();
        for (Map.Entry<Long, Long> answer : answers.entrySet()) {
            ExamQuestion question = questionsById.get(answer.getKey());
            if (question == null || answer.getValue() == null) {
                return Optional.empty();
            }
            ExamOption option = examOptionService.getById(answer.getValue()).orElse(null);
            if (option == null || option.getQuestion() == null
                    || !question.getId().equals(option.getQuestion().getId())) {
                return Optional.empty();
            }
            selectedOptions.put(question.getId(), option);
        }

        int correctCount = 0;
        for (ExamQuestion question : questions) {
            ExamOption selectedOption = selectedOptions.get(question.getId());
            ExamAttemptAnswer attemptAnswer = savedAnswers.getOrDefault(
                    question.getId(),
                    new ExamAttemptAnswer());
            ExamOption correctOption = attemptAnswer.getCorrectOption();
            if (correctOption == null) {
                correctOption = examOptionService.getOptionsByQuestion(question).stream()
                        .filter(ExamOption::isCorrect)
                        .findFirst()
                        .orElse(null);
            }
            boolean correct = selectedOption != null && correctOption != null
                    && selectedOption.getId().equals(correctOption.getId());
            if (correct) {
                correctCount++;
            }

            attemptAnswer.setAttempt(attempt);
            attemptAnswer.setQuestion(question);
            attemptAnswer.setSelectedOption(selectedOption);
            attemptAnswer.setCorrectOption(correctOption);
            attemptAnswer.setCorrect(correct);
            examAttemptAnswerService.saveAnswer(attemptAnswer);
        }
        // Đảm bảo thời gian nộp bài được lưu chính xác với múi giờ Việt Nam
        ZoneId vietnamZone = ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime vietnamTime = ZonedDateTime.now(vietnamZone);
        LocalDateTime submitTime = vietnamTime.toLocalDateTime();
        attempt.setSubmittedAt(submitTime);
        attempt.setScore(correctCount);
        attempt.setCorrectCount(correctCount);
        // Sửa logic lưu remainingTime: nếu lớn hơn 60 thì chia cho 60 (giây -> phút)
        if (remainingTime != null) {
            int remainingSeconds = Math.max(0, Math.min(remainingTime, attempt.getExam().getDuration() * 60));
            attempt.setRemainingTime((int) Math.ceil(remainingSeconds / 60.0));
        } else {
            attempt.setRemainingTime(null);
        }

        // Debug: In ra thông tin submit
        System.out.println("=== DEBUG: Submit attempt ===");
        System.out.println("Attempt ID: " + attempt.getId());
        System.out.println("User: " + attempt.getUserId());
        System.out.println("StartedAt: " + attempt.getStartedAt());
        System.out.println("SubmittedAt: " + submitTime);
        System.out.println("Score: " + correctCount);
        System.out.println("=== END DEBUG ===");

        // Tăng số lượt làm bài
        Exam exam = attempt.getExam();
        Integer attempts = exam.getTotalAttempts();
        exam.setTotalAttempts(attempts == null ? 1 : attempts + 1);
        examService.createExam(exam);
        ExamAttempt submittedAttempt = examAttemptRepository.save(attempt);
        return Optional.of(buildResult(submittedAttempt));
    }

    @Transactional(readOnly = true)
    public Optional<ExamTakeDTO> getExamForAttempt(Exam exam, ExamAttempt attempt) {
        if (exam == null || attempt == null || !exam.getId().equals(attempt.getExam().getId())) {
            return Optional.empty();
        }
        java.util.Set<Long> questionIds = examAttemptAnswerService.getAnswersByAttempt(attempt).stream()
                .map(answer -> answer.getQuestion().getId())
                .collect(java.util.stream.Collectors.toSet());
        java.util.List<ExamQuestion> attemptQuestions = examQuestionService.getQuestionsByExam(exam);
        if (attempt.getTotalQuestions() != null && !questionIds.isEmpty()) {
            attemptQuestions = attemptQuestions.stream()
                    .filter(question -> questionIds.contains(question.getId()))
                    .limit(attempt.getTotalQuestions())
                    .toList();
        }
        java.util.List<ExamTakeDTO.Question> questions = attemptQuestions.stream()
                .map(question -> new ExamTakeDTO.Question(
                        question.getId(),
                        question.getContent(),
                        question.getQuestionOrder(),
                        examOptionService.getOptionsByQuestion(question).stream()
                                .map(option -> new ExamTakeDTO.Option(option.getId(), option.getContent()))
                                .toList()))
                .toList();
        return Optional.of(new ExamTakeDTO(
                attempt.getId(),
                exam.getId(),
                exam.getTitle(),
                exam.getDuration(),
                questions.size(),
                questions));
    }

    @Transactional(readOnly = true)
    public Optional<ExamSubmissionResultDTO> getResult(ExamAttempt attempt) {
        if (attempt == null || attempt.getSubmittedAt() == null) {
            return Optional.empty();
        }
        return Optional.of(buildResult(attempt));
    }

    @Transactional(readOnly = true)
    public java.util.List<ExamAttemptHistoryDTO> getHistoryForUserAndExam(String userId, Long examId) {
        java.util.List<ExamAttempt> attempts = examAttemptRepository
                .findByUserIdAndExam_IdAndSubmittedAtIsNotNullOrderByStartedAtAscIdAsc(userId, examId);
        return java.util.stream.IntStream.range(0, attempts.size())
                .mapToObj(index -> {
                    ExamAttempt attempt = attempts.get(index);
                    int totalQuestions = attempt.getTotalQuestions() == null
                            ? attempt.getExam().getTotalQuestions()
                            : attempt.getTotalQuestions();
                    double percentage = totalQuestions == 0 ? 0
                            : Math.round(attempt.getCorrectCount() * 10000.0 / totalQuestions) / 100.0;
                    return new ExamAttemptHistoryDTO(
                            attempt.getId(),
                            index + 1,
                            attempt.getStartedAt(),
                            attempt.getSubmittedAt(),
                            getTimeSpentSeconds(attempt),
                            attempt.getCorrectCount(),
                            totalQuestions,
                            percentage);
                })
                .toList();
    }

    private ExamSubmissionResultDTO buildResult(ExamAttempt attempt) {
        java.util.Map<Long, ExamAttemptAnswer> answersByQuestion = examAttemptAnswerService
                .getAnswersByAttempt(attempt).stream()
                .collect(java.util.stream.Collectors.toMap(
                        answer -> answer.getQuestion().getId(),
                        answer -> answer,
                        (first, ignored) -> first));

        java.util.List<ExamQuestion> attemptQuestions = examQuestionService.getQuestionsByExam(attempt.getExam());
        if (attempt.getTotalQuestions() != null && !answersByQuestion.isEmpty()) {
            attemptQuestions = attemptQuestions.stream()
                    .filter(question -> answersByQuestion.containsKey(question.getId()))
                    .limit(attempt.getTotalQuestions())
                    .toList();
        }
        java.util.List<ExamSubmissionResultDTO.QuestionResult> results = attemptQuestions.stream()
                .map(question -> {
                    ExamAttemptAnswer answer = answersByQuestion.get(question.getId());
                    ExamOption selected = answer == null ? null : answer.getSelectedOption();
                    ExamOption correct = answer == null ? null : answer.getCorrectOption();
                    if (correct == null) {
                        correct = examOptionService.getOptionsByQuestion(question).stream()
                                .filter(ExamOption::isCorrect)
                                .findFirst()
                                .orElse(null);
                    }
                    return new ExamSubmissionResultDTO.QuestionResult(
                            question.getId(),
                            question.getContent(),
                            question.getExplanation(),
                            selected == null ? null : selected.getId(),
                            selected == null ? null : selected.getContent(),
                            correct == null ? null : correct.getId(),
                            correct == null ? null : correct.getContent(),
                            answer != null && answer.isCorrect());
                })
                .toList();
        int total = attempt.getTotalQuestions() == null ? results.size() : attempt.getTotalQuestions();
        double percentage = total == 0 ? 0 : Math.round(attempt.getCorrectCount() * 10000.0 / total) / 100.0;
        return new ExamSubmissionResultDTO(
                attempt.getId(),
                attempt.getExam().getTitle(),
                attempt.getCorrectCount(),
                total,
                percentage,
                results);
    }

    private long getTimeSpentSeconds(ExamAttempt attempt) {
        if (attempt.getStartedAt() != null && attempt.getSubmittedAt() != null) {
            return Math.max(0, Duration.between(attempt.getStartedAt(), attempt.getSubmittedAt()).getSeconds());
        }
        if (attempt.getRemainingTime() != null) {
            return Math.max(0, (attempt.getExam().getDuration() - attempt.getRemainingTime()) * 60L);
        }
        return 0;
    }

    public java.util.List<ExamAttempt> getAttemptsByExam(Exam exam) {
        return examAttemptRepository.findAll().stream()
                .filter(a -> a.getExam().getId().equals(exam.getId()))
                .toList();
    }

    public java.util.List<ExamAttempt> getAttemptsByUser(String userId) {
        return examAttemptRepository.findAll().stream()
                .filter(a -> a.getUserId().equals(userId))
                .toList();
    }
}