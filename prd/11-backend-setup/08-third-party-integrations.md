# Third-Party Integrations — Ordo Creator OS

> A comprehensive guide to all external services, APIs, and providers integrated into the Ordo backend.
>
> **Purpose**: Enable creators to leverage AI, publish across platforms, process media, accept payments, and maintain real-time collaboration—all within a unified, modular system.

---

## Overview

Ordo integrates with 10+ third-party categories:

| Category | Provider(s) | Purpose |
|----------|-----------|---------|
| **AI** | Anthropic Claude, OpenAI | Chat, content generation, analysis, embeddings |
| **Payment** | Stripe | Subscription management (Pro, Enterprise) |
| **Auth** | Google, GitHub, Apple | OAuth sign-in |
| **Storage** | AWS S3 / MinIO | File uploads, media assets |
| **Email** | AWS SES / MailHog | Transactional emails |
| **Platforms** | YouTube, Instagram, TikTok, Twitter/X, LinkedIn | Analytics, publishing |
| **Real-time** | Gorilla WebSocket | Live collaboration, notifications |
| **Jobs** | Asynq (Redis) | Async task processing |
| **Monitoring** | DataDog / CloudWatch | Observability, tracing, logs |

---

## 1. AI Providers

AI is the core of Ordo. Two providers are configured with a smart routing layer that handles failover, rate limits, and per-tier token budgets.

### 1.1 Anthropic Claude (Primary)

**Role**: Primary AI provider for all creative tasks.

#### SDK & Configuration

```go
import "github.com/anthropics/anthropic-sdk-go"

type ClaudeConfig struct {
    APIKey    string        // env: CLAUDE_API_KEY
    BaseURL   string        // default: https://api.anthropic.com
    Timeout   time.Duration // default: 30s
}

// Initialize client
client := anthropic.NewClient(
    anthropic.WithAPIKey(os.Getenv("CLAUDE_API_KEY")),
    anthropic.WithHTTPClient(&http.Client{
        Timeout: 30 * time.Second,
    }),
)
```

#### Models & Use Cases

| Model | Use Case | Max Tokens | Cost | Notes |
|-------|----------|-----------|------|-------|
| `claude-sonnet-4-5-20250514` | Default for all tasks (chat, generation, analysis) | 8K in, 4K out | Low | Balanced speed/quality |
| `claude-opus-4-5-20250414` | Complex reasoning, deep analysis, long-form generation | 8K in, 4K out | Higher | Reserved for pro/enterprise |

#### Use Cases & Token Budgets

- **Chat**: 2,000 tokens/message (streamed to client)
- **Script generation** (titles, hooks, SEO): 3,000 tokens/response
- **Descriptions**: 1,500 tokens/response
- **Brainstorm** (3 ideas): 2,000 tokens/response
- **Performance analysis**: 4,000 tokens/response
- **Remix analysis** (comparing versions): 5,000 tokens/response

**Per-Tier Token Limits** (monthly):
- Free: 10,000 tokens
- Pro ($12/mo): 100,000 tokens
- Enterprise ($29/mo): 500,000 tokens

#### Streaming Implementation

```go
import (
    "github.com/anthropics/anthropic-sdk-go"
    "github.com/anthropics/anthropic-sdk-go/messages/streamer"
)

// Stream Claude response to client via SSE
func (s *AIService) ChatWithStreaming(ctx context.Context, req *ChatRequest) error {
    stream := s.client.Messages.NewStream(ctx, anthropic.MessageNewParams{
        Model: anthropic.F(anthropic.ModelClaudeSonnet4520250514),
        MaxTokens: anthropic.F(int64(2000)),
        Messages: anthropic.F([]anthropic.MessageParam{
            anthropic.NewUserMessage(req.Content),
        }),
    })
    defer stream.Close()

    // Write SSE to response writer
    for stream.Next() {
        event := stream.Current()
        if delta, ok := event.(*streamer.ContentBlockDeltaEvent); ok {
            if text, ok := delta.Delta.(*anthropic.TextDeltaEvent); ok {
                fmt.Fprintf(w, "data: %s\n\n", text.Text)
            }
        }
    }
    return stream.Err()
}
```

#### Rate Limiting & Retry Strategy

```go
type ClaudeRateLimiter struct {
    limiter     *rate.Limiter           // tokens/sec
    lastReset   time.Time
    monthlyUsed map[string]int64        // user_id -> tokens used
}

// Retry with exponential backoff
func (s *AIService) CallClaudeWithRetry(ctx context.Context, msg string) (string, error) {
    var lastErr error
    for attempt := 0; attempt < 3; attempt++ {
        resp, err := s.client.Messages.New(ctx, &anthropic.MessageNewParams{
            Model:     anthropic.F(anthropic.ModelClaudeSonnet4520250514),
            MaxTokens: anthropic.F(int64(3000)),
            Messages: anthropic.F([]anthropic.MessageParam{
                anthropic.NewUserMessage(msg),
            }),
        })

        if err == nil {
            return resp.Content[0].Text, nil
        }

        // Check error type
        if apiErr, ok := err.(*anthropic.APIError); ok {
            if apiErr.StatusCode == 429 {
                // Rate limited — exponential backoff
                backoff := time.Duration(math.Pow(2, float64(attempt))) * time.Second
                select {
                case <-time.After(backoff):
                case <-ctx.Done():
                    return "", ctx.Err()
                }
                continue
            } else if apiErr.StatusCode >= 500 {
                // Server error — retry
                lastErr = err
                continue
            } else {
                // 4xx error (not 429) — fail immediately
                return "", err
            }
        }
        lastErr = err
    }
    return "", fmt.Errorf("claude call failed after 3 retries: %w", lastErr)
}

// Token counting before sending
func (s *AIService) CountTokens(model, text string) (int, error) {
    resp, err := s.client.Messages.CountTokens(context.Background(), anthropic.MessageCountTokensParams{
        Model: anthropic.F(model),
        Messages: anthropic.F([]anthropic.MessageParam{
            anthropic.NewUserMessage(text),
        }),
    })
    if err != nil {
        return 0, err
    }
    return int(resp.InputTokens), nil
}

// Check budget before proceeding
func (s *AIService) HasTokenBudget(userID string, tokensNeeded int) (bool, error) {
    user, _ := s.db.GetUser(userID)
    used := s.redis.Get(fmt.Sprintf("tokens:monthly:%s", userID))
    budget := s.getTierBudget(user.Tier)
    return used + tokensNeeded <= budget, nil
}
```

#### Error Handling

```go
// Graceful failure modes
func (s *AIService) ChatSafe(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
    // Check budget first
    if ok, _ := s.HasTokenBudget(req.UserID, 2000); !ok {
        return nil, fmt.Errorf("token budget exceeded for tier %s", req.Tier)
    }

    // Try Claude
    resp, err := s.CallClaudeWithRetry(ctx, req.Content)
    if err != nil {
        // Log error but don't fail — suggest retry or offer manual input
        s.log.Warn("Claude call failed", zap.Error(err))
        return &ChatResponse{
            Message: "AI generation failed. Please try again.",
            Error:   err.Error(),
        }, nil
    }
    return &ChatResponse{Message: resp}, nil
}
```

---

### 1.2 OpenAI (Secondary/Fallback)

**Role**: Fallback when Claude is unavailable or rate-limited.

#### SDK & Configuration

```go
import "github.com/sashabaranov/go-openai"

type OpenAIConfig struct {
    APIKey         string // env: OPENAI_API_KEY
    OrganizationID string // env: OPENAI_ORG_ID (optional)
}

client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))
```

#### Models & Use Cases

| Model | Purpose | Max Tokens |
|-------|---------|-----------|
| `gpt-4o-mini` | Fallback text generation (when Claude fails) | 16K in, 4K out |
| `text-embedding-3-small` | Embeddings for semantic search | 8K tokens |
| `whisper-1` | Audio transcription (remix engine, user uploads) | 25MB max |

#### Fallback Flow

