# Backend Testing Strategy — Ordo Creator OS (Go)

**Comprehensive testing guide for Go backend reliability, maintainability, and developer velocity**

Last Updated: 2026-03-10
Go Version: 1.21+
Framework: chi, testcontainers-go, testify/assert
Philosophy: Fast feedback, high coverage, real integration tests

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Unit Tests](#2-unit-tests)
3. [Integration Tests](#3-integration-tests)
4. [Test Database Setup](#4-test-database-setup)
5. [HTTP Handler Testing](#5-http-handler-testing)
6. [Mocking Strategy](#6-mocking-strategy)
7. [Test Fixtures](#7-test-fixtures)
8. [Test Utilities Package](#8-test-utilities-package)
9. [Coverage Requirements](#9-coverage-requirements)
10. [CI Test Pipeline](#10-ci-test-pipeline)
11. [Performance & Benchmark Tests](#11-performance--benchmark-tests)
12. [Test Commands & Makefile](#12-test-commands--makefile)

---

## 1. Testing Philosophy

### Core Principles

- **Test Pyramid**: 70% unit tests, 20% integration tests, 10% e2e tests
  - Unit tests: Fast, isolated, deterministic
  - Integration tests: Real dependencies, slower, critical paths
  - E2E tests: Full system, browser/API client, sparingly used

- **Test Behavior, Not Implementation**
  - Write tests based on the public interface
  - Don't test private implementation details
  - Refactoring internals should not break tests

- **Every Bug Fix Gets a Regression Test**
  - When fixing a bug, add a test that would have caught it
  - This prevents the same bug from happening twice
  - Makes the root cause clear in the test name

- **Tests Run Fast**
  - Unit test suite must complete in < 30 seconds
  - Integration suite in < 2 minutes
  - Developers run tests frequently during development

- **Tests Are Documentation**
  - Test names describe the happy path and edge cases
  - Examples in tests show how to use the API
  - Future developers learn from test patterns

### Test Success Criteria

✓ Tests run on every `git push` in CI
✓ PRs cannot merge with failing tests
✓ Coverage trends upward over time
✓ No test is flaky (always passes or always fails deterministically)
✓ Tests catch real bugs (regression test, not just code coverage)

---

## 2. Unit Tests

### File Organization

```
internal/
  ├── domain/
  │   ├── idea.go
  │   └── idea_test.go          # Same package, _test.go suffix
  ├── service/
  │   ├── idea_service.go
  │   └── idea_service_test.go
  └── repository/
      ├── idea_repo.go
      └── idea_repo_test.go
```

### Test Naming Convention

```go
func Test{Function}_{Scenario}_{Expected}(t *testing.T)
```

**Examples:**

```go
// ✓ Good: Clear what is being tested and what should happen
func TestCreateIdea_ValidInput_CreatesIdea(t *testing.T) { }
func TestCreateIdea_EmptyTitle_ReturnsValidationError(t *testing.T) { }
func TestCreateIdea_DuplicateTitle_ReturnsConflictError(t *testing.T) { }

// ✗ Bad: Unclear intent
func TestCreateIdea(t *testing.T) { }
func TestCreateIdea1(t *testing.T) { }
func TestCreateIdea_Test(t *testing.T) { }
```

### Table-Driven Tests Pattern

Go idiom: define test cases as a slice of structs, iterate and execute.

```go
package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"yourapp/internal/domain"
	"yourapp/internal/testutil"
)

func TestCreateIdea_TableDriven(t *testing.T) {
	tests := []struct {
		name        string
		title       string
		description string
		userID      string
		wantErr     bool
		errCode     string
	}{
		{
			name:        "valid input",
			title:       "Improve dashboard UX",
			description: "Add dark mode",
			userID:      "user123",
			wantErr:     false,
		},
		{
			name:        "empty title",
			title:       "",
			description: "Add dark mode",
			userID:      "user123",
			wantErr:     true,
			errCode:     "INVALID_INPUT",
		},
		{
			name:        "title too long",
			title:       testutil.RandomString(300),
			description: "Add dark mode",
			userID:      "user123",
			wantErr:     true,
			errCode:     "INVALID_INPUT",
		},
		{
			name:        "missing user id",
			title:       "Improve dashboard UX",
			description: "Add dark mode",
			userID:      "",
			wantErr:     true,
			errCode:     "INVALID_INPUT",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := testutil.NewMockIdeaRepository()
			service := NewIdeaService(mockRepo)

			ctx := context.Background()
			idea, err := service.CreateIdea(ctx, tt.userID, tt.title, tt.description)

			if tt.wantErr {
				require.Error(t, err)
				appErr, ok := err.(*domain.AppError)
				require.True(t, ok, "error should be *AppError")
				assert.Equal(t, tt.errCode, appErr.Code)
				assert.Nil(t, idea)
			} else {
				require.NoError(t, err)
				require.NotNil(t, idea)
				assert.Equal(t, tt.title, idea.Title)
				assert.Equal(t, tt.description, idea.Description)
				assert.Equal(t, tt.userID, idea.UserID)
			}
		})
	}
}
```

### Service Method Testing Example

Mock the repository dependency, test only the service logic.

```go
// internal/service/idea_service_test.go
package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"yourapp/internal/domain"
	"yourapp/internal/testutil"
)

// Example: Service with injected repository
// func NewIdeaService(repo domain.IdeaRepository) *IdeaService

func TestIdeaService_CreateIdea_CallsRepositoryCreate(t *testing.T) {
	// Setup
	mockRepo := new(testutil.MockIdeaRepository)
	service := NewIdeaService(mockRepo)

	userID := "user123"
	title := "Improve dashboard"
	description := "Add dark mode support"

	expectedIdea := &domain.Idea{
		ID:          "idea_uuid",
		UserID:      userID,
		Title:       title,
		Description: description,
	}

	// Mock expectation: repository.Create will be called once with these args
	mockRepo.On(
		"Create",
		mock.MatchedBy(func(ctx context.Context) bool { return ctx != nil }),
		userID,
		title,
		description,
	).Return(expectedIdea, nil).Once()

	// Execute
	ctx := context.Background()
	idea, err := service.CreateIdea(ctx, userID, title, description)

	// Assert
	require.NoError(t, err)
	require.NotNil(t, idea)
	assert.Equal(t, expectedIdea.ID, idea.ID)
	assert.Equal(t, title, idea.Title)

	// Verify all expectations were met
	mockRepo.AssertExpectations(t)
}

func TestIdeaService_GetIdea_NotFound_ReturnsError(t *testing.T) {
	mockRepo := new(testutil.MockIdeaRepository)
	service := NewIdeaService(mockRepo)

	ideaID := "nonexistent_id"

	// Mock: repository returns nil and a not-found error
	mockRepo.On(
		"GetByID",
		mock.MatchedBy(func(ctx context.Context) bool { return ctx != nil }),
		ideaID,
	).Return(nil, domain.NewAppError("IDEA_NOT_FOUND", "Idea not found", 404)).Once()

	// Execute
	ctx := context.Background()
	idea, err := service.GetIdea(ctx, ideaID)

	// Assert
	require.Error(t, err)
	assert.Nil(t, idea)
	appErr, ok := err.(*domain.AppError)
	require.True(t, ok)
	assert.Equal(t, "IDEA_NOT_FOUND", appErr.Code)
}
```

### What to Unit Test

- **Domain model validation** – Rules and constraints on entities
- **Service business logic** – Orchestration and decision-making
- **Request parsing and validation** – Input sanitization
- **Response formatting** – Data transformation for API responses
- **Utility functions** – Helper logic that has complex behavior

### What NOT to Unit Test

- Private helper methods (test through public interface)
- Trivial getters/setters
- Third-party library code
- Implementation details that won't change

---

## 3. Integration Tests

### Separate Build Tag

Integration tests run with a `//go:build integration` tag. This allows:
- `make test-unit` runs fast (excludes integration tests)
- `make test-integration` includes the full suite
- CI can run both with different timeouts

```go
//go:build integration

package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"yourapp/internal/testutil"
)

func TestCreateIdeaAndRetrieve_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup: real database
	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repo := NewPostgresIdeaRepository(db)
	service := NewIdeaService(repo)

	// Execute
	ctx := context.Background()
	userID := "user123"
	idea, err := service.CreateIdea(ctx, userID, "Test Idea", "Description")

	// Assert: data persisted to real DB
	require.NoError(t, err)
	require.NotNil(t, idea)

	// Verify by fetching from repository
	retrieved, err := repo.GetByID(ctx, idea.ID)
	require.NoError(t, err)
	assert.Equal(t, idea.Title, retrieved.Title)
}
```

### What to Integration Test

- **Repository methods** – Real SQL queries against PostgreSQL
- **API endpoint flows** – Full HTTP request → service → repository → response cycle
- **Auth middleware chain** – Authentication and authorization logic
- **WebSocket connections** – Real socket behavior
- **Cache interactions** – Redis operations with real Redis

### What NOT to Integration Test

- Every code path (too slow)
- Happy paths that unit tests cover
- Things that can't be tested with testcontainers

---

## 4. Test Database Setup

### testcontainers-go: Ephemeral PostgreSQL

Spin up a fresh PostgreSQL container for each test run. Migrations are applied once in `TestMain`.

```go
//go:build integration

package repository

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"yourapp/internal/testutil"
)

var testDB *pgxpool.Pool

// TestMain: Set up and tear down the test database once for all tests
func TestMain(m *testing.M) {
	ctx := context.Background()

	// Start PostgreSQL container
	req := testcontainers.ContainerRequest{
		Image:        "postgres:15-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     "testuser",
			"POSTGRES_PASSWORD": "testpass",
			"POSTGRES_DB":       "testdb",
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").
			WithOccurrence(2).WithStartupTimeout(30 * time.Second),
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to start container: %v\n", err)
		os.Exit(1)
	}
	defer container.Terminate(ctx)

	// Get connection details
	host, err := container.Host(ctx)
	if err != nil {
		panic(err)
	}
	port, err := container.MappedPort(ctx, "5432")
	if err != nil {
		panic(err)
	}

	// Connect to database
	dsn := fmt.Sprintf(
		"postgres://testuser:testpass@%s:%s/testdb?sslmode=disable",
		host, port.Port(),
	)
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		panic(err)
	}

	testDB, err = pgxpool.NewWithContext(ctx, config.ConnString())
	if err != nil {
		panic(err)
	}
	defer testDB.Close()

	// Run migrations (once for all tests)
	err = testutil.MigrateDB(ctx, testDB)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Migration failed: %v\n", err)
		os.Exit(1)
	}

	// Run tests
	code := m.Run()
	os.Exit(code)
}

// Helper: SetupTestDB creates a new transaction for each test, auto-rolled back
func setupTestDB(t *testing.T) *pgxpool.Pool {
	ctx := context.Background()

	// Start a transaction
	tx, err := testDB.Begin(ctx)
	if err != nil {
		t.Fatalf("failed to begin transaction: %v", err)
	}

	// Cleanup: rollback the transaction after test
	t.Cleanup(func() {
		_ = tx.Rollback(ctx)
	})

	// Return the transaction as a pool-like interface
	// (In real code, you'd wrap this or use pgx.Tx directly)
	return testDB // Simplified; actual code would use tx
}

// Example test using the test database
func TestPostgresIdeaRepository_Create_PersistsIdea(t *testing.T) {
	db := setupTestDB(t)
	repo := NewPostgresIdeaRepository(db)

	ctx := context.Background()
	idea := &domain.Idea{
		ID:          "idea_uuid",
		UserID:      "user123",
		Title:       "Test Idea",
		Description: "Test Description",
	}

	err := repo.Create(ctx, idea)
	require.NoError(t, err)

	// Retrieve and verify
	retrieved, err := repo.GetByID(ctx, idea.ID)
	require.NoError(t, err)
	assert.Equal(t, idea.Title, retrieved.Title)
}
```

### Transaction Isolation Pattern

Each test gets a fresh transaction that rolls back after the test completes. This ensures:
- Tests are isolated (one test's data doesn't affect another)
- Database is always in a clean state
- No manual cleanup needed (auto-rollback)

```go
// internal/testutil/db.go
package testutil

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupTestDB wraps testDB in a transaction for isolation
func SetupTestDB(t *testing.T) (*pgxpool.Pool, func()) {
	ctx := context.Background()

	// Get a connection and start a transaction
	conn, err := testDB.Acquire(ctx)
	if err != nil {
		t.Fatalf("failed to acquire connection: %v", err)
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		t.Fatalf("failed to begin transaction: %v", err)
	}

	cleanup := func() {
		_ = tx.Rollback(ctx)
		conn.Release()
	}

	return testDB, cleanup
}
```

---

## 5. HTTP Handler Testing

### Using httptest Package

Go's `httptest` package provides `NewServer` (for integration) and `NewRecorder` (for unit testing).

```go
//go:build integration

package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"yourapp/internal/domain"
	"yourapp/internal/service"
	"yourapp/internal/testutil"
)

// Example: POST /ideas handler with auth and service injection
type IdeaHandler struct {
	service domain.IdeaService
	auth    domain.AuthMiddleware
}

func TestIdeaHandler_PostIdea_ValidRequest_CreatesIdea(t *testing.T) {
	// Setup
	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	repo := NewPostgresIdeaRepository(db)
	svc := service.NewIdeaService(repo)
	handler := NewIdeaHandler(svc)

	// Create HTTP server with handler
	router := chi.NewRouter()
	router.Use(testutil.MockAuthMiddleware(t, "user123"))
	router.Post("/ideas", handler.CreateIdea)

	server := httptest.NewServer(router)
	defer server.Close()

	// Prepare request
	reqBody := map[string]string{
		"title":       "Improve dashboard UX",
		"description": "Add dark mode support",
	}
	body, _ := json.Marshal(reqBody)

	// Execute: POST /ideas
	resp, err := http.Post(
		server.URL+"/ideas",
		"application/json",
		bytes.NewReader(body),
	)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Assert: 201 Created
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var resIdea domain.Idea
	err = json.NewDecoder(resp.Body).Decode(&resIdea)
	require.NoError(t, err)
	assert.Equal(t, "Improve dashboard UX", resIdea.Title)
	assert.NotEmpty(t, resIdea.ID)
}

func TestIdeaHandler_PostIdea_EmptyTitle_ReturnsBadRequest(t *testing.T) {
	mockService := new(testutil.MockIdeaService)
	handler := NewIdeaHandler(mockService)

	router := chi.NewRouter()
	router.Use(testutil.MockAuthMiddleware(t, "user123"))
	router.Post("/ideas", handler.CreateIdea)

	server := httptest.NewServer(router)
	defer server.Close()

	// Request with empty title
	reqBody := map[string]string{
		"title":       "",
		"description": "Add dark mode",
	}
	body, _ := json.Marshal(reqBody)

	resp, err := http.Post(
		server.URL+"/ideas",
		"application/json",
		bytes.NewReader(body),
	)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Assert: 400 Bad Request
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var errResp domain.ErrorResponse
	json.NewDecoder(resp.Body).Decode(&errResp)
	assert.Equal(t, "INVALID_INPUT", errResp.Code)
}

// Using httptest.Recorder for unit tests (faster, no server)
func TestIdeaHandler_GetIdea_WithRecorder(t *testing.T) {
	mockService := new(testutil.MockIdeaService)
	expectedIdea := &domain.Idea{
		ID:          "idea123",
		Title:       "Test Idea",
		Description: "Test",
	}

	mockService.On("GetIdea", mock.Anything, "idea123").
		Return(expectedIdea, nil)

	handler := NewIdeaHandler(mockService)

	// Create request
	req := httptest.NewRequest("GET", "/ideas/idea123", nil)
	req = req.WithContext(context.WithValue(req.Context(), "user_id", "user123"))

	// Record response
	w := httptest.NewRecorder()
	handler.GetIdea(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var resp domain.Idea
	json.NewDecoder(w.Body).Decode(&resp)
	assert.Equal(t, "Test Idea", resp.Title)
}
```

### Full Router Testing with Chi

```go
//go:build integration

package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"yourapp/internal/handler"
	"yourapp/internal/testutil"
)

func TestAPIRoutes_IdeaWorkflow_Integration(t *testing.T) {
	// Setup database
	db, cleanup := testutil.SetupTestDB(t)
	defer cleanup()

	// Setup services and handlers
	ideaRepo := NewPostgresIdeaRepository(db)
	ideaSvc := NewIdeaService(ideaRepo)
	ideaHandler := handler.NewIdeaHandler(ideaSvc)

	// Create router
	router := chi.NewRouter()
	router.Use(testutil.MockAuthMiddleware(t, "user123"))

	// Mount handlers
	router.Post("/ideas", ideaHandler.CreateIdea)
	router.Get("/ideas/{ideaID}", ideaHandler.GetIdea)
	router.Put("/ideas/{ideaID}", ideaHandler.UpdateIdea)

	server := httptest.NewServer(router)
	defer server.Close()

	// Test workflow: Create → Retrieve → Update

	// 1. Create idea
	createReq := map[string]string{
		"title":       "Dashboard Redesign",
		"description": "Modernize the UI",
	}
	createBody, _ := json.Marshal(createReq)
	createResp, _ := http.Post(
		server.URL+"/ideas",
		"application/json",
		bytes.NewReader(createBody),
	)
	require.Equal(t, http.StatusCreated, createResp.StatusCode)

	var createdIdea domain.Idea
	json.NewDecoder(createResp.Body).Decode(&createdIdea)
	ideaID := createdIdea.ID

	// 2. Retrieve idea
	getResp, _ := http.Get(server.URL + "/ideas/" + ideaID)
	require.Equal(t, http.StatusOK, getResp.StatusCode)

	var retrievedIdea domain.Idea
	json.NewDecoder(getResp.Body).Decode(&retrievedIdea)
	assert.Equal(t, "Dashboard Redesign", retrievedIdea.Title)

	// 3. Update idea
	updateReq := map[string]string{
		"title": "Dashboard Redesign v2",
	}
	updateBody, _ := json.Marshal(updateReq)
	updateHTTPReq, _ := http.NewRequest(
		"PUT",
		server.URL+"/ideas/"+ideaID,
		bytes.NewReader(updateBody),
	)
	updateHTTPReq.Header.Set("Content-Type", "application/json")

	updateResp, _ := http.DefaultClient.Do(updateHTTPReq)
	require.Equal(t, http.StatusOK, updateResp.StatusCode)

	var updatedIdea domain.Idea
	json.NewDecoder(updateResp.Body).Decode(&updatedIdea)
	assert.Equal(t, "Dashboard Redesign v2", updatedIdea.Title)
}
```

---

## 6. Mocking Strategy

### Interfaces for Dependencies

All external dependencies are injected via interfaces. This allows easy mocking.

```go
// internal/domain/repository.go
package domain

import "context"

// IdeaRepository defines the contract for idea persistence
type IdeaRepository interface {
	Create(ctx context.Context, idea *Idea) error
	GetByID(ctx context.Context, id string) (*Idea, error)
	Update(ctx context.Context, idea *Idea) error
	Delete(ctx context.Context, id string) error
	ListByUserID(ctx context.Context, userID string) ([]*Idea, error)
}

// AuthService defines the contract for authentication
type AuthService interface {
	ValidateToken(ctx context.Context, token string) (string, error) // returns userID or error
	GenerateToken(ctx context.Context, userID string) (string, error)
}
```

### Manual Mock Implementation

Simple, explicit, and easy to debug.

```go
// internal/testutil/mocks.go
package testutil

import (
	"context"
	"github.com/stretchr/testify/mock"
	"yourapp/internal/domain"
)

// MockIdeaRepository implements domain.IdeaRepository
type MockIdeaRepository struct {
	mock.Mock
}

func (m *MockIdeaRepository) Create(ctx context.Context, idea *domain.Idea) error {
	args := m.Called(ctx, idea)
	return args.Error(0)
}

func (m *MockIdeaRepository) GetByID(ctx context.Context, id string) (*domain.Idea, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Idea), args.Error(1)
}

func (m *MockIdeaRepository) Update(ctx context.Context, idea *domain.Idea) error {
	args := m.Called(ctx, idea)
	return args.Error(0)
}

func (m *MockIdeaRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockIdeaRepository) ListByUserID(ctx context.Context, userID string) ([]*domain.Idea, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Idea), args.Error(1)
}

// MockAuthService implements domain.AuthService
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) ValidateToken(ctx context.Context, token string) (string, error) {
	args := m.Called(ctx, token)
	return args.String(0), args.Error(1)
}

func (m *MockAuthService) GenerateToken(ctx context.Context, userID string) (string, error) {
	args := m.Called(ctx, userID)
	return args.String(0), args.Error(1)
}

// NewMockIdeaRepository creates a new mock repository
func NewMockIdeaRepository() *MockIdeaRepository {
	return new(MockIdeaRepository)
}

// NewMockAuthService creates a new mock auth service
func NewMockAuthService() *MockAuthService {
	return new(MockAuthService)
}
```

### Mock Usage in Tests

```go
func TestIdeaService_CreateIdea_ValidatesInput(t *testing.T) {
	mockRepo := NewMockIdeaRepository()
	service := NewIdeaService(mockRepo)

	// Setup: expect repository.Create to be called exactly once
	expectedIdea := &domain.Idea{ID: "123", Title: "Test"}
	mockRepo.On("Create", mock.Anything, mock.MatchedBy(func(idea *domain.Idea) bool {
		return idea.Title != ""
	})).Return(nil).Once()

	ctx := context.Background()
	idea, err := service.CreateIdea(ctx, "user1", "Test", "Description")

	require.NoError(t, err)
	assert.NotNil(t, idea)

	// Verify that the expected calls were made
	mockRepo.AssertExpectations(t)
	mockRepo.AssertCalled(t, "Create", mock.Anything, mock.Anything)
}
```

### When to Use Mocks

- ✓ Testing services with dependencies (repository, external APIs, caches)
- ✓ Testing handlers with service injection
- ✓ Testing error paths and edge cases without infrastructure
- ✗ Don't mock the repository in integration tests (use real DB)
- ✗ Don't create mocks for everything (only dependencies)

---

## 7. Test Fixtures

### Directory Structure

```
internal/
  ├── testdata/
  │   ├── ideas/
  │   │   ├── valid_create_request.json
  │   │   ├── invalid_create_request.json
  │   │   └── idea_response.json
  │   ├── users/
  │   │   └── user.json
  │   └── sql/
  │       └── seed_ideas.sql
  └── testutil/
      └── factories.go
```

### JSON Fixtures for API Tests

```json
// testdata/ideas/valid_create_request.json
{
  "title": "Improve dashboard UX",
  "description": "Add dark mode support and redesign cards",
  "tags": ["ui", "ux"]
}
```

```json
// testdata/ideas/idea_response.json
{
  "id": "idea_abc123",
  "user_id": "user_xyz789",
  "title": "Improve dashboard UX",
  "description": "Add dark mode support",
  "created_at": "2026-03-10T10:00:00Z",
  "updated_at": "2026-03-10T10:00:00Z"
}
```

### Factory Functions Pattern

```go
// internal/testutil/factories.go
package testutil

import (
	"time"
	"yourapp/internal/domain"
)

// NewUser creates a test user with sensible defaults
func NewUser() *domain.User {
	return &domain.User{
		ID:        RandomID("user"),
		Email:     RandomEmail(),
		Name:      "Test User",
		CreatedAt: time.Now(),
	}
}

// NewUserWithID creates a test user with a specific ID
func NewUserWithID(id string) *domain.User {
	user := NewUser()
	user.ID = id
	return user
}

// NewIdea creates a test idea with sensible defaults
func NewIdea() *domain.Idea {
	return &domain.Idea{
		ID:          RandomID("idea"),
		UserID:      RandomID("user"),
		Title:       "Test Idea - " + RandomString(10),
		Description: "A test idea for testing purposes",
		Status:      "active",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
}

// NewIdeaForUser creates a test idea for a specific user
func NewIdeaForUser(userID string) *domain.Idea {
	idea := NewIdea()
	idea.UserID = userID
	return idea
}

// NewIdeas creates multiple test ideas
func NewIdeas(count int) []*domain.Idea {
	ideas := make([]*domain.Idea, count)
	for i := 0; i < count; i++ {
		ideas[i] = NewIdea()
	}
	return ideas
}

// RandomID generates a unique ID for testing
func RandomID(prefix string) string {
	return prefix + "_" + RandomString(12)
}

// RandomEmail generates a unique email address
func RandomEmail() string {
	return "test_" + RandomString(8) + "@example.com"
}

// RandomString generates a random alphanumeric string of length n
func RandomString(n int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}
```

### Using Factories in Tests

```go
func TestCreateIdea_WithFactory(t *testing.T) {
	mockRepo := NewMockIdeaRepository()
	service := NewIdeaService(mockRepo)

	// Use factory to create test data
	user := testutil.NewUser()
	idea := testutil.NewIdeaForUser(user.ID)

	mockRepo.On("Create", mock.Anything, idea).Return(nil)

	ctx := context.Background()
	_, err := service.CreateIdea(ctx, user.ID, idea.Title, idea.Description)

	require.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
```

---

## 8. Test Utilities Package

### Centralized Testing Helpers

```go
// internal/testutil/helpers.go
package testutil

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"yourapp/internal/domain"
)

// AssertJSONEqual compares two JSON-serializable objects
func AssertJSONEqual(t *testing.T, expected, actual interface{}) {
	expectedJSON, err := json.Marshal(expected)
	require.NoError(t, err)

	actualJSON, err := json.Marshal(actual)
	require.NoError(t, err)

	assert.JSONEq(t, string(expectedJSON), string(actualJSON))
}

// AssertErrorCode verifies an AppError has the expected code
func AssertErrorCode(t *testing.T, err error, expectedCode string) {
	require.Error(t, err)
	appErr, ok := err.(*domain.AppError)
	require.True(t, ok, "error should be *AppError")
	assert.Equal(t, expectedCode, appErr.Code)
}

// CreateTestUser inserts a user into the test database and returns it
func CreateTestUser(t *testing.T, db *pgxpool.Pool) *domain.User {
	user := NewUser()
	ctx := context.Background()

	err := db.QueryRow(
		ctx,
		"INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, $4)",
		user.ID, user.Email, user.Name, user.CreatedAt,
	).Scan()

	// QueryRow doesn't return error on INSERT, use Exec instead
	_, err = db.Exec(
		ctx,
		"INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, $4)",
		user.ID, user.Email, user.Name, user.CreatedAt,
	)
	require.NoError(t, err)

	return user
}

// CreateTestIdea inserts an idea into the test database and returns it
func CreateTestIdea(t *testing.T, db *pgxpool.Pool, userID string) *domain.Idea {
	idea := NewIdeaForUser(userID)
	ctx := context.Background()

	_, err := db.Exec(
		ctx,
		`INSERT INTO ideas (id, user_id, title, description, status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		idea.ID, idea.UserID, idea.Title, idea.Description, idea.Status, idea.CreatedAt, idea.UpdatedAt,
	)
	require.NoError(t, err)

	return idea
}

// CreateTestWorkspace inserts a workspace into the test database
func CreateTestWorkspace(t *testing.T, db *pgxpool.Pool, ownerID string) *domain.Workspace {
	workspace := &domain.Workspace{
		ID:      RandomID("workspace"),
		OwnerID: ownerID,
		Name:    "Test Workspace",
		Slug:    RandomString(12),
	}
	ctx := context.Background()

	_, err := db.Exec(
		ctx,
		`INSERT INTO workspaces (id, owner_id, name, slug) VALUES ($1, $2, $3, $4)`,
		workspace.ID, workspace.OwnerID, workspace.Name, workspace.Slug,
	)
	require.NoError(t, err)

	return workspace
}

// MockAuthMiddleware returns a chi middleware that injects a user ID into context
func MockAuthMiddleware(t *testing.T, userID string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := context.WithValue(r.Context(), "user_id", userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// MustParseTime parses a time string or fails the test
func MustParseTime(t *testing.T, timeStr string) time.Time {
	t.Helper()
	parsed, err := time.Parse(time.RFC3339, timeStr)
	require.NoError(t, err)
	return parsed
}
```

---

## 9. Coverage Requirements

### Coverage Targets by Layer

| Layer | Minimum Coverage | Rationale |
|-------|-----------------|-----------|
| Domain Models | 95% | Core business logic, critical to test thoroughly |
| Service Layer | 90% | Orchestration logic, decision points |
| Handler Layer | 80% | HTTP concerns, some hard to test (e.g., headers) |
| Repository Layer | 60% | Most logic is in SQL; test key methods |
| **Overall** | **70%** | Healthy balance between coverage and velocity |

### Measure Coverage

```bash
# Generate coverage report
go test -coverprofile=coverage.out ./...

# View coverage in browser
go tool cover -html=coverage.out

# Report coverage percentage
go tool cover -func=coverage.out | tail -1
```

### GitHub Actions: Post Coverage to PR

```yaml
# .github/workflows/test.yml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.out
    flags: unittests
    fail_ci_if_error: true
```

### Enforcing Minimum Coverage

```makefile
test-coverage:
	go test -coverprofile=coverage.out ./internal/...
	@coverage=$$(go tool cover -func=coverage.out | tail -1 | awk '{print $$3}' | sed 's/%//'); \
	if (( $$(echo "$$coverage < 70" | bc -l) )); then \
		echo "Coverage $$coverage% is below 70% threshold"; \
		exit 1; \
	fi
	@echo "Coverage $$coverage% meets threshold"
```

---

## 10. CI Test Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
          cache: true

      - name: Run unit tests
        run: make test-unit

      - name: Run linting
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest
          args: --timeout=5m

  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
          cache: true

      - name: Run integration tests
        run: make test-integration
        env:
          DATABASE_URL: postgres://testuser:testpass@localhost:5432/testdb?sslmode=disable

  test-coverage:
    name: Coverage Check
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
          cache: true

      - name: Generate coverage report
        run: make test-coverage

      - name: Comment coverage on PR
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const coverage = fs.readFileSync('coverage.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Test Coverage\n\n' + coverage
            });
```

### PR Requirements

- All unit tests must pass
- Coverage must not decrease
- Integration tests must pass before merge
- No flaky tests (all tests pass or all fail consistently)

---

## 11. Performance & Benchmark Tests

### Benchmark Test Structure

```go
// internal/service/idea_service_bench_test.go
package service

import (
	"context"
	"testing"
	"yourapp/internal/testutil"
)

// Benchmark: CreateIdea with mock repository
func BenchmarkIdeaService_CreateIdea(b *testing.B) {
	mockRepo := testutil.NewMockIdeaRepository()
	service := NewIdeaService(mockRepo)

	// Setup: mock returns success
	mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		service.CreateIdea(ctx, "user123", "Idea Title", "Description")
	}
}

// Benchmark: GetIdea with mock repository
func BenchmarkIdeaService_GetIdea(b *testing.B) {
	mockRepo := testutil.NewMockIdeaRepository()
	service := NewIdeaService(mockRepo)

	expectedIdea := testutil.NewIdea()
	mockRepo.On("GetByID", mock.Anything, mock.Anything).Return(expectedIdea, nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		service.GetIdea(ctx, expectedIdea.ID)
	}
}

// Benchmark: Token validation (hot path)
func BenchmarkAuthService_ValidateToken(b *testing.B) {
	mockCache := testutil.NewMockTokenCache()
	authService := NewAuthService(mockCache)

	token := "valid.jwt.token"
	mockCache.On("Get", token).Return("user123", nil)

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		authService.ValidateToken(ctx, token)
	}
}
```

### Run Benchmarks

```bash
# Run all benchmarks
go test -bench=. ./internal/...

# Run specific benchmark
go test -bench=BenchmarkIdeaService_CreateIdea -benchtime=10s ./internal/service

# Save benchmark results
go test -bench=. -benchmem ./internal/... > old.txt
# (after code changes)
go test -bench=. -benchmem ./internal/... > new.txt
benchstat old.txt new.txt
```

### Key Hot Paths to Benchmark

- JWT token validation
- Request parsing
- Database queries (via integration tests)
- Cache lookups
- JSON marshaling

---

## 12. Test Commands & Makefile

### Complete Makefile Test Targets

```makefile
# Makefile

.PHONY: test test-unit test-integration test-coverage test-race test-bench test-watch

# Run all unit tests (fast, no integration)
test-unit:
	@echo "Running unit tests..."
	go test -short -v ./internal/...

# Run integration tests (slower, requires testcontainers or services)
test-integration:
	@echo "Running integration tests..."
	go test -tags=integration -v ./internal/...

# Run all tests (unit + integration)
test: test-unit test-integration

# Generate and report coverage
test-coverage:
	@echo "Generating coverage report..."
	go test -coverprofile=coverage.out ./internal/...
	go tool cover -func=coverage.out | tail -1
	@coverage=$$(go tool cover -func=coverage.out | tail -1 | awk '{print $$3}' | sed 's/%//'); \
	if (( $$(echo "$$coverage < 70" | bc -l) )); then \
		echo "❌ Coverage $$coverage% is below 70% threshold"; \
		exit 1; \
	fi
	@echo "✅ Coverage $$coverage% meets threshold"

# Open coverage in browser
test-coverage-html:
	go test -coverprofile=coverage.out ./internal/...
	go tool cover -html=coverage.out

# Run tests with race condition detector
test-race:
	@echo "Running tests with race detector..."
	go test -race -v ./internal/...

# Run benchmarks
test-bench:
	@echo "Running benchmarks..."
	go test -bench=. -benchmem -benchtime=10s ./internal/...

# Watch mode: run tests on file changes (requires entr or similar)
test-watch:
	@echo "Watching for changes (requires 'entr')..."
	find ./internal -name "*.go" | entr make test-unit

# Run linting
lint:
	golangci-lint run ./internal/...

# Run tests + linting (pre-commit)
test-all: test-unit lint test-coverage

# CI: all checks
ci: test-unit test-integration test-coverage test-race lint
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

set -e

echo "Running pre-commit tests..."
make test-unit
make lint

echo "✅ Pre-commit checks passed"
```

### Example Test Output

```
$ make test-unit

Running unit tests...
go test -short -v ./internal/...

=== RUN   TestCreateIdea_ValidInput_CreatesIdea
--- PASS: TestCreateIdea_ValidInput_CreatesIdea (0.02s)

=== RUN   TestCreateIdea_EmptyTitle_ReturnsValidationError
--- PASS: TestCreateIdea_EmptyTitle_ReturnsValidationError (0.01s)

=== RUN   TestIdeaService_CreateIdea_CallsRepositoryCreate
--- PASS: TestIdeaService_CreateIdea_CallsRepositoryCreate (0.03s)

=== RUN   TestIdeaHandler_PostIdea_ValidRequest_CreatesIdea
--- PASS: TestIdeaHandler_PostIdea_ValidRequest_CreatesIdea (0.05s)

=== RUN   TestPostgresIdeaRepository_Create_PersistsIdea
--- SKIP: TestPostgresIdeaRepository_Create_PersistsIdea (0.00s) (short mode)

PASS
ok  	yourapp/internal/service	0.15s
ok  	yourapp/internal/handler	0.08s
ok  	yourapp/internal/domain	0.01s

✅ Unit tests passed
```

---

## Quick Reference: Test Checklist

- [ ] Unit test naming follows `Test{Function}_{Scenario}_{Expected}`
- [ ] Integration tests marked with `//go:build integration`
- [ ] Mocks implement domain interfaces, not concrete types
- [ ] Tests use table-driven pattern for multiple scenarios
- [ ] Test database uses transaction rollback for isolation
- [ ] HTTP handlers tested with both `httptest.Server` and `httptest.Recorder`
- [ ] Fixtures live in `testdata/` directory
- [ ] Factories in `internal/testutil/` for test data
- [ ] Coverage >= 70% overall, >= 90% for service layer
- [ ] `make test-unit` runs in < 30 seconds
- [ ] `make test-integration` runs in < 2 minutes
- [ ] All tests pass in CI before PR merge
- [ ] Benchmarks for hot paths (JWT validation, DB queries, caching)

---

## References

- [Go Testing Best Practices](https://golang.org/doc/effective_go#testing)
- [Table-Driven Tests](https://github.com/golang/go/wiki/TableDrivenTests)
- [testcontainers-go](https://golang.testcontainers.org/)
- [testify/assert](https://github.com/stretchr/testify)
- [Go Benchmark Guide](https://pkg.go.dev/testing#B)
