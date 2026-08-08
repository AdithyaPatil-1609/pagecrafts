# dental-clinic

> a website for my family dental clinic in koramangala, we do check-ups root canals and braces, people should be able to book an appointment

**Template exists:** **no** · **Mode:** full · **Requests:** 6 · **Model time:** 2.9s · **Wall clock:** 3.0s

## FAILED

```
fillSection(services): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"heading\": \"Dental Services\",\n   \"items\": [\n      {\"name\": \"Check-ups\", \"description\": \"Regular dental check-ups\"},\n      {\"name\": \"Root Canals\", \"description\": \"Treatment for infected teeth\"},\n      {\"name\": \"Braces\", \"description\": \"Teeth straightening and alignment\"}\n   ]\n}",
  "issues": [
    {
      "expected": "string",
      "code": "invalid_type",
      "path": [
        "items",
        0,
        "title"
      ],
      "message": "Invalid input: expected string, received undefined"
    },
    {
      "expected": "string",
      "code": "invalid_type",
      "path": [
        "items",
        0,
        "body"
      ],
      "message": "Invalid input: expected string, received undefined"
    },
    {
      "expected": "string",
      "code": "invalid_type",
      "path": [
        "items",
        1,
        "title"
      ],
      "message": "Invalid input: expected string, received undefined"
    },
    {
      "expected": "string",
      "code": "invalid_type",
      "path": [
        "items",
        1,
        "body"
      ],
      "message": "Invalid input: expected string, received undefined"
    },
    {
      "expected": "string",
      "code": "invalid_type",
      "path": [
        "items",
        2,
        "title"
      ],
      "message": "Invalid input: expected string, received undefined"
    },
    {
      "expected": "string",
      "code": "invalid_type",
      "path": [
        "items",
        2,
        "body"
      ],
      "message": "Invalid input: expected string, received undefined"
    }
  ],
  "usage": {
    "provider": "groq",
    "text": "{\n  \"heading\": \"Dental Services\",\n   \"items\": [\n      {\"name\": \"Check-ups\", \"description\": \"Regular dental check-ups\"},\n      {\"name\": \"Root Canals\", \"description\": \"Treatment for infected teeth\"},\n      {\"name\": \"Braces\", \"description\": \"Teeth straightening and alignment\"}\n   ]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 260,
    "outputTokens": 72,
    "latencyMs": 278
  }
}
```

### Recipe

hero (required) — Introduction to the clinic
about (required) — Clinic history and mission
services (required) — List of dental services offered
team (required) — Meet the dentists and staff
testimonials — Patient reviews and testimonials
faq — Frequently asked questions
contact (required) — Get in touch with the clinic

### Art direction

theme **clinical-blue** · motion **calm** · corners **soft** · spacing **default** · imagery **bright-clean**

### Sections (6)

1. `hero` / `minimal` — Introduction to the family dental clinic in Koramangala
2. `about` / `text` — Clinic history and mission statement
3. `services` / `cards` — List of dental services offered, including check-ups, root canals, and braces
4. `team` / `grid` — Meet the dentists and staff at the clinic
5. `contact` / `simple` — Get in touch with the clinic to book an appointment
6. `testimonials` / `quotes` — Patient reviews and testimonials about their experience at the clinic
