package auth_test

import (
	"testing"

	"github.com/ordo/creators-os/internal/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword(t *testing.T) {
	hash, err := auth.HashPassword("supersecret")
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, "supersecret", hash)
}

func TestCheckPassword_Correct(t *testing.T) {
	hash, err := auth.HashPassword("correcthorse")
	require.NoError(t, err)
	assert.True(t, auth.CheckPassword("correcthorse", hash))
}

func TestCheckPassword_Wrong(t *testing.T) {
	hash, err := auth.HashPassword("correcthorse")
	require.NoError(t, err)
	assert.False(t, auth.CheckPassword("wrongpassword", hash))
}

func TestHashPassword_Uniqueness(t *testing.T) {
	h1, err := auth.HashPassword("samepassword")
	require.NoError(t, err)
	h2, err := auth.HashPassword("samepassword")
	require.NoError(t, err)
	// bcrypt produces different hashes due to salt
	assert.NotEqual(t, h1, h2)
}
