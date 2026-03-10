-- CreateSession: INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
--                VALUES ($1, $2, $3, $4, $5)
--                RETURNING *;

-- GetSessionByTokenHash: SELECT * FROM user_sessions
--                         WHERE refresh_token_hash = $1
--                           AND revoked_at IS NULL
--                           AND expires_at > NOW()
--                         LIMIT 1;

-- RevokeSession: UPDATE user_sessions SET revoked_at = NOW()
--                WHERE refresh_token_hash = $1 AND revoked_at IS NULL;

-- RevokeAllUserSessions: UPDATE user_sessions SET revoked_at = NOW()
--                        WHERE user_id = $1 AND revoked_at IS NULL;

-- ListActiveSessions: SELECT * FROM user_sessions
--                     WHERE user_id = $1
--                       AND revoked_at IS NULL
--                       AND expires_at > NOW()
--                     ORDER BY created_at DESC;
