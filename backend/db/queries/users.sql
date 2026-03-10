-- GetUserByEmail: SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1;

-- GetUserByID: SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL LIMIT 1;

-- CreateUser: INSERT INTO users (email, password_hash, full_name, avatar_url, oauth_provider, oauth_provider_id, subscription_tier, ai_credits_balance)
--             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
--             RETURNING *;

-- UpdateUser: UPDATE users SET full_name = $2, avatar_url = $3, updated_at = NOW()
--             WHERE id = $1 AND deleted_at IS NULL
--             RETURNING *;

-- SoftDeleteUser: UPDATE users SET deleted_at = NOW(), updated_at = NOW()
--                 WHERE id = $1 AND deleted_at IS NULL;

-- UpdateSubscriptionTier: UPDATE users SET subscription_tier = $2, updated_at = NOW()
--                          WHERE id = $1 AND deleted_at IS NULL;

-- DecrementAICredits: UPDATE users SET ai_credits_balance = ai_credits_balance - $2, updated_at = NOW()
--                     WHERE id = $1 AND deleted_at IS NULL AND ai_credits_balance >= $2;

-- GetAICreditsBalance: SELECT ai_credits_balance FROM users WHERE id = $1 AND deleted_at IS NULL;

-- UpdateEmailVerificationToken: UPDATE users SET email_verification_token = $2, email_verification_expires_at = $3, updated_at = NOW()
--                                WHERE id = $1 AND deleted_at IS NULL;

-- MarkEmailVerified: UPDATE users SET is_email_verified = true, email_verification_token = NULL, email_verification_expires_at = NULL, updated_at = NOW()
--                    WHERE email_verification_token = $1 AND email_verification_expires_at > NOW() AND deleted_at IS NULL;

-- UpdatePasswordResetToken: UPDATE users SET password_reset_token = $2, password_reset_expires_at = $3, updated_at = NOW()
--                            WHERE id = $1 AND deleted_at IS NULL;

-- UpdatePassword: UPDATE users SET password_hash = $2, password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = NOW()
--                 WHERE id = $1 AND deleted_at IS NULL;

-- UpsertOAuthUser: INSERT INTO users (email, full_name, avatar_url, oauth_provider, oauth_provider_id, is_email_verified)
--                  VALUES ($1, $2, $3, $4, $5, true)
--                  ON CONFLICT (email) DO UPDATE SET
--                      oauth_provider = EXCLUDED.oauth_provider,
--                      oauth_provider_id = EXCLUDED.oauth_provider_id,
--                      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
--                      updated_at = NOW()
--                  RETURNING *;
