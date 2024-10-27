// routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const AnalyticsController = require('../../Controllers/AnalyticsController');

// POST route to fetch scorecard data
router.post('/scorecards', AnalyticsController.getScorecardData);
// POST route to fetch GA4 data
router.post('/ga4data', AnalyticsController.getGA4Data);
router.post('/ga4report', AnalyticsController.getGA4Report);
module.exports = router;
