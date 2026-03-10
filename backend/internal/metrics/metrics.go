package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTPRequestsTotal counts all HTTP requests processed by the server.
	// Label "path" uses the Chi route pattern to avoid high cardinality from UUIDs.
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "ordo_http_requests_total",
			Help: "Total number of HTTP requests processed.",
		},
		[]string{"method", "path", "status"},
	)

	// HTTPRequestDuration measures the latency distribution of HTTP requests.
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "ordo_http_request_duration_seconds",
			Help:    "HTTP request latency distribution.",
			Buckets: []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5},
		},
		[]string{"method", "path", "status"},
	)

	// DBQueryDuration measures PostgreSQL query execution time.
	// Each repository method should record start/end time.
	DBQueryDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "ordo_db_query_duration_seconds",
			Help:    "PostgreSQL query execution time.",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
		},
		[]string{"query"},
	)

	// DBPoolConnections tracks current pgxpool connection states.
	// Values for "state" label: "idle", "in_use", "total".
	DBPoolConnections = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "ordo_db_pool_connections",
			Help: "Current pgxpool connection states.",
		},
		[]string{"state"},
	)

	// RedisOperationsTotal counts Redis command invocations by command and status.
	RedisOperationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "ordo_redis_operations_total",
			Help: "Redis command invocations.",
		},
		[]string{"operation", "status"},
	)

	// AsynqTasksTotal counts Asynq task processing events by queue and status.
	AsynqTasksTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "ordo_asynq_tasks_total",
			Help: "Asynq task processing counts.",
		},
		[]string{"queue", "status"},
	)
)

// Init is a no-op that forces the package to be imported and all metric
// variables to be registered with prometheus.DefaultRegisterer via promauto.
// Call this once during application startup.
func Init() {
	// All metrics are registered at package init time via promauto.
	// This function exists as a hook for future explicit registration needs
	// and to make the startup dependency graph explicit.
}
