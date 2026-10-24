// tests/e2e/printing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Print Agent Integration', () => {
  test('completes full print flow from sale to acknowledgment', async ({ page }) => {
    // Login as cashier
    await page.goto('/pos');
    await page.fill('[name="email"]', 'cashier@test.com');
    await page.fill('[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    
    // Add product to cart
    await page.fill('[data-testid="barcode-search"]', '8901234567890');
    await page.press('[data-testid="barcode-search"]', 'Enter');
    
    // Complete sale
    await page.click('[data-testid="pay-button"]');
    await page.click('[data-testid="cash-payment"]');
    await page.click('[data-testid="complete-sale"]');
    
    // Wait for print job to be created
    await page.waitForSelector('[data-testid="print-job-queued"]', { timeout: 5000 });
    
    // Verify print job appears in queue
    const printJob = await page.textContent('[data-testid="print-job-queued"]');
    expect(printJob).toContain('Printing receipt');
    
    // Simulate print agent response (in test env, mock agent endpoint)
    // In real env, agent would receive the job and respond
    await page.waitForSelector('[data-testid="print-job-success"]', { timeout: 10000 });
    
    // Verify job status updated
    const successMessage = await page.textContent('[data-testid="print-job-success"]');
    expect(successMessage).toContain('Receipt printed');
  });
  
  test('falls back to browser dialog when agent unavailable', async ({ page }) => {
    // Mock agent unavailable
    await page.route('http://127.0.0.1:27182/print', route => route.abort());
    
    await page.goto('/pos');
    // ... complete sale ...
    
    // Should show fallback prompt
    await page.waitForSelector('[data-testid="print-fallback-dialog"]');
    const dialog = await page.textContent('[data-testid="print-fallback-dialog"]');
    expect(dialog).toContain('Print Agent unavailable');
    expect(dialog).toContain('Use browser print dialog');
  });
});
