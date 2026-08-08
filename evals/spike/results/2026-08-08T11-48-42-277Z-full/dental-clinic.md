# dental-clinic

> a website for my family dental clinic in koramangala, we do check-ups root canals and braces, people should be able to book an appointment

**Template exists:** **no** · **Mode:** full · **Requests:** 4 · **Model time:** 1.8s · **Wall clock:** 1.8s

## FAILED

```
fillSection(hero): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"eyebrow\": \"Koramangala Dental Clinic\",\n   \"heading\": \"Dental Care for Your Family\",\n   \"sub\": \"Check-ups, root canals, and braces for a healthy smile\",\n   \"ctaLabel\": \"Book an Appointment\",\n   \"image\": \"dentist-at-work\"\n}",
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
    "text": "{\n  \"eyebrow\": \"Koramangala Dental Clinic\",\n   \"heading\": \"Dental Care for Your Family\",\n   \"sub\": \"Check-ups, root canals, and braces for a healthy smile\",\n   \"ctaLabel\": \"Book an Appointment\",\n   \"image\": \"dentist-at-work\"\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 240,
    "outputTokens": 67,
    "latencyMs": 277
  }
}
```

### Recipe

hero (required) — Introduction to the clinic
about (required) — Clinic history and mission
services (required) — List of dental services offered
team (required) — Meet the dentists and staff
testimonials — Patient reviews
faq — Frequently asked questions
contact (required) — Get in touch and make an appointment

### Art direction

theme **clinical-blue** · motion **calm** · corners **soft** · spacing **default** · imagery **bright-clean**

### Sections (5)

1. `hero` / `minimal` — Introduction to the family dental clinic in Koramangala
2. `about` / `text` — Clinic history and mission
3. `services` / `cards` — List of dental services offered including check-ups, root canals, and braces
4. `team` / `grid` — Meet the dentists and staff
5. `contact` / `simple` — Get in touch and make an appointment
