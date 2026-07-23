class SectionsPage {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async findByNameAndBatch(name, batchId) {
    const res = await this.apiClient.get(`/api/sections?batchId=${batchId}`);
    if (res.body.success) {
      return res.body.data.find(s => s.name === name) || null;
    }
    return null;
  }

  async createSection(name, batchId) {
    const existing = await this.findByNameAndBatch(name, batchId);
    if (existing) {
      console.log(`Section already exists: ${name} under batch ${batchId} → ID: ${existing.id}`);
      return existing;
    }

    const res = await this.apiClient.post('/api/sections', { name, batchId });
    if (res.status === 201 && res.body.success) {
      console.log(`Created section: ${name} under batch ${batchId} → ID: ${res.body.data.id}`);
      return res.body.data;
    }
    throw new Error(`Failed to create section ${name}: ${JSON.stringify(res.body)}`);
  }

  async getAllSections() {
    const res = await this.apiClient.get('/api/sections');
    if (res.body.success) return res.body.data;
    throw new Error(`Failed to fetch sections: ${JSON.stringify(res.body)}`);
  }
}

export default SectionsPage;
