const nodemailer = require('nodemailer');
const { requireConfig } = require('../lib/secrets');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: requireConfig('SMTP_HOST'),
    port: Number(requireConfig('SMTP_PORT')),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: requireConfig('SMTP_USER'),
      pass: requireConfig('SMTP_PASS'),
    },
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transporter;
}

async function sendTransactionalEmail({ to, subject, text }) {
  if (!/^\S+@\S+\.\S+$/.test(to || '')) throw new Error('A valid email recipient is required');
  return getTransporter().sendMail({ from: requireConfig('EMAIL_FROM'), to, subject, text });
}

module.exports = { sendTransactionalEmail };
