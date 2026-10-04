const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');
const { todayStamp } = require('../utils/csv');

const money = (text) => parseFloat(String(text).replace(/[^\d.]/g, '')) || 0;

class SelfStatementPage extends BasePage {
  constructor(page) {
    super(page);
    this.balanceText = page.getByText(/Current Balance/);
    this.fromDate = page.getByLabel('From Date');
    this.toDate = page.getByLabel('To Date');
    this.headerCells = page.getByRole('columnheader');
    this.rows = page.locator('tbody tr').filter({ has: page.locator('td:nth-child(2)') });
    this.nextButton = page
      .getByRole('button', { name: /next page/i })
      .or(page.locator('.MuiTablePagination-actions button').last())
      .last();
    this.totalText = page.getByText(/Total:\s*\d+/);
  }

  async open() {
    await this.openMenu('Self Statement');
    await expect(this.page).toHaveURL(/self-statement/);
    await this.showAllDates();
    await expect(this.rows.first(), 'Self Statement should load at least one row').toBeVisible();
  }

  async showAllDates() {
    await this.fromDate.fill('2000-01-01');
    await this.toDate.fill(todayStamp(new Date(Date.now() + 2 * 86_400_000)));
  }

  async currentBalance() {
    await expect(this.balanceText).toBeVisible();
    return money(await this.balanceText.innerText());
  }

  async headers() {
    return (await this.headerCells.allInnerTexts()).map((h) => h.trim());
  }

  async findTransaction(text) {
    const row = this.rows.filter({ hasText: text }).first();
    await expect(row, `Self Statement should contain a row with "${text}"`).toBeVisible();
    const headers = await this.headers();
    const cells = await row.locator('td').allInnerTexts();
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? '').trim()]));
  }

  async totalCount() {
    const text = await this.totalText.first().innerText();
    return Number(text.match(/Total:\s*(\d+)/)[1]);
  }

  async hasNextPage() {
    return this.nextButton.isEnabled({ timeout: 5_000 });
  }

  async readAllRows() {
    const firstCell = () => this.rows.first().locator('td').first();
    const total = await this.totalCount();
    const all = [];
    for (;;) {
      const pageRows = await this.rows.evaluateAll((trs) =>
        trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.trim())),
      );
      all.push(...pageRows);
      if (!(await this.hasNextPage())) break;
      const before = await firstCell().innerText();
      await this.nextButton.click();
      await expect
        .poll(async () => {
          const now = await firstCell().innerText({ timeout: 1_000 }).catch(() => null);
          return now !== null && now !== before;
        }, { message: 'next Self Statement page should load new rows' })
        .toBe(true);
    }
    expect(all.length, `Read ${all.length} rows but the Self Statement reports ${total}`).toBe(total);
    return all;
  }
}

module.exports = { SelfStatementPage, money };
