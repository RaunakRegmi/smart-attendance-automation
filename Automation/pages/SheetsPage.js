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
    if (res.status === 409 || (res.body && res.body.message && res.body.message.includes('already'))) {
      console.log(`Sheet already linked: ${url}`);
      return res.body;
    }
    throw new Error(`Failed to link sheet ${url}: ${JSON.stringify(res.body)}`);
  }

  async getAllSheets() {
    const res = await this.apiClient.get('/api/sheets');
    if (res.body.success) return res.body.data;
    throw new Error(`Failed to fetch sheets: ${JSON.stringify(res.body)}`);
  }
}

export default SheetsPage;
