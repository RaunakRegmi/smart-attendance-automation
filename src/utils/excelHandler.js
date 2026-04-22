const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const parseExcelFile = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    console.log('DEBUG: File parsed, total rows:', rawData.length);
    console.log('DEBUG: First row:', rawData[0]);
    console.log('DEBUG: Row 2:', rawData[2]);
    console.log('DEBUG: Row 6:', rawData[6]);

    const result = [];

    // Extract subject code from row 2 (row index 2: "Subject Code : DSA001")
    let subjectCode = 'UNKNOWN';
    if (rawData[2] && rawData[2][0]) {
      const match = rawData[2][0].toString().match(/Subject Code\s*:\s*(\S+)/);
      if (match) subjectCode = match[1];
    }

    console.log('DEBUG: Extracted subject code:', subjectCode);

    // Get column headers from row 4 (index 4)
    const headerRow = rawData[4] || [];

    // Get dates from row 6 (index 6) - dates are in numeric format
    const dateRow = rawData[6] || [];

    // Process student data starting from row 7 (index 7)
    for (let i = 7; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || !row[2] || !row[3]) continue;

      const studentName = row[2];
      const email = row[3];

      // For each week column (starting from index 4)
      for (let j = 4; j < row.length; j++) {
        const status = row[j];
        const dateValue = dateRow[j];

        // Skip empty cells
        if (!status || !dateValue) continue;

        // Normalize status values
        let normalizedStatus = 'Unknown';
        const statusStr = status.toString().toLowerCase();
        if (statusStr.includes('present')) normalizedStatus = 'Present';
        else if (statusStr.includes('absent')) normalizedStatus = 'Absent';
        else if (statusStr.includes('late')) normalizedStatus = 'Late';

        // Convert Excel date number to JavaScript date
        let date;
        if (typeof dateValue === 'number') {
          date = new Date((dateValue - 25569) * 86400 * 1000);
        } else {
          date = new Date(dateValue);
        }

        result.push({
          studentName,
          email,
          subjectCode,
          date: date,
          status: normalizedStatus,
        });
      }
    }

    console.log('DEBUG: Total records extracted:', result.length);
    if (result.length > 0) {
      console.log('DEBUG: First record:', result[0]);
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

const exportToExcel = async (data, outputPath) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    worksheet.columns = [
      { header: 'Student Name', key: 'studentName', width: 20 },
      { header: 'Email (Gmail)', key: 'email', width: 25 },
      { header: 'Subject Code', key: 'subjectCode', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Attendance Status', key: 'status', width: 15 },
    ];

    data.forEach(row => {
      worksheet.addRow({
        studentName: row.Student.name,
        email: row.Student.email,
        subjectCode: row.Subject.subjectCode,
        date: row.date,
        status: row.status,
      });
    });

    worksheet.getRow(1).font = { bold: true, bg: 'D3D3D3' };

    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to export Excel file: ${error.message}`);
  }
};

const normalizeKey = (key) => key.toString().trim().toLowerCase();

const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const normalized = {};
        Object.keys(row).forEach((key) => {
          normalized[normalizeKey(key)] = row[key];
        });
        results.push(normalized);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

const parseRoutineExcelFile = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error('Routine file contains no usable rows');
    }

    const rows = rawData.map((row) => {
      const normalized = {};
      Object.keys(row).forEach((key) => {
        normalized[normalizeKey(key)] = row[key];
      });
      return normalized;
    });

    const records = [];
    rows.forEach((row) => {
      const sectionName = row.section || row['section name'] || row['batch section'] || row['group'];
      const dayOfWeek = row.day || row['day of week'] || row['day'];
      const subjectCode = row['subject code'] || row.subjectcode || row['module code'];
      const subjectName = row['subject name'] || row.subjectname || row['module title'];
      const startTime = row['start time'] || row.start || row['start time'];
      const endTime = row['end time'] || row.end || row['end time'];
      const block = row.block || row['block name'] || row['block'];
      const room = row.room || row['room number'] || row['room'];

      if (!sectionName || !dayOfWeek || !subjectCode || !subjectName || !startTime || !endTime) {
        return;
      }

      records.push({
        sectionName: sectionName.toString().trim(),
        dayOfWeek: dayOfWeek.toString().trim(),
        subjectCode: subjectCode.toString().trim(),
        subjectName: subjectName.toString().trim(),
        startTime: startTime.toString().trim(),
        endTime: endTime.toString().trim(),
        room: room ? room.toString().trim() : null,
      });
    });

    if (records.length === 0) {
      throw new Error('No valid routine records found in the uploaded file');
    }

    return records;
  } catch (error) {
    throw new Error(`Failed to parse routine Excel file: ${error.message}`);
  }
};

const parseRoutineCSVFile = async (filePath) => {
  try {
    const rows = await parseCSVFile(filePath);

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('Routine file contains no usable rows');
    }

    const records = [];
    rows.forEach((row) => {
      const sectionName = row.section || row['section name'] || row['batch section'] || row['class section'];
      const dayOfWeek = row.day || row['day of week'] || row['weekday'];
      const subjectCode = row['subject code'] || row.subjectcode || row['code'];
      const subjectName = row['subject name'] || row.subjectname || row['subject'];
      const startTime = row['start time'] || row.start || row['from'];
      const endTime = row['end time'] || row.end || row['to'];
      const room = row.room || row['room number'] || row['venue'];

      if (!sectionName || !dayOfWeek || !subjectCode || !subjectName || !startTime || !endTime) {
        return;
      }

      records.push({
        sectionName: sectionName.toString().trim(),
        dayOfWeek: dayOfWeek.toString().trim(),
        subjectCode: subjectCode.toString().trim(),
        subjectName: subjectName.toString().trim(),
        startTime: startTime.toString().trim(),
        endTime: endTime.toString().trim(),
        room: room ? room.toString().trim() : null,
      });
    });

    if (records.length === 0) {
      throw new Error('No valid routine records found in the uploaded file');
    }

    return records;
  } catch (error) {
    throw new Error(`Failed to parse routine CSV file: ${error.message}`);
  }
};

const parseRoutineFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.csv') {
    return await parseRoutineCSVFile(filePath);
  } else if (['.xlsx', '.xls'].includes(ext)) {
    return parseRoutineExcelFile(filePath);
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }
};

module.exports = { 
  parseExcelFile, 
  exportToExcel, 
  parseRoutineExcelFile, 
  parseRoutineCSVFile, 
  parseRoutineFile,
  parseCSVFile 
};