```go
type AIRouter struct {
    claude      *ClaudeClient
    openai      *OpenAIClient
    circuitBreaker map[string]*CircuitBreaker // provider -> state
}

// Route request with failover
func (r *AIRouter) Generate(ctx context.Context, req *GenerateRequest) (string, error) {
    // Try Claude first
    if !r.isCircuitBreakerOpen("claude") {
        resp, err := r.claude.Generate(ctx, req.Content)
        if err == nil {
            return resp, nil
        }
        r.recordFailure("claude")
    }

    // Fall back to OpenAI
    if !r.isCircuitBreakerOpen("openai") {
        resp, err := r.openai.Generate(ctx, req.Content)
        if err == nil {
            r.recordSuccess("openai")
            return resp, nil
        }
        r.recordFailure("openai")
    }

    return "", fmt.Errorf("both AI providers unavailable")
}

// Circuit breaker: if provider fails 5x in 1 min → skip for 5 min
func (r *AIRouter) isCircuitBreakerOpen(provider string) bool {
    cb := r.circuitBreaker[provider]
    if cb.failureCount >= 5 && time.Since(cb.lastFailure) < time.Minute {
        if time.Since(cb.circuitOpenedAt) < 5*time.Minute {
            return true // Circuit is open
        }
        cb.reset()
    }
    return false
}
```

#### Embeddings for Search

```go
// Generate embeddings for semantic search
func (s *AIService) Embed(ctx context.Context, text string) ([]float32, error) {
    resp, err := s.openai.CreateEmbeddings(ctx, openai.EmbeddingRequest{
        Input: []string{text},
        Model: openai.SmallEmbedding3,
    })
    if err != nil {
        return nil, err
    }
    return resp.Data[0].Embedding, nil
}

// Store embeddings for content (scripts, ideas, etc.)
// Used for: "Find similar scripts", "Discover ideas in my vault"
```

#### Audio Transcription (Remix Engine)

```go
// Transcribe audio uploads (user records ideas, audio snippets)
func (s *AIService) TranscribeAudio(ctx context.Context, filePath string) (string, error) {
    file, _ := os.Open(filePath)
    defer file.Close()

    resp, err := s.openai.CreateTranscription(ctx, openai.AudioRequest{
        Model:    openai.Whisper1,
        FilePath: filePath,
    })
    if err != nil {
        return "", err
    }
    return resp.Text, nil
}
```

---

### 1.3 AI Router Pattern (Provider Interface)

All AI operations go through the router. This enables easy provider swapping and metrics.

```go
// AIProvider interface — implemented by Claude, OpenAI, etc.
type AIProvider interface {
    Chat(ctx context.Context, msg string, opts ...Option) (string, error)
    Generate(ctx context.Context, prompt string, opts ...Option) (string, error)
    Analyze(ctx context.Context, content string, opts ...Option) (string, error)
    Embed(ctx context.Context, text string) ([]float32, error)
    CountTokens(text string) (int, error)
    Name() string
}

// Router coordinates calls
type AIRouter struct {
    providers   map[string]AIProvider // "claude", "openai"
    primary     AIProvider
    fallback    AIProvider
    metrics     *AIMetrics
    circuitBreaker map[string]*CircuitBreaker
}

func (r *AIRouter) Chat(ctx context.Context, req *ChatRequest) (*ChatResponse, error) {
    // Try primary
    if resp, err := r.callWithMetrics(ctx, r.primary, "Chat", req.Content); err == nil {
        return resp, nil
    }

    // Try fallback
    if resp, err := r.callWithMetrics(ctx, r.fallback, "Chat", req.Content); err == nil {
        r.metrics.RecordFallback("Chat")
        return resp, nil
    }

    return nil, ErrAllProvidersUnavailable
}

func (r *AIRouter) callWithMetrics(ctx context.Context, provider AIProvider, op string, input string) (*ChatResponse, error) {
    start := time.Now()
    resp, err := provider.Chat(ctx, input)
    r.metrics.RecordLatency(provider.Name(), op, time.Since(start))
    if err != nil {
        r.metrics.RecordError(provider.Name(), op, err)
    }
    return resp, err
}

// Track usage per tier
func (r *AIRouter) RecordUsage(userID, tier string, provider string, tokens int) {
    r.metrics.RecordTokens(userID, tier, provider, tokens)
    // Update Redis for monthly quota
    r.redis.Incr(fmt.Sprintf("tokens:monthly:%s", userID))
}
```

---

## 2. Payment: Stripe

Stripe manages subscriptions, billing, and the transition between tiers (Free → Pro → Enterprise).

### 2.1 Configuration & Products

```go
import "github.com/stripe/stripe-go/v81"

type StripeConfig struct {
    SecretKey          string // env: STRIPE_SECRET_KEY
    PublishableKey     string // env: STRIPE_PUBLISHABLE_KEY
    WebhookSecret      string // env: STRIPE_WEBHOOK_SECRET
    ProductIDs         map[string]string // "pro" -> product_id
    PriceIDs           map[string]string // "pro_monthly" -> price_id
    CustomerPortalURL  string // https://billing.stripe.com/...
}

// Products & prices
var products = map[string]struct{}{
    "pro":        {Price: "$12/mo", Seats: 1, AI: 100000}, // 100k tokens/mo
    "enterprise": {Price: "$29/mo", Seats: unlimited, AI: 500000}, // 500k tokens/mo
}
```

### 2.2 Customer & Subscription Lifecycle

```go
import (
    "github.com/stripe/stripe-go/v81"
    "github.com/stripe/stripe-go/v81/customer"
    "github.com/stripe/stripe-go/v81/subscription"
)

// Step 1: Create customer on signup
func (s *StripeService) CreateCustomer(ctx context.Context, userID, email string) (string, error) {
    params := &stripe.CustomerParams{
        Email: stripe.String(email),
        Metadata: map[string]string{
            "user_id": userID,
        },
    }
    cust, err := customer.New(ctx, params)
    if err != nil {
        return "", err
    }
    // Store stripe_customer_id in user record
    return cust.ID, nil
}

// Step 2: Create subscription on upgrade
func (s *StripeService) CreateSubscription(ctx context.Context, userID, tier string) error {
    user, _ := s.db.GetUser(userID)
    priceID := s.config.PriceIDs[tier+"_monthly"]

    params := &stripe.SubscriptionParams{
        Customer: stripe.String(user.StripeCustomerID),
        Items: []*stripe.SubscriptionItemsParams{
            {
                Price: stripe.String(priceID),
            },
        },
    }
    sub, err := subscription.New(ctx, params)
    if err != nil {
        return err
    }

    // Store subscription_id in user record
    s.db.UpdateUser(userID, map[string]interface{}{
        "stripe_subscription_id": sub.ID,
        "tier": tier,
        "subscription_started_at": time.Now(),
    })
    return nil
}

// Step 3: Cancel subscription
func (s *StripeService) CancelSubscription(ctx context.Context, userID string) error {
    user, _ := s.db.GetUser(userID)
    _, err := subscription.Cancel(ctx, user.StripeSubscriptionID, nil)
    if err != nil {
        return err
    }

    s.db.UpdateUser(userID, map[string]interface{}{
        "tier": "free",
        "subscription_ended_at": time.Now(),
    })
    return nil
}
```

### 2.3 Webhook Handlers

Stripe sends webhooks for all subscription events. Handle these to sync billing state.

