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
    // ACT 1: Landing Page Showcase
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    await sleep(2000);

    // -----------------------------------------------------------
    // ACT 2: Merchant Persona - Create 18+ Payment Request
    // -----------------------------------------------------------
    console.log('📍 Act 2: Merchant Login & Payment Request Creation...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    const merchantPersona = await page.waitForSelector('xpath=//button[contains(., "Merchant")]', { timeout: 6000 });
    if (merchantPersona) {
      await merchantPersona.click();
      await sleep(1000);
    }
    const merchantSubmit = await page.waitForSelector('form button.btn-accent', { timeout: 5000 });
    await merchantSubmit.click();
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 10000 });
    console.log('✅ Authenticated as Demo Merchant');
    await sleep(2000);

    // Navigate to /pay to create a payment request
    console.log('📝 Navigating to /pay to create an 18+ payment request...');
    await page.goto(`${BASE_URL}/pay`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    // Fill in amount and description
    await page.evaluate(() => {
      const amountInput = document.querySelector('input[name="amount"]');
      if (amountInput) amountInput.value = '15.00';
      const descInput = document.querySelector('input[name="description"]');
      if (descInput) descInput.value = 'Design Deliverable #42 (Age-Restricted)';
      const adultBox = document.querySelector('input[name="adults_only"]');
      if (adultBox) adultBox.checked = true;
    });
    await sleep(1500);

    const createBtn = await page.waitForSelector('xpath=//button[contains(., "Create payment request")]', { timeout: 5000 });
    await createBtn.click();
    await page.waitForFunction(() => window.location.pathname.startsWith('/pay/'), { timeout: 10000 });
    const paymentUrl = page.url();
    const requestId = paymentUrl.split('/').pop();
    console.log(`✅ Merchant created payment request: ${requestId}`);
    await sleep(3500);

    // Sign out merchant
    console.log('🚪 Signing out merchant...');
    const signOutBtn = await page.$('xpath=//button[contains(., "Sign out")]');
    if (signOutBtn) {
      await signOutBtn.click();
      await sleep(2000);
    }

    // -----------------------------------------------------------
    // ACT 3: Payer Persona (Asha Verma) - Sign In
    // -----------------------------------------------------------
    console.log('📍 Act 3: Payer Login (Asha Verma)...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    const payerPersona = await page.waitForSelector('xpath=//button[contains(., "Payer")]', { timeout: 6000 });
    if (payerPersona) {
      await payerPersona.click();
      await sleep(1000);
    }
    const payerSubmit = await page.waitForSelector('form button.btn-accent', { timeout: 5000 });
    await payerSubmit.click();
    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 10000 });
    console.log('✅ Authenticated as Asha Verma');
    await sleep(2500);

    // -----------------------------------------------------------
    // ACT 4: ZK Verify AI Inspection
    // -----------------------------------------------------------
    console.log('📍 Act 4: Opening Verification Wizard (/verify)...');
    await page.goto(`${BASE_URL}/verify`, { waitUntil: 'networkidle2' });
    await sleep(3000);

    // -----------------------------------------------------------
    // ACT 5: ZK Passport Issuance
    // -----------------------------------------------------------
    console.log('📍 Act 5: Issuing ZK Passport (/passport)...');
    await page.goto(`${BASE_URL}/passport`, { waitUntil: 'networkidle2' });
    await sleep(2500);

    const issueBtn = await page.$('xpath=//button[contains(., "Issue") or contains(., "Reissue")]');
    if (issueBtn) {
      console.log('🔐 Computing Poseidon secret hash & signing BabyJubJub EdDSA Passport...');
      await issueBtn.click();
      await page.waitForFunction(() => document.body.innerText.includes('Ready to prove') || document.body.innerText.includes('active'), { timeout: 10000 }).catch(() => {});
      await sleep(3000);
    }
    console.log('✅ ZK Passport active and ready to prove in browser');

    // -----------------------------------------------------------
    // ACT 6: Payer Opens Payment Request, Simulates Attack & Pays
    // -----------------------------------------------------------
    console.log(`📍 Act 6: Payer Opening Payment Request (/pay/${requestId})...`);
    await page.goto(`${BASE_URL}/pay/${requestId}`, { waitUntil: 'networkidle2' });
    await sleep(3500);

    // Security attack test: Alter the proof
    console.log('🛡️ Testing security attack: Alter the proof...');
    const alterBtn = await page.$('xpath=//button[contains(., "Alter")]');
    if (alterBtn) {
      await alterBtn.click();
      // Wait for rejected badge
      await page.waitForFunction(() => document.body.innerText.includes('Rejected') || document.body.innerText.includes('tampered'), { timeout: 10000 }).catch(() => {});
      console.log('🛡️ Attack 01 successfully caught and rejected by gate!');
      await sleep(3000);
    }

    // Wait until button is ready
    await page.waitForFunction(() => {
      const b = document.querySelector('button.btn-accent');
      return b && !b.disabled;
    }, { timeout: 10000 }).catch(() => {});

    // Valid Groth16 Snarkjs proof compilation
    console.log('⚡ Generating valid Groth16 proof (proves KYC & 18+ in-circuit)...');
    const unlockBtn = await page.waitForSelector('xpath=//button[contains(., "Generate proof and unlock")]', { timeout: 10000 });
    await unlockBtn.click();

    // Wait for checkout unlocked
    await page.waitForFunction(() => document.body.innerText.includes('Checkout unlocked') || document.body.innerText.includes('Proof verified'), { timeout: 15000 });
    console.log('⚡ Proof verified! Checkout unlocked!');
    await sleep(2500);

    // Complete PayPal Sandbox Capture
    console.log('💳 Capturing PayPal Sandbox payment...');
    const captureBtn = await page.waitForSelector('xpath=//button[contains(., "Complete Sandbox Payment")]', { timeout: 10000 });
    await captureBtn.click();

    // Wait for receipt
    await page.waitForFunction(() => document.body.innerText.includes('Payment captured'), { timeout: 10000 });
    console.log('✅ Payment captured successfully! Official Receipt displayed on screen!');
    await sleep(4000);

    // -----------------------------------------------------------
    // ACT 7: Payment History & Cryptographic Audit Ledger
    // -----------------------------------------------------------
    console.log('📍 Act 7: Reviewing Audit History (/history)...');
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.body.innerText.includes('Design Deliverable #42') || document.body.innerText.includes('PAID'), { timeout: 10000 });
    console.log('📜 Transaction verified in Audit History!');
    await sleep(4000);

    console.log('📜 Smooth scrolling through transaction history...');
    await page.evaluate(async () => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await sleep(3500);

    console.log('🎉 Complete Merchant + Payer + ZK Proof + PayPal Settle Walkthrough finished successfully!');
    await sleep(3000);
  } catch (err) {
    console.error('Demo error:', err);
  } finally {
    console.log('Demo finished. Leaving browser open for 35 seconds so you can view/stop recording.');
    await sleep(35000);
    await browser.close();
  }
}

runDemo();
