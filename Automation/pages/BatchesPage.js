class BatchesPage {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async createBatch(name, abbreviation) {
    const res = await this.apiClient.post('/api/batches', { name, abbreviation });
    if (res.status === 201 && res.body.success) {
      console.log(`Created batch: ${name} (${abbreviation}) → ID: ${res.body.data.id}`);
      return res.body.data;
    }
    if (res.status === 409 || (res.body && res.body.message && res.body.message.includes('already exists'))) {
      console.log(`Batch already exists: ${name}, fetching...`);
      const listRes = await this.apiClient.get('/api/batches');
      if (listRes.body.success) {
        const existing = listRes.body.data.find(b => b.name === name);
        if (existing) {
          console.log(`Found existing batch: ${name} → ID: ${existing.id}`);
          return existing;
        }
      }
    }
    throw new Error(`Failed to create batch ${name}: ${JSON.stringify(res.body)}`);
  }

  async getAllBatches() {
    const res = await this.apiClient.get('/api/batches');
    if (res.body.success) return res.body.data;
    throw new Error(`Failed to fetch batches: ${JSON.stringify(res.body)}`);
  }
}

export default BatchesPage;
