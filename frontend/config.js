// Study Dost AI - frontend config (by Sami Ahraf Nirob)
// Edit this file to point at your backend, then re-upload.
window.CC_CONFIG = {
  // The base URL of your FastAPI backend running on the RDP.
  // Examples:
  //   "http://203.0.113.45:8000"            (raw IP, dev only)
  //   "https://api.yourdomain.com"          (recommended, behind a reverse proxy)
  API_BASE: "http://localhost:8000",

  // Optional shared secret. Must match APP_API_KEY in the backend .env.
  // Leave empty if the backend has APP_API_KEY unset.
  API_KEY: ""
};
