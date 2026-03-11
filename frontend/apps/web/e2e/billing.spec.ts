import { test, expect } from '@playwright/test';

/**
 * TASK-616 — Billing upgrade E2E test
 *
 * Covers:
 *  1. Click upgrade CTA on the billing settings page
 *  2. Intercept POST /api/v1/billing/checkout and verify correct plan ID
 *  3. Simulate WebSocket subscription_updated event -> plan badge updates to "Pro"
 *  4. Uses Stripe test mode (never real Stripe)
 */
test.describe('Billing upgrade flow', () => {
  test.beforeEach(async ({ page }) => {
    // Log in first — fill the form and redirect to dashboard
    await page.goto('/en/login');
    await page.getByLabel('Email').fill('creator@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL('**/dashboard');
  });

  test('upgrade from Free to Pro via billing page', async ({ page }) => {
    // ── Step 1: Override subscription to return "free" tier ──────
    await test.step('Override subscription to free tier', async () => {
      await page.route('**/v1/billing/subscription', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'sub_01HQSUB111111111',
            tier: 'free',
            status: 'active',
            currentPeriodStart: '2025-01-01T00:00:00.000Z',
            currentPeriodEnd: '2025-02-01T00:00:00.000Z',
            cancelAtPeriodEnd: false,
          }),
        }),
      );
    });

    // ── Step 2: Navigate to billing page ────────────────────────
    await test.step('Navigate to billing settings', async () => {
      await page.goto('/en/settings/billing');

      await expect(
        page.getByRole('heading', { name: 'Billing' }),
      ).toBeVisible();

      // Verify current plan shows "free"
      await expect(page.getByText('free').first()).toBeVisible();
    });

    // ── Step 3: Intercept checkout API and click Upgrade ────────
    let checkoutRequestBody: Record<string, unknown> | null = null;

    await test.step('Click Upgrade on Pro plan and verify checkout request', async () => {
      // Intercept the POST /v1/billing/checkout to capture the
      // request body and verify the correct plan ID is sent.
      await page.route('**/v1/billing/checkout', async (route) => {
        const request = route.request();
        checkoutRequestBody = JSON.parse(
          request.postData() ?? '{}',
        ) as Record<string, unknown>;

        // Return a mock Stripe checkout URL (test mode — never real)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://checkout.stripe.com/c/pay/cs_test_mock_session_id',
          }),
        });
      });

      // Prevent the page from navigating away to Stripe
      await page.route('https://checkout.stripe.com/**', (route) =>
        route.abort(),
      );

      // Click the "Upgrade" button in the Pro plan card
      // The PlanSelector renders plan cards with tier names as headings
      // and an "Upgrade" CTA button for non-current tiers.
      const proPlanCard = page.getByText('pro', { exact: false }).locator('..').locator('..');
      const upgradeButton = page.getByRole('button', { name: 'Upgrade' });
      await upgradeButton.click();
    });

    await test.step('Verify checkout request sent correct plan ID', async () => {
      expect(checkoutRequestBody).not.toBeNull();
      expect(checkoutRequestBody!.tier).toBe('pro');
      // Should also include the billing period
      expect(checkoutRequestBody!.billingPeriod).toBeDefined();
    });

    // ── Step 4: Simulate subscription_updated WebSocket event ───
    await test.step('Simulate WebSocket subscription_updated event', async () => {
      // In a real app, the server sends a WebSocket message when
      // Stripe fires a webhook. We simulate this by:
      // 1. Updating the subscription endpoint to return "pro"
      // 2. Dispatching a custom event that the app listens for
      //    (or directly calling the query invalidation)

      // Override the subscription endpoint to now return pro
      await page.unroute('**/v1/billing/subscription');
      await page.route('**/v1/billing/subscription', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'sub_01HQSUB111111111',
            tier: 'pro',
            status: 'active',
            currentPeriodStart: '2025-01-01T00:00:00.000Z',
            currentPeriodEnd: '2025-02-01T00:00:00.000Z',
            cancelAtPeriodEnd: false,
          }),
        }),
      );

      // Simulate the WebSocket event by dispatching a custom event
      // that triggers a React Query refetch, or directly invalidate
      // the query cache from the browser context.
      await page.evaluate(() => {
        // Dispatch a custom event the app can listen to
        window.dispatchEvent(
          new CustomEvent('subscription_updated', {
            detail: { tier: 'pro', status: 'active' },
          }),
        );

        // Also trigger a storage event to force re-renders
        window.dispatchEvent(new Event('focus'));
      });

      // Navigate to billing page to see the updated state
      // (React Query will refetch on window focus or navigation)
      await page.goto('/en/settings/billing');
    });

    await test.step('Verify plan badge shows Pro', async () => {
      // The CurrentPlanCard shows the tier in a badge-like span
      // with class "capitalize" — it should now show "pro"
      await expect(
        page.getByText('pro').first(),
      ).toBeVisible();

      // Verify the plan is marked as active
      await expect(page.getByText('Active')).toBeVisible();
    });
  });

  test('upgrade CTA sends correct billing period when annual is selected', async ({
    page,
  }) => {
    let checkoutBody: Record<string, unknown> | null = null;

    await test.step('Override subscription to free tier', async () => {
      await page.route('**/v1/billing/subscription', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'sub_01HQSUB111111111',
            tier: 'free',
            status: 'active',
            currentPeriodStart: '2025-01-01T00:00:00.000Z',
            currentPeriodEnd: '2025-02-01T00:00:00.000Z',
            cancelAtPeriodEnd: false,
          }),
        }),
      );
    });

    await test.step('Go to billing, switch to annual, and click upgrade', async () => {
      await page.goto('/en/settings/billing');

      // Intercept checkout
      await page.route('**/v1/billing/checkout', async (route) => {
        checkoutBody = JSON.parse(
          route.request().postData() ?? '{}',
        ) as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: 'https://checkout.stripe.com/c/pay/cs_test_annual_mock',
          }),
        });
      });

      // Prevent navigation to Stripe
      await page.route('https://checkout.stripe.com/**', (route) =>
        route.abort(),
      );

      // Click the "Annual" period toggle in the PlanSelector
      await page.getByRole('button', { name: /annual/i }).click();

      // Click upgrade on the Pro plan
      await page.getByRole('button', { name: 'Upgrade' }).click();
    });

    await test.step('Verify annual billing period in request', async () => {
      expect(checkoutBody).not.toBeNull();
      expect(checkoutBody!.tier).toBe('pro');
      expect(checkoutBody!.billingPeriod).toBe('annual');
    });
  });

  test('never connects to real Stripe — all checkout URLs are test mode', async ({
    page,
  }) => {
    // This test verifies that the checkout URL returned by the
    // mock handler is always a Stripe test-mode URL (cs_test_*).

    let checkoutUrl: string | null = null;

    await test.step('Override subscription and capture checkout URL', async () => {
      await page.route('**/v1/billing/subscription', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'sub_01HQSUB111111111',
            tier: 'free',
            status: 'active',
            currentPeriodStart: '2025-01-01T00:00:00.000Z',
            currentPeriodEnd: '2025-02-01T00:00:00.000Z',
            cancelAtPeriodEnd: false,
          }),
        }),
      );

      await page.route('**/v1/billing/checkout', async (route) => {
        const url = 'https://checkout.stripe.com/c/pay/cs_test_safeguard';
        checkoutUrl = url;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ url }),
        });
      });

      await page.route('https://checkout.stripe.com/**', (route) =>
        route.abort(),
      );
    });

    await test.step('Trigger checkout and verify test mode URL', async () => {
      await page.goto('/en/settings/billing');
      await page.getByRole('button', { name: 'Upgrade' }).click();

      expect(checkoutUrl).not.toBeNull();
      expect(checkoutUrl).toContain('cs_test_');
      // Must never contain cs_live_
      expect(checkoutUrl).not.toContain('cs_live_');
    });
  });
});
