package job

import (
	"github.com/hibiken/asynq"
	"github.com/redis/go-redis/v9"
)

// NewScheduler creates and returns an asynq.Scheduler backed by Redis.
// Register periodic tasks using scheduler.Register before calling Run.
func NewScheduler(redisClient *redis.Client) *asynq.Scheduler {
	opts := redisClient.Options()
	redisOpt := asynq.RedisClientOpt{
		Addr:     opts.Addr,
		Password: opts.Password,
		DB:       opts.DB,
	}
	return asynq.NewScheduler(redisOpt, nil)
}
