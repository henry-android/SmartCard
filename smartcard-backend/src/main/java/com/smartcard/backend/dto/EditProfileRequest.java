package com.smartcard.backend.dto;

import lombok.Data;

@Data
public class EditProfileRequest {
    private String username;
    private String email;
    private String avatarUrl;
}
