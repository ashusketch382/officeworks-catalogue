import nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
}

/**
 * Port: anything that can deliver an email. The enquiry flow depends on this
 * interface only, so moving to SES/SendGrid/etc. is a new adapter + config,
 * not a change to business logic.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

/** Any SMTP server: Mailpit locally, or e.g. Amazon SES SMTP in AWS. */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly transporter;

  constructor(options: { host: string; port: number; secure: boolean; user?: string; pass?: string }) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user ? { user: options.user, pass: options.pass } : undefined,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail(message);
  }
}

/** Dev fallback when no SMTP server is configured: writes the email to the log. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  constructor(private readonly log: (line: string) => void = console.log) {}

  async send(message: EmailMessage): Promise<void> {
    this.log(
      [
        '----- email (console provider) -----',
        `To: ${message.to}`,
        `From: ${message.from}`,
        message.replyTo ? `Reply-To: ${message.replyTo}` : undefined,
        `Subject: ${message.subject}`,
        '',
        message.text,
        '------------------------------------',
      ]
        .filter((l) => l !== undefined)
        .join('\n'),
    );
  }
}
