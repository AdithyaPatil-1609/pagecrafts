# ngo

> page for our NGO that runs after school classes for kids, we need donations and volunteers to sign up

**Template exists:** **no** · **Mode:** full · **Requests:** 2 · **Model time:** 1.3s · **Wall clock:** 1.3s

## FAILED

```
profile(ngo): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\":[\n      {\"section\":\"hero\", \"required\":true, \"note\":\"Introduction to the NGO's mission\"},\n      {\"section\":\"about\", \"required\":true, \"note\":\"NGO's history, values, and goals\"},\n      {\"section\":\"services\", \"required\":true, \"note\":\"Description of services and programs offered\"},\n      {\"section\":\"gallery\", \"optional\":true, \"note\":\"Photos and videos of NGO's work and events\"},\n      {\"section\":\"testimonials\", \"optional\":true, \"note\":\"Quotes from beneficiaries, donors, or partners\"},\n      {\"section\":\"faq\", \"optional\":true, \"note\":\"Frequently asked questions about the NGO\"},\n      {\"section\":\"contact\", \"required\":true, \"note\":\"Contact information and donation details\"},\n      {\"section\":\"footer\", \"required\":true, \"note\":\"Copyright, social media links, and other secondary information\"}\n   ],\n   \"artDirection\":{\n      \"theme\":\"warm-editorial\",\n      \"motion\":\"calm\",\n      \"cornerStyle\":\"soft\",\n      \"spacing\":\"default\",\n      \"photography\":\"warm-natural\"\n   },\n   \"vocabulary\":{\n      \"customer\":\"beneficiary\",\n      \"purchase\":\"donation\"\n   },\n   \"imageQueries\":[\n      \"people helping people\",\n      \"volunteers in action\",\n      \"community development projects\"\n   ],\n   \"aliases\":[\n      \"non-profit\",\n      \"charity\",\n      \"community organization\"\n   ]\n}",
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
    "text": "{\n  \"recipe\":[\n      {\"section\":\"hero\", \"required\":true, \"note\":\"Introduction to the NGO's mission\"},\n      {\"section\":\"about\", \"required\":true, \"note\":\"NGO's history, values, and goals\"},\n      {\"section\":\"services\", \"required\":true, \"note\":\"Description of services and programs offered\"},\n      {\"section\":\"gallery\", \"optional\":true, \"note\":\"Photos and videos of NGO's work and events\"},\n      {\"section\":\"testimonials\", \"optional\":true, \"note\":\"Quotes from beneficiaries, donors, or partners\"},\n      {\"section\":\"faq\", \"optional\":true, \"note\":\"Frequently asked questions about the NGO\"},\n      {\"section\":\"contact\", \"required\":true, \"note\":\"Contact information and donation details\"},\n      {\"section\":\"footer\", \"required\":true, \"note\":\"Copyright, social media links, and other secondary information\"}\n   ],\n   \"artDirection\":{\n      \"theme\":\"warm-editorial\",\n      \"motion\":\"calm\",\n      \"cornerStyle\":\"soft\",\n      \"spacing\":\"default\",\n      \"photography\":\"warm-natural\"\n   },\n   \"vocabulary\":{\n      \"customer\":\"beneficiary\",\n      \"purchase\":\"donation\"\n   },\n   \"imageQueries\":[\n      \"people helping people\",\n      \"volunteers in action\",\n      \"community development projects\"\n   ],\n   \"aliases\":[\n      \"non-profit\",\n      \"charity\",\n      \"community organization\"\n   ]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 384,
    "outputTokens": 304,
    "latencyMs": 987
  }
}
```
