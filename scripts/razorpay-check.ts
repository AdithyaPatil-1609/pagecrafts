// Does the payments account answer us? (R3, before the D11-D15 payment gate.)
//
// Creates one order in Razorpay's test mode and prints what came back. No money moves,
// nothing is stored, and the order is never paid — it exists to prove three things before
// any of the gate is written: the keys are real, they are TEST keys, and the account can
// actually create orders.
//
//   npm run pay:check
//
// An order is what the gate will create at publish: the server asks Razorpay for one,
// hands its id to the browser, and only grants the entitlement when the signed webhook says
// that order was paid. Getting an id back here means that path is open.

const KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

function bail(message: string): never {
  console.error(`\n  FAILED  ${message}\n`);
  process.exit(1);
}

async function main() {
  if (!KEY_ID || !KEY_SECRET) {
    bail("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must both be set in .env.local");
  }

  // Live keys move real money. This script is not allowed to touch them.
  if (!KEY_ID.startsWith("rzp_test_")) {
    bail(`RAZORPAY_KEY_ID is not a test key (${KEY_ID.slice(0, 9)}...). Refusing to run.`);
  }

  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Paise, not rupees: 49900 is Rs 499. Getting this wrong by 100x is the classic
      // payments bug, so the gate will take rupees and convert in one place.
      amount: 49_900,
      currency: "INR",
      receipt: `check_${Date.now()}`,
      notes: { purpose: "connectivity check, never paid" },
    }),
  });

  const body = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error = body.error as { description?: string } | undefined;
    bail(`Razorpay said ${response.status}: ${error?.description ?? JSON.stringify(body)}`);
  }

  console.log("\n  OK  Razorpay test mode is reachable and the keys work.\n");
  console.log(`      order id   ${body.id}`);
  console.log(`      amount     Rs ${Number(body.amount) / 100}`);
  console.log(`      currency   ${body.currency}`);
  console.log(`      status     ${body.status}`);
  console.log("\n  Nothing was paid. Check the dashboard under Orders to see it.\n");
}

main().catch((error: unknown) => {
  bail(error instanceof Error ? error.message : String(error));
});