```go
import (
    "github.com/stripe/stripe-go/v81/webhook"
    "github.com/stripe/stripe-go/v81/event"
)

// Register webhook endpoint: POST /webhooks/stripe
func (h *WebhookHandler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)

    // Verify webhook signature
    event, err := webhook.ConstructEvent(
        body,
        r.Header.Get("Stripe-Signature"),
        h.stripeWebhookSecret,
    )
    if err != nil {
        http.Error(w, "Invalid signature", http.StatusForbidden)
        return
    }

    switch event.Type {
    case "checkout.session.completed":
        h.handleCheckoutCompleted(event)
    case "customer.subscription.updated":
        h.handleSubscriptionUpdated(event)
    case "customer.subscription.deleted":
        h.handleSubscriptionDeleted(event)
    case "invoice.payment_succeeded":
        h.handlePaymentSucceeded(event)
    case "invoice.payment_failed":
        h.handlePaymentFailed(event)
    }

    w.WriteHeader(http.StatusOK)
}

// Handle: Customer purchases Pro or Enterprise
func (h *WebhookHandler) handleCheckoutCompleted(evt *stripe.Event) {
    var session stripe.CheckoutSession
    json.Unmarshal(evt.Data.Raw, &session)

    userID := session.Metadata["user_id"]
    tier := session.Metadata["tier"] // "pro" or "enterprise"

    h.db.UpdateUser(userID, map[string]interface{}{
        "tier": tier,
        "stripe_customer_id": session.Customer.ID,
        "stripe_subscription_id": session.Subscription.ID,
        "subscription_active": true,
    })

    // Send welcome email
    h.emailService.SendWelcome(userID, tier)
}

// Handle: Subscription tier change (pro -> enterprise)
func (h *WebhookHandler) handleSubscriptionUpdated(evt *stripe.Event) {
    var sub stripe.Subscription
    json.Unmarshal(evt.Data.Raw, &sub)

    userID := sub.Metadata["user_id"]
    newTier := determineTierFromPrice(sub.Items.Data[0].Price.ID)

    h.db.UpdateUser(userID, map[string]interface{}{
        "tier": newTier,
    })

    h.log.Info("User tier updated", zap.String("user_id", userID), zap.String("new_tier", newTier))
}

// Handle: Subscription cancelled
func (h *WebhookHandler) handleSubscriptionDeleted(evt *stripe.Event) {
    var sub stripe.Subscription
    json.Unmarshal(evt.Data.Raw, &sub)

    userID := sub.Metadata["user_id"]

    h.db.UpdateUser(userID, map[string]interface{}{
        "tier": "free",
        "subscription_active": false,
    })

    // Send "subscription cancelled" email
    h.emailService.SendCancellationNotice(userID)
}

// Handle: Payment succeeded
func (h *WebhookHandler) handlePaymentSucceeded(evt *stripe.Event) {
    var invoice stripe.Invoice
    json.Unmarshal(evt.Data.Raw, &invoice)

    userID := invoice.Subscription.Metadata["user_id"]

    h.db.LogPayment(userID, invoice.ID, invoice.Total, "succeeded")
}

// Handle: Payment failed (3-day grace period)
func (h *WebhookHandler) handlePaymentFailed(evt *stripe.Event) {
    var invoice stripe.Invoice
    json.Unmarshal(evt.Data.Raw, &invoice)

    userID := invoice.Subscription.Metadata["user_id"]

    // Log failure
    h.db.LogPayment(userID, invoice.ID, invoice.Total, "failed")

    // Send retry notification
    h.emailService.SendPaymentFailedNotice(userID, invoice.NextPaymentAttempt)

    // Schedule downgrade to Free after 3 days if not retried
    h.jobs.Enqueue("downgrade_on_failed_payment", map[string]interface{}{
        "user_id": userID,
        "invoice_id": invoice.ID,
    }, time.Now().Add(72*time.Hour))
}
```

### 2.4 Billing Portal & Testing

```go
// Redirect user to Stripe customer portal for self-service
func (h *BillingHandler) OpenPortal(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    user, _ := h.db.GetUser(userID)

    session, _ := billingportal.New(context.Background(), &stripe.BillingPortalSessionParams{
        Customer: stripe.String(user.StripeCustomerID),
        ReturnURL: stripe.String("https://app.ordo.com/settings/billing"),
    })

    http.Redirect(w, r, session.URL, http.StatusTemporaryRedirect)
}

// Testing: Use Stripe test mode
// Cards: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (decline)
// Use test clock for subscription lifecycle testing
```

---

## 3. OAuth Providers

Three OAuth providers for sign-in: Google, GitHub, Apple.

### 3.1 Google OAuth

**Scope**: User sign-in + YouTube analytics access.

```go
import (
    "github.com/coreos/go-oidc"
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/google"
)

type GoogleConfig struct {
    ClientID     string // env: GOOGLE_OAUTH_CLIENT_ID
    ClientSecret string // env: GOOGLE_OAUTH_CLIENT_SECRET
    RedirectURL  string // https://api.ordo.com/auth/google/callback
}

var googleOAuth2Config = &oauth2.Config{
    ClientID:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID"),
    ClientSecret: os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
    RedirectURL:  "https://api.ordo.com/auth/google/callback",
    Scopes: []string{
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/youtube.readonly", // For video analytics
    },
    Endpoint: google.Endpoint,
}

// Authorization Code with PKCE
func (h *AuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
    // Generate PKCE code challenge
    state := generateState()
    codeChallenge := generateCodeChallenge()
    codeVerifier := generateCodeVerifier()

    // Store in session
    h.session.Set(r, "oauth_state", state)
    h.session.Set(r, "code_verifier", codeVerifier)

    url := googleOAuth2Config.AuthCodeURL(state,
        oauth2.SetAuthURLParam("code_challenge", codeChallenge),
        oauth2.SetAuthURLParam("code_challenge_method", "S256"),
    )
    http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// Callback
func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
    code := r.URL.Query().Get("code")
    state := r.URL.Query().Get("state")
    codeVerifier := h.session.Get(r, "code_verifier")

    // Verify state
    if state != h.session.Get(r, "oauth_state") {
        http.Error(w, "Invalid state", http.StatusBadRequest)
        return
    }

    // Exchange code for token
    token, err := googleOAuth2Config.Exchange(context.Background(), code,
        oauth2.SetAuthURLParam("code_verifier", codeVerifier),
    )
    if err != nil {
        http.Error(w, "Exchange failed", http.StatusInternalServerError)
        return
    }

    // Verify ID token
    verifier, _ := oidc.NewProvider(context.Background(), "https://accounts.google.com")
    idToken, _ := verifier.Verifier(&oidc.Config{ClientID: googleOAuth2Config.ClientID}).Verify(context.Background(), token.Extra("id_token").(string))

    var claims map[string]interface{}
    idToken.Claims(&claims)

    // Find or create user
    user, _ := h.db.FindOrCreateUserFromOAuth(map[string]interface{}{
        "email": claims["email"],
        "name":  claims["name"],
        "oauth_provider": "google",
        "oauth_id": claims["sub"],
        "google_access_token": token.AccessToken,
        "google_refresh_token": token.RefreshToken,
    })

    // Create JWT session
    jwt := h.auth.SignJWT(user.ID, user.Email)
    http.SetCookie(w, &http.Cookie{
        Name:  "auth_token",
        Value: jwt,
        Path:  "/",
        HttpOnly: true,
        Secure: true,
    })

    http.Redirect(w, r, "https://app.ordo.com/dashboard", http.StatusTemporaryRedirect)
}

// Store encrypted tokens for YouTube API access
func (s *PublishingService) StoreGoogleTokens(userID string, accessToken, refreshToken string) {
    encrypted := s.crypto.Encrypt(accessToken)
    s.db.UpdateUser(userID, map[string]interface{}{
        "google_access_token_encrypted": encrypted,
        "google_refresh_token_encrypted": s.crypto.Encrypt(refreshToken),
    })
}

// Auto-refresh Google tokens before expiry
func (s *PublishingService) RefreshGoogleTokenIfNeeded(userID string) error {
    user, _ := s.db.GetUser(userID)
    if user.GoogleTokenExpiresAt.Before(time.Now().Add(5 * time.Minute)) {
        newToken, err := googleOAuth2Config.TokenSource(context.Background(), &oauth2.Token{
            RefreshToken: s.crypto.Decrypt(user.GoogleRefreshTokenEncrypted),
        }).Token()
        if err != nil {
            return err
        }
        s.StoreGoogleTokens(userID, newToken.AccessToken, newToken.RefreshToken)
    }
    return nil
}
```

### 3.2 GitHub OAuth

**Scope**: Sign-in only (no platform integration).

```go
import "golang.org/x/oauth2/github"

var githubOAuth2Config = &oauth2.Config{
    ClientID:     os.Getenv("GITHUB_OAUTH_CLIENT_ID"),
    ClientSecret: os.Getenv("GITHUB_OAUTH_CLIENT_SECRET"),
    RedirectURL:  "https://api.ordo.com/auth/github/callback",
    Scopes:       []string{"read:user", "user:email"},
    Endpoint:     github.Endpoint,
}

// Flow is identical to Google, but simpler (no YouTube token storage)
```

### 3.3 Apple Sign-In

**Scope**: iOS-specific sign-in with PKCE.

