const { GoogleAuth, GoogleSpreadsheets } = require('google-spreadsheets');

// Initialize with service account credentials
const auth = new GoogleAuth({
  keyFile: '/home/addy/student-attendance-system/src/utils/keys.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

class SheetsIntegration {
  constructor() {
    this.spreadsheets = new GoogleSpreadsheets();
    this.metadataCache = new Map();
  }

  async linkSheet(url, batchId, sectionId) {
    try {
      // Fetch sheet data
      const sheetData = await this.spreadsheets.getSheetData(url);

      // Validate schema
      if (!this.validateSchema(sheetData)) {
        throw new Error('Schema validation failed');
      }

      // Extract metadata
      const metadata = this.extractSheetMetadata(sheetData);

      // Store mapping
      const metadataKey = `${batchId}-${sectionId}`;
      this.metadataCache.set(metadataKey, {
        ...metadata,
        url,
        batchId,
        sectionId,
        status: 'active'
      });

      return metadata;
    } catch (error) {
      throw new Error(`Sheet integration error: ${error.message}`);
    }
  }

  validateSchema(data) {
    // Verify required sheets exist
    const requiredSheets = ['Students', 'Subjects', 'Attendance'];
    const availableSheets = Object.keys(data);

    return requiredSheets.every(sheet => availableSheets.includes(sheet));
  }

  extractSheetMetadata(data) {
    return {
      sheetName: data.properties.title,
      sheetId: data.spreadsheetId,
      batchId: null,
      sectionId: null,
      createdAt: new Date().toISOString(),
      lastSyncTime: null,
      status: 'inactive' // Default to inactive until configured
    };
  }
}

module.exports = new SheetsIntegration();