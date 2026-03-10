# Staging Deployment Runbook

## Prerequisites
- AWS CLI configured with staging profile
- ECS task definition updated with new image tag
- Database migration reviewed and tested locally

## Deployment Steps

### 1. Pre-deploy
```bash
# Run migrations against staging DB
DATABASE_URL=$STAGING_DATABASE_URL make migrate-up
# Verify migration succeeded
DATABASE_URL=$STAGING_DATABASE_URL make migrate-status
```

### 2. Deploy
```bash
# Update ECS service with new task definition revision
aws ecs update-service \
  --cluster ordo-staging \
  --service ordo-api \
  --task-definition ordo-api:latest \
  --force-new-deployment \
  --profile staging
```

### 3. Health Check
```bash
# Wait for deployment to complete (ECS rolling update)
aws ecs wait services-stable --cluster ordo-staging --services ordo-api --profile staging
# Verify health endpoint
curl https://staging-api.ordocreator.com/health
```

### 4. Rollback
```bash
# Rollback to previous task definition revision
aws ecs update-service \
  --cluster ordo-staging \
  --service ordo-api \
  --task-definition ordo-api:PREVIOUS_REVISION \
  --profile staging
# Rollback migration if needed
DATABASE_URL=$STAGING_DATABASE_URL make migrate-down
```

## Environment Variables
- `DB_READ_REPLICA_URL`: Set to RDS read replica endpoint for analytics queries
- `APP_ENV`: Must be `staging`
- All secrets sourced from AWS Secrets Manager; inject as env vars in ECS task definition

## ECS Health Check Grace Period
Set `healthCheckGracePeriodSeconds: 30` in ECS service definition to allow app startup before health checks begin.

## Secrets Rotation
Rotate these secrets every 90 days via AWS Secrets Manager:
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`: Generate new RS256 key pair; update task definition; rolling deploy
- `AES_ENCRYPTION_KEY`: Requires re-encryption of platform_credentials — coordinate with team
- `STRIPE_SECRET_KEY`: Update in Stripe dashboard first, then rotate env var
- `AI_CLAUDE_API_KEY` / `AI_OPENAI_API_KEY`: Rotate in provider dashboard, then update secret
