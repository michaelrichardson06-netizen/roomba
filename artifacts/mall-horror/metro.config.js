const { getDefaultConfig } = require("expo/metro-config");
const { createProxyMiddleware } = require("http-proxy-middleware");

const config = getDefaultConfig(__dirname);

// Proxy /api-server/* to the api-server (localhost:8080) so the Expo web
// preview can call the API from the same origin (avoids cross-origin CORS).
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  const apiProxy = createProxyMiddleware({
    target: "http://localhost:8080",
    changeOrigin: false,
    pathRewrite: { "^/api-server": "" },
    on: {
      error: (err, _req, res) => {
        console.error("[api-proxy]", err.message);
        res.writeHead(502).end("Bad Gateway");
      },
    },
  });
  return (req, res, next) => {
    if (req.url && req.url.startsWith("/api-server")) {
      return apiProxy(req, res, next);
    }
    return middleware(req, res, next);
  };
};

module.exports = config;
