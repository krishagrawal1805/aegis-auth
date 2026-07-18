import puppeteer from 'puppeteer-core';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runSimulation() {
  console.log('[Simulation] Starting Aegis Authentication Platform Simulation...');
  
  // Launch Browser A (LeadDev / Admin B)
  console.log('[Simulation] Launching Browser A (LeadDev)...');
  const browserA = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1000, height: 750 },
    args: ['--window-size=1000,750', '--window-position=50,50']
  });
  const pageA = (await browserA.pages())[0];

  // Launch Browser B (SeniorAdmin / Admin A)
  console.log('[Simulation] Launching Browser B (SeniorAdmin)...');
  const browserB = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1000, height: 750 },
    args: ['--window-size=1000,750', '--window-position=1100,50']
  });
  const pageB = (await browserB.pages())[0];

  // Setup logging
  pageA.on('console', msg => console.log('[PAGE A LOG]', msg.text()));
  pageB.on('console', msg => console.log('[PAGE B LOG]', msg.text()));
  pageA.on('pageerror', err => console.error('[PAGE A ERR]', err.message));
  pageB.on('pageerror', err => console.error('[PAGE B ERR]', err.message));

  try {
    // 1. Enable Virtual WebAuthn on both browsers
    console.log('[Simulation] Enabling virtual WebAuthn authenticators...');
    const sessionA = await pageA.target().createCDPSession();
    await sessionA.send('WebAuthn.enable');
    await sessionA.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      }
    });

    const sessionB = await pageB.target().createCDPSession();
    await sessionB.send('WebAuthn.enable');
    await sessionB.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      }
    });

    // 2. Open Application Page
    console.log('[Simulation] Opening frontend on both browsers...');
    await pageA.goto('http://localhost:3000');
    await pageB.goto('http://localhost:3000');
    await delay(3000);

    // Clean up existing sessions if they were logged in
    const cleanSession = async (page) => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const logBtn = btns.find(b => b.innerText.includes('Logout'));
        if (logBtn) logBtn.click();
      });
      await delay(2000);
    };
    await cleanSession(pageA);
    await cleanSession(pageB);

    // 3. Register Admin B (LeadDev) on Browser A
    const emailB = `admin_b_${Date.now()}@aegis.local`;
    console.log(`[Simulation] Registering Admin B (${emailB}) on Browser A as LeadDev...`);
    await pageA.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reg = buttons.find(b => b.textContent.includes('Register Device'));
      if (reg) reg.click();
    });
    await delay(1500);

    await pageA.type('input[placeholder="Email Address"]', emailB);
    await pageA.type('input[placeholder="Display Name"]', 'Admin B (LeadDev)');
    await pageA.select('select', 'LeadDev');
    await pageA.click('button[type="submit"]');
    
    console.log('[Simulation] Waiting for Browser A registration redirect...');
    await pageA.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('clearance level') && document.body.innerText.includes('LeadDev'),
      { timeout: 15000 }
    );
    console.log('[Simulation] Admin B (LeadDev) registered successfully on Browser A.');

    // 4. Register Admin A (SeniorAdmin) on Browser B
    const emailA = `admin_a_${Date.now()}@aegis.local`;
    console.log(`[Simulation] Registering Admin A (${emailA}) on Browser B as SeniorAdmin...`);
    await pageB.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reg = buttons.find(b => b.textContent.includes('Register Device'));
      if (reg) reg.click();
    });
    await delay(1500);

    await pageB.type('input[placeholder="Email Address"]', emailA);
    await pageB.type('input[placeholder="Display Name"]', 'Admin A (SeniorAdmin)');
    await pageB.select('select', 'SeniorAdmin');
    await pageB.click('button[type="submit"]');
    
    console.log('[Simulation] Waiting for Browser B registration redirect...');
    await pageB.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('clearance level') && document.body.innerText.includes('SeniorAdmin'),
      { timeout: 15000 }
    );
    console.log('[Simulation] Admin A (SeniorAdmin) registered successfully on Browser B.');

    // 5. Log out Admin B from Browser A to prepare for cross-device check...
    console.log('[Simulation] Logging out Admin B on Browser A to prepare for cross-device check...');
    await pageA.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const logBtn = btns.find(b => b.innerText.includes('Logout'));
      if (logBtn) logBtn.click();
    });
    await delay(2500);

    // Direct Browser A back to Login view
    console.log('[Simulation] Directing Browser A back to Login view...');
    await pageA.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginBtn = buttons.find(b => b.innerText.includes('Sign In'));
      if (loginBtn) loginBtn.click();
    });
    await delay(1500);

    // 6. Initiate login for Admin A on Browser A (Cross-Device Flow)
    console.log(`[Simulation] Initiating cross-device login for Admin A (${emailA}) on Browser A...`);
    await pageA.type('input[placeholder="Email Address"]', emailA);
    await pageA.click('button[type="submit"]');
    await delay(4000);

    // Extract the 2-digit confirmation code displayed on Browser A
    console.log('[Simulation] Extracting verification code from Browser A...');
    const verificationCode = await pageA.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.innerText.trim() : null;
    });

    if (!verificationCode) {
      const text = await pageA.evaluate(() => document.body.innerText);
      console.log('[PAGE A InnerText on failure]:\n', text);
      throw new Error('Verification code not displayed on Browser A');
    }
    console.log(`[Simulation] Extracted verification code: ${verificationCode}`);

    // 7. Approve on Browser B (Admin A is logged in on Browser B and listening to SSE)
    console.log('[Simulation] Waiting for login prompt notification on Browser B...');
    await pageB.waitForFunction(
      () => document.body.innerText.includes('Cross-Device Authentication Request'),
      { timeout: 15000 }
    );

    console.log(`[Simulation] Clicking button [${verificationCode}] on Browser B...`);
    await pageB.evaluate((code) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const matchButton = buttons.find(b => b.innerText.trim() === code);
      if (matchButton) matchButton.click();
    }, verificationCode);

    // Confirm Browser A logins successfully
    console.log('[Simulation] Verifying Browser A logged in automatically...');
    await pageA.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('clearance level') && document.body.innerText.includes('SeniorAdmin'),
      { timeout: 15000 }
    );
    console.log('[Simulation] Browser A successfully logged in via cross-device verification.');

    // 8. Log out Admin A from Browser A
    console.log('[Simulation] Logging out Admin A from Browser A...');
    await pageA.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const logBtn = btns.find(b => b.innerText.includes('Logout'));
      if (logBtn) logBtn.click();
    });
    await delay(2500);

    // Direct Browser A back to Login view
    console.log('[Simulation] Directing Browser A back to Login view...');
    await pageA.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginBtn = buttons.find(b => b.innerText.includes('Sign In'));
      if (loginBtn) loginBtn.click();
    });
    await delay(1500);

    // 9. Enable request interception on Browser A to block /events, forcing local login fallback
    console.log('[Simulation] Enabling request interception on Browser A to force local login for Admin B...');
    await pageA.setRequestInterception(true);
    const interceptEventsA = (request) => {
      if (request.url().includes('/api/events')) {
        request.abort();
      } else {
        request.continue();
      }
    };
    pageA.on('request', interceptEventsA);

    console.log(`[Simulation] Logging in Admin B (${emailB}) locally on Browser A...`);
    await pageA.type('input[placeholder="Email Address"]', emailB);
    await pageA.click('button[type="submit"]');

    console.log('[Simulation] Waiting for Browser A local login...');
    await pageA.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('clearance level') && document.body.innerText.includes('LeadDev'),
      { timeout: 15000 }
    );
    console.log('[Simulation] Admin B logged in locally on Browser A successfully.');

    // Disable request interception and reload Browser A to active standard SSE connection
    pageA.off('request', interceptEventsA);
    await pageA.setRequestInterception(false);
    await delay(2000);

    console.log('[Simulation] Reloading Browser A to establish logged-in SSE connection...');
    await pageA.reload();
    await pageA.waitForFunction(
      () => document.body.innerText.toLowerCase().includes('clearance level') && document.body.innerText.includes('LeadDev'),
      { timeout: 10000 }
    );
    await delay(3000);

    // At this stage:
    // Browser A is logged in as Admin B (LeadDev, and has LeadDev's credential)
    // Browser B is logged in as Admin A (SeniorAdmin, and has SeniorAdmin's credential)

    // 10. Trigger a Database Drop request via Browser B evaluate (Admin A)
    console.log('[Simulation] Triggering Production Database Wipe request from Browser B...');
    const requestResult = await pageB.evaluate(() => {
      return fetch('http://localhost:8000/api/approvals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL for cross-origin cookies!
        body: JSON.stringify({
          resourceName: 'Production Database Wipe (PROD-DB-01)',
          actionPayload: 'DROP DATABASE aegis_prod;'
        })
      }).then(r => r.json());
    });
    console.log('[Simulation] Request Response:', requestResult);

    // 11. Sign the request on both Browsers
    console.log('[Simulation] Waiting for request in Authorization Queue on Browser A...');
    await pageA.waitForFunction(
      () => document.body.innerText.includes('Production Database Wipe (PROD-DB-01)'),
      { timeout: 10000 }
    );
    
    console.log('[Simulation] Signing on Browser A (Admin B - LeadDev)...');
    await pageA.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const signBtn = buttons.find(b => b.innerText.includes('Sign & Approve'));
      if (signBtn) signBtn.click();
    });
    await delay(3000);

    console.log('[Simulation] Waiting for request in Authorization Queue on Browser B...');
    await pageB.waitForFunction(
      () => document.body.innerText.includes('Production Database Wipe (PROD-DB-01)'),
      { timeout: 10000 }
    );

    console.log('[Simulation] Signing on Browser B (Admin A - SeniorAdmin)...');
    await pageB.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const signBtn = buttons.find(b => b.innerText.includes('Sign & Approve'));
      if (signBtn) signBtn.click();
    });
    await delay(3000);

    // 12. Verify Audit Ledger on Browser B
    console.log('[Simulation] Navigating to Audit Ledger on Browser B...');
    await pageB.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const auditBtn = buttons.find(b => b.innerText.includes('Audit Ledger'));
      if (auditBtn) auditBtn.click();
    });
    await delay(2000);

    // Print block hashes from the table
    const auditLogs = await pageB.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(r => {
        const cells = Array.from(r.querySelectorAll('td'));
        return {
          timestamp: cells[0]?.innerText || '',
          eventType: cells[1]?.innerText || '',
          description: cells[2]?.innerText || '',
          blockHash: cells[3]?.innerText || ''
        };
      });
    });

    console.log('\n--- CRYPTOGRAPHIC AUDIT LOG LEDGER RESULTS ---');
    console.table(auditLogs);
    console.log('---------------------------------------------\n');

    console.log('[Simulation] Simulation completed successfully! Closing browsers.');
  } catch (error) {
    console.error('[Simulation Error]', error);
    try {
      await pageA.screenshot({ path: 'C:/Users/krish/.gemini/antigravity-ide/brain/02023cb5-8cb1-45f3-8614-2347d937770d/error_page_a.png' });
      await pageB.screenshot({ path: 'C:/Users/krish/.gemini/antigravity-ide/brain/02023cb5-8cb1-45f3-8614-2347d937770d/error_page_b.png' });
      console.log('[Simulation] Captured error screenshots.');
    } catch (e) {
      console.error('[Simulation Error] Failed to capture screenshots:', e);
    }
  } finally {
    await browserA.close();
    await browserB.close();
  }
}

runSimulation();
