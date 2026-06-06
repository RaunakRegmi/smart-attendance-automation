const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const DAY_NAME_MAP = {
  sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
};

const normalizeDayName = (day) => {
  if (!day) return null;
  const trimmed = day.toString().trim();
  const lower = trimmed.toLowerCase();
  // Already a full day name
  if (DAY_NAME_MAP[lower]) return DAY_NAME_MAP[lower];
  // Check partial match (e.g. "thurs" → "Thursday")
  for (const [short, full] of Object.entries(DAY_NAME_MAP)) {
    if (lower.startsWith(short)) return full;
  }
  // Numeric: 0-6 (0=Sunday) or 1-7 (1=Monday)
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (num >= 0 && num <= 6) return days[num];
    if (num >= 1 && num <= 7) return days[num - 1];
  }
  return trimmed;
};

const normalizeStatus = (status) => {
  if (!status) return 'Absent';
  const statusStr = status.toString().trim().toLowerCase();
  if (statusStr.includes('present')) return 'Present';
  if (statusStr.includes('late')) return 'Late';
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

  // Validate date headers in row 7 (index 6)
  const dateRow = values[6] || [];
  const invalidDateHeaders = [];
  dateRow.forEach((cell, index) => {
    const parsed = parseDateValue(cell);
    if (!parsed) {
      invalidDateHeaders.push(`column ${index + 1} with value '${cell}'`);
    }
  });
  if (invalidDateHeaders.length > 0) {
    result.invalidDateHeaders = invalidDateHeaders;
  }

  for (let i = 7; i < values.length; i++) {
    const row = values[i];
    if (!row || !row[2] || !row[3]) continue;
    const studentName = row[2];
    const email = row[3];

    for (let j = 4; j < dateRow.length; j++) {
      const dateValue = dateRow[j];
      if (!dateValue) continue;

      const statusValue = row[j];
      const date = parseDateValue(dateValue);
      if (!date) continue;

      result.push({
        studentName: studentName.toString().trim(),
        email: email.toString().trim(),
        subjectCode,
        subjectTitle: null,
        lecturer: null,
        date,
        status: normalizeStatus(statusValue),
        attendance: normalizeStatus(statusValue),
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
        studentName: row.Student ? row.Student.name : row.studentName,
        email: row.Student ? row.Student.email : row.email,
        subjectCode: row.Subject ? row.Subject.subjectCode : row.subjectCode,
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

// Convert "09:30 AM" / "1:00 PM" / "13:00" / Excel serial / Date object → "HH:MM" (24h).
// Returns null if it can't make sense of the input.
const normalizeTime = (raw) => {
  if (raw === null || raw === undefined || raw === '') return null;

  // Excel sometimes returns a Date for time cells
  if (raw instanceof Date) {
    return `${String(raw.getHours()).padStart(2, '0')}:${String(raw.getMinutes()).padStart(2, '0')}`;
  }

  // Excel time serial number (fraction of a day)
  if (typeof raw === 'number' && raw < 1) {
    const totalMin = Math.round(raw * 24 * 60);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const s = raw.toString().trim();
  // "9:30 AM", "01:00 PM", "1:00pm"
  const ampm = s.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)\.?$/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2] || '0', 10);
    const isPm = /pm/i.test(ampm[3]);
    if (h === 12) h = isPm ? 12 : 0;
    else if (isPm) h += 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  // "09:30" / "9:30"
  const hhmm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    const h = Math.min(23, parseInt(hhmm[1], 10));
    const m = Math.min(59, parseInt(hhmm[2], 10));
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return s; // give up, return as-is
};

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
      // sectionName is OPTIONAL — the controller already knows the section
      // from the form. Kept for files that include it as a column.
      const sectionName = row.section || row['section name'] || row['batch section'] || row['group'] || row['class section'];
      const dayOfWeek = row.day || row['day of week'] || row['weekday'];
      const subjectCode = row['subject code'] || row.subjectcode || row['module code'] || row.code;
      const subjectName = row['subject name'] || row.subjectname || row['module title'] || row.subject;
      const startTime = row['start time'] || row.start || row.from;
      const endTime = row['end time'] || row.end || row.to;
      const block = row.block || row['block name'] || row['class type'] || row.type;
      const room = row.room || row['room number'] || row.venue || row.location;
      const teacher = row.teacher || row.lecturer || row.faculty || row.instructor;

      // Required: day, subject, both times. Section name no longer required.
      if (!dayOfWeek || !subjectCode || !subjectName || !startTime || !endTime) {
        return;
      }

      records.push({
        sectionName: sectionName ? sectionName.toString().trim() : null,
        dayOfWeek: normalizeDayName(dayOfWeek),
        subjectCode: subjectCode.toString().trim(),
        subjectName: subjectName.toString().trim(),
        startTime: normalizeTime(startTime),
        endTime: normalizeTime(endTime),
        block: block ? block.toString().trim() : null,
        room: room ? room.toString().trim() : null,
        teacher: teacher ? teacher.toString().trim() : null,
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
      const sectionName = row.section || row['section name'] || row['batch section'] || row['class section'] || row.group;
      const dayOfWeek = row.day || row['day of week'] || row['weekday'];
      const subjectCode = row['subject code'] || row.subjectcode || row['code'] || row['module code'];
      const subjectName = row['subject name'] || row.subjectname || row['subject'] || row['module title'];
      const startTime = row['start time'] || row.start || row['from'];
      const endTime = row['end time'] || row.end || row['to'];
      const block = row.block || row['block name'] || row['type'] || row['class type'];
      const room = row.room || row['room number'] || row['venue'] || row.location;
      const teacher = row.teacher || row.lecturer || row.faculty || row.instructor;

      // sectionName is OPTIONAL — controller supplies sectionId from the form
      if (!dayOfWeek || !subjectCode || !subjectName || !startTime || !endTime) {
        return;
      }

      records.push({
        sectionName: sectionName ? sectionName.toString().trim() : null,
        dayOfWeek: normalizeDayName(dayOfWeek),
        subjectCode: subjectCode.toString().trim(),
        subjectName: subjectName.toString().trim(),
        startTime: normalizeTime(startTime),
        endTime: normalizeTime(endTime),
        block: block ? block.toString().trim() : null,
        room: room ? room.toString().trim() : null,
        teacher: teacher ? teacher.toString().trim() : null,
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