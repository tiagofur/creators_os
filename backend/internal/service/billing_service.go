package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
	"github.com/redis/go-redis/v9"
	stripe "github.com/stripe/stripe-go/v76"
	portalsession "github.com/stripe/stripe-go/v76/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v76/checkout/session"
	stripecustomer "github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/webhook"
)

type billingService struct {
	stripeKey     string
	webhookSecret string
	userRepo      repository.UserRepository
	redisClient   *redis.Client
	logger        *slog.Logger
}

// NewBillingService creates a new BillingService and initialises the Stripe client.
func NewBillingService(
	stripeKey, webhookSecret string,
	userRepo repository.UserRepository,
	redisClient *redis.Client,
	logger *slog.Logger,
) BillingService {
	if logger == nil {
		logger = slog.Default()
	}
	stripe.Key = stripeKey
	return &billingService{
		stripeKey:     stripeKey,
		webhookSecret: webhookSecret,
		userRepo:      userRepo,
		redisClient:   redisClient,
		logger:        logger,
	}
}

// CreateCheckoutSession creates a Stripe Checkout session for subscription upgrade.
// If the user has no stripe_customer_id, a Stripe Customer is created first and saved to DB.
func (s *billingService) CreateCheckoutSession(ctx context.Context, userID uuid.UUID, priceID string) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("billing: get user: %w", err)
	}

	customerID := ""
	if user.StripeCustomerID != nil {
		customerID = *user.StripeCustomerID
	} else {
		cust, err := stripecustomer.New(&stripe.CustomerParams{
			Email: stripe.String(user.Email),
		})
		if err != nil {
			return "", fmt.Errorf("billing: create stripe customer: %w", err)
		}
		customerID = cust.ID
		if err := s.userRepo.UpdateStripeCustomerID(ctx, userID, customerID); err != nil {
			s.logger.WarnContext(ctx, "failed to save stripe customer id", "err", err, "user_id", userID)
		}
	}

	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{Price: stripe.String(priceID), Quantity: stripe.Int64(1)},
		},
		SuccessURL: stripe.String("https://app.ordo.io/billing/success"),
		CancelURL:  stripe.String("https://app.ordo.io/billing/cancel"),
	}

	sess, err := checkoutsession.New(params)
	if err != nil {
		return "", fmt.Errorf("billing: create checkout session: %w", err)
	}

	return sess.URL, nil
}

// CreatePortalSession creates a Stripe Customer Portal session for managing subscription.
func (s *billingService) CreatePortalSession(ctx context.Context, userID uuid.UUID) (string, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("billing: get user: %w", err)
	}

	if user.StripeCustomerID == nil {
		return "", domain.NewError("BILLING_001", "no billing account found", 404)
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(*user.StripeCustomerID),
		ReturnURL: stripe.String("https://app.ordo.io/settings/billing"),
	}

	sess, err := portalsession.New(params)
	if err != nil {
		return "", fmt.Errorf("billing: create portal session: %w", err)
	}

	return sess.URL, nil
}

// HandleWebhook verifies the Stripe HMAC signature, deduplicates via Redis,
// and processes the relevant webhook events.
func (s *billingService) HandleWebhook(ctx context.Context, payload []byte, signature string) error {
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return domain.NewError("BILLING_002", "invalid webhook signature", 400)
	}

	// Deduplicate: SET NX EX 300 using event ID.
	dedupeKey := fmt.Sprintf("stripe:event:%s", event.ID)
	set, err := s.redisClient.SetNX(ctx, dedupeKey, "1", 300*time.Second).Result()
	if err != nil {
		s.logger.WarnContext(ctx, "redis dedup check failed", "err", err, "event_id", event.ID)
	} else if !set {
		// Already processed.
		return nil
	}

	switch event.Type {
	case "checkout.session.completed":
		return s.handleCheckoutCompleted(ctx, event)

	case "customer.subscription.updated":
		return s.handleSubscriptionUpdated(ctx, event)

	case "customer.subscription.deleted":
		return s.handleSubscriptionDeleted(ctx, event)

	case "invoice.payment_failed":
		s.logger.WarnContext(ctx, "invoice payment failed", "event_id", event.ID)
		return nil

	default:
		s.logger.InfoContext(ctx, "unhandled stripe event", "type", event.Type)
		return nil
	}
}

func (s *billingService) handleCheckoutCompleted(ctx context.Context, event stripe.Event) error {
	var sess stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
		return fmt.Errorf("billing: unmarshal checkout session: %w", err)
	}
	s.logger.InfoContext(ctx, "checkout session completed", "session_id", sess.ID)
	return nil
}

func (s *billingService) handleSubscriptionUpdated(ctx context.Context, event stripe.Event) error {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return fmt.Errorf("billing: unmarshal subscription: %w", err)
	}

	tierStr := ""
	if len(sub.Items.Data) > 0 {
		if t, ok := sub.Items.Data[0].Price.Metadata["tier"]; ok {
			tierStr = t
		}
	}

	var tier domain.SubscriptionTier
	switch tierStr {
	case "pro":
		tier = domain.TierPro
	case "enterprise":
		tier = domain.TierEnterprise
	default:
		tier = domain.TierFree
	}

	customerID := ""
	if sub.Customer != nil {
		customerID = sub.Customer.ID
	}

	s.logger.InfoContext(ctx, "subscription updated", "customer", customerID, "tier", tier)

	if customerID == "" {
		return nil
	}

	user, err := s.userRepo.GetByStripeCustomerID(ctx, customerID)
	if err != nil {
		s.logger.WarnContext(ctx, "user not found for stripe customer", "customer_id", customerID)
		return nil
	}

	return s.userRepo.UpdateSubscriptionTier(ctx, user.ID, tier)
}

func (s *billingService) handleSubscriptionDeleted(ctx context.Context, event stripe.Event) error {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return fmt.Errorf("billing: unmarshal subscription: %w", err)
	}

	customerID := ""
	if sub.Customer != nil {
		customerID = sub.Customer.ID
	}
	if customerID == "" {
		return nil
	}

	user, err := s.userRepo.GetByStripeCustomerID(ctx, customerID)
	if err != nil {
		s.logger.WarnContext(ctx, "user not found for stripe customer (deletion)", "customer_id", customerID)
		return nil
	}

	return s.userRepo.UpdateSubscriptionTier(ctx, user.ID, domain.TierFree)
}

var _ BillingService = (*billingService)(nil)
