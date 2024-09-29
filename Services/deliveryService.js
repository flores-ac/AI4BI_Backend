const axios = require('axios');

const initializeService = async (data) => {
    try {
        const response = await axios.post('http://localhost:5000/initialize', data);
        return response.data;
    } catch (error) {
        console.error('Error initializing route service:', error);
        throw error;
    }
};

const optimizeService = async () => {
    try {
        const response = await axios.post('http://localhost:5000/optimize');
        return response.data;
    } catch (error) {
        console.error('Error optimizing route:', error);
        throw error;
    }
};

module.exports = {
    initializeService,
    optimizeService
};