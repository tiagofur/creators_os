package config

import (
	"errors"
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	// Server
	ServerPort string `mapstructure:"SERVER_PORT"`
	AppEnv     string `mapstructure:"APP_ENV"`

	// Logging
	LogLevel  string `mapstructure:"LOG_LEVEL"`
	LogFormat string `mapstructure:"LOG_FORMAT"`

	// Database
	DatabaseURL string `mapstructure:"DATABASE_URL"`

	// Redis
	RedisURL string `mapstructure:"REDIS_URL"`

	// Metrics
	MetricsPort string `mapstructure:"METRICS_PORT"`

	// CORS
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`

	// AI providers
	AIClaudeAPIKey  string `mapstructure:"AI_CLAUDE_API_KEY"`
	AIOpenAIAPIKey  string `mapstructure:"AI_OPENAI_API_KEY"`

	// Stripe
	StripeSecretKey      string `mapstructure:"STRIPE_SECRET_KEY"`
	StripeWebhookSecret  string `mapstructure:"STRIPE_WEBHOOK_SECRET"`

	// Security
	AESEncryptionKey  string `mapstructure:"AES_ENCRYPTION_KEY"`
	JWTPrivateKeyPath string `mapstructure:"JWT_PRIVATE_KEY_PATH"`
	JWTPublicKeyPath  string `mapstructure:"JWT_PUBLIC_KEY_PATH"`

	// Storage
	StorageBackend string `mapstructure:"STORAGE_BACKEND"`

	// MinIO
	MinIOEndpoint  string `mapstructure:"MINIO_ENDPOINT"`
	MinIOAccessKey string `mapstructure:"MINIO_ACCESS_KEY"`
	MinIOSecretKey string `mapstructure:"MINIO_SECRET_KEY"`
	MinIOBucket    string `mapstructure:"MINIO_BUCKET"`

	// AWS S3
	AWSS3Bucket string `mapstructure:"AWS_S3_BUCKET"`
	AWSRegion   string `mapstructure:"AWS_REGION"`

	// OAuth providers
	OAuthGoogleClientID      string `mapstructure:"OAUTH_GOOGLE_CLIENT_ID"`
	OAuthGoogleClientSecret  string `mapstructure:"OAUTH_GOOGLE_CLIENT_SECRET"`
	OAuthGithubClientID      string `mapstructure:"OAUTH_GITHUB_CLIENT_ID"`
	OAuthGithubClientSecret  string `mapstructure:"OAUTH_GITHUB_CLIENT_SECRET"`
	OAuthRedirectBaseURL     string `mapstructure:"OAUTH_REDIRECT_BASE_URL"`
}

// requiredFields lists env vars that must be non-empty for the service to start.
var requiredFields = []string{
	"DATABASE_URL",
	"REDIS_URL",
}

// envBindings maps each Viper key (lowercase) to its environment variable name.
// Explicit binding is required because Viper's AutomaticEnv only matches when
// the env var name equals the Viper key uppercased, but our keys use underscores
// and match their uppercase env var names exactly after upcasing.
var envBindings = []string{
	"SERVER_PORT",
	"APP_ENV",
	"LOG_LEVEL",
	"LOG_FORMAT",
	"DATABASE_URL",
	"REDIS_URL",
	"METRICS_PORT",
	"CORS_ALLOWED_ORIGINS",
	"AI_CLAUDE_API_KEY",
	"AI_OPENAI_API_KEY",
	"STRIPE_SECRET_KEY",
	"STRIPE_WEBHOOK_SECRET",
	"AES_ENCRYPTION_KEY",
	"JWT_PRIVATE_KEY_PATH",
	"JWT_PUBLIC_KEY_PATH",
	"STORAGE_BACKEND",
	"MINIO_ENDPOINT",
	"MINIO_ACCESS_KEY",
	"MINIO_SECRET_KEY",
	"MINIO_BUCKET",
	"AWS_S3_BUCKET",
	"AWS_REGION",
	"OAUTH_GOOGLE_CLIENT_ID",
	"OAUTH_GOOGLE_CLIENT_SECRET",
	"OAUTH_GITHUB_CLIENT_ID",
	"OAUTH_GITHUB_CLIENT_SECRET",
	"OAUTH_REDIRECT_BASE_URL",
}

// Load reads configuration from environment variables (and optionally a .env file)
// using Viper, applies defaults, and validates required fields.
func Load() (*Config, error) {
	v := viper.New()

	// Allow reading from a .env file if present (non-fatal if missing)
	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")
	_ = v.ReadInConfig() // ignore error — .env file is optional

	// AutomaticEnv enables env var lookup; BindEnv below maps each key explicitly.
	v.AutomaticEnv()

	// Bind each env var explicitly so Viper reads the uppercase env var name
	// for the corresponding (lowercase-internally) Viper key.
	for _, key := range envBindings {
		if err := v.BindEnv(key, key); err != nil {
			return nil, fmt.Errorf("config: bind env %s: %w", key, err)
		}
	}

	// Defaults
	v.SetDefault("SERVER_PORT", "8080")
	v.SetDefault("APP_ENV", "development")
	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("LOG_FORMAT", "json")
	v.SetDefault("METRICS_PORT", "9090")
	v.SetDefault("STORAGE_BACKEND", "minio")
	v.SetDefault("MINIO_ENDPOINT", "localhost:9000")
	v.SetDefault("MINIO_BUCKET", "ordo-uploads")
	v.SetDefault("AWS_REGION", "us-east-1")
	v.SetDefault("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"})

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("config: unmarshal failed: %w", err)
	}

	// Handle CORS_ALLOWED_ORIGINS as comma-separated string when set via env
	if raw := v.GetString("CORS_ALLOWED_ORIGINS"); raw != "" && len(cfg.CORSAllowedOrigins) == 0 {
		cfg.CORSAllowedOrigins = strings.Split(raw, ",")
	}

	if err := validate(v); err != nil {
		return nil, err
	}

	return &cfg, nil
}

// validate checks that all required configuration fields are set.
func validate(v *viper.Viper) error {
	var missing []string
	for _, key := range requiredFields {
		if v.GetString(key) == "" {
			missing = append(missing, key)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("config: missing required environment variables: %s", strings.Join(missing, ", "))
	}
	return nil
}

// IsDevelopment returns true when APP_ENV is "development".
func (c *Config) IsDevelopment() bool {
	return c.AppEnv == "development"
}

// IsProduction returns true when APP_ENV is "production".
func (c *Config) IsProduction() bool {
	return c.AppEnv == "production"
}

// ErrMissingConfig is returned when a required config value is absent.
var ErrMissingConfig = errors.New("missing required configuration")
