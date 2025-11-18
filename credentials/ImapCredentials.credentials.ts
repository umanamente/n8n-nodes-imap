import { ICredentialType, INodeProperties } from "n8n-workflow";

export const IMAP_CREDENTIALS_NAME = "imapApi";

export enum STARTTLS_USAGE {
  NEVER = "never",
  IF_SUPPORTED = "if_supported",
  ALWAYS = "always",
}

export const DEFAULT_STARTTLS_USAGE = STARTTLS_USAGE.IF_SUPPORTED;

export class ImapCredentials implements ICredentialType {
  name = IMAP_CREDENTIALS_NAME;
  displayName = "IMAP Credentials";
  properties: INodeProperties[] = [
      {
      displayName: "User",
      name: "user",
      type: "string",
      default: "",
      placeholder: "Username",
    },
    {
      displayName: "Password",
      name: "password",
      type: "string",
      typeOptions: { password: true },
      default: "",
    },
    {
      displayName: "Host",
      name: "host",
      type: "string",
      default: "",
      placeholder: "imap.gmail.com",
    },
    {
      displayName: "Port",
      name: "port",
      type: "number",
      default: 993,
      description: "Usually 993 for SSL and 143 for TLS",
    },
    {
      displayName: "SSL/TLS",
      name: "tls",
      type: "boolean",
      default: true,
      description: "Whether to use SSL/TLS or not",
    },
    {
      displayName: "Use STARTTLS",
      name: "startTLSUsage",
      type: "options",
      default: STARTTLS_USAGE.IF_SUPPORTED,
      description: "Whether to allow the use of STARTTLS to upgrade the connection to a secure one",
      hint: "If the server supports STARTTLS, the connection will be upgraded to a secure one before any sensitive data is sent. If the server does not support STARTTLS, the connection will remain unencrypted.",
      options: [
        {
          name: "If Supported (default)",
          value: STARTTLS_USAGE.IF_SUPPORTED,
        },
        {
          name: "Never (not recommended)",
          value: STARTTLS_USAGE.NEVER,
        },
        {
          name: "Always",
          value: STARTTLS_USAGE.ALWAYS,
        },
      ],
      displayOptions: {
        show: {
          tls: [false],
        },
      },
    },
    {
      displayName: "Allow Self-Signed Certificates",
      name: "allowUnauthorizedCerts",
      type: "boolean",
      default: false,
    },
  ];
}

export interface ImapCredentialsData {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
  startTLSUsage: STARTTLS_USAGE;
  allowUnauthorizedCerts: boolean;
}

