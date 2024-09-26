// controllers/queryController.js
const { fetchGA4Events } = require('../Services/bigQueryService');

exports.getQueryResults = async (req, res) => {
  try {
    const events = await fetchGA4Events();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch GA4 events' });
  }
};
