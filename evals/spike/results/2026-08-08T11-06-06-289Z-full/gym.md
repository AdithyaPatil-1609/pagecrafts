# gym

> bold loud page for a boutique gym, big pictures, class packages and pricing, open till 11pm

**Template exists:** yes · **Mode:** full · **Requests:** 2 · **Model time:** 1.3s · **Wall clock:** 1.3s

## FAILED

```
profile(gym): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\": [\n       {\"section\": \"hero\", \"required\": true, \"note\": \"introduction to the gym\"},\n       {\"section\": \"about\", \"required\": true, \"note\": \"gym history and mission\"},\n       {\"section\": \"services\", \"required\": true, \"note\": \"types of workouts and training\"},\n       {\"section\": \"team\", \"optional\": true, \"note\": \"personal trainer profiles\"},\n       {\"section\": \"testimonials\", \"optional\": true, \"note\": \"member success stories\"},\n       {\"section\": \"faq\", \"optional\": true, \"note\": \"common questions about the gym\"},\n       {\"section\": \"contact\", \"required\": true, \"note\": \"membership and visit information\"},\n       {\"section\": \"footer\", \"required\": true, \"note\": \"copyright and social media links\"}\n   ],\n   \"artDirection\": {\n       \"theme\": \"vivid-energy\",\n       \"motion\": \"kinetic\",\n       \"cornerStyle\": \"sharp\",\n       \"spacing\": \"default\",\n       \"photography\": \"bold-contrast\"\n   },\n   \"vocabulary\": {\n       \"customer\": \"member\",\n       \"purchase\": \"membership\"\n   },\n   \"imageQueries\": [\n       \"people lifting weights in a gym\",\n       \"group fitness class in action\",\n       \"person running on a treadmill\"\n   ],\n   \"aliases\": [\"fitness center\", \"workout studio\", \"athletic club\"]\n}",
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
    "text": "{\n  \"recipe\": [\n       {\"section\": \"hero\", \"required\": true, \"note\": \"introduction to the gym\"},\n       {\"section\": \"about\", \"required\": true, \"note\": \"gym history and mission\"},\n       {\"section\": \"services\", \"required\": true, \"note\": \"types of workouts and training\"},\n       {\"section\": \"team\", \"optional\": true, \"note\": \"personal trainer profiles\"},\n       {\"section\": \"testimonials\", \"optional\": true, \"note\": \"member success stories\"},\n       {\"section\": \"faq\", \"optional\": true, \"note\": \"common questions about the gym\"},\n       {\"section\": \"contact\", \"required\": true, \"note\": \"membership and visit information\"},\n       {\"section\": \"footer\", \"required\": true, \"note\": \"copyright and social media links\"}\n   ],\n   \"artDirection\": {\n       \"theme\": \"vivid-energy\",\n       \"motion\": \"kinetic\",\n       \"cornerStyle\": \"sharp\",\n       \"spacing\": \"default\",\n       \"photography\": \"bold-contrast\"\n   },\n   \"vocabulary\": {\n       \"customer\": \"member\",\n       \"purchase\": \"membership\"\n   },\n   \"imageQueries\": [\n       \"people lifting weights in a gym\",\n       \"group fitness class in action\",\n       \"person running on a treadmill\"\n   ],\n   \"aliases\": [\"fitness center\", \"workout studio\", \"athletic club\"]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 383,
    "outputTokens": 304,
    "latencyMs": 1111
  }
}
```
