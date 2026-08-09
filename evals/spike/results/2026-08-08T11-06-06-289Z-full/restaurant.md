# restaurant

> warm friendly site for my small south indian breakfast place in jayanagar, with the menu and timings

**Template exists:** yes · **Mode:** full · **Requests:** 2 · **Model time:** 1.1s · **Wall clock:** 1.1s

## FAILED

```
profile(restaurant): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\": [\n       {\"section\": \"hero\", \"required\": true, \"note\": \"introduction to the restaurant\"},\n       {\"section\": \"about\", \"required\": true, \"note\": \"story of the restaurant and its mission\"},\n       {\"section\": \"menu\", \"required\": true, \"note\": \"list of dishes and prices\"},\n       {\"section\": \"gallery\", \"optional\": true, \"note\": \"photos of dishes and restaurant atmosphere\"},\n       {\"section\": \"team\", \"optional\": true, \"note\": \"introduction to the chefs and staff\"},\n       {\"section\": \"testimonials\", \"optional\": true, \"note\": \"customer reviews and ratings\"},\n       {\"section\": \"contact\", \"required\": true, \"note\": \"contact information and reservation details\"},\n       {\"section\": \"footer\", \"required\": true, \"note\": \"copyright and social media links\"}\n   ],\n   \"artDirection\": {\n       \"theme\": \"warm-editorial\",\n       \"motion\": \"calm\",\n       \"cornerStyle\": \"soft\",\n       \"spacing\": \"default\",\n       \"photography\": \"warm-natural\"\n   },\n   \"vocabulary\": {\n       \"customer\": \"diner\",\n       \"purchase\": \"order\"\n   },\n   \"imageQueries\": [\n       \"food photography\",\n       \"restaurant interior design\",\n       \"chef preparing dishes\"\n   ],\n   \"aliases\": [\n       \"bistro\",\n       \"cafe\",\n       \"eatery\"\n   ]\n}",
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
    "text": "{\n  \"recipe\": [\n       {\"section\": \"hero\", \"required\": true, \"note\": \"introduction to the restaurant\"},\n       {\"section\": \"about\", \"required\": true, \"note\": \"story of the restaurant and its mission\"},\n       {\"section\": \"menu\", \"required\": true, \"note\": \"list of dishes and prices\"},\n       {\"section\": \"gallery\", \"optional\": true, \"note\": \"photos of dishes and restaurant atmosphere\"},\n       {\"section\": \"team\", \"optional\": true, \"note\": \"introduction to the chefs and staff\"},\n       {\"section\": \"testimonials\", \"optional\": true, \"note\": \"customer reviews and ratings\"},\n       {\"section\": \"contact\", \"required\": true, \"note\": \"contact information and reservation details\"},\n       {\"section\": \"footer\", \"required\": true, \"note\": \"copyright and social media links\"}\n   ],\n   \"artDirection\": {\n       \"theme\": \"warm-editorial\",\n       \"motion\": \"calm\",\n       \"cornerStyle\": \"soft\",\n       \"spacing\": \"default\",\n       \"photography\": \"warm-natural\"\n   },\n   \"vocabulary\": {\n       \"customer\": \"diner\",\n       \"purchase\": \"order\"\n   },\n   \"imageQueries\": [\n       \"food photography\",\n       \"restaurant interior design\",\n       \"chef preparing dishes\"\n   ],\n   \"aliases\": [\n       \"bistro\",\n       \"cafe\",\n       \"eatery\"\n   ]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 383,
    "outputTokens": 310,
    "latencyMs": 890
  }
}
```
