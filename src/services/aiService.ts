import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Fetches delivery information for a retailer in a specific country using OpenAI
 */
export const fetchRetailerDeliveryInfo = async (
  retailerName: string,
  countryName: string,
  countryCode?: string,
  currency?: string
): Promise<RetailerDeliveryInfo> => {
  const requestStartTime = Date.now();
  const currencyInfo = currency ? ` in ${currency}` : '';
  console.log(`\n🤖 [AI Service] Fetching delivery info for: ${retailerName} → ${countryName}${countryCode ? ` (${countryCode})` : ''}${currencyInfo}`);

  if (!process.env.OPENAI_API_KEY) {
    console.error(`❌ [AI Service] OPENAI_API_KEY not configured`);
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  console.log(`   Model: ${model}`);
  if (currency) {
    console.log(`   Currency: ${currency}`);
  }

  const currencyInstruction = currency 
    ? `IMPORTANT: All prices MUST be provided in ${currency} currency. Use the appropriate currency symbol for ${currency}.`
    : 'Use the retailer\'s default currency for the destination country.';
  
  const prompt = `You are a shipping and delivery information expert. Provide accurate delivery information for ${retailerName} shipping to ${countryName}${countryCode ? ` (${countryCode})` : ''}.

${currencyInstruction}

Please provide delivery information in the following JSON format:
{
  "retailerName": "${retailerName}",
  "countryName": "${countryName}",
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
- Provide realistic, current delivery information based on common practices
- Include multiple shipping methods if available (Standard, Express, Overnight, etc.)
- ${currency ? `Use ${currency} currency for all prices` : 'Use the appropriate currency for the destination country'}
- Use actual currency symbols and realistic costs
- Provide realistic delivery timeframes
- Include free shipping thresholds if applicable (use the same currency)
- If information is not available or uncertain, indicate this in additionalNotes
- Return ONLY valid JSON, no additional text or markdown formatting
- If the retailer doesn't ship to this country, return an empty methods array with a note in additionalNotes

Return the JSON response now:`;

  try {
    console.log(`   📤 Sending request to OpenAI...`);
    const apiStartTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that provides accurate shipping and delivery information. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual responses
      response_format: { type: 'json_object' },
    });

    const apiTime = Date.now() - apiStartTime;
    console.log(`   ✅ Received response from OpenAI in ${apiTime}ms`);
    console.log(`   📊 Tokens used: ${completion.usage?.total_tokens || 'N/A'} (prompt: ${completion.usage?.prompt_tokens || 'N/A'}, completion: ${completion.usage?.completion_tokens || 'N/A'})`);

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      console.error(`   ❌ No response content from OpenAI`);
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    console.log(`   🔄 Parsing JSON response...`);
    const parsedResponse = JSON.parse(responseContent);
    
    // Validate and structure the response
    const deliveryInfo: RetailerDeliveryInfo = {
      retailerName: parsedResponse.retailerName || retailerName,
      countryName: parsedResponse.countryName || countryName,
      sourceUrl: parsedResponse.sourceUrl || undefined,
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
    console.log(`   ✅ Successfully processed ${deliveryInfo.methods.length} delivery method(s)`);
    console.log(`   ⏱️  Total time: ${totalTime}ms`);
    
    // Log methods summary
    deliveryInfo.methods.forEach((method, idx) => {
      console.log(`      ${idx + 1}. ${method.method}: ${method.cost} (${method.duration})`);
    });

    return deliveryInfo;
  } catch (error) {
    const totalTime = Date.now() - requestStartTime;
    console.error(`   ❌ [AI Service] Error after ${totalTime}ms:`, error);
    console.error(`   Error details:`, error instanceof Error ? error.message : String(error));
    
    // Return a fallback response with error information
    console.log(`   ⚠️  Returning fallback response`);
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
  currency?: string
): Promise<RetailerDeliveryInfo[]> => {
  const parallelStartTime = Date.now();
  console.log(`\n🚀 [AI Service] Starting parallel fetch for ${retailerNames.length} retailer(s)`);
  console.log(`   Retailers: ${retailerNames.join(', ')}`);
  console.log(`   Country: ${countryName}${countryCode ? ` (${countryCode})` : ''}`);
  if (currency) {
    console.log(`   Currency: ${currency}`);
  }
  
  // Fetch all retailers in parallel for better performance
  const promises = retailerNames.map((retailerName, index) => {
    console.log(`   Queueing request ${index + 1}/${retailerNames.length}: ${retailerName}`);
    return fetchRetailerDeliveryInfo(retailerName, countryName, countryCode, currency);
  });

  console.log(`   ⏳ Waiting for all ${retailerNames.length} AI requests to complete...`);
  const results = await Promise.all(promises);
  
  const parallelTime = Date.now() - parallelStartTime;
  console.log(`✅ [AI Service] All ${results.length} requests completed in ${parallelTime}ms`);
  console.log(`   Average time per retailer: ${Math.round(parallelTime / retailerNames.length)}ms\n`);

  return results;
};
