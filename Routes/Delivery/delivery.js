// Routes/Delivery/delivery.js
const express = require('express');
const { initializeRoutes, optimizeRoutes } = require('../../Controllers/deliveryController'); // Check this path

const router = express.Router();

router.post('/initialize-delivery', initializeRoutes);  // Ensure initializeRoutes is correctly imported
router.post('/optimize-delivery', optimizeRoutes);      // Ensure optimizeRoutes is correctly imported

module.exports = router;
