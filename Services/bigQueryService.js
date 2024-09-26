const { google } = require('google-auth-library');
const { BigQuery } = require('@google-cloud/bigquery');
const { decryptToken } = require('../Utils/encryptionUtils');  // Import decryption functions

// Function to fetch BigQuery data using service account JSON from environment variable
async function fetchBigQueryData() {
  try {
    console.log('fetchBigQueryData called');

    // Parse the service account JSON from the environment variable
    const googleCredentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);  // Parse the JSON string

    // Initialize the BigQuery client using the parsed credentials
    const bigquery = new BigQuery({
      credentials: googleCredentials,  // Use credentials from environment variable
      projectId: googleCredentials.project_id,  // Extract project ID from credentials
    });

    // Example query to fetch BigQuery data (adjust as needed)
    const query = 'SELECT * FROM `flores-ac.analytics_351906236.events_intraday_*` LIMIT 10';

    // Run the query
    const [rows] = await bigquery.query({ query });

    return rows;  // Return the result rows
  } catch (error) {
    console.error('Error fetching BigQuery data:', error);
    throw new Error('Failed to fetch data from BigQuery');
  }
}


module.exports = { fetchBigQueryData };
