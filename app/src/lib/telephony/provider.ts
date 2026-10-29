/** Provider-agnostic telephony contract. Twilio today; Telnyx can implement the same interface later. */
export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

export interface PurchasedNumber {
  sid: string;
  phoneNumber: string;
  voiceUrl: string;
}

export interface TelephonyProvider {
  id: "twilio" | "telnyx";
  searchNumbers(input: {
    areaCode?: string;
    contains?: string;
    region?: string;
    type?: "local" | "toll_free";
  }): Promise<AvailableNumber[]>;
  purchaseNumber(input: {
    phoneNumber: string;
    voiceUrl: string;
    label: string;
  }): Promise<PurchasedNumber>;
  configureNumber(sid: string, voiceUrl: string): Promise<boolean>;
  releaseNumber(sid: string): Promise<void>;
}
