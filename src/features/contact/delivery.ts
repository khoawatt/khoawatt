export interface ContactMessage {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html?: string;
}

export type DeliveryResult =
  | { status: "accepted"; messageId?: string }
  | { status: "rejected" }
  | { status: "error" };

export interface ContactDeliveryProvider {
  send(message: ContactMessage): Promise<DeliveryResult>;
}

interface ResendProviderOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Resend HTTP API delivery adapter using native fetch.
 *
 * Only a successful provider response (HTTP 2xx) is treated as accepted.
 * Every provider error is mapped to an internal typed failure and the
 * provider's raw response is never exposed to the caller.
 */
export function createResendDeliveryProvider(
  options: ResendProviderOptions,
): ContactDeliveryProvider {
  const apiKey = options.apiKey.trim();
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    async send(message: ContactMessage): Promise<DeliveryResult> {
      if (apiKey.length === 0) {
        return { status: "error" };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchFn(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: message.from,
            to: message.to,
            reply_to: message.replyTo,
            subject: message.subject,
            text: message.text,
            ...(message.html ? { html: message.html } : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          return { status: "rejected" };
        }

        let messageId: string | undefined;
        try {
          const data = (await response.json()) as { id?: unknown };
          if (typeof data.id === "string") {
            messageId = data.id;
          }
        } catch {
          // Response body is not JSON; a 2xx still counts as accepted.
        }

        return { status: "accepted", messageId };
      } catch {
        return { status: "error" };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
