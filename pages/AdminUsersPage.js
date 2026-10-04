const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class AdminUsersPage extends BasePage {
  constructor(page) {
    super(page);
    this.searchTypeSelect = page.locator('.MuiFormControl-root', { hasText: 'Search Type' }).getByRole('combobox');
    this.searchInput = page.getByRole('textbox').first();
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });

    this.editButton = page.getByRole('button', { name: /edit/i });
    this.statusSelect = page.locator('.MuiFormControl-root', { hasText: 'Account Status' }).getByRole('combobox');
    this.saveButton = page.getByRole('button', { name: /Save Changes/ });
    this.updatedToast = page.getByText('User updated successfully');
  }

  async openUserList() {
    await this.openMenu('User List');
    await expect(this.page).toHaveURL(/\/admin\/users$/);
  }

  async searchByEmail(email) {
    await this.searchTypeSelect.click();
    await this.page.getByRole('option', { name: 'Search by Email' }).click();
    await this.searchInput.fill(email);
    await this.searchButton.click();
    return this.rowFor(email);
  }

  rowFor(email) {
    return this.page.getByRole('row').filter({ hasText: email });
  }

  async openProfile(email) {
    await this.rowFor(email).getByRole('button', { name: 'View' }).click();
    await expect(this.page).toHaveURL(/\/admin\/users\/\d+/);
  }

  async openProfileFor(email) {
    if (!(await this.rowFor(email).first().isVisible())) {
      await this.openUserList();
      await this.searchByEmail(email);
    }
    await this.openProfile(email);
  }

  async activate() {
    await this.editButton.click();
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: /^Active$/ }).click();
    await this.saveButton.click();
    await expect(this.updatedToast, 'Admin save should confirm the update').toBeVisible();
  }

  statusChip(status) {
    return this.page.getByText(status, { exact: true });
  }
}

module.exports = { AdminUsersPage };
