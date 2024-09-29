// routes/analyticsRoutes.js

const express = require('express');
const router = express.Router();
const AnalyticsController = require('../../Controllers/AnalyticsController');

// POST route to fetch scorecard data
router.post('/scorecards', AnalyticsController.getScorecardData);

module.exports = router;
