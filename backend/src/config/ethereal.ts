import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    // Use configured SMTP (e.g. Mailtrap on port 2525)
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
    });
    console.log(`Using SMTP: ${host}:${port} as ${user}`);
  } else {
    // Local dev fallback: create Ethereal test account
    const account = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: account.user, pass: account.pass },
    });
    console.log('Ethereal Email account created:', account.user);
  }

  return transporter;
}
