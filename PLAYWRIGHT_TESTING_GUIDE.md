# Playwright Testing Guide for Room Planner

This guide shows you how to write and run automated tests for your room planner app using Playwright.

---

## What Are These Tests For?

Automated tests let you verify that features work correctly without manually clicking through the app every time. Think of them as **robot assistants** that test your app for you.

### Real-World Example

**Without tests:**
- You change the zoom code
- You manually click zoom buttons: "Does 50% work? 100%? 200%? Keyboard shortcut?"
- Takes 5 minutes, easy to forget edge cases

**With tests:**
- You change the zoom code
- Run `npm test`
- In 10 seconds, all zoom scenarios are tested automatically
- If something broke, you see exactly what and where

---

## Setup (One-Time)

### Install Playwright

Open Cursor Agent and run this:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

This installs Playwright and the Chromium browser for testing.

### Create Test Configuration

Create a file called `playwright.config.ts` in your project root:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Create Tests Folder

```bash
mkdir tests
```

---

## Your First Test

Create `tests/room-planner-basic.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('app loads successfully', async ({ page }) => {
  await page.goto('/');
  
  // Check that the page title is correct
  await expect(page).toHaveTitle(/Room Planner/);
  
  // Check that the canvas is visible
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  
  // Check that control buttons are visible
  await expect(page.getByRole('button', { name: /add furniture/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /zoom in/i })).toBeVisible();
});
```

### Run Your First Test

```bash
npx playwright test
```

You should see:
```
Running 1 test using 1 worker

  ✓  tests/room-planner-basic.spec.ts:3:1 › app loads successfully (1.2s)

  1 passed (2.0s)
```

---

## Example Tests for Your Room Planner

### Test: Adding Furniture

```typescript
test('can add furniture to canvas', async ({ page }) => {
  await page.goto('/');
  
  // Click "Add Furniture" button
  await page.getByRole('button', { name: /add furniture/i }).click();
  
  // Select "Sofa" from library
  await page.getByText('Sofa').click();
  
  // Click on canvas to place furniture
  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 200, y: 150 } });
  
  // Verify console shows furniture was added (check your debug logs)
  const logs = await page.evaluate(() => {
    return (window as any).__consoleLogs || [];
  });
  
  // Or verify visually by taking screenshot
  await expect(page).toHaveScreenshot('furniture-added.png');
});
```

### Test: Zoom Functionality

```typescript
test('zoom buttons change zoom level correctly', async ({ page }) => {
  await page.goto('/');
  
  // Click zoom in button
  await page.getByRole('button', { name: /zoom in/i }).click();
  
  // Wait for zoom to apply
  await page.waitForTimeout(300);
  
  // Check that zoom level display shows 110%
  await expect(page.getByText('110%')).toBeVisible();
  
  // Click zoom out button
  await page.getByRole('button', { name: /zoom out/i }).click();
  await page.waitForTimeout(300);
  
  // Check that zoom level is back to 100%
  await expect(page.getByText('100%')).toBeVisible();
});
```

### Test: Drag Furniture

```typescript
test('can drag furniture to new position', async ({ page }) => {
  await page.goto('/');
  
  // First add a piece of furniture
  await page.getByRole('button', { name: /add furniture/i }).click();
  await page.getByText('Sofa').click();
  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 100, y: 100 } });
  
  // Now drag it to a new position
  await canvas.hover({ position: { x: 100, y: 100 } });
  await page.mouse.down();
  await page.mouse.move(200, 200);
  await page.mouse.up();
  
  // Take screenshot to verify new position
  await expect(page).toHaveScreenshot('furniture-dragged.png');
});
```

### Test: Measurement Tool

```typescript
test('measurement tool shows correct dimensions', async ({ page }) => {
  await page.goto('/');
  
  // Add furniture
  await page.getByRole('button', { name: /add furniture/i }).click();
  await page.getByText('Sofa').click();
  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 200, y: 150 } });
  
  // Click on furniture to select it
  await canvas.click({ position: { x: 200, y: 150 } });
  
  // Check that measurement overlay appears
  await expect(page.locator('text=/\\d+ cm x \\d+ cm/')).toBeVisible();
});
```

### Test: Delete Furniture

