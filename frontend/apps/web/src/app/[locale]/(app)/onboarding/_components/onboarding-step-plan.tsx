import { Check } from 'lucide-react';
import { Button, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ordo/ui';
import { cn } from '@ordo/core';

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with your creator journey.',
    features: [
      'Up to 50 ideas',
      '1 workspace',
      'Basic pipeline',
      '10 AI requests/month',
      'Community support',
    ],
    cta: 'Continue for free',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'Everything you need to grow consistently.',
    features: [
      'Up to 500 ideas',
      '5 workspaces',
      'Full pipeline + series',
      '100 AI requests/month',
      'Analytics & consistency tracker',
      'Sponsorship CRM',
      'Priority support',
    ],
    cta: 'Start Pro',
    highlighted: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams and agencies at scale.',
    features: [
      'Unlimited everything',
      'Team collaboration',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
    ],
    cta: 'Contact sales',
  },
];

interface OnboardingStepPlanProps {
  onSelect: (plan: string) => void;
  onBack: () => void;
}

export function OnboardingStepPlan({ onSelect, onBack }: OnboardingStepPlanProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose your plan</h2>
        <p className="mt-2 text-muted-foreground">
          You can always upgrade later. Start free with no credit card required.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'relative',
              plan.highlighted && 'border-primary shadow-md',
            )}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default">{plan.badge}</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted ? 'primary' : 'outline'}
                className="w-full"
                onClick={() => onSelect(plan.name.toLowerCase())}
              >
                {plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="ghost" onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
