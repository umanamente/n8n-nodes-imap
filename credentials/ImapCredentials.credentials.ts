import { ICredentialType, INodeProperties } from "n8n-workflow";

export const IMAP_CREDENTIALS_NAME = "imapApi";

export class ImapCredentials implements ICredentialType {
  name = IMAP_CREDENTIALS_NAME;
  displayName = "IMAP Credentials";
  properties: INodeProperties[] = [
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
      displayName: "TLS",
      name: "tls",
      type: "boolean",
      default: true,
      description: "Whether to use SSL/TLS or not",
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
  allowUnauthorizedCerts: boolean;
}

