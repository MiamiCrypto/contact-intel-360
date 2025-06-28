#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { chromium } = require('playwright');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Function to read profiles.yml from repo root
async function readProfiles() {
  try {
    const profilesPath = path.join(process.cwd(), 'profiles.yml');
    const fileContents = fs.readFileSync(profilesPath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    console.error('Error reading profiles.yml:', error.message);
    process.exit(1);
  }
}

// Function to ensure output directory exists
function ensureOutputDir() {
  const outputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

// Function to scrape people from a profile
async function scrapePeopleData(profile) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log(`Scraping ${profile.tenant} from ${profile.startUrl}...`);
  
  try {
    await page.goto(profile.startUrl, { waitUntil: "domcontentloaded" });
    
    // Extract senior leadership
    const seniorLeaders = await page.$$eval(profile.seniorSelector, nodes => {
      return nodes.map(node => ({
        name: node.textContent.trim(),
        title: node.nextElementSibling ? node.nextElementSibling.textContent.trim() : '',
        level: "Senior Leadership"
      }));
    });
    
    // Extract staff
    const staff = await page.$$eval(profile.staffSelector, nodes => {
      return nodes.map(node => ({
        name: node.textContent.trim(),
        title: node.nextElementSibling ? node.nextElementSibling.textContent.trim() : '',
        level: "Other Staff"
      }));
    });
    
    // Combine and add source_url
    const allPeople = [...seniorLeaders, ...staff].map(person => ({
      ...person,
      source_url: profile.startUrl
    }));
    
    await browser.close();
    return allPeople;
    
  } catch (error) {
    console.error(`Error scraping ${profile.tenant}:`, error.message);
    await browser.close();
    return [];
  }
}

// Function to write data to CSV
async function writeToCSV(data, tenant) {
  const outputDir = ensureOutputDir();
  const csvPath = path.join(outputDir, `${tenant}_raw.csv`);
  
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: 'source_url', title: 'source_url' },
      { id: 'name', title: 'name' },
      { id: 'title', title: 'title' },
      { id: 'level', title: 'level' }
    ]
  });
  
  await csvWriter.writeRecords(data);
  console.log(`Rows written: ${data.length}`);
  return csvPath;
}

// Main execution function
async function main() {
  try {
    const profiles = await readProfiles();
    
    for (const profile of profiles) {
      const peopleData = await scrapePeopleData(profile);
      if (peopleData.length > 0) {
        const csvPath = await writeToCSV(peopleData, profile.tenant);
        console.log(`CSV saved to: ${csvPath}`);
      } else {
        console.log(`No data found for ${profile.tenant}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run as CLI
if (require.main === module) {
  main();
}

// Export for module usage
module.exports = {
  readProfiles,
  scrapePeopleData,
  writeToCSV
}; 