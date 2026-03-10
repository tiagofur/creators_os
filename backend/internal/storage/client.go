package storage

import (
	"context"
	"time"
)

// StorageClient defines the interface for object storage operations used
// throughout the application. Implementations exist for MinIO (local dev)
// and AWS S3 (staging/production).
type StorageClient interface {
	// PresignPutURL generates a pre-signed URL that allows a client to upload
	// an object directly to storage without backend involvement.
	PresignPutURL(ctx context.Context, key string, expiry time.Duration) (string, error)

	// PresignGetURL generates a pre-signed URL that allows a client to download
	// an object directly from storage.
	PresignGetURL(ctx context.Context, key string, expiry time.Duration) (string, error)

	// HeadObject retrieves metadata about an object (size, content-type, etc.)
	// without downloading its content. Returns an error if the object does not exist.
	HeadObject(ctx context.Context, key string) (*ObjectInfo, error)
}

// ObjectInfo contains metadata returned by HeadObject.
type ObjectInfo struct {
	Key         string
	Size        int64
	ContentType string
	ETag        string
}
