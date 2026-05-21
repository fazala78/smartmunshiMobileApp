import { BankAccount } from './bankList';
import { Contact } from './contact';
import { Product } from './Product';

export type RootStackParamList = {
  TenantVerification: undefined;
  Login: undefined;
  Home: undefined;
  Contacts: undefined;
  Journal: undefined;
  Menu: undefined;
  Billing: undefined;
  StockTransfer: undefined;
  CashTransfer: undefined;
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
  ChequeList: undefined;
  JournalEntry: undefined;
  inventoryTransaction: { item: any };
  receivePaymentList: { item: any };
  bankPayments: { item: any };
  expensePayment: { item: any };
  dailyCashReport: undefined;
  Assembly: undefined;
  subLots: { lotId: number; lotNumber: string; depth: number };
  addLot: undefined;
  nextProcess: undefined;
  stockify: undefined;
  issueStock: undefined;
  claim: undefined;
  vendors: undefined;
  lotLedger: {
    contact: Contact;
  };
  products: undefined;
  bankList: undefined;
  productLedger: {
    product: Product;
  };
  rawProducts: undefined;
  rawProductLedger: {
    product: any;
  };
  AccountLedger: {
    account: BankAccount;
  };
};
