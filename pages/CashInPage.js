const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class CashInPage extends BasePage {
  constructor(page) {
    super(page);
    this.phoneInput = page.getByLabel('Customer Phone Number');
    this.amountInput = page.getByLabel('Amount (BDT)');
    this.submitButton = page.getByRole('button', { name: /Cash In/ });

    this.successMessage = page.getByText(/success/i).first();
  }

  async open() {
    await this.openMenu('Cash In');
    await expect(this.page).toHaveURL(/\/agent\/cash-in/);
  }

  async submitDeposit(receiverPhone, amount) {
    await this.phoneInput.fill(receiverPhone);
    await this.amountInput.fill(String(amount));
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().includes('/transaction/deposit') && r.request().method() === 'POST'),
      this.submitButton.click(),
    ]);
    return { response, body: await response.json() };
  }

  async confirmDeposit({ response, body }, amount) {
    expect(response.status(), `Deposit of ${amount} Tk should return 201. Server said: ${body.message}`).toBe(201);
    const { trnxId } = body;
    expect(trnxId, 'Deposit response should include a transaction id').toBeTruthy();
    await expect(this.successMessage, `UI should confirm the ${amount} Tk deposit`).toBeVisible();
    await expect(this.page.locator('.MuiChip-root', { hasText: trnxId }), 'UI should show the same transaction id').toBeVisible();
    return { trnxId };
  }

  async deposit(receiverPhone, amount) {
    return this.confirmDeposit(await this.submitDeposit(receiverPhone, amount), amount);
  }
}

module.exports = { CashInPage };
