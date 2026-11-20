// package com.smartcard.backend.service;

// import com.smartcard.backend.entity.User;
// import com.smartcard.backend.repositories.UserRepository;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.stereotype.Service;

// import java.util.List;
// import java.util.Optional;

// @Service
// public class UserService {
//     @Autowired
//     private UserRepository userRepository;

//     public List<User> getAllUsers() {
//         return userRepository.findAll();
//     }

//     public Optional<User> findByUsername(String username) {
//         return userRepository.findByUsername(username);
//     }

//     public Optional<User> findByEmail(String email) {
//         return userRepository.findByEmail(email);
//     }

//     public Optional<User> findById(Integer id) {
//         return userRepository.findById(id);
//     }

//     public User saveUser(User user) {
//         return userRepository.save(user);
//     }

//     public void deleteUser(Integer id) {
//         userRepository.deleteById(id);
//     }
// }

package com.smartcard.backend.service;

import com.smartcard.backend.entity.Role;
import com.smartcard.backend.entity.User;
import com.smartcard.backend.repositories.QuizQuestionResultRepository;
import com.smartcard.backend.repositories.QuizRepository;
import com.smartcard.backend.repositories.RoleRepository;
import com.smartcard.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private QuizRepository quizRepository;
    @Autowired
    private QuizQuestionResultRepository quizQuestionResultRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> findById(Integer id) {
        return userRepository.findById(id);
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }

    public void deleteUser(Integer id) {
        userRepository.deleteById(id);
    }

    public Role getRoleByName(String name) {
        return roleRepository.findByName(name).orElse(null);
    }

    public User saveUserWithRole(User user, String roleName) {
        Role role = getRoleByName(roleName);
        if (role == null) {
            role = new Role();
            role.setName(roleName);
            role = roleRepository.save(role);
        }
        user.setRole(role);
        return saveUser(user);
    }

    public void setUserEnabled(Integer userId, Boolean enabled) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setEnabled(enabled);
            userRepository.save(user);
        });
    }

    public void changeUserRole(Integer userId, String roleName) {
        User user = userRepository.findById(userId).orElse(null);
        Role role = roleRepository.findByName(roleName).orElse(null);

        if (user != null && role != null) {
            user.setRole(role);
            userRepository.save(user);
        }
    }

    // Đếm số flashcard user đã học (số QuizQuestionResult có is_correct là true
    // liên
    // quan quiz của user)
    public int countFlashcardsLearnedByUserId(Integer userId) {
        return quizQuestionResultRepository.countFlashcardsLearnedByUserIdAndIsCorrect(userId);
    }
}