```go
import (
    "github.com/lestrrat-go/jwx/v2/jwt"
    "github.com/lestrrat-go/jwx/v2/jws"
)

type AppleConfig struct {
    TeamID       string // env: APPLE_TEAM_ID
    ClientID     string // env: APPLE_CLIENT_ID
    KeyID        string // env: APPLE_KEY_ID
    PrivateKey   string // env: APPLE_PRIVATE_KEY (base64)
}

// Authorization Code with PKCE (iOS app)
func (h *AuthHandler) AppleCallback(w http.ResponseWriter, r *http.Request) {
    code := r.FormValue("code")
    idToken := r.FormValue("id_token")
    user := r.FormValue("user")

    // Verify ID token
    claims, _ := jwt.Parse([]byte(idToken), jwt.WithVerify(false)) // Verify with Apple public key

    // Exchange code for token
    token, _ := h.exchangeAppleCode(code)

    // Find or create user
    user, _ := h.db.FindOrCreateUserFromOAuth(map[string]interface{}{
        "email": claims["email"],
        "name":  user, // From form
        "oauth_provider": "apple",
        "oauth_id": claims["sub"],
    })

    // Return JWT to mobile app
    jwt := h.auth.SignJWT(user.ID, user.Email)
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "token": jwt,
    })
}

// Helper: Exchange Apple authorization code for token
func (h *AuthHandler) exchangeAppleCode(code string) (string, error) {
    // Generate client secret JWT
    clientSecret := h.generateAppleClientSecret()

    params := url.Values{
        "client_id": {h.appleConfig.ClientID},
        "client_secret": {clientSecret},
        "code": {code},
        "grant_type": {"authorization_code"},
    }

    resp, _ := http.PostForm("https://appleid.apple.com/auth/token", params)
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result["access_token"].(string), nil
}

// Helper: Generate Apple client secret (JWT signed with private key)
func (h *AuthHandler) generateAppleClientSecret() string {
    token := jwt.New()
    token.Set("iss", h.appleConfig.TeamID)
    token.Set("aud", "https://appleid.apple.com")
    token.Set("sub", h.appleConfig.ClientID)
    token.Set("exp", time.Now().Add(time.Minute*5).Unix())

    // Sign with private key
    signed, _ := jwt.Sign(token, jwt.WithKey(jws.SignatureAlgorithmES256, h.applePrivateKey))
    return string(signed)
}
```

---

## 4. Storage: AWS S3 / MinIO

All media (images, videos, audio, documents) are uploaded directly to S3 from clients via presigned URLs.

### 4.1 Configuration & Buckets

```go
import (
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type S3Config struct {
    Region         string // "us-east-1"
    Bucket         string // "ordo-uploads", "ordo-media", "ordo-exports"
    AccessKeyID    string // env: AWS_ACCESS_KEY_ID
    SecretKey      string // env: AWS_SECRET_ACCESS_KEY
    MinIOEndpoint  string // env: MINIO_ENDPOINT (for dev)
}

// Three buckets
const (
    BucketUploads = "ordo-uploads"    // Raw user uploads
    BucketMedia   = "ordo-media"      // Processed media (thumbnails, transcoded video)
    BucketExports = "ordo-exports"    // Content exports (PDFs, CSVs)
)

// Initialize S3 client (auto-switch to MinIO if endpoint is set)
func NewS3Client(cfg *S3Config) *s3.Client {
    awsCfg, _ := config.LoadDefaultConfig(context.Background())

    if cfg.MinIOEndpoint != "" {
        // Use MinIO for dev
        customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
            return aws.Endpoint{
                URL: cfg.MinIOEndpoint,
            }, nil
        })
        awsCfg.EndpointResolverWithOptions = customResolver
    }

    return s3.NewFromConfig(awsCfg)
}
```

### 4.2 Presigned URL Upload Flow

Clients upload directly to S3, bypassing the backend. This is more efficient and scales better.

```go
import "github.com/aws/aws-sdk-go-v2/service/s3/types"

// Step 1: User requests upload → Backend generates presigned URL
func (h *MediaHandler) RequestUploadURL(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    fileName := r.URL.Query().Get("name")
    fileSize := r.URL.Query().Get("size")
    contentType := r.URL.Query().Get("type") // image/jpeg, video/mp4, etc.

    // Validate
    if !isAllowedMimeType(contentType) {
        http.Error(w, "File type not allowed", http.StatusBadRequest)
        return
    }
    if !isAllowedSize(contentType, fileSize) {
        http.Error(w, "File too large", http.StatusBadRequest)
        return
    }

    // Generate unique key
    key := fmt.Sprintf("%s/%s/%s", userID, time.Now().Format("2006-01-02"), uuid.New().String())

    // Generate presigned URL (15-minute expiry)
    presigner := s3.NewPresignClient(h.s3Client)
    request, _ := presigner.PresignPutObject(context.Background(), &s3.PutObjectInput{
        Bucket:      aws.String(BucketUploads),
        Key:         aws.String(key),
        ContentType: aws.String(contentType),
        Metadata: map[string]string{
            "user_id": userID,
        },
    }, func(opts *s3.PresignOptions) {
        opts.Expires = duration.NewDuration(15 * time.Minute)
    })

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "url": request.URL,
        "key": key,
    })
}

// Allowed file types and sizes
var allowedTypes = map[string]string{
    "image": "10MB",   // jpg, png, webp
    "video": "2GB",    // mp4, mov, webm
    "audio": "500MB",  // mp3, wav, m4a
    "document": "50MB", // pdf
}

func isAllowedMimeType(mimeType string) bool {
    allowed := []string{
        "image/jpeg", "image/png", "image/webp",
        "video/mp4", "video/quicktime", "video/webm",
        "audio/mpeg", "audio/wav", "audio/x-m4a",
        "application/pdf",
    }
    for _, t := range allowed {
        if mimeType == t {
            return true
        }
    }
    return false
}

func isAllowedSize(mimeType string, sizeStr string) bool {
    size, _ := strconv.ParseInt(sizeStr, 10, 64)
    limits := map[string]int64{
        "image": 10 * 1024 * 1024,        // 10MB
        "video": 2 * 1024 * 1024 * 1024,  // 2GB
        "audio": 500 * 1024 * 1024,       // 500MB
        "application/pdf": 50 * 1024 * 1024, // 50MB
    }
    for prefix, limit := range limits {
        if strings.HasPrefix(mimeType, prefix) {
            return size <= limit
        }
    }
    return false
}

// Step 2: Client uploads directly to presigned URL
// (No backend involvement — S3 handles auth via signature)

// Step 3: Client confirms upload → Backend triggers async processing
func (h *MediaHandler) ConfirmUpload(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    key := r.FormValue("key")
    originalName := r.FormValue("name")
    contentType := r.FormValue("type")

    // Enqueue async job to process media
    h.jobs.Enqueue("process_media", map[string]interface{}{
        "user_id": userID,
        "s3_key": key,
        "original_name": originalName,
        "content_type": contentType,
    })

    w.WriteHeader(http.StatusAccepted)
}

// Step 4: Async processing job (triggered by Asynq)
func (h *MediaService) ProcessMedia(ctx context.Context, userID, s3Key, originalName, contentType string) error {
    // Check file exists in S3
    headObj, _ := h.s3Client.HeadObject(ctx, &s3.HeadObjectInput{
        Bucket: aws.String(BucketUploads),
        Key:    aws.String(s3Key),
    })

    // Determine type and process
    switch {
    case strings.HasPrefix(contentType, "image"):
        return h.processImage(ctx, userID, s3Key)
    case strings.HasPrefix(contentType, "video"):
        return h.processVideo(ctx, userID, s3Key)
    case strings.HasPrefix(contentType, "audio"):
        return h.processAudio(ctx, userID, s3Key)
    }
    return nil
}

// Helper: Generate thumbnail for images
func (h *MediaService) processImage(ctx context.Context, userID, s3Key string) error {
    // Download from S3
    obj, _ := h.s3Client.GetObject(ctx, &s3.GetObjectInput{
        Bucket: aws.String(BucketUploads),
        Key:    aws.String(s3Key),
    })

    // Create thumbnail
    img, _ := imaging.Decode(obj.Body)
    thumb := imaging.Thumbnail(img, 200, 200, imaging.Lanczos)

    // Upload thumbnail
    thumbKey := fmt.Sprintf("%s/thumbs/%s", userID, filepath.Base(s3Key))
    h.s3Client.PutObject(ctx, &s3.PutObjectInput{
        Bucket:      aws.String(BucketMedia),
        Key:         aws.String(thumbKey),
        Body:        imageToReader(thumb),
        ContentType: aws.String("image/jpeg"),
    })

    // Update DB with processed media record
    h.db.CreateMediaRecord(userID, s3Key, thumbKey, "image")
    return nil
}
```

