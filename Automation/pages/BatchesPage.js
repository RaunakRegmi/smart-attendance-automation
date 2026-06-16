class BatchesPage {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async findByName(name) {
    const res = await this.apiClient.get('/api/batches');
    if (res.body.success) {
      return res.body.data.find(b => b.name === name) || null;
    }
    return null;
  }

  async createBatch(name, abbreviation) {
    const existing = await this.findByName(name);
    if (existing) {
      console.log(`Batch already exists: ${name} → ID: ${existing.id}`);
      return existing;
    }

    const res = await this.apiClient.post('/api/batches', { name, abbreviation });
    if (res.status === 201 && res.body.success) {
      console.log(`Created batch: ${name} (${abbreviation}) → ID: ${res.body.data.id}`);
      return res.body.data;
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
