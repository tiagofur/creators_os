package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
	"golang.org/x/oauth2/google"
)

// OAuthProfile holds the normalised profile data returned by an OAuth provider.
type OAuthProfile struct {
	Email      string
	Name       string
	ProviderID string
	AvatarURL  string
	Provider   string
}

// OAuthManager manages OAuth2 flows for multiple providers.
type OAuthManager struct {
	providers map[string]*oauth2.Config
	redis     *redis.Client
	env       string
}

// NewOAuthManager initialises provider configurations from the supplied credentials.
func NewOAuthManager(
	redisClient *redis.Client,
	env string,
	googleClientID, googleClientSecret string,
	githubClientID, githubClientSecret string,
	redirectBaseURL string,
) *OAuthManager {
	providers := map[string]*oauth2.Config{
		"google": {
			ClientID:     googleClientID,
			ClientSecret: googleClientSecret,
			RedirectURL:  redirectBaseURL + "/api/v1/auth/oauth/google/callback",
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		},
		"github": {
			ClientID:     githubClientID,
			ClientSecret: githubClientSecret,
			RedirectURL:  redirectBaseURL + "/api/v1/auth/oauth/github/callback",
			Scopes:       []string{"user:email", "read:user"},
			Endpoint:     github.Endpoint,
		},
		// TODO: Apple Sign-In — requires special JWT client secret flow; not implemented yet.
	}

	return &OAuthManager{
		providers: providers,
		redis:     redisClient,
		env:       env,
	}
}

// GetAuthURL returns the OAuth2 redirect URL for the given provider and state.
func (m *OAuthManager) GetAuthURL(provider, state string) (string, error) {
	cfg, ok := m.providers[provider]
	if !ok {
		return "", fmt.Errorf("oauth: unknown provider: %s", provider)
	}
	return cfg.AuthCodeURL(state, oauth2.AccessTypeOffline), nil
}

// StoreState persists the OAuth state token in Redis with a 10-minute TTL.
func (m *OAuthManager) StoreState(ctx context.Context, state string) error {
	key := fmt.Sprintf("ordo:%s:oauth:state:%s", m.env, state)
	return m.redis.Set(ctx, key, "1", 10*time.Minute).Err()
}

// ValidateState checks the state token in Redis and deletes it (one-use).
func (m *OAuthManager) ValidateState(ctx context.Context, state string) error {
	key := fmt.Sprintf("ordo:%s:oauth:state:%s", m.env, state)
	n, err := m.redis.Del(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("oauth: validate state: redis: %w", err)
	}
	if n == 0 {
		return fmt.Errorf("oauth: invalid or expired state")
	}
	return nil
}

// Exchange performs the OAuth2 code-for-token exchange.
func (m *OAuthManager) Exchange(ctx context.Context, provider, code string) (*oauth2.Token, error) {
	cfg, ok := m.providers[provider]
	if !ok {
		return nil, fmt.Errorf("oauth: unknown provider: %s", provider)
	}
	token, err := cfg.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("oauth: exchange (%s): %w", provider, err)
	}
	return token, nil
}

// GetUserProfile retrieves the user's profile from the OAuth provider.
func (m *OAuthManager) GetUserProfile(ctx context.Context, provider string, token *oauth2.Token) (*OAuthProfile, error) {
	cfg, ok := m.providers[provider]
	if !ok {
		return nil, fmt.Errorf("oauth: unknown provider: %s", provider)
	}

	httpClient := cfg.Client(ctx, token)

	switch provider {
	case "google":
		return fetchGoogleProfile(ctx, httpClient, provider)
	case "github":
		return fetchGitHubProfile(ctx, httpClient, provider)
	default:
		return nil, fmt.Errorf("oauth: GetUserProfile not implemented for provider: %s", provider)
	}
}

// ---- Google ----

type googleUserInfo struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Picture   string `json:"picture"`
	Verified  bool   `json:"verified_email"`
}

func fetchGoogleProfile(ctx context.Context, client *http.Client, provider string) (*OAuthProfile, error) {
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("oauth: google: fetch userinfo: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("oauth: google: read body: %w", err)
	}

	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("oauth: google: unmarshal: %w", err)
	}

	return &OAuthProfile{
		Email:      info.Email,
		Name:       info.Name,
		ProviderID: info.ID,
		AvatarURL:  info.Picture,
		Provider:   provider,
	}, nil
}

// ---- GitHub ----

type githubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Email     string `json:"email"`
}

type githubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func fetchGitHubProfile(ctx context.Context, client *http.Client, provider string) (*OAuthProfile, error) {
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		return nil, fmt.Errorf("oauth: github: fetch user: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("oauth: github: read body: %w", err)
	}

	var user githubUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, fmt.Errorf("oauth: github: unmarshal user: %w", err)
	}

	email := user.Email
	if email == "" {
		// Fetch from the emails endpoint
		email, err = fetchGitHubPrimaryEmail(client)
		if err != nil {
			return nil, err
		}
	}

	name := user.Name
	if name == "" {
		name = user.Login
	}

	return &OAuthProfile{
		Email:      email,
		Name:       name,
		ProviderID: fmt.Sprintf("%d", user.ID),
		AvatarURL:  user.AvatarURL,
		Provider:   provider,
	}, nil
}

func fetchGitHubPrimaryEmail(client *http.Client) (string, error) {
	resp, err := client.Get("https://api.github.com/user/emails")
	if err != nil {
		return "", fmt.Errorf("oauth: github: fetch emails: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("oauth: github: read emails body: %w", err)
	}

	var emails []githubEmail
	if err := json.Unmarshal(body, &emails); err != nil {
		return "", fmt.Errorf("oauth: github: unmarshal emails: %w", err)
	}

	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email, nil
		}
	}
	for _, e := range emails {
		if e.Primary {
			return e.Email, nil
		}
	}
	if len(emails) > 0 {
		return emails[0].Email, nil
	}
	return "", fmt.Errorf("oauth: github: no email found")
}
