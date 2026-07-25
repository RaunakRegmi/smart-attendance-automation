/**
 * Stand-in for the `googleapis` package.
 *
 * The audit tests the Google Sheets adapter at the seam only — we assert that we call it with
 * the right arguments, never that Google behaves a certain way. This mock therefore returns
 * empty-but-well-shaped responses and throws on nothing; individual tests override the
 * relevant jest.fn() to script a response or a failure.
 */
const spreadsheets = {
  get: jest.fn(async () => ({
    data: { spreadsheetId: 'mock-spreadsheet', sheets: [{ properties: { title: 'Sheet1' } }] },
  })),
  batchUpdate: jest.fn(async () => ({ data: { replies: [] } })),
  values: {
    get: jest.fn(async () => ({ data: { values: [] } })),
    update: jest.fn(async () => ({ data: { updatedCells: 0 } })),
    append: jest.fn(async () => ({ data: { updates: { updatedCells: 0 } } })),
    batchUpdate: jest.fn(async () => ({ data: { totalUpdatedCells: 0 } })),
    clear: jest.fn(async () => ({ data: {} })),
  },
};

const sheetsClient = { spreadsheets };

class GoogleAuth {
  constructor(options = {}) {
    this.options = options;
  }

  async getClient() {
    return {};
  }

  async getAccessToken() {
    return { token: 'mock-access-token' };
  }
}

const google = {
  __sheetsClient: sheetsClient,
  auth: { GoogleAuth },
  sheets: jest.fn(() => sheetsClient),
};

module.exports = { google, GoogleAuth };
