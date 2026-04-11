import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  // Create ethereal test account
  const account = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  console.log('Ethereal Email account created:', account.user);
  console.log('Preview URL base: https://ethereal.email');

  return transporter;
}
