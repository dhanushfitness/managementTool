import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the JSON file
const jsonFilePath = process.argv[2] || path.join(__dirname, '../../Bill_Report_16_Dec_2025_18_08_41.json');

if (!fs.existsSync(jsonFilePath)) {
  console.error(`❌ File not found: ${jsonFilePath}`);
  process.exit(1);
}

console.log(`📖 Reading JSON file: ${jsonFilePath}`);
// Read file and replace NaN with null (NaN is not valid JSON)
let fileContent = fs.readFileSync(jsonFilePath, 'utf8');
// Replace NaN (not in quotes) with null
fileContent = fileContent.replace(/:\s*NaN\s*(,|\})/g, ': null$1');
const jsonData = JSON.parse(fileContent);

// Convert NaN values to null for JavaScript
function cleanData(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanData);
  } else if (obj !== null && typeof obj === 'object') {
    const cleaned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === 'number' && isNaN(value)) {
          cleaned[key] = null;
        } else {
          cleaned[key] = cleanData(value);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

const cleanedData = cleanData(jsonData);

// Generate the data file content
const dataFileContent = `// Bill Report Data
// Auto-generated from: ${path.basename(jsonFilePath)}
// Generated on: ${new Date().toISOString()}

export const billReportData = ${JSON.stringify(cleanedData, null, 2)};
`;

// Write to bill-report-data.js
const outputPath = path.join(__dirname, 'bill-report-data.js');
fs.writeFileSync(outputPath, dataFileContent, 'utf8');

console.log(`✅ Data converted and written to: ${outputPath}`);
console.log(`📊 Records: ${cleanedData.Sheet1?.length || 0}`);

