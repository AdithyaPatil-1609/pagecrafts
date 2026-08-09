# law-firm

> site for a small law firm doing property and family matters, formal, needs our qualifications and years of practice

**Template exists:** **no** · **Mode:** full · **Requests:** 2 · **Model time:** 1.1s · **Wall clock:** 1.1s

## FAILED

```
profile(law-firm): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\": [\n      {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the law firm\"},\n      {\"section\": \"about\", \"required\": true, \"note\": \"Firm history and mission\"},\n      {\"section\": \"services\", \"required\": true, \"note\": \"List of practice areas\"},\n      {\"section\": \"team\", \"required\": true, \"note\": \"Attorney profiles\"},\n      {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Client reviews\"},\n      {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions\"},\n      {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information and form\"},\n      {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright and disclaimer\"}\n   ],\n   \"artDirection\": {\n      \"theme\": \"mono-precision\",\n      \"motion\": \"none\",\n      \"cornerStyle\": \"sharp\",\n      \"spacing\": \"default\",\n      \"photography\": \"bold-contrast\"\n   },\n   \"vocabulary\": {\n      \"customer\": \"client\",\n      \"purchase\": \"engagement\"\n   },\n   \"imageQueries\": [\n      \"professional law office interior\",\n      \"lawyers in a meeting\",\n      \"courtroom with a judge\"\n   ],\n   \"aliases\": [\n      \"legal practice\",\n      \"attorney's office\",\n      \"law office\"\n   ]\n}",
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
    "text": "{\n  \"recipe\": [\n      {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the law firm\"},\n      {\"section\": \"about\", \"required\": true, \"note\": \"Firm history and mission\"},\n      {\"section\": \"services\", \"required\": true, \"note\": \"List of practice areas\"},\n      {\"section\": \"team\", \"required\": true, \"note\": \"Attorney profiles\"},\n      {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Client reviews\"},\n      {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions\"},\n      {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information and form\"},\n      {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright and disclaimer\"}\n   ],\n   \"artDirection\": {\n      \"theme\": \"mono-precision\",\n      \"motion\": \"none\",\n      \"cornerStyle\": \"sharp\",\n      \"spacing\": \"default\",\n      \"photography\": \"bold-contrast\"\n   },\n   \"vocabulary\": {\n      \"customer\": \"client\",\n      \"purchase\": \"engagement\"\n   },\n   \"imageQueries\": [\n      \"professional law office interior\",\n      \"lawyers in a meeting\",\n      \"courtroom with a judge\"\n   ],\n   \"aliases\": [\n      \"legal practice\",\n      \"attorney's office\",\n      \"law office\"\n   ]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 385,
    "outputTokens": 303,
    "latencyMs": 889
  }
}
```
