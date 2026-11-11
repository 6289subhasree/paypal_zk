import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';
const SAMPLES_DIR = path.resolve(__dirname, '../samples');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDemo() {
  console.log('🚀 Launching Google Chrome for automated ZK Pass Demo Walkthrough...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: [
      '--start-maximized',
      '--window-size=1440,900',
      '--no-default-browser-check',
      '--disable-infobars',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // -----------------------------------------------------------
    // ACT 1: Landing Page
    // -----------------------------------------------------------
    console.log('📍 Act 1: Navigating to Landing Page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await sleep(2500);

    console.log('📜 Smooth scrolling through the Cotool landing showcases...');
    await page.evaluate(async () => {
      window.scrollBy({ top: 700, behavior: 'smooth' });
    });
    await sleep(2500);

    await page.evaluate(async () => {
      window.scrollBy({ top: 850, behavior: 'smooth' });
    });
    await sleep(2500);

    await page.evaluate(async () => {
      window.scrollBy({ top: 900, behavior: 'smooth' });
    });
    await sleep(2500);

    await page.evaluate(async () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await sleep(2000);

    // -----------------------------------------------------------
    // ACT 2: Login via 1-Click Payer Demo Account
    // -----------------------------------------------------------
    console.log('📍 Act 2: Navigating to Sign In...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    console.log('🔑 Clicking Payer demo account persona button...');
    const payerBtn = await page.waitForSelector('xpath=//button[contains(., "Payer")]', { timeout: 6000 });
    if (payerBtn) {
      await payerBtn.click();
      await sleep(1500);
    }

    console.log('🚀 Submitting Sign In form...');
    const submitBtn = await page.waitForSelector('form button.btn-accent', { timeout: 5000 });
    await submitBtn.click();

    // Verify successful authentication and redirection to dashboard
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 10000 });
    console.log('✅ Successfully authenticated as Asha Verma! Current page: /dashboard');
    await sleep(3500);

    // -----------------------------------------------------------
    // ACT 3: Dashboard Overview
    // -----------------------------------------------------------
    console.log('📍 Act 3: Dashboard Overview & Status Inspection...');
    await page.evaluate(async () => {
      window.scrollBy({ top: 400, behavior: 'smooth' });
    });
    await sleep(2500);
    await page.evaluate(async () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await sleep(1500);

    // -----------------------------------------------------------
    // ACT 4: ZK Verify AI & Specimen Document Upload
    // -----------------------------------------------------------
    console.log('📍 Act 4: Opening Verification Wizard (/verify)...');
    await page.goto(`${BASE_URL}/verify`, { waitUntil: 'networkidle2' });
    await sleep(2500);

    // Check consent checkbox if on welcome step
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      console.log('📝 Consenting to demo verification...');
      await checkbox.click();
      await sleep(1000);
      const startBtn = await page.$('xpath=//button[contains(., "Start")]');
      if (startBtn) {
        await startBtn.click();
        await sleep(2500);
      }
    }

    // Save details step if on details step
    const saveDetailsBtn = await page.$('xpath=//button[contains(., "Save")]');
    if (saveDetailsBtn) {
      console.log('📋 Confirming identity details...');
      await saveDetailsBtn.click();
      await sleep(2500);
    }

    // Upload specimen PAN card
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      console.log('📄 Uploading specimen test PAN card (samples/specimen_pan_card.png)...');
      const sampleCard = path.join(SAMPLES_DIR, 'specimen_pan_card.png');
      await fileInput.uploadFile(sampleCard);
      await sleep(4000);
    }

    // Advance to liveness
    const livenessBtn = await page.$('xpath=//button[contains(., "liveness") or contains(., "Continue")]');
    if (livenessBtn) {
      console.log('➡️ Advancing to liveness step...');
      await livenessBtn.click();
      await sleep(2500);
    }

    // Use simulated liveness for demo speed and stability
    const simLivenessBtn = await page.$('xpath=//button[contains(., "simulated") or contains(., "Simulated")]');
    if (simLivenessBtn) {
      console.log('👤 Completing liveness check...');
      await simLivenessBtn.click();
      await sleep(3500);
    }

    // -----------------------------------------------------------
    // ACT 5: Auto-Approve via Reviewer API in Background
    // -----------------------------------------------------------
    console.log('⚖️ Reviewer approving session in background...');
    try {
      const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'reviewer@zkpass.dev', password: 'zkpass-demo-123' }),
      });
      const { token: revToken } = await loginRes.json();
      const queueRes = await fetch(`${BACKEND_URL}/api/review/queue`, {
        headers: { Authorization: `Bearer ${revToken}` },
      });
      const queue = await queueRes.json();
      for (const s of queue) {
        await fetch(`${BACKEND_URL}/api/review/sessions/${s.id}/decision`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${revToken}`,
          },
          body: JSON.stringify({ decision: 'approved', reason_code: 'checks_confirmed' }),
        });
        console.log(`✅ Approved KYC session: ${s.id}`);
      }
    } catch (e) {
      console.error('Reviewer approval error:', e);
    }
    await sleep(2500);

    // -----------------------------------------------------------
    // ACT 6: ZK Passport Issuance
    // -----------------------------------------------------------
    console.log('📍 Act 6: Issuing ZK Passport (/passport)...');
    await page.goto(`${BASE_URL}/passport`, { waitUntil: 'networkidle2' });
    await sleep(3000);

    const issueBtn = await page.$('xpath=//button[contains(., "Issue")]');
    if (issueBtn) {
      console.log('🔐 Computing Poseidon secret hash & signing BabyJubJub EdDSA Passport...');
      await issueBtn.click();
      await sleep(4500);
    }

    // -----------------------------------------------------------
    // ACT 7: ZK Pay & "Try to break it" Proof Gate
    // -----------------------------------------------------------
    console.log('📍 Act 7: Creating and Opening a Payment Request...');
    let reqId = null;
    try {
      const mLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'merchant@zkpass.dev', password: 'zkpass-demo-123' }),
      });
      const { token: mToken } = await mLogin.json();
      const prRes = await fetch(`${BACKEND_URL}/api/payments/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mToken}` },
        body: JSON.stringify({
          amount: '15.00',
          currency: 'USD',
          description: 'Design Deliverable #42',
          min_age: 18,
        }),
      });
      const prData = await prRes.json();
      reqId = prData.id;
      console.log(`💳 Created Payment Request ID: ${reqId}`);
    } catch (e) {
      console.error('Failed to create payment request:', e);
    }

    if (reqId) {
      await page.goto(`${BASE_URL}/pay/${reqId}`, { waitUntil: 'networkidle2' });
      await sleep(3500);

      // Try to break it: Alter proof (Attack 1)
      console.log('🛡️ Testing security attack: Alter the proof...');
      const alterBtn = await page.$('xpath=//button[contains(., "Alter")]');
      if (alterBtn) {
        await alterBtn.click();
        await sleep(4000);
      }

      // Generate valid proof & unlock
      console.log('⚡ Generating valid Groth16 proof to unlock PayPal...');
      const unlockBtn = await page.$('xpath=//button[contains(., "Generate proof and unlock")]');
      if (unlockBtn) {
        await unlockBtn.click();
        await sleep(6000);
      }
    }

    // -----------------------------------------------------------
    // ACT 8: Payment History & Audit Ledger
    // -----------------------------------------------------------
    console.log('📍 Act 8: Reviewing Audit History (/history)...');
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle2' });
    await sleep(4500);

    console.log('🎉 Demo walkthrough completed successfully!');
    await sleep(3000);
  } catch (err) {
    console.error('Demo error:', err);
  } finally {
    console.log('Demo finished. Leaving browser open for 30 seconds so you can view/stop recording.');
    await sleep(30000);
    await browser.close();
  }
}

runDemo();
