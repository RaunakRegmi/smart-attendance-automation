const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const normalizeStatus = (status) => {
  if (!status) return 'Absent';
  const statusStr = status.toString().trim().toLowerCase();
  if (statusStr.includes('present') || statusStr.includes('late')) return 'Present';
  if (statusStr.includes('absent')) return 'Absent';
  return 'Absent';
};

const parseDateValue = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'number') {
    return new Date((dateValue - 25569) * 86400 * 1000);
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseTabularData = (values) => {
  if (!Array.isArray(values) || values.length === 0) return [];

  const firstRow = values[0].map((cell) => (cell == null ? '' : cell.toString().trim().toLowerCase()));
  const hasFlatHeader = firstRow.includes('student name') && firstRow.includes('email (gmail)') && firstRow.includes('subject code') && firstRow.includes('date') && firstRow.some((col) => col.includes('attendance'));

  const result = [];

  if (hasFlatHeader) {
    const headerIndexes = {
      studentName: firstRow.indexOf('student name'),
      email: firstRow.indexOf('email (gmail)'),
      subjectCode: firstRow.indexOf('subject code'),
      subjectTitle: firstRow.indexOf('subject title'),
      lecturer: firstRow.indexOf('lecturer'),
      date: firstRow.indexOf('date'),
      status: firstRow.findIndex((col) => col.includes('attendance')),
    };

    for (let i = 1; i < values.length; i++) {
      const row = values[i] || [];
      const studentName = row[headerIndexes.studentName];
      const email = row[headerIndexes.email];
      const subjectCode = row[headerIndexes.subjectCode];
      const dateValue = row[headerIndexes.date];
      const statusValue = row[headerIndexes.status];

      if (!studentName || !email || !subjectCode || !dateValue || !statusValue) continue;

      const date = parseDateValue(dateValue);
      if (!date) continue;

      result.push({
        studentName: studentName.toString().trim(),
        email: email.toString().trim(),
        subjectCode: subjectCode.toString().trim(),
        subjectTitle: headerIndexes.subjectTitle >= 0 && row[headerIndexes.subjectTitle] ? row[headerIndexes.subjectTitle].toString().trim() : null,
        lecturer: headerIndexes.lecturer >= 0 && row[headerIndexes.lecturer] ? row[headerIndexes.lecturer].toString().trim() : null,
        date,
        status: normalizeStatus(statusValue),
        attendance: normalizeStatus(statusValue),
      });
    }

    return result;
  }

  // Fallback: legacy sheet layout with subject code in row 3 and dates in row 7
  let subjectCode = 'UNKNOWN';
  if (values[2] && values[2][0]) {
    const match = values[2][0].toString().match(/Subject Code\s*:\s*(\S+)/i);
    if (match) subjectCode = match[1];
  }

  const dateRow = values[6] || [];
  for (let i = 7; i < values.length; i++) {
    const row = values[i];
    if (!row || !row[2] || !row[3]) continue;
    const studentName = row[2];
    const email = row[3];

    for (let j = 4; j < row.length; j++) {
      const status = row[j];
      const dateValue = dateRow[j];
      if (!status || !dateValue) continue;

      const date = parseDateValue(dateValue);
      if (!date) continue;

      result.push({
        studentName: studentName.toString().trim(),
        email: email.toString().trim(),
        subjectCode,
        subjectTitle: null,
        lecturer: null,
        date,
        status: normalizeStatus(status),
        attendance: normalizeStatus(status),
      });
    }
  }

  return result;
};

const parseExcelFile = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    console.log('DEBUG: File parsed, total rows:', rawData.length);
    console.log('DEBUG: First row:', rawData[0]);
    console.log('DEBUG: Row 2:', rawData[2]);
    console.log('DEBUG: Row 6:', rawData[6]);

    const records = parseTabularData(rawData);

    console.log('DEBUG: Total records extracted:', records.length);
    if (records.length > 0) {
      console.log('DEBUG: First record:', records[0]);
    }

    return records;
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
  parseTabularData,
  exportToExcel,
  parseRoutineExcelFile,
  parseRoutineCSVFile,
  parseRoutineFile,
  parseCSVFile,
};
