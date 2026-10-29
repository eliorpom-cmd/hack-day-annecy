import { elRequest, isDemoMode } from "./client.server";

export interface ImportTwilioNumberInput {
  phoneNumber: string;
  label: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
}

export async function importPhoneNumber(input: ImportTwilioNumberInput): Promise<{ phone_number_id: string }> {
  if (isDemoMode()) return { phone_number_id: `mock_phone_${crypto.randomUUID().slice(0, 8)}` };
  return elRequest<{ phone_number_id: string }>("/v1/convai/phone-numbers", {
    method: "POST",
    body: {
      provider: "twilio",
      phone_number: input.phoneNumber,
      label: input.label,
      sid: input.twilioAccountSid,
      token: input.twilioAuthToken,
    },
  });
}

export async function assignPhoneNumber(phoneNumberId: string, agentId: string): Promise<void> {
  if (isDemoMode()) return;
  await elRequest(`/v1/convai/phone-numbers/${phoneNumberId}`, { method: "PATCH", body: { agent_id: agentId } });
}

export async function removePhoneNumber(phoneNumberId: string): Promise<void> {
  if (isDemoMode()) return;
  await elRequest(`/v1/convai/phone-numbers/${phoneNumberId}`, { method: "DELETE" });
}

export async function listPhoneNumbers(): Promise<unknown[]> {
  if (isDemoMode()) return [];
  return elRequest<unknown[]>("/v1/convai/phone-numbers");
}
