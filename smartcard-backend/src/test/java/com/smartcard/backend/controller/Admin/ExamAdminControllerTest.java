package com.smartcard.backend.controller.Admin;

import com.smartcard.backend.entity.User;
import com.smartcard.backend.entity.exam.Exam;
import com.smartcard.backend.service.exam.ExamService;
import com.smartcard.backend.util.PermissionUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpSession;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExamAdminControllerTest {
    @Mock
    private ExamService examService;
    @Mock
    private PermissionUtils permissionUtils;
    @InjectMocks
    private ExamAdminController controller;

    @Test
    void adminCanDeleteExam() {
        User user = new User();
        user.setUsername("admin");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loggedInUser", user);
        when(permissionUtils.isAdmin(user)).thenReturn(true);
        when(examService.getExamById(5L)).thenReturn(Optional.of(new Exam()));

        ResponseEntity<?> response = controller.deleteExam(5L, session);

        assertEquals(204, response.getStatusCode().value());
        verify(examService).deleteExam(5L);
    }

    @Test
    void nonAdminCannotDeleteExam() {
        User user = new User();
        user.setUsername("user");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("loggedInUser", user);
        when(permissionUtils.isAdmin(user)).thenReturn(false);

        ResponseEntity<?> response = controller.deleteExam(5L, session);

        assertEquals(403, response.getStatusCode().value());
        verify(examService, never()).deleteExam(5L);
    }

    @Test
    void unauthenticatedUserCannotDeleteExam() {
        ResponseEntity<?> response = controller.deleteExam(5L, new MockHttpSession());

        assertEquals(401, response.getStatusCode().value());
        verify(examService, never()).deleteExam(5L);
    }
}