### 4.3 Download Flow (Download & Export)

```go
// Generate presigned download URL (1-hour expiry)
func (h *MediaHandler) GetDownloadURL(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    mediaID := r.URL.Query().Get("id")

    // Verify user owns media
    media, _ := h.db.GetMedia(mediaID)
    if media.UserID != userID {
        http.Error(w, "Unauthorized", http.StatusForbidden)
        return
    }

    // Generate presigned URL (1-hour expiry)
    presigner := s3.NewPresignClient(h.s3Client)
    request, _ := presigner.PresignGetObject(context.Background(), &s3.GetObjectInput{
        Bucket: aws.String(BucketMedia),
        Key:    aws.String(media.S3Key),
    }, func(opts *s3.PresignOptions) {
        opts.Expires = duration.NewDuration(1 * time.Hour)
    })

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "url": request.URL,
    })
}
```

---

## 5. Email: AWS SES (Prod) / MailHog (Dev)

All transactional emails (welcome, password reset, subscription updates, digests) go through SES with fallback to MailHog for dev.

### 5.1 Configuration

```go
import (
    "github.com/aws/aws-sdk-go-v2/service/sesv2"
    "github.com/aws/aws-sdk-go-v2/service/sesv2/types"
)

type EmailConfig struct {
    Provider      string // "ses" or "mailhog"
    FromAddress   string // "noreply@ordo.com"
    ReplyTo       string // "support@ordo.com"
    SESRegion     string // "us-east-1"
    MailHogHost   string // "localhost:1025" (SMTP)
}

// SES client (prod)
var sesClient *sesv2.Client

// Net/SMTP for MailHog (dev)
var smtpDialer *mail.Dialer
```

### 5.2 Email Templates

All templates are stored in code and rendered server-side.

```go
import "html/template"

type EmailTemplate struct {
    name    string
    subject string
    tmpl    *template.Template
}

var emailTemplates = map[string]*EmailTemplate{
    "welcome": {
        name:    "welcome",
        subject: "Welcome to Ordo",
        tmpl: template.Must(template.New("welcome").Parse(`
            <h1>Welcome to Ordo, {{.Name}}!</h1>
            <p>You're one step away from creating like never before.</p>
            <p><a href="{{.ActivationLink}}">Activate your account</a></p>
        `)),
    },
    "password_reset": {
        name:    "password_reset",
        subject: "Reset your Ordo password",
        tmpl: template.Must(template.New("password_reset").Parse(`
            <p>Hi {{.Name}},</p>
            <p>Click below to reset your password:</p>
            <p><a href="{{.ResetLink}}">Reset password</a></p>
            <p>This link expires in 1 hour.</p>
        `)),
    },
    "subscription_confirmed": {
        name:    "subscription_confirmed",
        subject: "Your Ordo {{.Tier}} subscription is active",
        tmpl: template.Must(template.New("subscription_confirmed").Parse(`
            <p>Welcome to Ordo {{.Tier}}, {{.Name}}!</p>
            <p>Your subscription is active. You now have:</p>
            <ul>
                <li>{{.TokenBudget}} AI tokens/month</li>
                <li>Unlimited content management</li>
                <li>Priority support</li>
            </ul>
        `)),
    },
    "weekly_digest": {
        name:    "weekly_digest",
        subject: "Your Ordo weekly digest",
        tmpl: template.Must(template.New("weekly_digest").Parse(`
            <p>Hi {{.Name}},</p>
            <p>Here's what happened this week:</p>
            <p><strong>Views:</strong> {{.TotalViews}} (+{{.ViewsGrowth}}%)</p>
            <p><strong>Engagement:</strong> {{.TotalEngagement}} interactions</p>
            <p><strong>Top post:</strong> {{.TopPost}}</p>
            <p><a href="https://app.ordo.com/analytics">See full analytics</a></p>
        `)),
    },
}

// Render and send email
type EmailService struct {
    sesClient *sesv2.Client
    smtpDialer *mail.Dialer
    config *EmailConfig
    log *zap.Logger
}

func (s *EmailService) Send(recipient, templateName string, data interface{}) error {
    tmpl := emailTemplates[templateName]
    if tmpl == nil {
        return fmt.Errorf("template not found: %s", templateName)
    }

    // Render body
    var body bytes.Buffer
    tmpl.tmpl.Execute(&body, data)

    // Send via SES (prod) or SMTP (dev)
    if s.config.Provider == "ses" {
        return s.sendViaSES(recipient, tmpl.subject, body.String())
    } else {
        return s.sendViaMailHog(recipient, tmpl.subject, body.String())
    }
}

// Send via AWS SES (prod)
func (s *EmailService) sendViaSES(to, subject, htmlBody string) error {
    _, err := s.sesClient.SendEmail(context.Background(), &sesv2.SendEmailInput{
        FromEmailAddress: aws.String(s.config.FromAddress),
        Destination: &types.Destination{
            ToAddresses: []string{to},
        },
        Content: &types.EmailContent{
            Simple: &types.Message{
                Subject: &types.Content{
                    Data: aws.String(subject),
                },
                Body: &types.Body{
                    Html: &types.Content{
                        Data: aws.String(htmlBody),
                    },
                },
            },
        },
    })
    if err != nil {
        s.log.Error("SES send failed", zap.Error(err))
        // Optionally fallback to MailHog or queue for retry
    }
    return err
}

// Send via SMTP (MailHog, dev)
func (s *EmailService) sendViaMailHog(to, subject, htmlBody string) error {
    msg := mail.NewMessage()
    msg.SetHeader("From", s.config.FromAddress)
    msg.SetHeader("To", to)
    msg.SetHeader("Subject", subject)
    msg.SetBody("text/html", htmlBody)

    return s.smtpDialer.DialAndSend(msg)
}

// Helper: Send welcome email on signup
func (s *EmailService) SendWelcome(userID, email, name string) {
    s.Send(email, "welcome", map[string]interface{}{
        "Name": name,
        "ActivationLink": fmt.Sprintf("https://app.ordo.com/activate?token=%s", generateToken()),
    })
}

// Helper: Send weekly digest (scheduled job)
func (s *EmailService) SendWeeklyDigest(userID, email string) {
    analytics, _ := s.analyticsService.GetWeeklyStats(userID)
    s.Send(email, "weekly_digest", map[string]interface{}{
        "Name": analytics.UserName,
        "TotalViews": analytics.Views,
        "ViewsGrowth": analytics.ViewsGrowth,
        "TotalEngagement": analytics.Engagement,
        "TopPost": analytics.TopPostTitle,
    })
}
```

### 5.3 Bounce Handling

SES sends bounce notifications to SNS, which triggers a Lambda to mark email invalid.

```go
// Bounce event from SES → SNS → Lambda
// Lambda marks user's email as invalid
func handleSESBounce(ctx context.Context, snsEvent *sns.SNSEvent) error {
    for _, record := range snsEvent.Records {
        var sesNotification struct {
            EventType string `json:"eventType"`
            Bounce struct {
                BounceType string `json:"bounceType"`
                BouncedRecipients []struct {
                    EmailAddress string `json:"emailAddress"`
                } `json:"bouncedRecipients"`
            } `json:"bounce"`
        }
        json.Unmarshal([]byte(record.SNS.Message), &sesNotification)

        if sesNotification.EventType == "Bounce" {
            for _, recipient := range sesNotification.Bounce.BouncedRecipients {
                // Mark email invalid in DB
                db.UpdateUserEmail(recipient.EmailAddress, map[string]interface{}{
                    "email_valid": false,
                    "bounce_type": sesNotification.Bounce.BounceType,
                })
            }
        }
    }
    return nil
}
```

---

## 6. Platform APIs: YouTube, Instagram, TikTok, Twitter/X, LinkedIn

Ordo integrates with creator platforms for analytics and publishing. Each platform implements a common interface.

### 6.1 Platform Provider Interface

