import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAccount, setTrainingConsent, setBillingProfile } from "@/lib/data/account";
import { consentSchema, billingProfileSchema } from "@/lib/contracts/schemas";

type Reply = { data: unknown; error: { message: string } | null };

interface Update {
  table: string;
  values: Record<string, unknown>;
}

// The same minimal builder the commit tests use: chained methods return the builder, and
// awaiting it yields the next queued reply for that table.
function fakeSupabase(replies: Record<string, Reply[]>) {
  const updates: Update[] = [];

  const client = {
    from(table: string) {
      const queue = replies[table] ?? [];
      const reply: Reply = queue.shift() ?? { data: null, error: null };

      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "not", "maybeSingle", "single"]) {
        builder[method] = () => builder;
      }
      builder.update = (values: Record<string, unknown>) => {
        updates.push({ table, values });
        return builder;
      };
      builder.then = (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(reply).then(resolve, reject);

      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, updates };
}

const ROW = {
  email: "someone@example.com",
  email_verified: true,
  training_opt_in: false,
  created_at: "2026-08-01T09:00:00.000Z",
};

describe("getAccount", () => {
  it("reads the caller's own row and nothing about anyone else", async () => {
    const { client } = fakeSupabase({ users: [{ data: ROW, error: null }] });

    await expect(getAccount(client)).resolves.toEqual({
      email: "someone@example.com",
      emailVerified: true,
      trainingOptIn: false,
      createdAt: "2026-08-01T09:00:00.000Z",
      displayName: "",
      phone: "",
      billingLine: "",
      billingCity: "",
      gstin: "",
    });
  });

  it("treats no visible row as not_found, which is what RLS returns for someone else", async () => {
    const { client } = fakeSupabase({ users: [{ data: null, error: null }] });

    await expect(getAccount(client)).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("setTrainingConsent", () => {
  it("writes only training_opt_in", async () => {
    const { client, updates } = fakeSupabase({
      users: [
        { data: null, error: null },
        { data: { ...ROW, training_opt_in: true }, error: null },
      ],
    });

    await setTrainingConsent(client, true);

    expect(updates).toHaveLength(1);
    expect(updates[0].values).toEqual({ training_opt_in: true });
  });

  it("returns the account as it now stands, not as the caller asked for it", async () => {
    const { client } = fakeSupabase({
      users: [
        { data: null, error: null },
        { data: { ...ROW, training_opt_in: true }, error: null },
      ],
    });

    await expect(setTrainingConsent(client, true)).resolves.toMatchObject({ trainingOptIn: true });
  });

  it("turns consent off again", async () => {
    const { client, updates } = fakeSupabase({
      users: [{ data: null, error: null }, { data: ROW, error: null }],
    });

    await expect(setTrainingConsent(client, false)).resolves.toMatchObject({
      trainingOptIn: false,
    });
    expect(updates[0].values).toEqual({ training_opt_in: false });
  });

  it("reports a refused write rather than reporting success", async () => {
    const { client } = fakeSupabase({
      users: [{ data: null, error: { message: "permission denied for table users" } }],
    });

    await expect(setTrainingConsent(client, true)).rejects.toMatchObject({ code: "internal" });
  });
});

describe("consentSchema", () => {
  it("requires the value, so silence can never be read as consent", () => {
    expect(consentSchema.safeParse({}).success).toBe(false);
    expect(consentSchema.safeParse({ trainingOptIn: "yes" }).success).toBe(false);
    expect(consentSchema.safeParse({ trainingOptIn: true }).success).toBe(true);
    expect(consentSchema.safeParse({ trainingOptIn: false }).success).toBe(true);
  });
});

describe("setBillingProfile", () => {
  it("writes name and bill-to fields, not a card or bank number", async () => {
    const { client, updates } = fakeSupabase({
      users: [
        { data: null, error: null },
        { data: { ...ROW, handle: "Ravi", phone: "9876543210" }, error: null },
      ],
    });

    await setBillingProfile(client, {
      displayName: "Ravi",
      phone: "9876543210",
      billingLine: "MG Road",
      billingCity: "Pune",
      gstin: "",
    });

    expect(updates[0].values).toEqual({
      handle: "Ravi",
      phone: "9876543210",
      billing_line: "MG Road",
      billing_city: "Pune",
      gstin: null,
    });
  });
});

describe("billingProfileSchema", () => {
  it("accepts empty optional fields and refuses a too-long GSTIN", () => {
    expect(
      billingProfileSchema.safeParse({
        displayName: "",
        phone: "",
        billingLine: "",
        billingCity: "",
        gstin: "",
      }).success,
    ).toBe(true);
    expect(
      billingProfileSchema.safeParse({
        displayName: "Ravi",
        phone: "98",
        billingLine: "x",
        billingCity: "Pune",
        gstin: "THISISTOOLONGFORGST",
      }).success,
    ).toBe(false);
  });
});
