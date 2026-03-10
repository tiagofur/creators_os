package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3Client implements StorageClient using AWS S3.
type S3Client struct {
	client     *s3.Client
	presigner  *s3.PresignClient
	bucket     string
}

// NewS3Client creates an AWS S3-backed StorageClient using the default AWS
// credential chain (env vars, ~/.aws/credentials, EC2 instance profile, etc.).
//
// Parameters:
//   - region: AWS region, e.g. "us-east-1"
//   - bucket: Target S3 bucket name
func NewS3Client(ctx context.Context, region, bucket string) (*S3Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("storage/s3: load aws config: %w", err)
	}

	client := s3.NewFromConfig(cfg)
	presigner := s3.NewPresignClient(client)

	return &S3Client{
		client:    client,
		presigner: presigner,
		bucket:    bucket,
	}, nil
}

// PresignPutURL generates a pre-signed PUT URL for direct client uploads.
func (s *S3Client) PresignPutURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	req, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", fmt.Errorf("storage/s3: presign put: %w", err)
	}
	return req.URL, nil
}

// PresignGetURL generates a pre-signed GET URL for direct client downloads.
func (s *S3Client) PresignGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	req, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", fmt.Errorf("storage/s3: presign get: %w", err)
	}
	return req.URL, nil
}

// HeadObject retrieves object metadata without downloading the content.
func (s *S3Client) HeadObject(ctx context.Context, key string) (*ObjectInfo, error) {
	out, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("storage/s3: head object: %w", err)
	}

	var size int64
	if out.ContentLength != nil {
		size = *out.ContentLength
	}

	var contentType string
	if out.ContentType != nil {
		contentType = *out.ContentType
	}

	var etag string
	if out.ETag != nil {
		etag = *out.ETag
	}

	return &ObjectInfo{
		Key:         key,
		Size:        size,
		ContentType: contentType,
		ETag:        etag,
	}, nil
}
