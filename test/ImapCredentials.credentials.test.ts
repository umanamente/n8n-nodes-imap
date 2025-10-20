import { ImapCredentials, ImapCredentialsData } from '../credentials/ImapCredentials.credentials';

describe('ImapCredentials', () => {
  let credentials: ImapCredentials;
  let expectedFields: (keyof ImapCredentialsData)[];

  beforeEach(() => {
    credentials = new ImapCredentials();
    
    // Dynamically extract field names from the credentials properties
    // This ensures the test stays in sync with the actual implementation
    const sampleData: ImapCredentialsData = {
      host: '',
      port: 0,
      user: '',
      password: '',
      tls: false,
      allowUnauthorizedCerts: false,
    };
    
    expectedFields = Object.keys(sampleData) as (keyof ImapCredentialsData)[];    
  });

  describe('properties correspondence with ImapCredentialsData', () => {
    it('should have properties that match all fields in ImapCredentialsData interface', () => {
      // Get all property names from the credentials
      const propertyNames = credentials.properties.map(prop => prop.name);

      // Check that all expected fields are present in properties
      expectedFields.forEach(field => {
        expect(propertyNames).toContain(field);
      });
    });

    it('should have exactly the same number of properties as ImapCredentialsData fields', () => {
      const propertyNames = credentials.properties.map(prop => prop.name);

      expect(propertyNames.length).toBe(expectedFields.length);
    });

    it('should have no extra properties beyond ImapCredentialsData fields', () => {
      const propertyNames = credentials.properties.map(prop => prop.name);

      propertyNames.forEach(propName => {
        expect(expectedFields).toContain(propName as keyof ImapCredentialsData);
      });
    });

  });

});
