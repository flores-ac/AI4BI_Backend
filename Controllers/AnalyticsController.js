const { getFilteredData, getGoogleAnalyticsData, runReport } = require('../Services/AnalyticsService');

// Function to get scorecard data from BigQuery
const getScorecardData = async (req, res) => {
  try {
    const { startDate, endDate, metrics } = req.body;

    // Fetch filtered data from BigQuery
    const result = await getFilteredData({ startDate, endDate, metrics });
    
    // Access the `data` field from the result (which contains the rows)
    const scorecardData = result.data;

    // Now you can filter on the scorecardData which is the actual array of rows
    const uniqueVisitors = scorecardData.filter(row => row.event_name === 'page_view').length;
    const sessionCount = scorecardData.filter(row => row.event_name === 'session_start').length;
    const conversionRate = scorecardData.filter(row => row.event_name === 'user_engagement').length / uniqueVisitors * 100;

    // You can then format the response however you need
    res.status(200).json({
      query: result.query,  // Return the query for debugging
      uniqueVisitors,
      conversionRate,
      sessionCount
    });
  } catch (error) {
    console.error('Error fetching scorecard data:', error);
    res.status(500).json({ message: 'Error fetching scorecard data' });
  }
};
const getGA4Data = async (req, res) => {
  try {
    const { startDate, endDate, metrics, dimensions } = req.body;

    // Ensure metrics and dimensions are provided and valid
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ message: 'Metrics are required' });
    }

    if (!dimensions || !Array.isArray(dimensions) || dimensions.length === 0) {
      return res.status(400).json({ message: 'Dimensions are required' });
    }

    // Fetch GA4 data using the Google Analytics Data API
    const result = await getGoogleAnalyticsData({ startDate, endDate, metrics, dimensions });

    // Send formatted response to the client
    res.status(200).json({
      data: result.data
    });
  } catch (error) {
    console.error('Error fetching GA4 data:', error);
    res.status(500).json({ message: 'Error fetching GA4 data' });
  }
};


// Function to get active users, sessions, and bounce rate from Google Analytics (GA4)
const getGA4Report = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Fetch report data from Google Analytics Data API
    const reportData = await runReport({ startDate, endDate });

    // Format and return the response
    res.status(200).json({
      data: reportData
    });
  } catch (error) {
    console.error('Error running GA4 report:', error);
    res.status(500).json({ message: 'Error running GA4 report' });
  }
};
module.exports = { getScorecardData, getGA4Data, getGA4Report };
