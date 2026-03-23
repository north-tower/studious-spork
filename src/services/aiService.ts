import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const isVerboseFetchLogsEnabled = (): boolean => process.env.VERBOSE_FETCH_LOGS === 'true';

const logVerbose = (traceId: string | undefined, message: string): void => {
  if (!isVerboseFetchLogsEnabled()) {
    return;
  }
  const prefix = traceId ? `[Trace ${traceId}] ` : '';
  console.log(`${prefix}${message}`);
};

export interface RetailerDeliveryInfo {
  retailerName: string;
  countryName: string;
  sourceUrl?: string; // URL where the delivery data was sourced from
  methods: {
    method: string;
    cost: string;
    duration: string;
    freeShippingThreshold?: string;
    carrier?: string;
    additionalNotes?: string;
  }[];
}

/**
 * Fetches delivery information for a retailer in a specific country using
 * Anthropic Claude with the web_search tool for live, up-to-date data.
 */
export const fetchRetailerDeliveryInfo = async (
  retailerName: string,
  countryName: string,
  countryCode?: string,
  currency?: string,
  traceId?: string
): Promise<RetailerDeliveryInfo> => {
  const requestStartTime = Date.now();
  const currencyInfo = currency ? ` in ${currency}` : '';
  const tracePrefix = traceId ? `[Trace ${traceId}] ` : '';
  console.log(`\n${tracePrefix}🤖 [AI Service] Fetching delivery info for: ${retailerName} → ${countryName}${countryCode ? ` (${countryCode})` : ''}${currencyInfo}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(`❌ [AI Service] ANTHROPIC_API_KEY not configured`);
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
  console.log(`${tracePrefix}   Model: ${model}`);
  if (currency) {
    console.log(`${tracePrefix}   Currency: ${currency}`);
  }

  const currencyInstruction = currency
    ? `IMPORTANT: All prices MUST be provided in ${currency} currency. Use the appropriate currency symbol for ${currency}.`
    : "Use the retailer's default currency for the destination country.";

  const prompt = `You are a shipping and delivery information expert. Search the web to find the current, accurate delivery information for ${retailerName} shipping to ${countryName}${countryCode ? ` (${countryCode})` : ''}.

${currencyInstruction}

Search for "${retailerName} delivery shipping to ${countryName}" and "${retailerName} shipping costs ${countryName}" to get up-to-date information.

After searching, provide the delivery information in the following JSON format (return ONLY valid JSON, no markdown, no extra text):
{
  "retailerName": "${retailerName}",
  "countryName": "${countryName}",
  "sourceUrl": "URL of the page where you found the shipping info",
  "methods": [
    {
      "method": "Standard Shipping",
      "cost": "$X.XX or FREE",
      "duration": "X-X business days",
      "freeShippingThreshold": "$XX.XX (if applicable)",
      "carrier": "Carrier name (if known)",
      "additionalNotes": "Any additional relevant information"
    }
  ]
}

Important guidelines:
- Search the web for the most current delivery information
- Include multiple shipping methods if available (Standard, Express, Overnight, etc.)
- ${currency ? `Use ${currency} currency for all prices` : 'Use the appropriate currency for the destination country'}
- Use actual currency symbols and realistic costs from the search results
- Include free shipping thresholds if applicable
- If the retailer doesn't ship to this country, return an empty methods array with a note in additionalNotes
- Return ONLY valid JSON`;

  try {
    logVerbose(traceId, `Prompt preview for ${retailerName}: ${prompt.slice(0, 300).replace(/\s+/g, ' ')}...`);
    console.log(`${tracePrefix}   📤 Sending request to Anthropic Claude with web search...`);
    const apiStartTime = Date.now();

    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        } as any,
      ],
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const apiTime = Date.now() - apiStartTime;
    console.log(`${tracePrefix}   ✅ Received response from Claude in ${apiTime}ms`);
    console.log(`${tracePrefix}   📊 Tokens used: ${response.usage?.input_tokens + response.usage?.output_tokens || 'N/A'} (input: ${response.usage?.input_tokens || 'N/A'}, output: ${response.usage?.output_tokens || 'N/A'})`);

    // Extract the final text response from Claude (the JSON block)
    let responseContent: string | undefined;
    let citedSourceUrl: string | undefined;

    for (const block of response.content) {
      if (block.type === 'text') {
        responseContent = block.text;
      }
      // Extract the first cited source URL from web search results
      if ((block as any).type === 'web_search_tool_result' && !citedSourceUrl) {
        const results = (block as any).content;
        if (Array.isArray(results) && results.length > 0) {
          citedSourceUrl = results[0]?.url;
        }
      }
    }

    if (!responseContent) {
      console.error(`${tracePrefix}   ❌ No text response from Claude`);
      throw new Error('No response from Anthropic Claude');
    }

    logVerbose(traceId, `Raw response for ${retailerName}: ${responseContent.slice(0, 800)}${responseContent.length > 800 ? '...' : ''}`);

    // Parse the JSON response — Claude sometimes adds preamble text before/after the JSON,
    // so we extract the first complete JSON object found in the response.
    console.log(`${tracePrefix}   🔄 Parsing JSON response...`);

    // 1. Strip markdown code fences if present
    let jsonText = responseContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    // 2. If the text doesn't start with '{', find the first '{' and last '}' to extract the JSON object
    if (!jsonText.startsWith('{')) {
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        jsonText = jsonText.slice(start, end + 1);
        console.log(`${tracePrefix}   ℹ️  Extracted JSON from position ${start} to ${end + 1} (Claude added preamble text)`);
      } else {
        console.error(`${tracePrefix}   ❌ Could not locate JSON object in Claude response`);
        throw new Error('Claude response did not contain a valid JSON object');
      }
    }

    const parsedResponse = JSON.parse(jsonText);

    // Validate and structure the response
    const deliveryInfo: RetailerDeliveryInfo = {
      retailerName: parsedResponse.retailerName || retailerName,
      countryName: parsedResponse.countryName || countryName,
      sourceUrl: parsedResponse.sourceUrl || citedSourceUrl || undefined,
      methods: Array.isArray(parsedResponse.methods)
        ? parsedResponse.methods.map((method: any) => ({
            method: method.method || 'Standard Shipping',
            cost: method.cost || 'N/A',
            duration: method.duration || 'N/A',
            freeShippingThreshold: method.freeShippingThreshold,
            carrier: method.carrier,
            additionalNotes: method.additionalNotes,
          }))
        : [],
    };

    const totalTime = Date.now() - requestStartTime;
    console.log(`${tracePrefix}   ✅ Successfully processed ${deliveryInfo.methods.length} delivery method(s)`);
    console.log(`${tracePrefix}   🔗 Source URL: ${deliveryInfo.sourceUrl || 'none'}`);
    console.log(`${tracePrefix}   ⏱️  Total time: ${totalTime}ms`);

    deliveryInfo.methods.forEach((method, idx) => {
      console.log(`${tracePrefix}      ${idx + 1}. ${method.method}: ${method.cost} (${method.duration})`);
    });

    return deliveryInfo;
  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`${tracePrefix}   ❌ [AI Service] Error after ${totalTime}ms:`, error);
    console.error(`${tracePrefix}   Error details:`, error instanceof Error ? error.message : String(error));

    console.log(`${tracePrefix}   ⚠️  Returning fallback response`);
    return {
      retailerName,
      countryName,
      methods: [
        {
          method: 'Information Unavailable',
          cost: 'N/A',
          duration: 'N/A',
          additionalNotes: `Unable to fetch delivery information. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
};

/**
 * Fetches delivery information for multiple retailers in parallel
 */
export const fetchMultipleRetailersDeliveryInfo = async (
  retailerNames: string[],
  countryName: string,
  countryCode?: string,
  currency?: string,
  traceId?: string
): Promise<RetailerDeliveryInfo[]> => {
  const parallelStartTime = Date.now();
  const tracePrefix = traceId ? `[Trace ${traceId}] ` : '';
  console.log(`\n${tracePrefix}🚀 [AI Service] Starting parallel fetch for ${retailerNames.length} retailer(s)`);
  console.log(`${tracePrefix}   Retailers: ${retailerNames.join(', ')}`);
  console.log(`${tracePrefix}   Country: ${countryName}${countryCode ? ` (${countryCode})` : ''}`);
  if (currency) {
    console.log(`${tracePrefix}   Currency: ${currency}`);
  }

  // Fetch all retailers in parallel for better performance
  const promises = retailerNames.map((retailerName, index) => {
    console.log(`${tracePrefix}   Queueing request ${index + 1}/${retailerNames.length}: ${retailerName}`);
    return fetchRetailerDeliveryInfo(retailerName, countryName, countryCode, currency, traceId);
  });

  console.log(`${tracePrefix}   ⏳ Waiting for all ${retailerNames.length} Claude+WebSearch requests to complete...`);
  const results = await Promise.all(promises);

  const parallelTime = Date.now() - parallelStartTime;
  console.log(`${tracePrefix}✅ [AI Service] All ${results.length} requests completed in ${parallelTime}ms`);
  console.log(`${tracePrefix}   Average time per retailer: ${Math.round(parallelTime / retailerNames.length)}ms\n`);

  return results;
};