```go
type PlatformProvider interface {
    // Fetch analytics for connected account
    FetchAnalytics(ctx context.Context, accountID string) (*AnalyticsData, error)

    // Publish content to platform
    Publish(ctx context.Context, accountID string, content *PublishRequest) (string, error)

    // Get profile info
    GetProfile(ctx context.Context, accountID string) (*ProfileData, error)

    // Refresh tokens if needed
    RefreshTokens(ctx context.Context, accountID string) error

    // Name of platform
    Name() string
}

type AnalyticsData struct {
    Views          int64
    Likes          int64
    Comments       int64
    Shares         int64
    Engagement     float64
    ReachUnique    int64
    Impressions    int64
    SavesShares    int64
    FetchedAt      time.Time
}

type PublishRequest struct {
    Title       string
    Description string
    Content     []byte // Video file or image
    ThumbnailURL string
    Tags        []string
}

type ProfileData struct {
    ID          string
    Username    string
    DisplayName string
    Followers   int64
    ProfileURL  string
}
```

### 6.2 YouTube Data API v3

```go
import "google.golang.org/api/youtube/v3"

type YouTubeProvider struct {
    client *http.Client
    service *youtube.Service
}

// Fetch channel analytics (views, likes, comments)
func (yt *YouTubeProvider) FetchAnalytics(ctx context.Context, channelID string) (*AnalyticsData, error) {
    // Use YouTube Reporting API to fetch video stats
    // Returns: views, likes, comments, shares, engagement

    call := yt.service.Channels.List([]string{"statistics"}).
        Id(channelID).
        Context(ctx)

    resp, _ := call.Do()
    stats := resp.Items[0].Statistics

    return &AnalyticsData{
        Views: stats.ViewCount,
        // ... map other fields
    }, nil
}

// Upload video to YouTube (future feature)
func (yt *YouTubeProvider) Publish(ctx context.Context, accountID string, req *PublishRequest) (string, error) {
    video := &youtube.Video{
        Snippet: &youtube.VideoSnippet{
            Title:       req.Title,
            Description: req.Description,
            Tags:        req.Tags,
        },
        Status: &youtube.VideoStatus{
            PrivacyStatus: "unlisted", // Default: unlisted until creator confirms
        },
    }

    call := yt.service.Videos.Insert([]string{"snippet", "status"}, video).
        Media(bytes.NewReader(req.Content)).
        Context(ctx)

    resp, _ := call.Do()
    return resp.Id, nil
}

func (yt *YouTubeProvider) Name() string { return "youtube" }
```

### 6.3 Instagram Graph API (via Meta)

```go
import "github.com/facebook/facebook-sdk-go"

type InstagramProvider struct {
    client *fb.Client
}

// Fetch Instagram insights
func (ig *InstagramProvider) FetchAnalytics(ctx context.Context, accountID string) (*AnalyticsData, error) {
    // accountID = Instagram Business Account ID

    params := fb.Params{
        "fields": "insights.metric(impressions,reach,profile_views,website_clicks)",
    }

    result, _ := ig.client.Get("/"+accountID, params)

    insights := result["insights"].([]interface{})
    var analytics AnalyticsData
    for _, insight := range insights {
        m := insight.(map[string]interface{})
        // Parse metrics and populate analytics
    }
    return &analytics, nil
}

// Publish post via Later API (schedule)
func (ig *InstagramProvider) Publish(ctx context.Context, accountID string, req *PublishRequest) (string, error) {
    // Ordo uses Later for Instagram scheduling (not direct API)
    // This returns a "pending approval" ID until creator approves
    return "", fmt.Errorf("use Later API for scheduling")
}

func (ig *InstagramProvider) Name() string { return "instagram" }
```

### 6.4 TikTok API

```go
type TikTokProvider struct {
    clientID     string
    clientSecret string
    accessToken  string // Per-account token
}

// Fetch video analytics
func (tt *TikTokProvider) FetchAnalytics(ctx context.Context, accountID string) (*AnalyticsData, error) {
    // TikTok API returns: views, likes, comments, shares

    req, _ := http.NewRequest("GET", "https://open.tiktokapis.com/v1/post/query", nil)
    q := req.URL.Query()
    q.Add("access_token", tt.accessToken)
    q.Add("fields", "id,title,like_count,comment_count,share_count,view_count")
    req.URL.RawQuery = q.Encode()

    resp, _ := http.DefaultClient.Do(req)
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    // Parse and return analytics
    return &AnalyticsData{}, nil
}

func (tt *TikTokProvider) Name() string { return "tiktok" }
```

### 6.5 Twitter/X API v2

```go
type TwitterProvider struct {
    bearerToken string // OAuth token per account
}

// Fetch tweet engagement
func (tw *TwitterProvider) FetchAnalytics(ctx context.Context, accountID string) (*AnalyticsData, error) {
    // Query recent tweets and their metrics

    req, _ := http.NewRequest("GET", "https://api.twitter.com/2/tweets/search/recent", nil)
    q := req.URL.Query()
    q.Add("query", fmt.Sprintf("from:%s", accountID))
    q.Add("tweet.fields", "public_metrics")
    req.URL.RawQuery = q.Encode()

    req.Header.Add("Authorization", "Bearer "+tw.bearerToken)

    resp, _ := http.DefaultClient.Do(req)
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)

    return &AnalyticsData{}, nil
}

func (tw *TwitterProvider) Name() string { return "twitter" }
```

### 6.6 Platform Manager (Multi-Provider)

```go
type PlatformManager struct {
    providers   map[string]PlatformProvider
    db          *DB
    rateLimiter map[string]*RateLimiter // Per-platform limits
}

// Sync analytics for all connected accounts
func (pm *PlatformManager) SyncAllAnalytics(ctx context.Context, userID string) error {
    accounts, _ := pm.db.GetPublishingAccounts(userID)

    for _, acct := range accounts {
        provider := pm.providers[acct.Platform]

        // Check rate limit
        if pm.rateLimiter[acct.Platform].Allow() {
            analytics, _ := provider.FetchAnalytics(ctx, acct.AccountID)
            pm.db.SaveAnalytics(acct.ID, analytics)
        }
    }
    return nil
}

// Refresh tokens in background (before expiry)
func (pm *PlatformManager) RefreshTokensJob(ctx context.Context, userID, platform string) error {
    provider := pm.providers[platform]
    accounts, _ := pm.db.GetPublishingAccounts(userID)

    for _, acct := range accounts {
        if acct.Platform == platform && acct.TokenExpiresAt.Before(time.Now().Add(1*time.Hour)) {
            provider.RefreshTokens(ctx, acct.AccountID)
        }
    }
    return nil
}

// Publish to platform
func (pm *PlatformManager) PublishContent(ctx context.Context, userID, platform, accountID string, content *PublishRequest) (string, error) {
    provider := pm.providers[platform]
    postID, err := provider.Publish(ctx, accountID, content)
    if err != nil {
        return "", err
    }

    // Log publish event
    pm.db.LogPublishEvent(userID, platform, accountID, postID)
    return postID, nil
}

// Rate limiting per platform
type RateLimiter struct {
    limiter *rate.Limiter
    mu      sync.Mutex
}

func (rl *RateLimiter) Allow() bool {
    return rl.limiter.Allow()
}

// Configure rate limits per platform
var platformRateLimits = map[string]rate.Limit{
    "youtube": rate.Limit(10000 / (24 * 3600)), // 10k units/day
    "instagram": rate.Limit(200 / 3600),         // 200 calls/hour
    "tiktok": rate.Limit(300 / 60),              // 300 calls/min
    "twitter": rate.Limit(450 / 900),            // 450 calls/15min
    "linkedin": rate.Limit(100 / 3600),          // 100 calls/hour
}
```

---

## 7. Real-time: Gorilla WebSocket

Live collaboration and notifications use WebSocket (via Gorilla).

### 7.1 Connection Management

