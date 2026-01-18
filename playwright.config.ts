import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration for Room Planner
 * 
 * Read more: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Look for test files in the "tests" directory
  testDir: './tests',
  
  // Run tests in parallel for faster execution
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,
  
  // Limit workers on CI, use all CPU cores locally
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter: HTML report shows detailed results
  reporter: 'html',
  
  // Shared settings for all tests
  use: {
    // Base URL for navigation (e.g., page.goto('/') goes to localhost:3000)
    baseURL: 'http://localhost:3000',
    
    // Collect trace when retrying failed tests for debugging
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Collect video on failure
    video: 'retain-on-failure',
  },

  // Test against Chromium (Chrome/Edge)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Uncomment to test on Firefox and Safari
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    
    // Uncomment to test mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Automatically start dev server before running tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // Reuse if already running locally
    timeout: 120 * 1000, // 2 minutes to start
  },
});
