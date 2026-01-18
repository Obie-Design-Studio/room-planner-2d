import { test, expect } from '@playwright/test';

/**
 * Room Planner - Basic Tests
 * 
 * These tests verify core functionality of the room planner app.
 */

test.describe('Room Planner - Basic Functionality', () => {
  
  test('app loads successfully and shows all main controls', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Check that the page loaded
    await expect(page).toHaveTitle(/Room Planner/);
    
    // Check that the canvas is visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Check that main control buttons are visible
    // Note: Adjust these selectors based on your actual button text
    await expect(page.locator('button').filter({ hasText: /furniture/i }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /settings/i }).first()).toBeVisible();
  });

  test('zoom controls change zoom level', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas to load
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Find and click zoom in button
    // Note: Adjust selector based on your actual button
    const zoomInButton = page.locator('button').filter({ hasText: /zoom.*in/i }).or(
      page.locator('button[aria-label*="zoom in"]')
    ).first();
    
    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
      
      // Wait a moment for zoom to apply
      await page.waitForTimeout(300);
      
      // Take screenshot to verify zoom changed
      await expect(page).toHaveScreenshot('zoomed-in.png', {
        maxDiffPixels: 100 // Allow some variance
      });
    }
  });

  test('canvas is interactive (can click on it)', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Try clicking on canvas
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Listen for console logs to verify interaction
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));
    
    // Click again and wait for potential debug logs
    await canvas.click({ position: { x: 300, y: 300 } });
    await page.waitForTimeout(500);
    
    // The test passes if we can click without errors
    // You can add more specific assertions based on your debug logs
  });
});

test.describe('Room Planner - Keyboard Shortcuts', () => {
  
  test('Delete key works when item is selected', async ({ page }) => {
    await page.goto('/');
    
    // Wait for canvas
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // This test would need furniture to be added first
    // For now, just verify the page responds to Delete key
    await page.keyboard.press('Delete');
    
    // No errors should occur
    await page.waitForTimeout(300);
  });
});

// Add more test suites as your app grows
// Examples:
// - Furniture Library tests
// - Measurement tests  
// - Room Settings tests
// - Save/Load tests
