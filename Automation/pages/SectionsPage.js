class SectionsPage {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async createSection(name, batchId) {
    const res = await this.apiClient.post('/api/sections', { name, batchId });
    if (res.status === 201 && res.body.success) {
      console.log(`Created section: ${name} under batch ${batchId} → ID: ${res.body.data.id}`);
      return res.body.data;
    }
    if (res.status === 409 || (res.body && res.body.message && res.body.message.includes('already exists'))) {
      console.log(`Section already exists: ${name} under batch ${batchId}, fetching...`);
      const listRes = await this.apiClient.get('/api/sections');
      if (listRes.body.success) {
        const existing = listRes.body.data.find(s => s.name === name && s.batchId === batchId);
        if (existing) {
          console.log(`Found existing section: ${name} → ID: ${existing.id}`);
          return existing;
        }
      }
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
