// Auto-detect environment and set API URL
const API_CONFIG = {
    baseURL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : window.location.origin + '/api'
};

window.API_URL = API_CONFIG.baseURL;
console.log('API URL:', window.API_URL);