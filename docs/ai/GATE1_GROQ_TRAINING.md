# R5 · AI — Gate 1 · Groq training-data terms

Owner: Hanish (R5 · AI). Amendment A3 §6 Gate 1 / worklist E2.
Recorded: 2026-08-14.

> **Status: closed. Groq is production-eligible.**
>
> The PRD promise is that user site content is never used for training. Groq's
> Services Agreement does not reserve that right on any tier we use, including
> the fee-free Developer tier. Cerebras is out of `AI_PROVIDER_ORDER` and is
> not part of this recording. E1 initials are not required — this is a terms
> record on the provider we actually send content to, not a billing decision.

---

## Scope

The chain in force is **Groq → Gemini**. Gate 1 asked for Groq and Cerebras.
This record covers **Groq only**:

| Provider | In `AI_PROVIDER_ORDER` | This record |
|---|---|---|
| Groq | yes — head of chain | read, quoted, closed |
| Cerebras | no — unfunded, not needed | out of scope. Re-open a terms check *before* adding it back |
| Gemini | last resort | not this gate. Billing / Google data-use stays Adithya's |

Solving a quota problem must not import a privacy problem. The production
question is only: does Groq train on Inputs or Outputs? It does not.

---

## Sources, read 2026-08-14

| Document | URL |
|---|---|
| Groq Services Agreement | https://console.groq.com/docs/legal/services-agreement |
| Your Data in GroqCloud | https://console.groq.com/docs/your-data |

The Services Agreement is the contract the Groq Console binds on signup. It
covers GroqChat, Groq Playground, GroqCloud, "and any other service provided by
Groq for developers, businesses, or enterprise organizations that references
these terms." Fee-free usage is the same agreement: §5.1 says certain services
"may be designated as fee-free or otherwise available without triggering a
payment for a limited time or based on usage limits." There is no separate
free-tier data-use clause that carves training rights back in.

---

## Finding

**Groq is not permitted to train or fine-tune on our Inputs or Outputs**, unless
we explicitly grant permission or instruct it to. We do not.

Quoted, Services Agreement §4.2:

> Groq does not access, use, store, or retain Inputs or Outputs except as
> necessary to provide the Cloud Services, in accordance with the Customer's
> permission or instruction, comply with applicable law, ensure the reliable
> operation of the Cloud Services, or confirm Customer's compliance with the
> AUP. […] For clarity, Groq is not permitted to use Inputs or Outputs for
> training or fine-tuning any AI Model Services or other models, unless
> explicitly granted permission or instructed by Customer.

§8.1: as between the parties, the customer retains IP in Customer Data,
including Inputs and Outputs. §8.2 (Customer Training Data) only applies if we
supply data *for* fine-tuning; Groq then uses it solely to provide the Cloud
Services to us. We do not send fine-tune datasets.

**Your Data in GroqCloud** matches the contract and is not split by plan:

- Usage metadata is always collected and does not contain inputs or outputs.
- Inference requests are not retained by default.
- Temporary logs (up to 30 days) may exist for reliability or abuse
  investigation. That is retention, not training.
- Zero Data Retention is self-serve for every customer in Console → Data
  Controls. We do not use Batch or Fine-tuning, so enabling ZDR does not
  disable anything this product calls (`/openai/v1/chat/completions`).

The product calls chat completions only. We never hit `/batches` or
`/fine_tunings`.

---

## Decision

| Question | Answer |
|---|---|
| Does Groq reserve a right to train on user content? | **No.** |
| Is the answer different on the free / Developer tier? | **No.** Same agreement. |
| Is Groq development-only? | **No.** Stays at the head of `AI_PROVIDER_ORDER`. |
| Does this close Gate 1? | **Yes**, for the provider in the chain. |
| Cerebras | Not recorded. Not in the chain. Not needed. |
| E1 sign-off | Not required. This is not the Gemini billing gate. |

If Groq's Services Agreement §4.2 is ever amended to permit training on Inputs
or Outputs without an explicit grant, Groq becomes development-only the same
day and comes out of the production order by config. That is a re-read, not a
re-negotiation with E1.

---

## Operational note (not a blocker)

ZDR is available on this account class and is the tighter posture (no 30-day
reliability logs). Enable it in Groq Console → Data Controls before the first
external user if the control is not already on. The no-training clause holds
with or without it; ZDR is retention, not the PRD promise.
