const { expect } = require('@playwright/test');

class PasswordResetPage {
  constructor(page) {
    this.page = page;
    this.identifierInput = page.getByLabel('Email or Phone Number');
    this.sendLinkButton = page.getByRole('button', { name: /Send Reset Link/ });
    this.linkSentMessage = page.getByText(/password reset link has been sent/i);
    this.newPasswordInput = page.locator('input[type="password"]').nth(0);
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.resetButton = page.getByRole('button', { name: /Reset Password/ });
    this.resetSuccess = page.getByText(/password has been reset successfully/i);
  }

  async requestLink(identifier) {
    await this.page.goto('/forgot-password');
    await this.identifierInput.fill(identifier);
    await this.sendLinkButton.click();
    await expect(this.linkSentMessage, 'App should confirm the reset mail was sent').toBeVisible();
  }

  async setNewPassword(resetPath, newPassword) {
    await this.page.goto(resetPath);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(newPassword);
    await this.resetButton.click();
    await expect(this.resetSuccess, 'Password reset should succeed').toBeVisible();
  }
}

module.exports = { PasswordResetPage };
