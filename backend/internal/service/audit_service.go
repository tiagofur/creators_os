package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ordo/creators-os/internal/domain"
)

const (
	auditBatchSize    = 100
	auditFlushTimeout = 500 * time.Millisecond
	auditChannelSize  = 1000
)

// AuditService records workspace activity log entries to the database
// asynchronously using a buffered channel and a batch writer goroutine.
type AuditService struct {
	pool   *pgxpool.Pool
	ch     chan *domain.ActivityLogEntry
	logger *slog.Logger
}

// NewAuditService creates a new AuditService. Call Start to begin background processing.
func NewAuditService(pool *pgxpool.Pool, logger *slog.Logger) *AuditService {
	return &AuditService{
		pool:   pool,
		ch:     make(chan *domain.ActivityLogEntry, auditChannelSize),
		logger: logger,
	}
}

// Log pushes an audit entry onto the internal channel.
// Non-blocking: drops the entry silently if the channel is full.
func (s *AuditService) Log(ctx context.Context, entry *domain.ActivityLogEntry) {
	select {
	case s.ch <- entry:
	default:
		s.logger.Warn("audit channel full — dropping entry", "action", entry.Action)
	}
}

// Start launches the background batch writer goroutine.
// It runs until ctx is cancelled. Pass a context derived from the application
// lifecycle so it is stopped during graceful shutdown.
func (s *AuditService) Start(ctx context.Context) {
	go s.run(ctx)
}

func (s *AuditService) run(ctx context.Context) {
	ticker := time.NewTicker(auditFlushTimeout)
	defer ticker.Stop()

	batch := make([]*domain.ActivityLogEntry, 0, auditBatchSize)

	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := s.writeBatch(ctx, batch); err != nil {
			s.logger.Error("audit batch write failed", "err", err, "count", len(batch))
		}
		batch = batch[:0]
	}

	for {
		select {
		case entry, ok := <-s.ch:
			if !ok {
				flush()
				return
			}
			batch = append(batch, entry)
			if len(batch) >= auditBatchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		case <-ctx.Done():
			// Drain remaining entries.
			for {
				select {
				case entry := <-s.ch:
					batch = append(batch, entry)
				default:
					flush()
					return
				}
			}
		}
	}
}

func (s *AuditService) writeBatch(ctx context.Context, entries []*domain.ActivityLogEntry) error {
	rows := make([][]any, 0, len(entries))
	for _, e := range entries {
		metadata := e.Metadata
		if metadata == nil {
			metadata = map[string]any{}
		}
		rows = append(rows, []any{
			e.WorkspaceID,
			e.UserID,
			e.Action,
			e.EntityType,
			e.EntityID,
			metadata,
		})
	}

	_, err := s.pool.CopyFrom(
		ctx,
		pgx.Identifier{"activity_logs"},
		[]string{"workspace_id", "user_id", "action", "entity_type", "entity_id", "metadata"},
		pgx.CopyFromRows(rows),
	)
	return err
}
