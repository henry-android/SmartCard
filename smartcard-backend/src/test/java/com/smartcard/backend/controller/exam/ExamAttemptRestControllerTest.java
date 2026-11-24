package com.smartcard.backend.controller.exam;

import com.smartcard.backend.dto.ExamTakeDTO;
import com.smartcard.backend.entity.User;
import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.entity.exam.ExamAttempt;
import com.smartcard.backend.entity.exam.ExamQuestion;
import com.smartcard.backend.service.exam.ExamAttemptService;
import com.smartcard.backend.service.exam.ExamQuestionService;
import com.smartcard.backend.service.exam.ExamService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpSession;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExamAttemptRestControllerTest {
    @Mock
    private ExamAttemptService examAttemptService;
    @Mock
    private ExamService examService;
    @Mock
    private ExamQuestionService examQuestionService;
    @InjectMocks
    private ExamAttemptRestController controller;

    @Test
    void requiresLoginToStartExam() {
        ResponseEntity<?> response = controller.createAttempt(7L, new MockHttpSession());

        assertEquals(401, response.getStatusCode().value());
        verifyNoInteractions(examAttemptService, examService, examQuestionService);
    }

    @Test
    void doesNotAllowOtherUsersToStartPrivateExam() {
        User user = new User();
        user.setUsername("student");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loggedInUser", user);

        Exam exam = new Exam();
        exam.setId(7L);
        exam.setPublic(false);
        exam.setCreatedBy("owner");
        when(examService.getExamById(7L)).thenReturn(Optional.of(exam));

        ResponseEntity<?> response = controller.createAttempt(7L, session);

        assertEquals(403, response.getStatusCode().value());
        verifyNoInteractions(examAttemptService, examQuestionService);
    }

    @Test
    void startsPublicExamWithoutReturningCorrectAnswerFlags() {
        User user = new User();
        user.setUsername("student");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loggedInUser", user);

        Exam exam = new Exam();
        exam.setId(7L);
        exam.setTitle("Public exam");
        exam.setPublic(true);
        ExamQuestion question = new ExamQuestion();
        question.setId(10L);
        ExamAttempt attempt = new ExamAttempt();
        ExamTakeDTO examTake = new ExamTakeDTO(
                15L,
                7L,
                "Public exam",
                20,
                1,
                List.of(new ExamTakeDTO.Question(
                        10L,
                        "Question",
                        1,
                        List.of(new ExamTakeDTO.Option(21L, "Option")))));

        when(examService.getExamById(7L)).thenReturn(Optional.of(exam));
        when(examQuestionService.getQuestionsByExam(exam)).thenReturn(List.of(question));
        when(examAttemptService.createAttempt(exam, "student")).thenReturn(Optional.of(attempt));
        when(examAttemptService.getExamForAttempt(exam, attempt)).thenReturn(Optional.of(examTake));

        ResponseEntity<?> response = controller.createAttempt(7L, session);

        assertEquals(200, response.getStatusCode().value());
        ExamTakeDTO body = assertInstanceOf(ExamTakeDTO.class, response.getBody());
        assertEquals(21L, body.questions().get(0).options().get(0).id());
        verify(examQuestionService).getQuestionsByExam(exam);
    }
}