```typescript
test('can delete furniture item', async ({ page }) => {
  await page.goto('/');
  
  // Add furniture
  await page.getByRole('button', { name: /add furniture/i }).click();
  await page.getByText('Sofa').click();
  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 200, y: 150 } });
  
  // Select furniture
  await canvas.click({ position: { x: 200, y: 150 } });
  
  // Press Delete key
  await page.keyboard.press('Delete');
  
  // Verify console shows deletion (check your debug logs)
  await page.waitForTimeout(500);
  
  // Take screenshot - furniture should be gone
  await expect(page).toHaveScreenshot('furniture-deleted.png');
});
```

---

## Running Tests

### Run All Tests

```bash
npx playwright test
```

### Run Tests in UI Mode (Recommended for Debugging)

```bash
npx playwright test --ui
```

This opens a visual interface where you can:
- See tests running in real-time
- Pause and inspect at any step
- See screenshots and console logs
- Re-run failed tests

### Run Specific Test File

```bash
npx playwright test tests/room-planner-basic.spec.ts
```

### Run Tests in Debug Mode

```bash
npx playwright test --debug
```

This opens the Playwright Inspector where you can step through tests line by line.

---

## Understanding Test Results

### ✅ Passing Test
```
✓  tests/room-planner-basic.spec.ts:3:1 › app loads successfully (1.2s)
```
Everything works as expected!

### ❌ Failing Test
```
✗  tests/room-planner-basic.spec.ts:15:1 › can add furniture to canvas (3.4s)

  Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  
  Locator: getByRole('button', { name: /add furniture/i })
```

This tells you:
- **Which test failed**: "can add furniture to canvas"
- **What went wrong**: Button wasn't visible after 5 seconds
- **Where to look**: The "Add Furniture" button

### View HTML Report

After running tests:

```bash
npx playwright show-report
```

Opens a browser showing:
- Which tests passed/failed
- Screenshots at failure points
- Console logs
- Network requests
- Step-by-step trace

---

## Best Practices

### 1. Use Descriptive Test Names

**Good:**
```typescript
test('zoom in button increases zoom from 100% to 110%', async ({ page }) => {
```

**Bad:**
```typescript
test('test zoom', async ({ page }) => {
```

### 2. Test User Workflows, Not Implementation Details

**Good:** Test that clicking "Add Furniture" lets you place a sofa on the canvas
**Bad:** Test that `addFurniture()` function returns a specific object shape

### 3. Keep Tests Independent

Each test should:
- Start from a clean state
- Not depend on other tests running first
- Clean up after itself

### 4. Use Visual Regression Testing Sparingly

Screenshots are great for catching visual changes, but they break often (fonts, timing). Use them for critical visual features only.

### 5. Update Tests When Features Change

If you change how zoom works, update the zoom tests. Don't leave broken tests - they lose value quickly.

---

## When to Run Tests

### Always Run Before:
- ✅ Committing code to Git
- ✅ Deploying to production
- ✅ Making major refactors

### Consider Running:
- ⚠️ After adding a new feature
- ⚠️ After fixing a bug
- ⚠️ Daily (if working on the project)

### Add to package.json

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug"
  }
}
```

Now you can run:
- `npm test` - Run all tests
- `npm run test:ui` - Open UI mode
- `npm run test:debug` - Debug mode

---

## Common Issues

### "Cannot find baseURL"
Make sure your dev server is running on `http://localhost:3000`. Update `playwright.config.ts` if you use a different port.

### "Test times out"
Increase timeout:
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ... rest of test
});
```

### "Element not found"
Use `await page.waitForSelector()` or increase timeout:
```typescript
await expect(page.getByText('Sofa')).toBeVisible({ timeout: 10000 });
```

### Screenshots Don't Match
Update expected screenshots:
```bash
npx playwright test --update-snapshots
```

---

## Next Steps

1. **Start simple**: Write 3-5 tests for your most critical features
2. **Run them regularly**: Get into the habit of running tests before commits
3. **Add tests for bugs**: When you fix a bug, write a test to prevent it
4. **Grow gradually**: Add more tests as features stabilize

Remember: **Some tests are better than no tests**, but don't aim for 100% coverage right away. Focus on the features that would hurt most if they broke.

---

## Getting Help

- **Playwright Docs**: https://playwright.dev
- **Ask AI**: "How do I test [specific feature] with Playwright?"
- **Debug with UI Mode**: `npx playwright test --ui` shows you exactly what's happening

Happy testing! 🎭
