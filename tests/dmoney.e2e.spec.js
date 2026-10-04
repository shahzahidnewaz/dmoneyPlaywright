const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
const { RegisterPage } = require('../pages/RegisterPage');
const { AdminUsersPage } = require('../pages/AdminUsersPage');
const { CashInPage } = require('../pages/CashInPage');
const { SelfStatementPage, money } = require('../pages/SelfStatementPage');
const { PasswordResetPage } = require('../pages/PasswordResetPage');
const { getAccounts, createAgent, createCustomer } = require('../utils/testData');
const { snapshotMail, waitForMail, extractOtp, extractResetPath } = require('../utils/gmail');
const { saveSelfStatementCsv, toCsv, todayStamp } = require('../utils/csv');

const SMOKE = { tag: ['@smoke', '@regression'] };
const REGRESSION = { tag: ['@regression'] };

function step(number, title, tags, body) {
  test(title, { ...tags, annotation: { type: 'number', description: String(number) } }, body);
}

const DEPOSIT_TO_AGENT = 2000;
const DEPOSIT_TO_CUSTOMER = 500;

test.describe('DMoney Agent lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  const accounts = getAccounts();
  const agent = createAgent();
  const state = {};
  let context, page, login, statement, cashIn;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      recordVideo: { dir: path.join('output', 'videos') },
    });
    context.setDefaultTimeout(15_000);
    context.setDefaultNavigationTimeout(30_000);
    await context.tracing.start({ screenshots: true, snapshots: true });
    page = await context.newPage();
    login = new LoginPage(page);
    statement = new SelfStatementPage(page);
    cashIn = new CashInPage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const body = await page.screenshot({ fullPage: true }).catch(() => null);
      if (body) await testInfo.attach('failure-screenshot', { body, contentType: 'image/png' });
    }
  });

  test.afterAll(async () => {
    if (!context) return;
    await context.tracing.stop({ path: path.join('output', 'trace.zip') }).catch(() => {});
    const video = page ? page.video() : null;
    await context.close().catch(() => {});
    if (video) await video.saveAs(path.join('output', 'videos', 'dmoney-e2e.webm')).catch(() => {});
  });

  async function loginAgentWithOtp(password) {
    const known = await snapshotMail({ to: agent.email, subject: 'Login OTP' });
    await login.open();
    await login.submitCredentials(agent.email, password);
    await expect(login.otpInput, 'OTP step should appear for an Agent').toBeVisible();
    const body = await waitForMail({ to: agent.email, subject: 'Login OTP', known });
    const otp = extractOtp(body);
    expect(otp, `Login OTP should be found in the email. Email text: ${body.slice(0, 300)}`).toBeTruthy();
    await login.submitOtp(otp);
    try {
      await expect(page).not.toHaveURL(/\/login/);
    } catch (error) {
      const alerts = await page.getByRole('alert').allInnerTexts();
      throw new Error(`Agent not logged in after OTP ${otp}. Page alerts: ${JSON.stringify(alerts)}`);
    }
  }

  async function clearSession() {
    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/login');
  }

  async function createActiveCustomer(browser) {
    const customer = createCustomer();
    const ctx = await browser.newContext({ baseURL: new URL(page.url()).origin });
    ctx.setDefaultTimeout(15_000);
    ctx.setDefaultNavigationTimeout(30_000);
    try {
      const helperPage = await ctx.newPage();
      const register = new RegisterPage(helperPage);
      await register.openFromHome();
      await register.register(customer, 'Customer');
      await expect(register.successMessage, 'Customer registration should succeed').toBeVisible();

      const helperLogin = new LoginPage(helperPage);
      await helperLogin.open();
      await helperLogin.submitCredentials(accounts.admin.email, accounts.admin.password);
      await expect(helperPage, 'Admin login should succeed').not.toHaveURL(/\/login/);

      const admin = new AdminUsersPage(helperPage);
      await admin.openUserList();
      await admin.searchByEmail(customer.email);
      await admin.openProfile(customer.email);
      await admin.activate();
    } finally {
      await ctx.close();
    }
    return customer.phone;
  }

  async function logoutIfLoggedIn() {
    if (!/\/login/.test(page.url())) await login.logout();
  }

  step(1, 'Verify Agent registration is successful.', SMOKE, async () => {
    const register = new RegisterPage(page);
    await register.openFromHome();
    await register.registerAgent(agent);
    await expect(register.successMessage, 'Registration should succeed').toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  step(2, 'Verify the newly created Agent is initially inactive.', REGRESSION, async () => {
    const known = await snapshotMail({ to: agent.email, subject: 'Login OTP' });
    await login.open();
    await login.submitCredentials(agent.email, agent.password);
    await expect(login.otpInput, 'OTP step should appear').toBeVisible();
    const otp = extractOtp(await waitForMail({ to: agent.email, subject: 'Login OTP', known }));
    expect(otp, 'Login OTP should be found in the email').toBeTruthy();
    await login.submitOtp(otp);

    const gotIn = await page
      .waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 8_000 })
      .then(() => true, () => false);

    if (!gotIn) {
      await expect(page, 'Inactive Agent must not be granted access').toHaveURL(/\/login/);
      return;
    }

    await login.openMenu('My Profile');
    await expect(
      page.getByText(/pending|inactive/i).first(),
      'Profile of a new Agent should show an inactive or pending status',
    ).toBeVisible();
    await clearSession();
  });

  step(3, 'Verify Admin login is successful.', SMOKE, async () => {
    await login.open();
    await login.submitCredentials(accounts.admin.email, accounts.admin.password);
    await expect(page, 'Admin login should succeed').not.toHaveURL(/\/login/);
  });

  step(4, 'Verify the newly created Agent appears in the Admin user list.', REGRESSION, async () => {
    const admin = new AdminUsersPage(page);
    await admin.openUserList();
    const row = await admin.searchByEmail(agent.email);
    await expect(row, 'New Agent should appear in the Admin user list').toContainText(agent.email);
    await expect(row, 'New Agent should be listed as inactive').toContainText(/pending|inactive/i);
  });

  step(5, 'Verify Admin can activate the Agent.', SMOKE, async () => {
    const admin = new AdminUsersPage(page);
    await admin.openProfileFor(agent.email);
    await admin.activate();
    await expect(admin.statusChip('ACTIVE'), 'Agent should be ACTIVE after Admin activation').toBeVisible();
  });

  step(6, 'Verify the Agent remains active after page reload.', REGRESSION, async () => {
    const admin = new AdminUsersPage(page);
    await page.reload();
    await expect(admin.statusChip('ACTIVE'), 'Agent should remain active after reload').toBeVisible();
  });

  step(7, 'Verify System login is successful.', SMOKE, async () => {
    await logoutIfLoggedIn();
    await login.open();
    await login.submitCredentials(accounts.system.email, accounts.system.password);
    await expect(page, 'System login should succeed').not.toHaveURL(/\/login/);
  });

  step(8, 'Verify System can deposit 2000 Tk to the Agent.', SMOKE, async () => {
    await cashIn.open();
    const result = await cashIn.deposit(agent.phone, DEPOSIT_TO_AGENT);
    state.systemTrnxId = result.trnxId;
    expect(state.systemTrnxId, 'Deposit should return a transaction id').toBeTruthy();
  });

  step(9, 'Verify the System deposit creates the correct transaction record.', REGRESSION, async () => {

    await statement.open();
    const tx = await statement.findTransaction(state.systemTrnxId);
    expect(tx['Sender Account'], 'Sender should be SYSTEM').toContain('SYSTEM');
    expect(tx['Receiver Account'], 'Receiver should be the new Agent').toContain(agent.phone);
    expect(money(tx['Debit']), 'SYSTEM should be debited the deposit amount').toBe(DEPOSIT_TO_AGENT);
  });

  step(10, 'Verify the Agent can log in after activation.', SMOKE, async () => {
    await logoutIfLoggedIn();
    await loginAgentWithOtp(agent.password);
  });

  step(11, 'Verify the Agent balance is exactly 2000 Tk.', SMOKE, async () => {
    await statement.open();
    await expect
      .poll(() => statement.currentBalance(), { message: 'Agent balance after SYSTEM deposit' })
      .toBe(DEPOSIT_TO_AGENT);

    const tx = await statement.findTransaction(state.systemTrnxId);
    expect(tx['Sender Account'], 'Sender should be SYSTEM').toContain('SYSTEM');
    expect(tx['Type'], 'Type should be the SYSTEM top-up').toContain('Top-up from SYSTEM');
    expect(money(tx['Credit']), 'Agent should be credited 2000 Tk').toBe(DEPOSIT_TO_AGENT);
  });

  step(12, 'Verify the Agent can deposit 500 Tk to an existing Customer.', SMOKE, async ({ browser }) => {
    await cashIn.open();
    state.customerPhone = accounts.customerPhone;
    let attempt = await cashIn.submitDeposit(state.customerPhone, DEPOSIT_TO_CUSTOMER);
    if (attempt.response.status() !== 201 && /limit/i.test(String(attempt.body.message))) {
      state.customerPhone = await createActiveCustomer(browser);
      attempt = await cashIn.submitDeposit(state.customerPhone, DEPOSIT_TO_CUSTOMER);
    }
    const result = await cashIn.confirmDeposit(attempt, DEPOSIT_TO_CUSTOMER);
    state.customerTrnxId = result.trnxId;
  });

  step(13, 'Verify the Agent balance is updated correctly after the transaction.', REGRESSION, async () => {

    const commission = DEPOSIT_TO_CUSTOMER * accounts.commissionRate;
    const expectedBalance = DEPOSIT_TO_AGENT - DEPOSIT_TO_CUSTOMER + commission;

    await statement.open();
    await expect
      .poll(() => statement.currentBalance(), { message: 'Agent balance after Customer deposit' })
      .toBeCloseTo(expectedBalance, 2);
  });

  step(14, 'Verify the Customer deposit appears in the Agent\'s Self Statement.', REGRESSION, async () => {
    const commission = DEPOSIT_TO_CUSTOMER * accounts.commissionRate;
    const tx = await statement.findTransaction(state.customerTrnxId);
    expect(tx['Sender Account'], 'Sender should be the Agent').toContain(agent.phone);
    expect(tx['Receiver Account'], 'Receiver should be the Customer').toContain(state.customerPhone);
    expect(tx['Type'], 'Type should be the Agent deposit').toContain('Deposit');
    expect(money(tx['Debit']), 'Agent debit should be the deposit amount').toBe(DEPOSIT_TO_CUSTOMER);
    expect(money(tx['Credit']), 'Agent credit should be the commission').toBeCloseTo(commission, 2);
  });

  step(15, 'Verify Agent logout works successfully.', SMOKE, async () => {
    await statement.logout();
  });

  step(16, 'Verify Agent password reset works successfully.', SMOKE, async () => {
    const reset = new PasswordResetPage(page);
    const known = await snapshotMail({ to: agent.email, subject: 'Password Reset' });
    await reset.requestLink(agent.email);

    const body = await waitForMail({ to: agent.email, subject: 'Password Reset', known });
    const resetPath = extractResetPath(body);
    expect(resetPath, 'Reset link should be found in the email').toBeTruthy();
    await reset.setNewPassword(resetPath, agent.newPassword);
  });

  step(17, 'Verify login with the old password fails after password reset.', REGRESSION, async () => {
    await login.open();
    await login.submitCredentials(agent.email, agent.password);
    await expect(login.errorAlert, 'Old password should be rejected').toBeVisible();
    await expect(login.otpInput, 'No OTP step after a failed login').toBeHidden();
  });

  step(18, 'Verify login with the new password succeeds.', SMOKE, async () => {
    await loginAgentWithOtp(agent.newPassword);
  });

  step(19, 'Verify the Self Statement contains the expected transaction data.', REGRESSION, async () => {
    await statement.open();
    const systemTx = await statement.findTransaction(state.systemTrnxId);
    expect(money(systemTx['Credit']), 'System -> Agent: 2000 Tk credit').toBe(DEPOSIT_TO_AGENT);
    const customerTx = await statement.findTransaction(state.customerTrnxId);
    expect(money(customerTx['Debit']), 'Agent -> Customer: 500 Tk debit').toBe(DEPOSIT_TO_CUSTOMER);
    expect(customerTx['Receiver Account'], 'Agent -> Customer receiver').toContain(state.customerPhone);

    const rows = await statement.readAllRows();
    expect(rows.length, 'Self Statement should have at least the two transactions').toBeGreaterThanOrEqual(2);
  });

  step(20, 'Verify the Self Statement data is successfully saved into the required CSV file.', SMOKE, async () => {
    await statement.open();
    const headers = await statement.headers();
    const rows = await statement.readAllRows();
    expect(rows.length, 'Self Statement should have rows').toBeGreaterThanOrEqual(2);

    const file = saveSelfStatementCsv(headers, rows);

    expect(file, 'CSV filename follows the convention').toMatch(new RegExp(`self_statement_${todayStamp()}\\.csv$`));
    expect(fs.existsSync(file), 'CSV file should exist').toBe(true);
    const content = fs.readFileSync(file, 'utf8');
    expect(content.length, 'CSV should not be empty').toBeGreaterThan(0);
    expect(content.startsWith(toCsv(headers, [])), 'CSV should start with the table headers').toBe(true);
    expect(content, 'CSV has the System -> Agent 2000 Tk transaction').toContain(state.systemTrnxId);
    expect(content, 'CSV has the Agent -> Customer 500 Tk transaction').toContain(state.customerTrnxId);
  });
});
