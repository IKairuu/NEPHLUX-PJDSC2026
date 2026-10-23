import { Injectable, Logger } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { createTransport } from 'nodemailer';

export interface MailMessage {
  subject: string;
  text: string;
  replyTo?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

// Sends through Gmail SMTP with an app password. When MAIL_USER or
// MAIL_APP_PASSWORD is missing, mail is skipped with a warning so the
// app still runs without it.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly smtp: SmtpConfig | null;
  private readonly to: string;

  constructor() {
    const user = process.env.MAIL_USER?.trim();
    // Google shows app passwords in groups of four with spaces
    const pass = process.env.MAIL_APP_PASSWORD?.replace(/\s+/g, '');
    this.to = process.env.MAIL_TO?.trim() || user || '';
    this.smtp =
      user && pass
        ? {
            host: process.env.MAIL_HOST ?? 'smtp.gmail.com',
            port: Number(process.env.MAIL_PORT ?? 465),
            user,
            pass,
          }
        : null;
    if (!this.smtp) {
      this.logger.warn(
        'MAIL_USER or MAIL_APP_PASSWORD is not set, so emails will be skipped',
      );
    }
  }

  // Sends to the team inbox (MAIL_TO). Never throws: returns false on failure.
  async notifyTeam(message: MailMessage): Promise<boolean> {
    if (!this.smtp) {
      this.logger.warn(`Mail skipped (not configured): ${message.subject}`);
      return false;
    }
    const { host, port, user, pass } = this.smtp;
    try {
      // nodemailer's own DNS resolver queries DNS servers directly and can time
      // out on some Windows networks, so resolve with the OS resolver instead
      // (the same one the browser uses) and connect to the IP, preferring IPv4.
      const address = await this.resolve(host);
      const transporter = createTransport({
        host: address,
        port,
        secure: port === 465,
        auth: { user, pass },
        servername: host,
        tls: { servername: host },
        connectionTimeout: 15_000,
      });
      await transporter.sendMail({
        from: `NEPHLUX <${user}>`,
        to: this.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
      });
      return true;
    } catch (err) {
      this.logger.error(
        `Mail failed: ${message.subject}`,
        err instanceof Error ? err.message : String(err),
      );
      return false;
    }
  }

  private async resolve(host: string): Promise<string> {
    try {
      return (await lookup(host, { family: 4 })).address;
    } catch {
      return (await lookup(host)).address;
    }
  }
}
