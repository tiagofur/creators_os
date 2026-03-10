package storage

import (
	"context"
	"fmt"
	"strings"

	"github.com/ordo/creators-os/internal/config"
)

// NewClient creates the appropriate StorageClient based on cfg.StorageBackend.
//
// Supported backends:
//   - "minio" (default for local dev)
//   - "s3"    (AWS S3 for staging/production)
func NewClient(ctx context.Context, cfg *config.Config) (StorageClient, error) {
	switch strings.ToLower(cfg.StorageBackend) {
	case "s3":
		return NewS3Client(ctx, cfg.AWSRegion, cfg.AWSS3Bucket)
	case "minio", "":
		useSSL := false // MinIO local dev uses plain HTTP
		return NewMinIOClient(cfg.MinIOEndpoint, cfg.MinIOAccessKey, cfg.MinIOSecretKey, cfg.MinIOBucket, useSSL)
	default:
		return nil, fmt.Errorf("storage: unknown backend %q (supported: minio, s3)", cfg.StorageBackend)
	}
}
