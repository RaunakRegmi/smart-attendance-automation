# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: setup.spec.js >> System Setup: Create Batches, Sections, and Link Sheets >> Setup batch: Summer 2025
- Location: tests/setup.spec.js:42:5

# Error details

```
Error: Failed to link sheet https://docs.google.com/spreadsheets/d/1JJsqQTXkRBLObgZwlClV0hVzWT6MAXpm1Gf482HjwXQ/edit?gid=469923117#gid=469923117: {"success":false,"error":"Failed to link sheet: Format validation failed: This sheet does not match the expected attendance format. Ensure the sheet has columns: Student Name, Email (Gmail), Subject Code, Date, and Attendance status (flat layout) OR the Subject Code / Lecturer / Date structure (legacy layout)."}
```

# Test source

```ts
  1  | class SheetsPage {
  2  |   constructor(apiClient) {
  3  |     this.apiClient = apiClient;
  4  |   }
  5  | 
  6  |   async linkSheet(url, batchId, sectionId) {
  7  |     const res = await this.apiClient.post('/api/sheets', { url, batchId, sectionId });
  8  |     if (res.status === 201 && res.body.success) {
  9  |       console.log(`Linked sheet: ${res.body.sheetName || url} → ID: ${res.body.id}`);
  10 |       return res.body;
  11 |     }
  12 |     if (res.status === 409 || (res.body && res.body.message && res.body.message.includes('already'))) {
  13 |       console.log(`Sheet already linked: ${url}`);
  14 |       return res.body;
  15 |     }
> 16 |     throw new Error(`Failed to link sheet ${url}: ${JSON.stringify(res.body)}`);
     |           ^ Error: Failed to link sheet https://docs.google.com/spreadsheets/d/1JJsqQTXkRBLObgZwlClV0hVzWT6MAXpm1Gf482HjwXQ/edit?gid=469923117#gid=469923117: {"success":false,"error":"Failed to link sheet: Format validation failed: This sheet does not match the expected attendance format. Ensure the sheet has columns: Student Name, Email (Gmail), Subject Code, Date, and Attendance status (flat layout) OR the Subject Code / Lecturer / Date structure (legacy layout)."}
  17 |   }
  18 | 
  19 |   async getAllSheets() {
  20 |     const res = await this.apiClient.get('/api/sheets');
  21 |     if (res.body.success) return res.body.data;
  22 |     throw new Error(`Failed to fetch sheets: ${JSON.stringify(res.body)}`);
  23 |   }
  24 | }
  25 | 
  26 | export default SheetsPage;
  27 | 
```