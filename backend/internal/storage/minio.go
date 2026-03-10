package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinIOClient implements StorageClient using MinIO.
type MinIOClient struct {
	client *minio.Client
	bucket string
}

// NewMinIOClient creates a MinIO-backed StorageClient.
//
// Parameters:
//   - endpoint:  MinIO server address, e.g. "localhost:9000"
//   - accessKey: MinIO access key
//   - secretKey: MinIO secret key
//   - bucket:    Target bucket name
//   - useSSL:    Whether to connect over TLS
func NewMinIOClient(endpoint, accessKey, secretKey, bucket string, useSSL bool) (*MinIOClient, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("storage/minio: create client: %w", err)
	}

	return &MinIOClient{
		client: client,
		bucket: bucket,
	}, nil
}

// PresignPutURL generates a pre-signed PUT URL for direct client uploads.
func (m *MinIOClient) PresignPutURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	u, err := m.client.PresignedPutObject(ctx, m.bucket, key, expiry)
	if err != nil {
		return "", fmt.Errorf("storage/minio: presign put: %w", err)
	}
	return u.String(), nil
}

// PresignGetURL generates a pre-signed GET URL for direct client downloads.
func (m *MinIOClient) PresignGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	u, err := m.client.PresignedGetObject(ctx, m.bucket, key, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("storage/minio: presign get: %w", err)
	}
	return u.String(), nil
}

// HeadObject retrieves object metadata without downloading the content.
func (m *MinIOClient) HeadObject(ctx context.Context, key string) (*ObjectInfo, error) {
	info, err := m.client.StatObject(ctx, m.bucket, key, minio.StatObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("storage/minio: head object: %w", err)
	}
	return &ObjectInfo{
		Key:         info.Key,
		Size:        info.Size,
		ContentType: info.ContentType,
		ETag:        info.ETag,
	}, nil
}
