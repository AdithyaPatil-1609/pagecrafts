# unknown

> a website

**Template exists:** **no** · **Mode:** full · **Requests:** 2 · **Model time:** 1.2s · **Wall clock:** 1.2s

## FAILED

```
profile(unknown): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\": [\n       {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the business\"},\n       {\"section\": \"about\", \"required\": true, \"note\": \"Business description and mission\"},\n       {\"section\": \"services\", \"required\": true, \"note\": \"List of offered services\"},\n       {\"section\": \"gallery\", \"optional\": true, \"note\": \"Portfolio of previous work\"},\n       {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Customer reviews and feedback\"},\n       {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions\"},\n       {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information and form\"},\n       {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright and secondary links\"}\n   ],\n   \"artDirection\": {\n       \"theme\": \"calm-sage\",\n       \"motion\": \"calm\",\n       \"cornerStyle\": \"soft\",\n       \"spacing\": \"default\",\n       \"photography\": \"warm-natural\"\n   },\n   \"vocabulary\": {\n       \"customer\": \"client\",\n       \"purchase\": \"service\"\n   },\n   \"imageQueries\": [\n       \"professional team meeting\",\n       \"modern office interior\",\n       \"happy client testimonial\"\n   ],\n   \"aliases\": [\n       \"company\",\n       \"firm\",\n       \"organization\"\n   ]\n}",
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
      "expected": "boolean",
      "code": "invalid_type",
      "path": [
        "recipe",
        3,
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
    "text": "{\n  \"recipe\": [\n       {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the business\"},\n       {\"section\": \"about\", \"required\": true, \"note\": \"Business description and mission\"},\n       {\"section\": \"services\", \"required\": true, \"note\": \"List of offered services\"},\n       {\"section\": \"gallery\", \"optional\": true, \"note\": \"Portfolio of previous work\"},\n       {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Customer reviews and feedback\"},\n       {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions\"},\n       {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information and form\"},\n       {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright and secondary links\"}\n   ],\n   \"artDirection\": {\n       \"theme\": \"calm-sage\",\n       \"motion\": \"calm\",\n       \"cornerStyle\": \"soft\",\n       \"spacing\": \"default\",\n       \"photography\": \"warm-natural\"\n   },\n   \"vocabulary\": {\n       \"customer\": \"client\",\n       \"purchase\": \"service\"\n   },\n   \"imageQueries\": [\n       \"professional team meeting\",\n       \"modern office interior\",\n       \"happy client testimonial\"\n   ],\n   \"aliases\": [\n       \"company\",\n       \"firm\",\n       \"organization\"\n   ]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 383,
    "outputTokens": 297,
    "latencyMs": 859
  }
}
```
