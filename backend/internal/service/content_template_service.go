package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/google/uuid"
	"github.com/ordo/creators-os/internal/domain"
	"github.com/ordo/creators-os/internal/repository"
)

// contentTemplateService implements ContentTemplateService.
type contentTemplateService struct {
	templateRepo repository.ContentTemplateRepository
	contentRepo  repository.ContentRepository
	aiSvc        AIService
	logger       *slog.Logger
}

// NewContentTemplateService creates a new ContentTemplateService.
func NewContentTemplateService(
	templateRepo repository.ContentTemplateRepository,
	contentRepo repository.ContentRepository,
	aiSvc AIService,
	logger *slog.Logger,
) ContentTemplateService {
	if logger == nil {
		logger = slog.Default()
	}
	return &contentTemplateService{
		templateRepo: templateRepo,
		contentRepo:  contentRepo,
		aiSvc:        aiSvc,
		logger:       logger,
	}
}

// Create creates a new content template.
func (s *contentTemplateService) Create(ctx context.Context, workspaceID uuid.UUID, name string, description *string, contentType domain.ContentType, platformTarget *domain.PlatformType, defaultChecklist map[string]any, promptTemplate *string, metadata map[string]any) (*domain.ContentTemplate, error) {
	if contentType == "" {
		contentType = domain.ContentTypeVideo
	}
	if defaultChecklist == nil {
		defaultChecklist = map[string]any{}
	}
	if metadata == nil {
		metadata = map[string]any{}
	}

	t := &domain.ContentTemplate{
		WorkspaceID:      workspaceID,
		Name:             name,
		Description:      description,
		ContentType:      contentType,
		PlatformTarget:   platformTarget,
		DefaultChecklist: defaultChecklist,
		PromptTemplate:   promptTemplate,
		Metadata:         metadata,
	}

	created, err := s.templateRepo.Create(ctx, t)
	if err != nil {
		return nil, fmt.Errorf("content_template: create: %w", err)
	}
	return created, nil
}

// GetByID retrieves a content template by ID.
func (s *contentTemplateService) GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentTemplate, error) {
	t, err := s.templateRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("content_template: get: %w", err)
	}
	return t, nil
}

// List returns all content templates for a workspace.
func (s *contentTemplateService) List(ctx context.Context, workspaceID uuid.UUID) ([]*domain.ContentTemplate, error) {
	templates, err := s.templateRepo.List(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("content_template: list: %w", err)
	}
	return templates, nil
}

// Update updates mutable fields of a content template.
func (s *contentTemplateService) Update(ctx context.Context, id uuid.UUID, name *string, description *string, contentType *domain.ContentType, platformTarget *domain.PlatformType, defaultChecklist map[string]any, promptTemplate *string, metadata map[string]any) (*domain.ContentTemplate, error) {
	t, err := s.templateRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("content_template: update: get: %w", err)
	}

	if name != nil {
		t.Name = *name
	}
	if description != nil {
		t.Description = description
	}
	if contentType != nil {
		t.ContentType = *contentType
	}
	if platformTarget != nil {
		t.PlatformTarget = platformTarget
	}
	if defaultChecklist != nil {
		t.DefaultChecklist = defaultChecklist
	}
	if promptTemplate != nil {
		t.PromptTemplate = promptTemplate
	}
	if metadata != nil {
		if t.Metadata == nil {
			t.Metadata = make(map[string]any)
		}
		for k, v := range metadata {
			t.Metadata[k] = v
		}
	}

	updated, err := s.templateRepo.Update(ctx, t)
	if err != nil {
		return nil, fmt.Errorf("content_template: update: %w", err)
	}
	return updated, nil
}

// Delete deletes a content template.
func (s *contentTemplateService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := s.templateRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("content_template: delete: %w", err)
	}
	return nil
}

// Instantiate creates a new content item from a template, optionally using AI to generate a script outline.
func (s *contentTemplateService) Instantiate(ctx context.Context, templateID, workspaceID, userID uuid.UUID, topic string, useAI bool) (*domain.Content, error) {
	tmpl, err := s.templateRepo.GetByID(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("content_template: instantiate: get template: %w", err)
	}

	// Build title from topic or template name
	title := topic
	if title == "" {
		title = tmpl.Name
	}

	// Build metadata with default checklist
	contentMetadata := make(map[string]any)
	for k, v := range tmpl.Metadata {
		contentMetadata[k] = v
	}
	if len(tmpl.DefaultChecklist) > 0 {
		contentMetadata["checklist"] = tmpl.DefaultChecklist
	}
	contentMetadata["template_id"] = tmpl.ID.String()
	contentMetadata["template_name"] = tmpl.Name

	// Build description — optionally AI-generated
	var description *string
	if useAI && tmpl.PromptTemplate != nil && s.aiSvc != nil {
		prompt := strings.ReplaceAll(*tmpl.PromptTemplate, "{{topic}}", topic)
		script, aiErr := s.aiSvc.GenerateScript(ctx, userID, title, prompt)
		if aiErr != nil {
			s.logger.WarnContext(ctx, "AI script generation failed, creating content without AI pre-fill",
				"template_id", templateID,
				"err", aiErr,
			)
		} else {
			description = &script
		}
	}

	content := &domain.Content{
		WorkspaceID:    workspaceID,
		CreatedBy:      userID,
		Title:          title,
		Description:    description,
		Status:         domain.ContentStatusIdea,
		ContentType:    tmpl.ContentType,
		PlatformTarget: tmpl.PlatformTarget,
		Metadata:       contentMetadata,
	}

	created, err := s.contentRepo.Create(ctx, content)
	if err != nil {
		return nil, fmt.Errorf("content_template: instantiate: create content: %w", err)
	}
	return created, nil
}

// Ensure contentTemplateService implements ContentTemplateService at compile time.
var _ ContentTemplateService = (*contentTemplateService)(nil)