```go
import (
    "github.com/gorilla/websocket"
    "sync"
)

type Hub struct {
    clients    map[*Client]bool          // All connected clients
    broadcast  chan *Message             // Broadcast messages
    register   chan *Client              // Register new client
    unregister chan *Client              // Unregister client
    rooms      map[string]map[*Client]bool // Room-based routing
    mu         sync.RWMutex
}

type Client struct {
    hub      *Hub
    conn     *websocket.Conn
    userID   string
    room     string
    send     chan *Message
    pingTicker *time.Ticker
}

type Message struct {
    Type      string                 `json:"type"` // "edit", "comment", "notification"
    Content   map[string]interface{} `json:"content"`
    UserID    string                 `json:"user_id"`
    Room      string                 `json:"room"`
    Timestamp time.Time              `json:"timestamp"`
}

// Handle WebSocket connection
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
    userID := r.Header.Get("X-User-ID")
    room := r.URL.Query().Get("room") // workspace:123

    conn, _ := upgrader.Upgrade(w, r, nil)
    client := &Client{
        hub:      h,
        conn:     conn,
        userID:   userID,
        room:     room,
        send:     make(chan *Message, 256),
        pingTicker: time.NewTicker(30 * time.Second),
    }

    h.register <- client
    go client.readLoop()
    go client.writeLoop()
}

// Hub loop
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.rooms[client.room][client] = true
            h.mu.Unlock()
            log.Printf("Client registered: %s in room %s", client.userID, client.room)

        case client := <-h.unregister:
            h.mu.Lock()
            delete(h.clients, client)
            delete(h.rooms[client.room], client)
            h.mu.Unlock()
            close(client.send)

        case msg := <-h.broadcast:
            h.mu.RLock()
            for client := range h.rooms[msg.Room] {
                client.send <- msg
            }
            h.mu.RUnlock()
        }
    }
}

// Read from WebSocket
func (c *Client) readLoop() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })

    for {
        var msg Message
        err := c.conn.ReadJSON(&msg)
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocket error: %v", err)
            }
            break
        }

        msg.UserID = c.userID
        msg.Room = c.room
        msg.Timestamp = time.Now()
        c.hub.broadcast <- &msg
    }
}

// Write to WebSocket + heartbeat
func (c *Client) writeLoop() {
    defer c.pingTicker.Stop()

    for {
        select {
        case msg := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := c.conn.WriteJSON(msg); err != nil {
                return
            }

        case <-c.pingTicker.C:
            c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

### 7.2 Room-Based Routing

```go
// Broadcast to specific workspace
func (h *Hub) BroadcastToRoom(room string, msg *Message) {
    h.mu.RLock()
    for client := range h.rooms[room] {
        client.send <- msg
    }
    h.mu.RUnlock()
}

// Message types
const (
    TypeContentEdit    = "content_edit"    // Live editing
    TypeCommentAdded   = "comment_added"   // New comment
    TypeNotification   = "notification"    // Real-time notification
    TypePresence       = "presence"        // Who's editing now
)

// Example: Broadcast when content is edited
func (s *ContentService) UpdateScript(userID, scriptID string, delta []byte) error {
    s.db.UpdateScript(scriptID, delta)

    // Notify collaborators in real-time
    s.hub.BroadcastToRoom("workspace:123", &Message{
        Type: TypeContentEdit,
        Content: map[string]interface{}{
            "script_id": scriptID,
            "delta": string(delta),
        },
    })
    return nil
}
```

---

## 8. Background Jobs: Asynq (Redis-Based)

All async work (remix processing, analytics sync, email, scheduling) uses Asynq.

### 8.1 Job Types & Configuration

```go
import "github.com/hibiken/asynq"

// Job types
const (
    TypeRemixProcess        = "remix:process"
    TypeAnalyticsSync       = "analytics:sync"
    TypeEmailSend           = "email:send"
    TypePublishScheduled    = "publish:scheduled"
    TypeNotificationDeliver = "notification:deliver"
    TypeTokenRefresh        = "token:refresh"
)

// Initialize Asynq client and server
var (
    asynqClient *asynq.Client
    asynqServer *asynq.Server
)

func initAsynq() {
    asynqClient = asynq.NewClient(asynq.RedisClientOpt{Addr: "localhost:6379"})

    asynqServer = asynq.NewServer(
        asynq.RedisClientOpt{Addr: "localhost:6379"},
        asynq.Config{
            Concurrency: 10,
            Queues: map[string]int{
                "default": 6,
                "critical": 4,
            },
            RetryDeltas: []time.Duration{
                5 * time.Second,
                10 * time.Second,
                20 * time.Second,
            },
            LogLevel: log.InfoLevel,
        },
    )
}
```

### 8.2 Job Definition & Handlers

```go
// Job: Process remix (convert one content format to another)
func EnqueueRemixProcess(userID, contentID string) (string, error) {
    payload, _ := json.Marshal(map[string]string{
        "user_id": userID,
        "content_id": contentID,
    })

    task := asynq.NewTask(TypeRemixProcess, payload)
    info, err := asynqClient.Enqueue(task, asynq.Queue("default"))
    return info.ID, err
}

func HandleRemixProcess(ctx context.Context, t *asynq.Task) error {
    var payload struct {
        UserID    string `json:"user_id"`
        ContentID string `json:"content_id"`
    }
    if err := json.Unmarshal(t.Payload(), &payload); err != nil {
        return fmt.Errorf("unmarshal failed: %w", asynq.SkipRetry)
    }

    // Process remix (analyze, generate variations, etc.)
    log.Printf("Processing remix for %s", payload.ContentID)
    // ... actual processing logic

    return nil
}

// Job: Sync analytics for user
func EnqueueAnalyticsSync(userID string) error {
    payload, _ := json.Marshal(map[string]string{"user_id": userID})
    task := asynq.NewTask(TypeAnalyticsSync, payload)
    _, err := asynqClient.Enqueue(task, asynq.Queue("default"))
    return err
}

func HandleAnalyticsSync(ctx context.Context, t *asynq.Task) error {
    var payload struct {
        UserID string `json:"user_id"`
    }
    json.Unmarshal(t.Payload(), &payload)

    // Sync analytics from all connected platforms
    platformMgr.SyncAllAnalytics(ctx, payload.UserID)

    return nil
}

// Job: Send email
func EnqueueEmailSend(to, templateName string, data map[string]interface{}) error {
    payload, _ := json.Marshal(map[string]interface{}{
        "to": to,
        "template_name": templateName,
        "data": data,
    })
    task := asynq.NewTask(TypeEmailSend, payload)
    _, err := asynqClient.Enqueue(task, asynq.Queue("critical"))
    return err
}

func HandleEmailSend(ctx context.Context, t *asynq.Task) error {
    var payload struct {
        To           string                 `json:"to"`
        TemplateName string                 `json:"template_name"`
        Data         map[string]interface{} `json:"data"`
    }
    json.Unmarshal(t.Payload(), &payload)

    emailService.Send(payload.To, payload.TemplateName, payload.Data)
    return nil
}

// Job: Publish scheduled content
func EnqueuePublishScheduled(userID, contentID string, scheduleTime time.Time) error {
    payload, _ := json.Marshal(map[string]interface{}{
        "user_id": userID,
        "content_id": contentID,
    })

    task := asynq.NewTask(TypePublishScheduled, payload)
    _, err := asynqClient.Enqueue(
        task,
        asynq.Queue("default"),
        asynq.ProcessAt(scheduleTime), // Process at specific time
    )
    return err
}

func HandlePublishScheduled(ctx context.Context, t *asynq.Task) error {
    var payload struct {
        UserID    string `json:"user_id"`
        ContentID string `json:"content_id"`
    }
    json.Unmarshal(t.Payload(), &payload)

    // Publish to all connected platforms
    content, _ := db.GetContent(payload.ContentID)
    for _, platform := range content.PublishPlatforms {
        platformMgr.PublishContent(ctx, payload.UserID, platform, content)
    }

    return nil
}

// Register all handlers
func registerAsynqHandlers(mux *asynq.ServeMux) {
    mux.HandleFunc(TypeRemixProcess, HandleRemixProcess)
    mux.HandleFunc(TypeAnalyticsSync, HandleAnalyticsSync)
    mux.HandleFunc(TypeEmailSend, HandleEmailSend)
    mux.HandleFunc(TypePublishScheduled, HandlePublishScheduled)
}
```

### 8.3 Retry & Dead Letter Queue

```go
// Job fails 3 times → moved to dead letter queue
// Admin dashboard shows dead letter queue for manual intervention

// Inspect job status
func InspectJob(taskID string) {
    info, _ := asynqClient.GetTaskInfo(context.Background(), "", taskID)
    fmt.Printf("State: %v\n", info.State)
    if info.LastErr != "" {
        fmt.Printf("Last error: %s\n", info.LastErr)
    }
}

