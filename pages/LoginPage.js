const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.identifierInput = page.getByPlaceholder('Enter email or phone number');
    this.passwordInput = page.locator('input[type="password"]');
    this.loginButton = page.getByRole('button', { name: /^Login/ });
    this.otpInput = page.getByLabel(/4-Digit OTP/);
    this.verifyOtpButton = page.getByRole('button', { name: /Verify OTP/ });
    this.errorAlert = page.getByRole('alert').filter({ hasText: /login failed|invalid|incorrect|wrong|failed/i });
  }

  async open() {
    await this.page.goto('/login');
  }

  async submitCredentials(identifier, password) {
    await this.identifierInput.fill(identifier);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async submitOtp(otp) {
    await this.otpInput.fill(otp);
    await this.verifyOtpButton.click();
  }
}

module.exports = { LoginPage };
