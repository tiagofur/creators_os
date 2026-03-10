package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	ttlWorkspaceMembers = 5 * time.Minute
	ttlUserProfile      = 1 * time.Minute
)

// Cache wraps a Redis client and provides typed cache helpers for high-frequency
// read operations (workspace members, user profiles).
//
// Key convention: ordo:{env}:cache:{resource}:{id}
type Cache struct {
	client *redis.Client
	env    string
}

// NewCache creates a new Cache.
func NewCache(client *redis.Client, env string) *Cache {
	return &Cache{client: client, env: env}
}

// ---- Workspace members ----

func (c *Cache) workspaceMembersKey(workspaceID string) string {
	return fmt.Sprintf("ordo:%s:cache:workspace_members:%s", c.env, workspaceID)
}

// SetWorkspaceMembers marshals v to JSON and stores it with a 5-minute TTL.
func (c *Cache) SetWorkspaceMembers(ctx context.Context, workspaceID string, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("cache: marshal workspace members: %w", err)
	}
	return c.client.Set(ctx, c.workspaceMembersKey(workspaceID), data, ttlWorkspaceMembers).Err()
}

// GetWorkspaceMembers returns the cached JSON bytes or redis.Nil if not cached.
func (c *Cache) GetWorkspaceMembers(ctx context.Context, workspaceID string) ([]byte, error) {
	data, err := c.client.Get(ctx, c.workspaceMembersKey(workspaceID)).Bytes()
	if err != nil {
		return nil, err
	}
	return data, nil
}

// DeleteWorkspaceMembers invalidates the workspace members cache entry.
func (c *Cache) DeleteWorkspaceMembers(ctx context.Context, workspaceID string) error {
	return c.client.Del(ctx, c.workspaceMembersKey(workspaceID)).Err()
}

// ---- User profile ----

func (c *Cache) userProfileKey(userID string) string {
	return fmt.Sprintf("ordo:%s:cache:user_profile:%s", c.env, userID)
}

// SetUserProfile marshals v to JSON and stores it with a 1-minute TTL.
func (c *Cache) SetUserProfile(ctx context.Context, userID string, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return fmt.Errorf("cache: marshal user profile: %w", err)
	}
	return c.client.Set(ctx, c.userProfileKey(userID), data, ttlUserProfile).Err()
}

// GetUserProfile returns the cached JSON bytes or redis.Nil if not cached.
func (c *Cache) GetUserProfile(ctx context.Context, userID string) ([]byte, error) {
	data, err := c.client.Get(ctx, c.userProfileKey(userID)).Bytes()
	if err != nil {
		return nil, err
	}
	return data, nil
}

// DeleteUserProfile invalidates the user profile cache entry.
func (c *Cache) DeleteUserProfile(ctx context.Context, userID string) error {
	return c.client.Del(ctx, c.userProfileKey(userID)).Err()
}
