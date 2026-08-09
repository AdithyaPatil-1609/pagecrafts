# dental-clinic

> a website for my family dental clinic in koramangala, we do check-ups root canals and braces, people should be able to book an appointment

**Template exists:** **no** · **Mode:** plan-only · **Requests:** 2 · **Model time:** 1.4s · **Wall clock:** 1.4s

## FAILED

```
profile(dental-clinic): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\": [\n      {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the clinic and its services\"},\n      {\"section\": \"about\", \"required\": true, \"note\": \"Clinic history, mission, and values\"},\n      {\"section\": \"services\", \"required\": true, \"note\": \"List of dental services offered\"},\n      {\"section\": \"team\", \"required\": true, \"note\": \"Meet the dentists and staff\"},\n      {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Patient reviews and feedback\"},\n      {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions about dental care\"},\n      {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information and appointment scheduling\"},\n      {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright information, social media links, and footer content\"}\n   ],\n   \"artDirection\": {\n      \"theme\": \"clinical-blue\",\n      \"motion\": \"calm\",\n      \"cornerStyle\": \"sharp\",\n      \"spacing\": \"default\",\n      \"photography\": \"bright-clean\"\n   },\n   \"vocabulary\": {\n      \"customer\": \"patient\",\n      \"purchase\": \"appointment\",\n      \"services\": \"treatments\"\n   },\n   \"imageQueries\": [\n      \"smiling dentist with patient\",\n      \"modern dental equipment\",\n      \"clean and modern dental clinic waiting room\"\n   ],\n   \"aliases\": [\n      \"dental office\",\n      \"dental practice\",\n      \"orthodontic clinic\"\n   ]\n}",
  "issues": [
    {
      "expected": "string",
      "code": "invalid_type",
      "path": [
        "label"
      ],
      "message": "Invalid input: expected string, received undefined"
    },
    {
      "code": "invalid_value",
      "values": [
        "hero",
        "about",
        "services",
        "menu",
        "gallery",
        "team",
        "testimonials",
        "faq",
        "contact",
        "footer"
      ],
      "path": [
        "recipe",
        0,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    },
    {
      "code": "invalid_value",
      "values": [
        "hero",
        "about",
        "services",
        "menu",
        "gallery",
        "team",
        "testimonials",
        "faq",
        "contact",
        "footer"
      ],
      "path": [
        "recipe",
        1,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    },
    {
      "code": "invalid_value",
      "values": [
        "hero",
        "about",
        "services",
        "menu",
        "gallery",
        "team",
        "testimonials",
        "faq",
        "contact",
        "footer"
      ],
      "path": [
        "recipe",
        2,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    },
    {
      "code": "invalid_value",
      "values": [
        "hero",
        "about",
        "services",
        "menu",
        "gallery",
        "team",
        "testimonials",
        "faq",
        "contact",
        "footer"
      ],
      "path": [
        "recipe",
        3,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    },
    {
      "code": "invalid_value",
      "values": [
        "hero",
        "about",
        "services",
        "menu",
        "gallery",
        "team",
        "testimonials",
        "faq",
        "contact",
        "footer"
      ],
      "path": [
        "recipe",
        4,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    },
    {
      "expected": "boolean",
      "code": "invalid_type",
      "path": [
        "recipe",
        4,
        "required"
      ],
      "message": "Invalid input: expected boolean, received undefined"
    },
    {
      "code": "invalid_value",
      "values": [
        "hero",
        "about",
        "services",
        "menu",
        "gallery",
        "team",
        "testimonials",
        "faq",
        "contact",
        "footer"
      ],
      "path": [
        "recipe",
        5,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    },
    {
      "expected": "boolean",
      "code": "invalid_type",
      "path": [
        "recipe",
        5,
        "required"
      ],
      "message": "Invalid input: expected boolean, received undefined"
    },
    {
      "code": "invalid_value",
      "values": [
        "hero",
        "about",
        "services",
        "menu",
        "gallery",
        "team",
        "testimonials",
        "faq",
        "contact",
        "footer"
      ],
      "path": [
        "recipe",
        6,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    },
    {
      "code": "invalid_value",
      "values": [
        "hero",
        "about",
        "services",
        "menu",
        "gallery",
        "team",
        "testimonials",
        "faq",
        "contact",
        "footer"
      ],
      "path": [
        "recipe",
        7,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    }
  ],
  "usage": {
    "provider": "groq",
    "text": "{\n  \"recipe\": [\n      {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the clinic and its services\"},\n      {\"section\": \"about\", \"required\": true, \"note\": \"Clinic history, mission, and values\"},\n      {\"section\": \"services\", \"required\": true, \"note\": \"List of dental services offered\"},\n      {\"section\": \"team\", \"required\": true, \"note\": \"Meet the dentists and staff\"},\n      {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Patient reviews and feedback\"},\n      {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions about dental care\"},\n      {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information and appointment scheduling\"},\n      {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright information, social media links, and footer content\"}\n   ],\n   \"artDirection\": {\n      \"theme\": \"clinical-blue\",\n      \"motion\": \"calm\",\n      \"cornerStyle\": \"sharp\",\n      \"spacing\": \"default\",\n      \"photography\": \"bright-clean\"\n   },\n   \"vocabulary\": {\n      \"customer\": \"patient\",\n      \"purchase\": \"appointment\",\n      \"services\": \"treatments\"\n   },\n   \"imageQueries\": [\n      \"smiling dentist with patient\",\n      \"modern dental equipment\",\n      \"clean and modern dental clinic waiting room\"\n   ],\n   \"aliases\": [\n      \"dental office\",\n      \"dental practice\",\n      \"orthodontic clinic\"\n   ]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 385,
    "outputTokens": 335,
    "latencyMs": 1082
  }
}
```
