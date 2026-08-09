# restaurant

> warm friendly site for my small south indian breakfast place in jayanagar, with the menu and timings

**Template exists:** yes · **Mode:** full · **Requests:** 2 · **Model time:** 18.1s · **Wall clock:** 42.7s

**Spend:** 2595 tokens · 0.0000c · 2 calls

## FAILED

```
all AI providers failed — groq: groq: request timed out | gemini: {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.5-flash\nPlease retry in 7.253607673s.","status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.Help","links":[{"description":"Learn more about Gemini API quotas","url":"https://ai.google.dev/gemini-api/docs/rate-limits"}]},{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests","quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier","quotaDimensions":{"location":"global","model":"gemini-3.5-flash"},"quotaValue":"20"}]},{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"7s"}]}}
```

### Detail

```json
{
  "failures": [
    "groq: groq: request timed out",
    "gemini: {\"error\":{\"code\":429,\"message\":\"You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.5-flash\\nPlease retry in 7.253607673s.\",\"status\":\"RESOURCE_EXHAUSTED\",\"details\":[{\"@type\":\"type.googleapis.com/google.rpc.Help\",\"links\":[{\"description\":\"Learn more about Gemini API quotas\",\"url\":\"https://ai.google.dev/gemini-api/docs/rate-limits\"}]},{\"@type\":\"type.googleapis.com/google.rpc.QuotaFailure\",\"violations\":[{\"quotaMetric\":\"generativelanguage.googleapis.com/generate_content_free_tier_requests\",\"quotaId\":\"GenerateRequestsPerDayPerProjectPerModel-FreeTier\",\"quotaDimensions\":{\"location\":\"global\",\"model\":\"gemini-3.5-flash\"},\"quotaValue\":\"20\"}]},{\"@type\":\"type.googleapis.com/google.rpc.RetryInfo\",\"retryDelay\":\"7s\"}]}}"
  ]
}
```

### Recipe

hero (required) — hero image with tagline
about — story of the restaurant
services — catering, private events
menu (required) — food and drink offerings
gallery — photos of dishes and space
testimonials — customer reviews
contact (required) — address, phone, reservation form
footer (required) — legal links and social icons

### Art direction

theme **sunlit-craft** · motion **showcase** · corners **soft** · spacing **airy** · imagery **warm-natural**
