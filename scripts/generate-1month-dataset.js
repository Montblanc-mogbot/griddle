import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const START_DATE = new Date('2026-01-01');
const DAYS = 30; // 1 month
const RECORDS_PER_DAY = 15; // More records per day for a fuller dataset

// Enums from existing schema
const MATERIALS = ['Stone', 'Dirt', 'Sand', 'Gravel', 'Clay'];
const VENDORS = ['Acme', 'Globex', 'Initech', 'Cyberdyne', 'Massive'];
const LOCATIONS = ['North', 'South', 'East', 'West', 'Central'];

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper to get random item from array
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate random tons (1-50, weighted toward smaller loads)
function randomTons() {
  const r = Math.random();
  if (r < 0.5) return Math.floor(Math.random() * 10) + 1; // 1-10
  if (r < 0.8) return Math.floor(Math.random() * 20) + 10; // 10-30
  return Math.floor(Math.random() * 20) + 30; // 30-50
}

// Generate records
const records = [];
let recordId = 1;

for (let day = 0; day < DAYS; day++) {
  const currentDate = new Date(START_DATE);
  currentDate.setDate(currentDate.getDate() + day);
  const dateStr = formatDate(currentDate);

  for (let i = 0; i < RECORDS_PER_DAY; i++) {
    const material = randomItem(MATERIALS);
    const vendor = randomItem(VENDORS);
    const location = randomItem(LOCATIONS);
    const tons = randomTons();
    const isCorrection = Math.random() < 0.08; // 8% correction rate

    records.push({
      id: `r${recordId}`,
      createdAt: `${dateStr}T00:00:00Z`,
      updatedAt: `${dateStr}T00:00:00Z`,
      data: {
        date: dateStr,
        material,
        vendor,
        location,
        tons,
        isCorrection,
      },
    });

    recordId++;
  }
}

// Build the dataset
const dataset = {
  version: 1,
  name: 'Bills of Lading (1 month, ~450 records)',
  schema: {
    version: 1,
    fields: [
      {
        key: 'date',
        label: 'Date',
        type: 'date',
        roles: ['rowDim'],
      },
      {
        key: 'material',
        label: 'Material',
        type: 'string',
        roles: ['rowDim'],
        enum: MATERIALS,
      },
      {
        key: 'vendor',
        label: 'Vendor',
        type: 'string',
        roles: ['colDim'],
        enum: VENDORS,
      },
      {
        key: 'location',
        label: 'Location',
        type: 'string',
        roles: ['colDim'],
        enum: LOCATIONS,
      },
      {
        key: 'tons',
        label: 'Tons',
        type: 'number',
        roles: ['measure'],
        measure: {
          format: 'decimal',
        },
      },
      {
        key: 'isCorrection',
        label: 'Correction',
        type: 'boolean',
        roles: ['flag'],
        flag: {
          style: {
            cellClass: 'cell-flagged',
            priority: 1,
          },
        },
      },
    ],
  },
  records,
};

// Save to public folder so it's available for download
const outputPath = path.join(__dirname, '..', 'public', 'sample-dataset-1month.json');
fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));

console.log(`Generated dataset with ${records.length} records`);
console.log(`Date range: ${formatDate(START_DATE)} to ${formatDate(new Date(START_DATE.getTime() + (DAYS - 1) * 24 * 60 * 60 * 1000))}`);
console.log(`Saved to: ${outputPath}`);
