const { getFilteredData } = require('../Services/AnalyticsService'); // Ensure you're importing the right service

const getScorecardData = async (req, res) => {
  try {
    const { startDate, endDate, metrics } = req.body;

    // Fetch filtered data from BigQuery
    const result = await getFilteredData({ startDate, endDate, metrics });
    
    // Access the `data` field from the result (which contains the rows)
    const scorecardData = result.data;

    // Now you can filter on the scorecardData which is the actual array of rows
    const uniqueVisitors = scorecardData.filter(row => row.event_name === 'page_view').length;
    const conversionRate = scorecardData.filter(row => row.event_name === 'user_engagement').length / scorecardData.length * 100;
    const sessionCount = scorecardData.filter(row => row.event_name === 'session_start').length;

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

module.exports = { getScorecardData };
