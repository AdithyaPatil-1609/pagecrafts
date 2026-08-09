# interior-design

> site for Priya Ramanathan, freelance interior designer, formal tone, gallery of past work and an enquiry form

**Template exists:** **no** · **Mode:** full · **Requests:** 2 · **Model time:** 1.1s · **Wall clock:** 1.1s

## FAILED

```
profile(interior-design): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\": [\n      {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the design firm\"},\n      {\"section\": \"about\", \"required\": true, \"note\": \"Company history and mission\"},\n      {\"section\": \"services\", \"required\": true, \"note\": \"List of design services offered\"},\n      {\"section\": \"gallery\", \"required\": true, \"note\": \"Portfolio of completed projects\"},\n      {\"section\": \"team\", \"optional\": true, \"note\": \"Meet the designers and staff\"},\n      {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Client reviews and feedback\"},\n      {\"section\": \"contact\", \"required\": true, \"note\": \"Get in touch with the firm\"},\n      {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright and social media links\"}\n   ],\n   \"artDirection\": {\n      \"theme\": \"warm-editorial\",\n      \"motion\": \"calm\",\n      \"cornerStyle\": \"soft\",\n      \"spacing\": \"airy\",\n      \"photography\": \"warm-natural\"\n   },\n   \"vocabulary\": {\n      \"customer\": \"client\",\n      \"purchase\": \"project\"\n   },\n   \"imageQueries\": [\n      \"luxury living room interior\",\n      \"modern kitchen design ideas\",\n      \"cozy bedroom decor inspiration\"\n   ],\n   \"aliases\": [\n      \"design studio\",\n      \"interior decorating firm\",\n      \"home staging company\"\n   ]\n}",
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
    "text": "{\n  \"recipe\": [\n      {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the design firm\"},\n      {\"section\": \"about\", \"required\": true, \"note\": \"Company history and mission\"},\n      {\"section\": \"services\", \"required\": true, \"note\": \"List of design services offered\"},\n      {\"section\": \"gallery\", \"required\": true, \"note\": \"Portfolio of completed projects\"},\n      {\"section\": \"team\", \"optional\": true, \"note\": \"Meet the designers and staff\"},\n      {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Client reviews and feedback\"},\n      {\"section\": \"contact\", \"required\": true, \"note\": \"Get in touch with the firm\"},\n      {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright and social media links\"}\n   ],\n   \"artDirection\": {\n      \"theme\": \"warm-editorial\",\n      \"motion\": \"calm\",\n      \"cornerStyle\": \"soft\",\n      \"spacing\": \"airy\",\n      \"photography\": \"warm-natural\"\n   },\n   \"vocabulary\": {\n      \"customer\": \"client\",\n      \"purchase\": \"project\"\n   },\n   \"imageQueries\": [\n      \"luxury living room interior\",\n      \"modern kitchen design ideas\",\n      \"cozy bedroom decor inspiration\"\n   ],\n   \"aliases\": [\n      \"design studio\",\n      \"interior decorating firm\",\n      \"home staging company\"\n   ]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 384,
    "outputTokens": 312,
    "latencyMs": 884
  }
}
```
