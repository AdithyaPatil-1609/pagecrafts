# dental-clinic

> a website for my family dental clinic in koramangala, we do check-ups root canals and braces, people should be able to book an appointment

**Template exists:** **no** · **Mode:** full · **Requests:** 3 · **Model time:** 3.1s · **Wall clock:** 3.1s

## FAILED

```
plan: model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"hero\": {\"variant\": \"minimal\", \"brief\": \"Introduction to the family dental clinic in Koramangala\"},\n   \"about\": {\"variant\": \"text\", \"brief\": \"Clinic history and mission statement\"},\n   \"services\": {\"variant\": \"cards\", \"brief\": \"List of dental services including check-ups, root canals, and braces\"},\n   \"team\": {\"variant\": \"cards\", \"brief\": \"Meet the dentists and staff at the clinic\"},\n   \"contact\": {\"variant\": \"simple\", \"brief\": \"Contact information and online appointment scheduling\"},\n   \"testimonials\": {\"variant\": \"quotes\", \"brief\": \"Patient reviews and testimonials about the clinic's services\"},\n   \"faq\": {\"variant\": \"accordion\", \"brief\": \"Frequently asked questions about the clinic and its services\"}\n}",
  "issues": [
    {
      "origin": "array",
      "code": "too_small",
      "minimum": 1,
      "inclusive": true,
      "path": [],
      "message": "Too small: expected array to have >=1 items"
    }
  ],
  "usage": {
    "provider": "groq",
    "text": "{\n  \"hero\": {\"variant\": \"minimal\", \"brief\": \"Introduction to the family dental clinic in Koramangala\"},\n   \"about\": {\"variant\": \"text\", \"brief\": \"Clinic history and mission statement\"},\n   \"services\": {\"variant\": \"cards\", \"brief\": \"List of dental services including check-ups, root canals, and braces\"},\n   \"team\": {\"variant\": \"cards\", \"brief\": \"Meet the dentists and staff at the clinic\"},\n   \"contact\": {\"variant\": \"simple\", \"brief\": \"Contact information and online appointment scheduling\"},\n   \"testimonials\": {\"variant\": \"quotes\", \"brief\": \"Patient reviews and testimonials about the clinic's services\"},\n   \"faq\": {\"variant\": \"accordion\", \"brief\": \"Frequently asked questions about the clinic and its services\"}\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 529,
    "outputTokens": 173,
    "latencyMs": 527
  }
}
```

### Recipe

hero (required) — Introduction to the clinic
about (required) — Clinic history and mission
services (required) — List of dental services
team (required) — Meet the dentists and staff
testimonials — Patient reviews
faq — Frequently asked questions
contact (required) — Contact information and appointment scheduling

### Art direction

theme **clinical-blue** · motion **calm** · corners **soft** · spacing **default** · imagery **bright-clean**
