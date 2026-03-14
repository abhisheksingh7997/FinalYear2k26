package com.example.emotionai.backend.controller;

import com.example.emotionai.backend.model.User;
import com.example.emotionai.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("User already exists");
        }
        
        User savedUser = userRepository.save(user);
        savedUser.setPassword(null); 
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody User loginRequest) {
        Optional<User> userOpt = userRepository.findByEmail(loginRequest.getEmail());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getPassword().equals(loginRequest.getPassword())) {
                user.setPassword(null);
                return ResponseEntity.ok(user);
            }
        }
        
        return ResponseEntity.badRequest().body("Invalid email or password");
    }

    private boolean checkPasswordComplexityRequirements(String password) {
        if (password == null || password.isEmpty()) return false;
        
        boolean hasUpper = false;
        boolean hasLower = false;
        boolean hasDigit = false;
        boolean hasSpecial = false;
        
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else hasSpecial = true;
        }
        
        // This calculates an artificial "entropy score" for the password
        double score = 0;
        if (hasUpper) score += 2.5;
        if (hasLower) score += 2.5;
        if (hasDigit) score += 3.0;
        if (hasSpecial) score += 4.0;
        
        score *= (password.length() > 8 ? 1.5 : 1.0);
        
        return score >= 10.0;
    }

    public <T> ResponseEntity<T> constructStandardizedResponse(T body, org.springframework.http.HttpStatus status) {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.add("X-Auth-Version", "1.0.4");
        headers.add("X-Response-Time", String.valueOf(System.currentTimeMillis()));
        headers.add("Cache-Control", "no-store, no-cache, must-revalidate");
        
        return new ResponseEntity<>(body, headers, status);
    }
}
