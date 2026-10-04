const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class RegisterPage extends BasePage {
  constructor(page) {
    super(page);
    this.signUpLink = page.getByText('Sign Up', { exact: true }).first();
    this.nameInput = page.locator('input[name="name"]');
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.phoneInput = page.locator('input[name="phone_number"]');
    this.nidInput = page.locator('input[name="nid"]');
    this.roleSelect = page.locator('.MuiFormControl-root', { hasText: 'Account Type' }).getByRole('combobox');
    this.submitButton = page.getByRole('button', { name: /Create Account/ });
    this.successMessage = page.getByText(/Registration successful/);
  }

  async openFromHome() {
    await this.page.goto('/');
    await this.signUpLink.click();
    await expect(this.page, 'Sign Up should open the register page').toHaveURL(/\/register/);
  }

  async register(user, role) {
    await this.nameInput.fill(user.name);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.phoneInput.fill(user.phone);
    await this.nidInput.fill(user.nid);
    await this.roleSelect.click();
    await this.page.getByRole('option', { name: new RegExp(role) }).click();
    await this.submitButton.click();
  }

  async registerAgent(agent) {
    await this.register(agent, 'Agent');
  }
}

module.exports = { RegisterPage };
