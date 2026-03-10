-- Sponsorship queries (documented; implemented manually in repository/sponsorship_repository.go)

-- name: CreateSponsorship :one
-- INSERT INTO sponsorships (workspace_id, brand_name, contact_name, contact_email, status, deal_value, currency, notes, start_date, end_date)
-- VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
-- RETURNING *;

-- name: GetSponsorshipByID :one
-- SELECT * FROM sponsorships WHERE id = $1 AND deleted_at IS NULL;

-- name: ListSponsorships :many
-- SELECT * FROM sponsorships
-- WHERE workspace_id = $1 AND deleted_at IS NULL
-- [AND status = $2] [AND created_at >= $3] [AND created_at <= $4]
-- ORDER BY created_at DESC
-- LIMIT $5 OFFSET $6;

-- name: UpdateSponsorship :one
-- UPDATE sponsorships SET brand_name=$2, contact_name=$3, contact_email=$4, status=$5,
--     deal_value=$6, currency=$7, notes=$8, start_date=$9, end_date=$10, updated_at=NOW()
-- WHERE id=$1 AND deleted_at IS NULL
-- RETURNING *;

-- name: SoftDeleteSponsorship :exec
-- UPDATE sponsorships SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL;

-- name: AddSponsorshipMessage :one
-- INSERT INTO sponsorship_messages (sponsorship_id, user_id, content)
-- VALUES ($1, $2, $3)
-- RETURNING id, sponsorship_id, user_id, content, created_at;

-- name: ListSponsorshipMessages :many
-- SELECT id, sponsorship_id, user_id, content, created_at
-- FROM sponsorship_messages
-- WHERE sponsorship_id = $1
-- ORDER BY created_at ASC;
