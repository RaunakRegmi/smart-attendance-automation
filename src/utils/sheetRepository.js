class SheetRepository {
  constructor() {
    this.sheets = new Map(); // key: metadataKey, value: sheet metadata
  }

  addSheet(metadataKey, sheetData) {
    this.sheets.set(metadataKey, sheetData);
  }

  getSheetsByBatch(batchId) {
    return Array.from(this.sheets.values()).filter(
      sheet => sheet.batchId === batchId
    );
  }

  getSheetsBySection(sectionId) {
    return Array.from(this.sheets.values()).filter(
      sheet => sheet.sectionId === sectionId
    );
  }

  filterSheets({ batch, section, status, lastSync }) {
    return Array.from(this.sheets.values()).filter(sheet => {
      let matches = true;

      if (batch) matches &&=
        sheet.batchId === batch;

      if (section) matches &&=
        sheet.sectionId === section;

      if (status) matches &&=
        sheet.status === status;

      if (lastSync) {
        const lastSyncDate = new Date(sheet.lastSyncTime);
        const filterDate = new Date(lastSync);
        matches &&=
          lastSyncDate >= filterDate;
      }

      return matches;
    });
  }

  toggleSheetStatus(metadataKey) {
    const sheet = this.sheets.get(metadataKey);
    if (!sheet) return false;

    sheet.status = sheet.status === 'active' ? 'inactive' : 'active';
    return true;
  }
}

module.exports = new SheetRepository();