// Asynq web UI dashboard
// Accessible at: http://localhost:8080 (built-in)
// Shows: queues, active jobs, scheduled, completed, failed
```

---

## 9. Monitoring: DataDog / CloudWatch

### 9.1 Metrics

```go
import (
    "github.com/DataDog/datadog-go/v5/statsd"
    "github.com/prometheus/client_golang/prometheus"
)

type Metrics struct {
    ddClient *statsd.Client

    // Prometheus metrics
    apiLatency     prometheus.Histogram
    errorRate      prometheus.Counter
    aiTokensUsed   prometheus.Counter
    activeUsers    prometheus.Gauge
}

func (m *Metrics) RecordAPILatency(endpoint string, duration time.Duration) {
    m.ddClient.Histogram("api.latency", float64(duration.Milliseconds()),
        []string{"endpoint:" + endpoint})

    m.apiLatency.WithLabelValues(endpoint).Observe(duration.Seconds())
}

func (m *Metrics) RecordError(endpoint, errorType string) {
    m.ddClient.Incr("api.errors",
        []string{"endpoint:" + endpoint, "error:" + errorType})

    m.errorRate.WithLabelValues(endpoint, errorType).Inc()
}

func (m *Metrics) RecordAITokensUsed(provider string, tokens int) {
    m.ddClient.Count("ai.tokens.used", int64(tokens),
        []string{"provider:" + provider})

    m.aiTokensUsed.WithLabelValues(provider).Add(float64(tokens))
}

func (m *Metrics) SetActiveUsers(count int) {
    m.ddClient.Gauge("app.active_users", float64(count), nil)
    m.activeUsers.Set(float64(count))
}
```

### 9.2 Distributed Tracing (OpenTelemetry)

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initTracing() *trace.TracerProvider {
    exporter, _ := otlptrace.NewExporter(context.Background())
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)
    return tp
}

// Trace a function
func (s *AIService) ChatWithTracing(ctx context.Context, msg string) (string, error) {
    tracer := otel.Tracer("ai-service")
    ctx, span := tracer.Start(ctx, "chat")
    defer span.End()

    span.SetAttributes(
        attribute.String("user_id", userID),
        attribute.String("model", "claude-sonnet"),
    )

    resp, err := s.Chat(ctx, msg)
    if err != nil {
        span.RecordError(err)
    }
    return resp, err
}
```

### 9.3 Health Endpoints

```go
// Basic health check
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "status": "healthy",
    })
}

// Readiness check (dependencies: DB, Redis, AI)
func (h *HealthHandler) Ready(w http.ResponseWriter, r *http.Request) {
    checks := map[string]bool{
        "database": h.db.Ping(),
        "redis": h.redis.Ping(),
        "claude": h.aiRouter.IsProviderHealthy("claude"),
    }

    allReady := true
    for _, ready := range checks {
        if !ready {
            allReady = false
            break
        }
    }

    status := http.StatusOK
    if !allReady {
        status = http.StatusServiceUnavailable
    }

    w.WriteHeader(status)
    json.NewEncoder(w).Encode(checks)
}
```

---

## 10. Integration Testing Strategy

### 10.1 Test Doubles (Unit Tests)

```go
// Mock AI provider for unit tests
type MockAIProvider struct{}

func (m *MockAIProvider) Chat(ctx context.Context, msg string, opts ...Option) (string, error) {
    return "Mocked response", nil
}

func (m *MockAIProvider) Generate(ctx context.Context, prompt string, opts ...Option) (string, error) {
    return "Generated content", nil
}

// Use in tests
func TestChatFlow(t *testing.T) {
    router := &AIRouter{
        primary: &MockAIProvider{},
    }

    resp, _ := router.Chat(context.Background(), &ChatRequest{Content: "Hello"})
    if resp.Message != "Mocked response" {
        t.Fail()
    }
}
```

### 10.2 Integration Tests (Real Services)

```go
// Integration test with real Stripe test mode
func TestStripeSubscription(t *testing.T) {
    stripe.Key = os.Getenv("STRIPE_TEST_SECRET_KEY")

    // Create test customer
    cust, _ := customer.New(context.Background(), &stripe.CustomerParams{
        Email: stripe.String("test@ordo.com"),
    })

    // Create subscription
    sub, _ := subscription.New(context.Background(), &stripe.SubscriptionParams{
        Customer: stripe.String(cust.ID),
        Items: []*stripe.SubscriptionItemsParams{
            {
                Price: stripe.String("price_test_123"),
            },
        },
    })

    if sub.Status != stripe.SubscriptionStatusActive {
        t.Fail()
    }
}

// Integration test with real S3 / MinIO
func TestS3Upload(t *testing.T) {
    client := NewS3Client(&S3Config{
        MinIOEndpoint: "http://localhost:9000",
    })

    // Upload test file
    _, _ := client.PutObject(context.Background(), &s3.PutObjectInput{
        Bucket: aws.String("test-bucket"),
        Key: aws.String("test.txt"),
        Body: strings.NewReader("test content"),
    })

    // Verify file exists
    _, err := client.HeadObject(context.Background(), &s3.HeadObjectInput{
        Bucket: aws.String("test-bucket"),
        Key: aws.String("test.txt"),
    })

    if err != nil {
        t.Fail()
    }
}
```

### 10.3 E2E Tests (Full Flow)

```go
// E2E: User signup → subscribe → publish content
func TestFullFlow(t *testing.T) {
    // 1. Sign up via Google OAuth
    user := signupViaGoogle("test@gmail.com")

    // 2. Upgrade to Pro (Stripe)
    subscription := createStripeSubscription(user.ID, "pro")

    // 3. Connect YouTube
    connectYouTubeAccount(user.ID)

    // 4. Upload media to S3
    mediaID := uploadMedia(user.ID, "video.mp4")

    // 5. Create script with AI (Claude)
    script := generateScriptWithAI(user.ID, "Faceless YouTube channel")

    // 6. Schedule publish
    schedulePublish(user.ID, script.ID, []string{"youtube"}, time.Now().Add(24*time.Hour))

    // 7. Verify job was enqueued
    jobs := getScheduledJobs(user.ID)
    if len(jobs) == 0 {
        t.Fail()
    }

    // 8. Verify analytics sync happens
    syncAnalytics(user.ID)
    analytics := getAnalytics(user.ID)
    if analytics.Views == 0 {
        t.Fail()
    }
}
```

---

## Summary: Integration Map

| Component | Provider | Purpose | Config | Errors |
|-----------|----------|---------|--------|--------|
| Chat AI | Claude | Generate content | API key, model, timeout | Retry 3x on 5xx, fail on 4xx |
| Fallback AI | OpenAI | Fallback generation | API key, org ID | Circuit breaker (5 failures/min) |
| Payments | Stripe | Subscriptions | Secret key, webhooks | Handle 3-day grace period |
| Sign-in | Google/GitHub/Apple | OAuth | Client ID, secret | PKCE for mobile |
| Media | S3/MinIO | File storage | Presigned URLs | 15-min upload, 1-hour download |
| Email | SES/MailHog | Transactional | SMTP config | Bounce handling via SNS |
| YouTube | YouTube API | Analytics, publish | OAuth token, auto-refresh | 10k units/day rate limit |
| Instagram | Meta/Later | Analytics, schedule | Graph API token | 200 calls/hour rate limit |
| TikTok | TikTok API | Analytics, publish | OAuth token | Platform-specific limits |
| Twitter/X | Twitter API v2 | Tweets, engagement | Bearer token | 450 calls/15min |
| LinkedIn | LinkedIn API | Articles, engagement | OAuth token | 100 calls/hour |
| Real-time | Gorilla WebSocket | Live collab, notifications | Upgrade handler | Ping/pong every 30s, timeout 60s |
| Jobs | Asynq (Redis) | Async processing | Redis connection | Retry 3x, dead letter queue |
| Observability | DataDog/CloudWatch | Metrics, traces, logs | API key, region | OpenTelemetry export |

---

**Next Steps:**
1. Implement each provider with shown code patterns
2. Set up test infrastructure (Stripe test mode, MinIO, test DB)
3. Configure rate limiters and circuit breakers
4. Enable DataDog/CloudWatch for production monitoring
5. Test webhook handlers (Stripe, SES, GitHub)
6. Document credential rotation and refresh token management
