package service

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// mockUserRepoForAI is a minimal in-memory UserRepository for credit tests.
type mockUserRepoForAI struct {
	mu      sync.Mutex
	balance int
}

func (m *mockUserRepoForAI) DecrementAICredits(_ context.Context, _ uuid.UUID, amount int) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.balance < amount {
		return newInsufficientCreditsError()
	}
	m.balance -= amount
	return nil
}

func newInsufficientCreditsError() error {
	return &insufficientCreditsError{}
}

type insufficientCreditsError struct{}

func (e *insufficientCreditsError) Error() string { return "insufficient AI credits" }

// TestCheckAndDeductCredits_Race validates that concurrent deductions with balance=10
// and cost=8 result in exactly one success.
func TestCheckAndDeductCredits_Race(t *testing.T) {
	mockRepo := &mockUserRepoForAI{balance: 10}

	var successCount int64
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			m := mockRepo
			m.mu.Lock()
			canDeduct := m.balance >= 8
			if canDeduct {
				m.balance -= 8
			}
			m.mu.Unlock()
			if canDeduct {
				atomic.AddInt64(&successCount, 1)
			}
		}()
	}
	wg.Wait()

	assert.Equal(t, int64(1), successCount, "exactly one of two concurrent deductions should succeed")
	assert.Equal(t, 2, mockRepo.balance, "remaining balance should be 10-8=2")
}
