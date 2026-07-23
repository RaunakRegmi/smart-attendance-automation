module.exports = (req, res, next) => {
  // Service account authentication handled through keys.json
  req.services = {
    googleAuth: {
      auth: require('../utils/googleSheetsIntegration').auth,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    }
  };
  next();
};