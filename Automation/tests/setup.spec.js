import { test, expect, request as playwrightRequest } from '@playwright/test';
import ApiClient from '../utils/apiClient.js';
import LoginPage from '../pages/LoginPage.js';
import BatchesPage from '../pages/BatchesPage.js';
import SectionsPage from '../pages/SectionsPage.js';
import SheetsPage from '../pages/SheetsPage.js';
import setupData from '../data/setupData.json' assert { type: 'json' };

let apiClient;
let loginPage;
let batchesPage;
let sectionsPage;
let sheetsPage;

test.describe('System Setup: Create Batches, Sections, and Link Sheets', () => {
  test.beforeAll(async () => {
    const baseURL = process.env.BASE_URL || 'http://localhost:5001';

    const apiContext = await playwrightRequest.newContext({
      baseURL,
      extraHTTPHeaders: { 'Content-Type': 'application/json' },
    });

    apiClient = new ApiClient(baseURL);
    apiClient.setRequestContext(apiContext);

    loginPage = new LoginPage(apiClient);
    batchesPage = new BatchesPage(apiClient);
    sectionsPage = new SectionsPage(apiClient);
    sheetsPage = new SheetsPage(apiClient);

    await loginPage.loginAsAdmin();
  });

  test.afterAll(async () => {
    if (apiClient && apiClient.requestContext) {
      await apiClient.requestContext.dispose();
    }
  });

  for (const batchData of setupData) {
    test(`Setup batch: ${batchData.batch}`, async () => {
      const batch = await batchesPage.createBatch(batchData.batch, batchData.batchAbbreviation);
      expect(batch).toBeDefined();
      expect(batch.id).toBeTruthy();

      for (const sectionData of batchData.sections) {
        const section = await sectionsPage.createSection(sectionData.section, batch.id);
        expect(section).toBeDefined();
        expect(section.id).toBeTruthy();

        for (const sheetData of sectionData.sheets) {
          const result = await sheetsPage.linkSheet(sheetData.url, batch.id, section.id);
          expect(result).toBeDefined();
        }
      }
    });
  }
});
