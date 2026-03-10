package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_MissingRequired(t *testing.T) {
	// Ensure required vars are unset
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("REDIS_URL")

	_, err := Load()
	require.Error(t, err, "expected error when required vars are missing")
	assert.Contains(t, err.Error(), "DATABASE_URL")
}

func TestLoad_ValidConfig(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://ordo:secret@localhost:5432/ordo_dev?sslmode=disable")
	t.Setenv("REDIS_URL", "redis://localhost:6379/0")

	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "postgres://ordo:secret@localhost:5432/ordo_dev?sslmode=disable", cfg.DatabaseURL)
	assert.Equal(t, "redis://localhost:6379/0", cfg.RedisURL)
	assert.Equal(t, "8080", cfg.ServerPort)
	assert.Equal(t, "development", cfg.AppEnv)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, "9090", cfg.MetricsPort)
}

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://localhost/test")
	t.Setenv("REDIS_URL", "redis://localhost:6379")

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, "8080", cfg.ServerPort)
	assert.Equal(t, "development", cfg.AppEnv)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, "json", cfg.LogFormat)
	assert.Equal(t, "9090", cfg.MetricsPort)
	assert.Equal(t, "minio", cfg.StorageBackend)
}

func TestConfig_IsDevelopment(t *testing.T) {
	cfg := &Config{AppEnv: "development"}
	assert.True(t, cfg.IsDevelopment())
	assert.False(t, cfg.IsProduction())
}

func TestConfig_IsProduction(t *testing.T) {
	cfg := &Config{AppEnv: "production"}
	assert.True(t, cfg.IsProduction())
	assert.False(t, cfg.IsDevelopment())
}
