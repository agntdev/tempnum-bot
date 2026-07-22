export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export async function processPayment(
  amount: number,
  currency: string,
  description: string,
): Promise<PaymentResult> {
  const apiKey = process.env.STRIPE_SECRET_KEY ?? process.env.FLUTTERWAVE_SECRET_KEY;
  const provider = process.env.STRIPE_SECRET_KEY ? "stripe" : process.env.FLUTTERWAVE_SECRET_KEY ? "flutterwave" : null;

  if (!provider || !apiKey) {
    return { success: true, transactionId: `SIM-${Date.now()}` };
  }

  try {
    if (provider === "stripe") {
      return await processStripePayment(apiKey, amount, currency, description);
    }
    return await processFlutterwavePayment(apiKey, amount, currency, description);
  } catch (err) {
    return { success: false, error: "Payment processing failed. Please try again." };
  }
}

async function processStripePayment(
  apiKey: string,
  amount: number,
  currency: string,
  description: string,
): Promise<PaymentResult> {
  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      amount: String(Math.round(amount * 100)),
      currency: currency.toLowerCase(),
      description,
      "automatic_payment_methods[enabled]": "true",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { success: false, error: (body as { error?: { message?: string } })?.error?.message ?? "Payment failed" };
  }

  const data = (await res.json()) as { id: string };
  return { success: true, transactionId: data.id };
}

async function processFlutterwavePayment(
  apiKey: string,
  amount: number,
  currency: string,
  description: string,
): Promise<PaymentResult> {
  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: `vn-${Date.now()}`,
      amount,
      currency,
      redirect_url: "https://example.com/callback",
      meta: { description },
    }),
  });

  if (!res.ok) {
    return { success: false, error: "Payment failed" };
  }

  const data = (await res.json()) as { data?: { tx_ref?: string } };
  return { success: true, transactionId: data.data?.tx_ref ?? `FW-${Date.now()}` };
}
