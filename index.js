require('dotenv').config();
const SlackBot = require('./src/slackBot');

const config = {
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  adminUsers: process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',') : []
};

const bot = new SlackBot(config);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

bot.start(PORT).catch(error => {
  console.error('Error starting bot:', error);
  process.exit(1);
});