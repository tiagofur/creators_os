'use client';

import * as React from 'react';
import { Sparkles, FileText } from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Label,
  Switch,
} from '@ordo/ui';
import type { ContentTemplate } from '@ordo/types';

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ContentTemplate[];
  onSelectTemplate: (templateId: string, topic: string, useAI: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function TemplatePicker({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
  isLoading,
}: TemplatePickerProps) {
  const [selectedTemplate, setSelectedTemplate] = React.useState<ContentTemplate | null>(null);
  const [topic, setTopic] = React.useState('');
  const [useAI, setUseAI] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async () => {
    if (!selectedTemplate) return;
    setSubmitting(true);
    try {
      await onSelectTemplate(selectedTemplate.id, topic, useAI);
      onOpenChange(false);
      setSelectedTemplate(null);
      setTopic('');
      setUseAI(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setSelectedTemplate(null);
    setTopic('');
    setUseAI(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedTemplate ? 'Configure Content' : 'Start from Template'}
          </DialogTitle>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-3">
            {templates.length === 0 && (
              <div className="py-6 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No templates available. Create one first.</p>
              </div>
            )}
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="py-3 pb-1">
                    <CardTitle className="text-sm">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-xs line-clamp-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {template.content_type}
                      </Badge>
                      {template.platform_target && (
                        <Badge variant="outline" className="text-xs">
                          {template.platform_target}
                        </Badge>
                      )}
                      {template.prompt_template && (
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-0.5" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="font-medium text-sm">{selectedTemplate.name}</p>
              <div className="flex gap-1.5 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {selectedTemplate.content_type}
                </Badge>
                {selectedTemplate.platform_target && (
                  <Badge variant="outline" className="text-xs">
                    {selectedTemplate.platform_target}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic / Title</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter the topic for this content..."
              />
            </div>

            {selectedTemplate.prompt_template && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">AI Script Outline</p>
                    <p className="text-xs text-muted-foreground">
                      Generate a script outline using AI
                    </p>
                  </div>
                </div>
                <Switch checked={useAI} onCheckedChange={setUseAI} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                loading={submitting}
                disabled={!topic.trim() && !selectedTemplate.name}
              >
                {useAI ? 'Create with AI' : 'Create Content'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
