const { initializeService, optimizeService } = require('../Services/deliveryService');

const initializeRoutes = async (req, res) => {
    try {
        const data = req.body;
        const initResponse = await initializeService(data);  // Call to the service layer
        res.status(200).json(initResponse);
    } catch (error) {
        console.error('Error in initializeRoutes:', error);
        res.status(500).json({ message: 'Error initializing routes', error: error.message });
    }
};

const optimizeRoutes = async (req, res) => {
    try {
        const optimizationResult = await optimizeService();  // Call to the service layer
        res.status(200).json(optimizationResult);
    } catch (error) {
        console.error('Error in optimizeRoutes:', error);
        res.status(500).json({ message: 'Error optimizing routes', error: error.message });
    }

};

module.exports = {
    initializeRoutes,
    optimizeRoutes
};
