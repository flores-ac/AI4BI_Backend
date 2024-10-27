const { google } = require('google-auth-library');
const { BigQuery } = require('@google-cloud/bigquery');
const { decryptToken } = require('../Utils/encryptionUtils');  // Import decryption functions
const { BetaAnalyticsDataClient } = require('@google-analytics/data');  // GA4 API client

// Function to get data from BigQuery
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
            'sessionCount': 'session_start'  // Replace with your actual custom event name
        };

        // Collect relevant event names based on requested metrics
        const eventNames = metrics.map(metric => eventNameMap[metric]).filter(Boolean);

        // Start building the query based on the requested metrics
        let query = `
            SELECT 
                *
            FROM \`${googleCredentials.project_id}.analytics_351906236.events_intraday_*\`
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




// Function to fetch data from Google Analytics
const getGoogleAnalyticsData = async ({ startDate, endDate, metrics, dimensions }) => {
    try {
        // Set up the Google Analytics Data API client
        const analyticsDataClient = new BetaAnalyticsDataClient({
            credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS)  // Use credentials from environment variable
        });

        // Make a request to the API with dynamic parameters
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${process.env.GA4_PROPERTY_ID}`,  // GA4 property ID
            dateRanges: [
                {
                    startDate: startDate,  // Use dynamic date range
                    endDate: endDate,
                },
            ],
            dimensions: dimensions.map(dimension => ({ name: dimension })),  // Dynamic dimensions
            metrics: metrics.map(metric => ({ name: metric })),  // Dynamic metrics
        });

        // Format the response and return data
        return {
            data: response.rows.map(row => {
                // Create a dynamic object for the dimension values
                const dimensionValues = dimensions.reduce((acc, dimension, index) => {
                    acc[dimension] = row.dimensionValues[index].value || "(not set)";
                    return acc;
                }, {});

                // Create a dynamic object for the metric values
                const metricValues = metrics.reduce((acc, metric, index) => {
                    acc[metric] = row.metricValues[index].value;
                    return acc;
                }, {});

                // Return the formatted data
                return {
                    ...dimensionValues,  // Spread dynamic dimension values
                    ...metricValues      // Spread dynamic metric values
                };
            })
        };
    } catch (error) {
        console.error('Error running Google Analytics report:', error);
        throw new Error('Error fetching Google Analytics data');
    }
};




// Function to fetch data from Google Analytics
const runReport = async () => {
    try {
        // Set up the Google Analytics Data API client
        const analyticsDataClient = new BetaAnalyticsDataClient({
            credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS)  // Use credentials from environment variable
        });

        // Make a request to the API
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${process.env.GA4_PROPERTY_ID}`,  // Replace with your GA4 property ID
            dateRanges: [
                {
                    startDate: '2024-01-01',  // Adjust your date range
                    endDate: 'today',
                },
            ],
            dimensions: [
                {
                    name: 'city',  // You can change or add more dimensions as needed
                },
            ],
            metrics: [
                {
                    name: 'activeUsers',  // Active users
                },
                {
                    name: 'sessions',  // Sessions
                },
                {
                    name: 'engagedSessions',  // Engaged sessions (for calculating bounce rate)
                }
            ],
        });

        // Process the data and calculate bounce rate
        const data = response.rows.map(row => {
            const activeUsers = parseInt(row.metricValues[0].value);
            const sessions = parseInt(row.metricValues[1].value);
            const engagedSessions = parseInt(row.metricValues[2].value);

            // Calculate bounce rate
            const bounceRate = ((sessions - engagedSessions) / sessions) * 100;

            return {
                city: row.dimensionValues[0].value,
                activeUsers,
                sessions,
                bounceRate: bounceRate.toFixed(2)  // Keep it to 2 decimal places
            };
        });

        console.log('Report result:', data);
        return data;
    } catch (error) {
        console.error('Error running report:', error);
    }
};



module.exports = { getFilteredData, getGoogleAnalyticsData, runReport};
