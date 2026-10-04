# DMoney Portal E2E Automation with Playwright

## Overview
End-to-end automation of the [DMoney Portal](https://dmoneyportal.roadtocareer.net/) Agent lifecycle:

Register Agent → Admin activates → System deposits 2000 Tk → Agent verifies balance → Agent deposits 500 Tk to a Customer → Password reset via emailed link → Old password rejected → New password login → Self Statement exported to CSV.

## Tech Stack
- Playwright Test (JavaScript), Node.js
- Page Object Model
- Gmail API (reads the Agent's login OTP and reset-link emails)
- CSV export utility

## Prerequisites
- Node.js 20.12 or newer
- A Gmail inbox the test can read (OAuth token for the Gmail API)

## Installation
```bash
npm install
npx playwright install chromium
cp .env.example .env     # then fill in the values
```

Key `.env` values: `AGENT_GMAIL`, `CUSTOMER_PHONE`, `COMMISSION_RATE`, and either `GMAIL_ACCESS_TOKEN` or `GMAIL_CLIENT_ID` + `GMAIL_CLIENT_SECRET` + `GMAIL_REFRESH_TOKEN`. `.env` is git-ignored.

## Running Tests
```bash
npx playwright test                    # everything (regression)
npx playwright test --headed           # watch / record the browser
npx playwright test --grep @smoke      # major test cases only (12 tests)
npx playwright test --grep @regression # all test cases (20 tests)
npx playwright show-report             # HTML report
npm run clean                          # delete output, test-results and playwright-report
```

Tests run in order and share one browser session, so run the whole file rather than a single test.

## Business Rules Checked
- Agent is `pending` after registration; Admin activates it and it stays active after reload.
- Admin and SYSTEM log in directly; Agent login needs an emailed 4-digit OTP.
- SYSTEM → Agent 2000 Tk: SYSTEM debit and Agent credit appear in both statements with the same transaction ID.
- Agent → Customer 500 Tk: the Customer receives the full amount and the Agent earns a commission (`COMMISSION_RATE`, default 2.5%), so the expected balance is 2000 − 500 + 12.50 = **1512.50**.

## Outputs (git-ignored)
| Path | What |
|---|---|
| `output/self_statement_YYYY-MM-DD.csv` | Self Statement, all rows on all pages |
| `output/videos/dmoney-e2e.webm` | Full-run video (use `--headed` for the submission recording) |
| `output/trace.zip` | Open with `npx playwright show-trace output/trace.zip` |
| `playwright-report/` | HTML report |

Note: the Balance column is calculated by the app per page, so it is exported as shown.

## Regression Test Result
![Regression Test Result](<docs/Regression Test Result.png>)

## Smoke Test Result
![Smoke Test Result](<docs/Smoke Test Result.png>)

## Automation Video
Recorded video: [dmoney-e2e](https://drive.google.com/file/d/1eTpryaUD4yI2HB90aURO8xqL41fsXOha/view?usp=sharing)
