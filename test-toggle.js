import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to home
    await page.goto('http://localhost:5175/home', { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Take initial state - capture all Naira amounts
    console.log('\n=== INITIAL STATE (NGN) ===');
    const initialBalance = await page.locator('p:has-text("₦1,000")').first().innerText();
    const initialPerRef = await page.locator('p:has-text("₦0")').nth(1).innerText();
    console.log('Initial Total Balance:', initialBalance);
    console.log('Initial Per Referral:', initialPerRef);
    
    // Click the NGN toggle button
    await page.click('button:has-text("🇳🇬 NGN")');
    console.log('✓ Clicked currency toggle button');
    
    // Wait for modal to appear
    await page.waitForSelector('text=Display currency');
    await page.waitForTimeout(500);
    
    // Click US Dollar option
    await page.click('button:has-text("US Dollar")');
    console.log('✓ Selected USD option');
    
    // Wait for re-render
    await page.waitForTimeout(1500);
    
    // Check the new state
    console.log('\n=== AFTER USD SELECTION ===');
    
    // Get the button text to confirm it switched
    const buttonText = await page.locator('button:has-text("USD")').first().innerText();
    console.log('Toggle button now shows:', buttonText);
    
    // Get the currency label inside the balance card
    const currencyLabel = await page.locator('div:has-text("USD"), div:has-text("NGN")').first().innerText();
    console.log('Currency label:', currencyLabel);
    
    // Check for live rate text
    const hasLiveRate = await page.locator('text=/Live rate: 1 USD = ₦/').isVisible();
    console.log('Live rate text visible:', hasLiveRate);
    
    if (hasLiveRate) {
      const rateText = await page.locator('text=/Live rate: 1 USD = ₦[0-9,]+/').first().innerText();
      console.log('Live rate text:', rateText);
    }
    
    // Get all dollar amounts
    const bodyText = await page.innerText('body');
    const dollarMatches = bodyText.match(/\$[0-9.]+/g) || [];
    console.log('Dollar amounts found:', dollarMatches);
    
    // Check the balance display
    const balanceElement = await page.locator('p.font-mono').first().innerText();
    console.log('Balance display:', balanceElement);
    
    console.log('\n=== CHECKING PERSISTENCE ===');
    console.log('Now refreshing page...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check if USD is still selected after refresh
    const afterRefreshButton = await page.locator('button:has-text("USD")').isVisible();
    console.log('USD button still visible after refresh:', afterRefreshButton);
    
    if (!afterRefreshButton) {
      const ngnButton = await page.locator('button:has-text("🇳🇬 NGN")').isVisible();
      console.log('NGN button visible (reverted):', ngnButton);
    }
    
    const afterRefreshCurrencyLabel = await page.locator('div:has-text("USD"), div:has-text("NGN")').first().innerText();
    console.log('Currency label after refresh:', afterRefreshCurrencyLabel);
    
    const afterRefreshRate = await page.locator('text=/Live rate: 1 USD = ₦/').isVisible();
    console.log('Live rate still visible after refresh:', afterRefreshRate);
    
    console.log('\n✓✓✓ VERIFICATION COMPLETE ✓✓✓');
    
    // Keep browser open for 5 seconds so user can see
    await page.waitForTimeout(5000);
  } catch (error) {
    console.error('\n✗ ERROR during test:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
})();
