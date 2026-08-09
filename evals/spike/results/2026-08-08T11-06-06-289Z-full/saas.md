# saas

> landing page for a tool that helps small shops track stock, clean and professional, pricing table

**Template exists:** yes · **Mode:** full · **Requests:** 2 · **Model time:** 1.4s · **Wall clock:** 1.4s

## FAILED

```
profile(saas): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\": [\n      {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the SaaS product\"},\n      {\"section\": \"about\", \"required\": true, \"note\": \"Company history and mission\"},\n      {\"section\": \"services\", \"required\": true, \"note\": \"Product features and benefits\"},\n      {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Customer reviews and success stories\"},\n      {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions about the product\"},\n      {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information and support\"},\n      {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright and terms of use\"}\n   ],\n   \"artDirection\": {\n      \"theme\": \"tech-slate\",\n      \"motion\": \"calm\",\n      \"cornerStyle\": \"sharp\",\n      \"spacing\": \"default\",\n      \"photography\": \"bright-clean\"\n   },\n   \"vocabulary\": {\n      \"customer\": \"user\",\n      \"purchase\": \"subscription\"\n   },\n   \"imageQueries\": [\n      \"people working on laptops\",\n      \"cloud computing infrastructure\",\n      \"software development team\"\n   ],\n   \"aliases\": [\n      \"cloud service\",\n      \"software as a service provider\",\n      \"online platform\"\n   ]\n}",
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
    }
  ],
  "usage": {
    "provider": "groq",
    "text": "{\n  \"recipe\": [\n      {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the SaaS product\"},\n      {\"section\": \"about\", \"required\": true, \"note\": \"Company history and mission\"},\n      {\"section\": \"services\", \"required\": true, \"note\": \"Product features and benefits\"},\n      {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Customer reviews and success stories\"},\n      {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions about the product\"},\n      {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information and support\"},\n      {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright and terms of use\"}\n   ],\n   \"artDirection\": {\n      \"theme\": \"tech-slate\",\n      \"motion\": \"calm\",\n      \"cornerStyle\": \"sharp\",\n      \"spacing\": \"default\",\n      \"photography\": \"bright-clean\"\n   },\n   \"vocabulary\": {\n      \"customer\": \"user\",\n      \"purchase\": \"subscription\"\n   },\n   \"imageQueries\": [\n      \"people working on laptops\",\n      \"cloud computing infrastructure\",\n      \"software development team\"\n   ],\n   \"aliases\": [\n      \"cloud service\",\n      \"software as a service provider\",\n      \"online platform\"\n   ]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 384,
    "outputTokens": 287,
    "latencyMs": 916
  }
}
```
