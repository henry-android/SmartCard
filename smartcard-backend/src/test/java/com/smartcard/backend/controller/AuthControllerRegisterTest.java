package com.smartcard.backend.controller;

import com.smartcard.backend.entity.User;
import com.smartcard.backend.service.UserService;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import com.smartcard.backend.entity.Role;

@ExtendWith(MockitoExtension.class)
class AuthControllerRegisterTest {
    @Mock
    private UserService userService;

    @Mock
    private HttpSession session;

    private AuthApiController authController;

    @BeforeEach
    void setUp() {
        authController = new AuthApiController(userService);
    }

    @Test
    void dangKy_ThanhCong() {
        AuthApiController.SignupRequest request =
                new AuthApiController.SignupRequest("testuser", "test@example.com", "password", "password");

        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());
        when(userService.findByEmail("test@example.com")).thenReturn(Optional.empty());
        when(userService.saveUser(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            savedUser.setId(1);
            Role role = new Role();
            role.setName("USER");
            savedUser.setRole(role);
            savedUser.setAvatarUrl("");
            return savedUser;
        });

        ResponseEntity<?> response = authController.signup(request, session);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
    }

    @Test
    void dangKy_TenDangNhapDaTonTai() {
        AuthApiController.SignupRequest request =
                new AuthApiController.SignupRequest("testuser", "test@example.com", "password", "password");

        when(userService.findByUsername("testuser")).thenReturn(Optional.of(new User()));

        ResponseEntity<?> response = authController.signup(request, session);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void dangKy_EmailDaTonTai() {
        AuthApiController.SignupRequest request =
                new AuthApiController.SignupRequest("testuser", "test@example.com", "password", "password");

        when(userService.findByUsername("testuser")).thenReturn(Optional.empty());
        when(userService.findByEmail("test@example.com")).thenReturn(Optional.of(new User()));

        ResponseEntity<?> response = authController.signup(request, session);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void dangKy_MatKhauXacNhanKhongKhop() {
        AuthApiController.SignupRequest request =
                new AuthApiController.SignupRequest("testuser", "test@example.com", "password", "wrongpassword");

        ResponseEntity<?> response = authController.signup(request, session);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }
}
