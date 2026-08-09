# dental-clinic

> a website for my family dental clinic in koramangala, we do check-ups root canals and braces, people should be able to book an appointment

**Template exists:** **no** · **Mode:** full · **Requests:** 5 · **Model time:** 2.4s · **Wall clock:** 2.4s

## FAILED

```
fillSection(about): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"heading\": \"Our Clinic\",\n   \"body\": \"Our family dental clinic in Koramangala provides services including check-ups, root canals, and braces.\",\n   \"image\": \"\"\n}",
  "issues": [
    {
      "expected": "object",
      "code": "invalid_type",
      "path": [
        "image"
      ],
      "message": "Invalid input: expected object, received string"
    }
  ],
  "usage": {
    "provider": "groq",
    "text": "{\n  \"heading\": \"Our Clinic\",\n   \"body\": \"Our family dental clinic in Koramangala provides services including check-ups, root canals, and braces.\",\n   \"image\": \"\"\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 227,
    "outputTokens": 42,
    "latencyMs": 247
  }
}
```

### Recipe

hero (required) — Introduction to the clinic
about (required) — Clinic history and staff
services (required) — List of dental services offered
gallery — Photos of the clinic and staff
testimonials — Patient reviews and feedback
faq — Frequently asked questions
contact (required) — Contact information and appointment scheduling

### Art direction

theme **clinical-blue** · motion **calm** · corners **soft** · spacing **default** · imagery **bright-clean**

### Sections (4)

1. `hero` / `minimal` — Introduction to the dental clinic
2. `about` / `text` — Clinic history and staff
3. `services` / `cards` — List of dental services offered such as check-ups, root canals, and braces
4. `contact` / `form` — Contact information and appointment scheduling
