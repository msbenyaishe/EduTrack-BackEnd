const { v4: uuidv4 } = require("uuid");

const generateInviteCode = () => {
  return uuidv4().slice(0, 8).toUpperCase();
};

module.exports = { generateInviteCode };
