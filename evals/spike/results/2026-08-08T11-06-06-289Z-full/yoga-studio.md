# yoga-studio

> calm simple page for my yoga studio, class timings, a bit about me and how to reach the place

**Template exists:** **no** · **Mode:** full · **Requests:** 2 · **Model time:** 1.4s · **Wall clock:** 1.4s

## FAILED

```
profile(yoga-studio): model output failed validation
```

### Detail

```json
{
  "raw": "{\n  \"recipe\": [\n       {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the studio and its offerings\"},\n       {\"section\": \"about\", \"required\": true, \"note\": \"Studio history, mission, and philosophy\"},\n       {\"section\": \"services\", \"required\": true, \"note\": \"Class schedules, workshops, and private sessions\"},\n       {\"section\": \"gallery\", \"optional\": true, \"note\": \"Photos of the studio, classes, and events\"},\n       {\"section\": \"team\", \"optional\": true, \"note\": \"Instructor profiles and bios\"},\n       {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Student reviews and testimonials\"},\n       {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions about the studio and classes\"},\n       {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information, including address, phone number, and email\"},\n       {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright information, social media links, and other secondary content\"}\n   ],\n   \"artDirection\": {\n       \"theme\": \"calm-sage\",\n       \"motion\": \"calm\",\n       \"cornerStyle\": \"soft\",\n       \"spacing\": \"airy\",\n       \"photography\": \"warm-natural\"\n   },\n   \"vocabulary\": {\n       \"customer\": \"student\",\n       \"purchase\": \"class\"\n   },\n   \"imageQueries\": [\n       \"yoga class in a serene outdoor setting\",\n       \"students practicing yoga in a studio with natural light\",\n       \"yoga instructor assisting a student in a tranquil atmosphere\"\n   ],\n   \"aliases\": [\"yoga center\", \"yoga school\"]\n}",
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
      "expected": "boolean",
      "code": "invalid_type",
      "path": [
        "recipe",
        6,
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
        7,
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
        8,
        "type"
      ],
      "message": "Invalid option: expected one of \"hero\"|\"about\"|\"services\"|\"menu\"|\"gallery\"|\"team\"|\"testimonials\"|\"faq\"|\"contact\"|\"footer\""
    }
  ],
  "usage": {
    "provider": "groq",
    "text": "{\n  \"recipe\": [\n       {\"section\": \"hero\", \"required\": true, \"note\": \"Introduction to the studio and its offerings\"},\n       {\"section\": \"about\", \"required\": true, \"note\": \"Studio history, mission, and philosophy\"},\n       {\"section\": \"services\", \"required\": true, \"note\": \"Class schedules, workshops, and private sessions\"},\n       {\"section\": \"gallery\", \"optional\": true, \"note\": \"Photos of the studio, classes, and events\"},\n       {\"section\": \"team\", \"optional\": true, \"note\": \"Instructor profiles and bios\"},\n       {\"section\": \"testimonials\", \"optional\": true, \"note\": \"Student reviews and testimonials\"},\n       {\"section\": \"faq\", \"optional\": true, \"note\": \"Frequently asked questions about the studio and classes\"},\n       {\"section\": \"contact\", \"required\": true, \"note\": \"Contact information, including address, phone number, and email\"},\n       {\"section\": \"footer\", \"required\": true, \"note\": \"Copyright information, social media links, and other secondary content\"}\n   ],\n   \"artDirection\": {\n       \"theme\": \"calm-sage\",\n       \"motion\": \"calm\",\n       \"cornerStyle\": \"soft\",\n       \"spacing\": \"airy\",\n       \"photography\": \"warm-natural\"\n   },\n   \"vocabulary\": {\n       \"customer\": \"student\",\n       \"purchase\": \"class\"\n   },\n   \"imageQueries\": [\n       \"yoga class in a serene outdoor setting\",\n       \"students practicing yoga in a studio with natural light\",\n       \"yoga instructor assisting a student in a tranquil atmosphere\"\n   ],\n   \"aliases\": [\"yoga center\", \"yoga school\"]\n}",
    "model": "llama-3.3-70b-versatile",
    "inputTokens": 385,
    "outputTokens": 365,
    "latencyMs": 1182
  }
}
```
