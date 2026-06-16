class SheetsPage {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async linkSheet(url, batchId, sectionId) {
    const res = await this.apiClient.post('/api/sheets', { url, batchId, sectionId });
    if (res.status === 201 && res.body.success) {
      console.log(`Linked sheet: ${res.body.sheetName || url} → ID: ${res.body.id}`);
      return res.body;
    }
    if (res.body && res.body.error && res.body.error.includes('already exists')) {
      console.log(`Sheet already linked: ${url}`);
      return res.body;
    }
    throw new Error(`Failed to link sheet ${url}: ${JSON.stringify(res.body)}`);
  }

  async syncSheet(sheetId) {
    const res = await this.apiClient.post('/api/sheets/sync', { sheetId });
    if (res.body && res.body.message) {
      console.log(`Sync triggered for sheet ${sheetId}: ${res.body.message}`);
      return res.body;
    }
    throw new Error(`Failed to sync sheet ${sheetId}: ${JSON.stringify(res.body)}`);
  }

  async getAllSheets() {
    const res = await this.apiClient.get('/api/sheets');
    if (res.body.success) return res.body.data;
    throw new Error(`Failed to fetch sheets: ${JSON.stringify(res.body)}`);
  }
}

export default SheetsPage;
