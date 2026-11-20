package com.smartcard.backend.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smartcard.backend.entity.Role;
import com.smartcard.backend.entity.User;
import com.smartcard.backend.service.UserService;

import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthApiController {

    private final UserService userService;

    public record LoginRequest(String username, String password) {}

    public record SignupRequest(String username, String email, String password, String confirmPassword) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpSession session) {
        if (request.username() == null || request.username().isBlank()
                || request.password() == null || request.password().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập tên đăng nhập và mật khẩu."));
        }

        var userOpt = userService.findByUsername(request.username());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Tên đăng nhập không tồn tại."));
        }

        User user = userOpt.get();
        if (Boolean.FALSE.equals(user.getEnabled())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Tài khoản đã bị khóa."));
        }
        if (!request.password().equals(user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Mật khẩu không đúng."));
        }

        user.setFailedLoginAttempts(0);
        userService.saveUser(user);
        session.setAttribute("loggedInUser", user);
        return ResponseEntity.ok(authUser(user));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request, HttpSession session) {
        if (request.username() == null || request.username().isBlank()
                || request.email() == null || request.email().isBlank()
                || request.password() == null || request.password().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập đầy đủ thông tin."));
        }
        if (!request.password().equals(request.confirmPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu xác nhận không khớp."));
        }
        if (userService.findByUsername(request.username()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên đăng nhập đã tồn tại."));
        }
        if (userService.findByEmail(request.email()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email đã tồn tại."));
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(request.password());
        user.setEnabled(true);
        user.setFailedLoginAttempts(0);
        user.setCreatedAt(new java.util.Date());
        userService.saveUserWithRole(user, "USER");
        user = userService.saveUser(user);
        session.setAttribute("loggedInUser", user);
        return ResponseEntity.status(HttpStatus.CREATED).body(authUser(user));
    }

    @GetMapping("/current")
    public ResponseEntity<?> current(HttpSession session) {
        Object value = session.getAttribute("loggedInUser");
        if (!(value instanceof User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Chưa đăng nhập."));
        }
        return ResponseEntity.ok(authUser(user));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công."));
    }

    private Map<String, Object> authUser(User user) {
        Role role = user.getRole();
        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail() == null ? "" : user.getEmail(),
                "avatarUrl", user.getAvatarUrl() == null ? "" : user.getAvatarUrl(),
                "role", role == null ? "USER" : role.getName());
    }
}
