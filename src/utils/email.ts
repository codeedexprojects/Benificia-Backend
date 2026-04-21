import { SendEmailCommand, type SESClient } from "@aws-sdk/client-ses";
import { env } from "../config/env";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Replaces {{variable_name}} placeholders in a template string.
 * Unmatched keys are replaced with an empty string.
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => variables[key] ?? "",
  );
}

export async function sendEmail(
  ses: SESClient,
  input: SendEmailInput,
): Promise<void> {
  const toAddresses = Array.isArray(input.to) ? input.to : [input.to];

  await ses.send(
    new SendEmailCommand({
      Source: env.AWS_SES_FROM_EMAIL,
      Destination: { ToAddresses: toAddresses },
      Message: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: input.html, Charset: "UTF-8" },
          ...(input.text && { Text: { Data: input.text, Charset: "UTF-8" } }),
        },
      },
    }),
  );
}
