import { env } from "../config/env";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => variables[key] ?? "",
  );
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const toAddresses = Array.isArray(input.to) ? input.to : [input.to];

  if (env.MOCK_EMAIL) {
    console.log("================ MOCK EMAIL ================");
    console.log(`To: ${toAddresses.join(", ")}`);
    console.log(`Subject: ${input.subject}`);
    console.log(`Body:\n${input.text ?? input.html}`);
    console.log("============================================");
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: env.BREVO_FROM_NAME, email: env.BREVO_FROM_EMAIL },
      to: toAddresses.map((email) => ({ email })),
      subject: input.subject,
      htmlContent: input.html,
      ...(input.text && { textContent: input.text }),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo email error (${res.status}): ${body}`);
  }
}
