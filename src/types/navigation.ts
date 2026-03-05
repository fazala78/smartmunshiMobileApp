import { Contact } from './contact';

export type RootStackParamList = {
  TenantVerification: undefined;
  Login: undefined;
  Home: undefined;
  Contacts: undefined;
  Journal: undefined;
  Menu: undefined;
  Billing: undefined;
  ContactLedger: {
    contact: Contact;
  };
  OTPVerification: {
    email: string;
    maskedEmail: string;
    expire: string;
  };
  ReceivePayment: undefined;
  PayPayment: undefined;
  PayExpense: undefined;
  BankTransaction: undefined;
  AddContact: undefined;
  AddProduct: undefined;
};
