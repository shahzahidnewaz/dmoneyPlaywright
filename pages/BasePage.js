const { expect } = require('@playwright/test');

class BasePage {
  constructor(page) {
    this.page = page;
    this.userMenu = page.getByRole('banner').locator('.MuiAvatar-root');
    this.logoutItem = page.getByRole('menuitem', { name: /Logout/ });
  }

  async openMenu(name) {
    await this.page.getByRole('link', { name, exact: true }).click();
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutItem.click();
    await expect(this.page, 'Logout should return to the login page').toHaveURL(/\/login/);
  }
}

module.exports = { BasePage };
