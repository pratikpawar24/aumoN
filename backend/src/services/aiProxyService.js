const axios = require('axios');
const { config } = require('../config/env');

class AIProxyService {
  constructor() {
    this.baseUrl = config.aiServiceUrl;
    this.timeout = 30000;
  }

  async proxyRequest(method, path, data = null, params = null) {
    try {
      const res = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        params,
        timeout: this.timeout,
        headers: { 'Content-Type': 'application/json' },
      });
      return { success: true, data: res.data };
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      console.error(`AI proxy error [${path}]:`, msg);
      return { success: false, error: msg, status: err.response?.status || 503 };
    }
  }

  async optimizeRoute(payload) {
    return this.proxyRequest('POST', '/api/route/optimize', payload);
  }

  async matchCarpool(payload) {
    return this.proxyRequest('POST', '/api/carpool/match', payload);
  }

  async predictTraffic(payload) {
    return this.proxyRequest('POST', '/api/traffic/predict', payload);
  }

  async estimateEmissions(payload) {
    return this.proxyRequest('POST', '/api/emissions/estimate', payload);
  }

  async healthCheck() {
    return this.proxyRequest('GET', '/health');
  }
}

module.exports = new AIProxyService();