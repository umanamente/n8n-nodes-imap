import { getDefaultGreenMailConfig } from '../TestUtils/Greenmail/greenmail';

const GREENMAIL_PORT_ENV_NAMES = [
  'GREENMAIL_IMAP_PORT',
  'GREENMAIL_IMAPS_PORT',
  'GREENMAIL_SMTP_PORT',
  'GREENMAIL_SMTPS_PORT',
  'GREENMAIL_POP3_PORT',
  'GREENMAIL_POP3S_PORT',
  'GREENMAIL_API_PORT',
];

describe('GreenMail configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const envName of GREENMAIL_PORT_ENV_NAMES) {
      delete process.env[envName];
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use default host ports', () => {
    expect(getDefaultGreenMailConfig()).toMatchObject({
      imapPort: 3143,
      imapsPort: 3993,
      smtpPort: 3025,
      smtpsPort: 3465,
      pop3Port: 3110,
      pop3sPort: 3995,
      apiPort: 8080,
    });
  });

  it('should allow overriding host ports from environment variables', () => {
    process.env.GREENMAIL_IMAP_PORT = '4143';
    process.env.GREENMAIL_IMAPS_PORT = '4993';
    process.env.GREENMAIL_SMTP_PORT = '3125';
    process.env.GREENMAIL_SMTPS_PORT = '4465';
    process.env.GREENMAIL_POP3_PORT = '4110';
    process.env.GREENMAIL_POP3S_PORT = '4995';
    process.env.GREENMAIL_API_PORT = '18080';

    expect(getDefaultGreenMailConfig()).toMatchObject({
      imapPort: 4143,
      imapsPort: 4993,
      smtpPort: 3125,
      smtpsPort: 4465,
      pop3Port: 4110,
      pop3sPort: 4995,
      apiPort: 18080,
    });
  });

  it('should prefer explicit overrides over environment variables', () => {
    process.env.GREENMAIL_SMTP_PORT = '3125';

    expect(getDefaultGreenMailConfig({ smtpPort: 4025 }).smtpPort).toBe(4025);
  });

  it('should reject invalid environment port values', () => {
    process.env.GREENMAIL_SMTP_PORT = 'not-a-port';

    expect(() => getDefaultGreenMailConfig()).toThrow(
      'GREENMAIL_SMTP_PORT must be a valid TCP port number between 1 and 65535',
    );
  });
});
