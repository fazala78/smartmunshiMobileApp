/**
 * react-native-contacts.d.ts
 *
 * Place this file at:  src/types/react-native-contacts.d.ts
 *
 * Then add to tsconfig.json:
 *   "typeRoots": ["./src/types", "./node_modules/@types"]
 *
 * This covers every field the library exposes.
 */

declare module 'react-native-contacts' {
  export type Permission = 'undefined' | 'authorized' | 'denied';

  export interface PhoneNumber {
    label: string;
    number: string;
  }

  export interface EmailAddress {
    label: string;
    email: string;
  }

  export interface PostalAddress {
    label: string;
    formattedAddress: string;
    street: string;
    pobox: string;
    neighborhood: string;
    city: string;
    region: string;
    state: string;
    postCode: string;
    country: string;
  }

  export interface InstantMessageAddress {
    username: string;
    service: string;
  }

  export interface UrlAddress {
    url: string;
    label: string;
  }

  export interface Contact {
    recordID: string;
    backTitle: string;
    company: string;
    emailAddresses: EmailAddress[];
    familyName: string;
    givenName: string;
    middleName: string;
    jobTitle: string;
    phoneNumbers: PhoneNumber[];
    hasThumbnail: boolean;
    thumbnailPath: string;
    postalAddresses: PostalAddress[];
    prefix: string;
    suffix: string;
    department: string;
    birthday: {
      year?: number;
      month?: number;
      day?: number;
    } | null;
    imAddresses: InstantMessageAddress[];
    urlAddresses: UrlAddress[];
    note: string;
  }

  type PermissionCallback = (
    error: Error | null,
    permission: Permission,
  ) => void;

  const Contacts: {
    getAll(): Promise<Contact[]>;
    getAllWithoutPhotos(): Promise<Contact[]>;
    getContactById(contactId: string): Promise<Contact | null>;
    getCount(): Promise<number>;
    getPhotoForId(contactId: string): Promise<string>;
    addContact(contact: Partial<Contact>): Promise<Contact>;
    openContactForm(contact: Partial<Contact>): Promise<Contact | null>;
    openExistingContact(contact: Partial<Contact>): Promise<Contact | null>;
    viewExistingContact(contact: { recordID: string }): Promise<Contact | null>;
    editExistingContact(contact: Partial<Contact>): Promise<Contact | null>;
    updateContact(
      contact: Partial<Contact> & { recordID: string },
    ): Promise<void>;
    deleteContact(
      contact: Partial<Contact> & { recordID: string },
    ): Promise<void>;
    getContactsMatchingString(str: string): Promise<Contact[]>;
    getContactsByPhoneNumber(phoneNumber: string): Promise<Contact[]>;
    getContactsByEmailAddress(emailAddress: string): Promise<Contact[]>;
    checkPermission(callback: PermissionCallback): void;
    requestPermission(callback: PermissionCallback): void;
    writePhotoToPath(contactId: string, file: string): Promise<boolean>;
  };

  export default Contacts;
}
