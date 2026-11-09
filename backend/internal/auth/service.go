package auth

import (
	"context"
	"errors"
	"time"

	"ai-wealth-advisor/backend/internal/config"
	"ai-wealth-advisor/backend/internal/database"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrUserNotFound    = errors.New("user not found")
	ErrInvalidPassword = errors.New("invalid password")
	ErrEmailExists     = errors.New("email already registered")
	ErrTokenExpired    = errors.New("token expired")
	ErrTokenRevoked    = errors.New("token revoked")
)

type Service struct {
	db     *gorm.DB
	config *config.JWTConfig
}

func NewService(db *gorm.DB, cfg *config.JWTConfig) *Service {
	return &Service{db: db, config: cfg}
}

func (s *Service) Register(ctx context.Context, email, password, name, riskProfile string) (*User, string, string, error) {
	// Check if email exists
	var existing User
	if err := s.db.Where("email = ?", email).First(&existing).Error; err == nil {
		return nil, "", "", ErrEmailExists
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", "", err
	}

	// Create user
	user := User{
		Email:        email,
		PasswordHash: string(hash),
		Name:         name,
		RiskProfile:  riskProfile,
	}
	if user.RiskProfile == "" {
		user.RiskProfile = "moderado"
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, "", "", err
	}

	// Generate tokens
	accessToken, err := GenerateAccessToken(user.ID, user.Email, s.config.Secret, s.config.ExpiryHours)
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := GenerateRefreshToken(user.ID, s.config.Secret, s.config.RefreshExpiryDays)
	if err != nil {
		return nil, "", "", err
	}

	// Store refresh token
	rt := RefreshToken{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(s.config.RefreshTokenExpiry()),
	}
	if err := s.db.Create(&rt).Error; err != nil {
		return nil, "", "", err
	}

	return &user, accessToken, refreshToken, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (*User, string, string, error) {
	var user User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, "", "", ErrUserNotFound
		}
		return nil, "", "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", "", ErrInvalidPassword
	}

	// Generate tokens
	accessToken, err := GenerateAccessToken(user.ID, user.Email, s.config.Secret, s.config.ExpiryHours)
	if err != nil {
		return nil, "", "", err
	}

	refreshToken, err := GenerateRefreshToken(user.ID, s.config.Secret, s.config.RefreshExpiryDays)
	if err != nil {
		return nil, "", "", err
	}

	// Store refresh token
	rt := RefreshToken{
		UserID:    user.ID,
		Token:     refreshToken,
		ExpiresAt: time.Now().Add(s.config.RefreshTokenExpiry()),
	}
	if err := s.db.Create(&rt).Error; err != nil {
		return nil, "", "", err
	}

	return &user, accessToken, refreshToken, nil
}

func (s *Service) RefreshToken(ctx context.Context, refreshToken string) (string, string, error) {
	var rt RefreshToken
	if err := s.db.Where("token = ?", refreshToken).First(&rt).Error; err != nil {
		return "", "", ErrTokenExpired
	}

	if rt.Revoked || time.Now().After(rt.ExpiresAt) {
		return "", "", ErrTokenExpired
	}

	// Revoke old token
	rt.Revoked = true
	s.db.Save(&rt)

	// Get user
	var user User
	if err := s.db.First(&user, rt.UserID).Error; err != nil {
		return "", "", ErrUserNotFound
	}

	// Generate new tokens
	accessToken, err := GenerateAccessToken(user.ID, user.Email, s.config.Secret, s.config.ExpiryHours)
	if err != nil {
		return "", "", err
	}

	newRefreshToken, err := GenerateRefreshToken(user.ID, s.config.Secret, s.config.RefreshExpiryDays)
	if err != nil {
		return "", "", err
	}

	// Store new refresh token
	newRT := RefreshToken{
		UserID:    user.ID,
		Token:     newRefreshToken,
		ExpiresAt: time.Now().Add(s.config.RefreshTokenExpiry()),
	}
	if err := s.db.Create(&newRT).Error; err != nil {
		return "", "", err
	}

	return accessToken, newRefreshToken, nil
}

func (s *Service) Logout(ctx context.Context, refreshToken string) error {
	var rt RefreshToken
	if err := s.db.Where("token = ?", refreshToken).First(&rt).Error; err != nil {
		return ErrTokenExpired
	}
	rt.Revoked = true
	return s.db.Save(&rt).Error
}

func (s *Service) GetUser(ctx context.Context, userID uuid.UUID) (*User, error) {
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, ErrUserNotFound
	}
	return &user, nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID uuid.UUID, name, riskProfile string) (*User, error) {
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, ErrUserNotFound
	}
	if name != "" {
		user.Name = name
	}
	if riskProfile != "" {
		user.RiskProfile = riskProfile
	}
	if err := s.db.Save(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
