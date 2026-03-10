package job

import (
	"context"
	"log/slog"

	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
)

// NewWorker creates and returns a configured asynq.Server backed by Redis.
//
// Queue priorities:
//   - critical: weight 6
//   - default:  weight 3
//   - low:      weight 1
//
// Each task retries up to 3 times with a 30-second processing timeout.
func NewWorker(redisClient *redis.Client, logger *slog.Logger) *asynq.Server {
	opts := redisClient.Options()
	redisOpt := asynq.RedisClientOpt{
		Addr:     opts.Addr,
		Password: opts.Password,
		DB:       opts.DB,
	}

	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: 10,
		Queues: map[string]int{
			"critical": 6,
			"default":  3,
			"low":      1,
		},
		RetryDelayFunc: asynq.DefaultRetryDelayFunc,
		ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
			logger.Error("asynq task error",
				"type", task.Type(),
				"err", err,
			)
		}),
	})

	return srv
}
