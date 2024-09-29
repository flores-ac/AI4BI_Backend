const { google } = require('google-auth-library');
const { BigQuery } = require('@google-cloud/bigquery');
const { decryptToken } = require('../Utils/encryptionUtils');  // Import decryption functions

const getFilteredData = async (params) => {
    try {
        console.log('fetchFilteredQueryData called');
        
        const { startDate, endDate, metrics } = params;  // Destructure the params to get startDate, endDate, and metrics

        // Parse the service account JSON from the environment variable
        const googleCredentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);  // Parse the JSON string
    
        // Initialize the BigQuery client using the parsed credentials
        const bigqueryClient = new BigQuery({
          credentials: googleCredentials,  // Use credentials from environment variable
          projectId: googleCredentials.project_id,  // Extract project ID from credentials
        });

        // Map metrics to corresponding event names
        const eventNameMap = {
            'uniqueVisitors': 'page_view',
            'conversionRate': 'user_engagement',  // Replace with your actual custom event name
            'sessionCount': 'session_start'// Replace with your actual custom event name
        };

        // Collect relevant event names based on requested metrics
        const eventNames = metrics.map(metric => eventNameMap[metric]).filter(Boolean);

        // Start building the query based on the requested metrics
        let query = `
            SELECT 
                *
            FROM \`flores-ac.analytics_351906236.events_intraday_*\`
            WHERE _TABLE_SUFFIX BETWEEN '${startDate}' AND '${endDate}'
              AND event_name IN (${eventNames.map(name => `'${name}'`).join(', ')})
        `;
        
        // Limit the results to 1000 rows
        query += "LIMIT 1000";

        // Execute the query
        const [rows] = await bigqueryClient.query({ query });
        // Return both the rows and the constructed query for debugging purposes
        return {
            query,  // Send the query string back for debugging
            data: rows
        };
    } catch (error) {
        console.error('Error fetching BigQuery data:', error);
        throw new Error('Failed to fetch data from BigQuery');
    }
};

module.exports = { getFilteredData };
