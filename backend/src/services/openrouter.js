const axios = require('axios');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

class OpenRouterService {
  getApiKey() {
    return process.env.OPENROUTER_API_KEY;
  }

  getModel() {
    return process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';
  }

  async chat(messages, options = {}) {
    const apiKey = this.getApiKey();
    const model = this.getModel();

    if (!apiKey) {
      console.warn('OpenRouter API key not configured');
      throw new Error('OpenRouter API key not configured');
    }

    console.log(`OpenRouter request: model=${model}, messages=${messages.length}`);

    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model,
          messages,
          max_tokens: options.maxTokens || 1024,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Food Truck AI Platform'
          },
          timeout: 30000
        }
      );

      console.log('OpenRouter response received');
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenRouter API error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateLocationRecommendation(locationHistory, truckName) {
    const prompt = `You are an AI assistant for a food truck business called "${truckName}".
Based on the following location performance data, provide a brief recommendation for where to operate next.

Location History:
${locationHistory.map(l => `- ${l.location?.name}: ${l.visits} visits, $${l.totalRevenue.toFixed(2)} total revenue, avg $${l.averageRevenue.toFixed(2)}/visit`).join('\n')}

Provide a concise recommendation (2-3 sentences) about which location(s) to prioritize and why.`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    return response;
  }

  async generateDemandForecast(topItems, dayOfWeek, truckName) {
    const prompt = `You are an AI assistant for a food truck business called "${truckName}".
Based on historical sales data, provide prep quantity recommendations for ${dayOfWeek}.

Top selling items:
${topItems.map(i => `- ${i.item}: typically sells ${i.predictedQuantity} units`).join('\n')}

Provide brief, actionable prep recommendations (2-3 sentences) for tomorrow's service.`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    return response;
  }

  async generateMenuInsights(menuData, truckName) {
    const prompt = `You are an AI assistant for a food truck business called "${truckName}".
Analyze this menu performance data and provide optimization suggestions.

Star items (high popularity, high profit): ${menuData.stars?.map(i => i.name).join(', ') || 'None'}
Underperformers (low sales): ${menuData.dogs?.map(i => i.name).join(', ') || 'None'}

Provide 2-3 specific, actionable recommendations for menu optimization.`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    return response;
  }

  async generateSocialPost(type, context, truckName) {
    const prompts = {
      LOCATION_ANNOUNCEMENT: `Create a fun, engaging social media post for food truck "${truckName}" announcing they'll be at ${context.locationName} on ${context.date} from ${context.startTime} to ${context.endTime}. Include emojis. Keep it under 200 characters.`,
      DAILY_MENU: `Create an appetizing social media post for food truck "${truckName}" featuring today's menu items: ${context.items?.join(', ')}. Include emojis and make it mouth-watering. Keep it under 250 characters.`,
      SPECIAL_PROMOTION: `Create an exciting promotional social media post for food truck "${truckName}" about: ${context.special}. Create urgency and include emojis. Keep it under 200 characters.`,
      CUSTOMER_ENGAGEMENT: `Create a friendly, engaging social media post for food truck "${truckName}" to connect with customers. Ask a question or share something fun. Include emojis. Keep it under 200 characters.`
    };

    const response = await this.chat([
      { role: 'user', content: prompts[type] || prompts.CUSTOMER_ENGAGEMENT }
    ]);

    return response;
  }

  async generateWeatherRecommendation(weatherCondition, truckName) {
    const prompt = `You are an AI assistant for food truck "${truckName}".
The weather forecast shows: ${weatherCondition}

Provide a brief recommendation (2-3 sentences) on how to adjust operations, prep quantities, and menu focus based on this weather.`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    return response;
  }

  async generateCustomerEngagementResponse(customerMessage, truckName) {
    const prompt = `You are a friendly social media manager for food truck "${truckName}".
A customer wrote: "${customerMessage}"

Write a brief, warm, and professional response (1-2 sentences). Be friendly and include an emoji.`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    return response;
  }

  async generateEnhancedDemandForecast(data, truckName) {
    const { date, dayOfWeek, location, weather, historicalData, topItems } = data;

    const prompt = `You are an AI demand forecaster for food truck "${truckName}".
Generate a detailed demand prediction based on the following data:

Date: ${date} (${dayOfWeek})
Location: ${location.name}, ${location.city}

Weather Forecast:
- Temperature: ${weather.temperature}°F
- Conditions: ${weather.conditions}
- Weather Impact Factor: ${weather.factor}x (1.0 = normal, >1 = better, <1 = worse)

Historical Performance at this Location:
${historicalData.map(h => `- ${h.dayOfWeek}: ${h.customerCount} customers, $${h.revenue.toFixed(2)} revenue`).join('\n')}

Top Selling Items:
${topItems.map(i => `- ${i.name}: ${i.avgQuantity} units/day, $${i.revenue.toFixed(2)}/day`).join('\n')}

Based on this data, provide a JSON response with:
{
  "predictedCustomers": number,
  "predictedRevenue": number,
  "confidence": number (0-1),
  "prepRecommendations": [{ "item": string, "quantity": number, "reason": string }],
  "insights": string,
  "riskFactors": [string]
}`;

    try {
      const response = await this.chat([
        { role: 'user', content: prompt }
      ], { temperature: 0.3 });

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback response
      return {
        predictedCustomers: Math.round(50 * (weather.factor || 1)),
        predictedRevenue: Math.round(500 * (weather.factor || 1)),
        confidence: 0.6,
        prepRecommendations: [],
        insights: response,
        riskFactors: []
      };
    } catch (error) {
      console.error('Enhanced forecast error:', error);
      return {
        predictedCustomers: 50,
        predictedRevenue: 500,
        confidence: 0.5,
        prepRecommendations: [],
        insights: 'Unable to generate detailed forecast',
        riskFactors: ['API error']
      };
    }
  }

  async analyzeDemandPatterns(historicalData, truckName) {
    const prompt = `You are a data analyst for food truck "${truckName}".
Analyze the following historical performance data and identify patterns:

${JSON.stringify(historicalData, null, 2)}

Provide a JSON response with:
{
  "bestDays": [{ "day": string, "avgRevenue": number, "reason": string }],
  "worstDays": [{ "day": string, "avgRevenue": number, "reason": string }],
  "peakHours": [{ "hour": number, "avgCustomers": number }],
  "weatherImpact": { "clearDay": number, "rainyDay": number, "coldDay": number },
  "trends": [string],
  "recommendations": [string]
}`;

    try {
      const response = await this.chat([
        { role: 'user', content: prompt }
      ], { temperature: 0.3 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { analysis: response };
    } catch (error) {
      console.error('Pattern analysis error:', error);
      return { error: 'Unable to analyze patterns' };
    }
  }

  async generateWeatherAwarePrediction(weather, location, dayOfWeek, truckName) {
    const prompt = `You are an AI assistant for food truck "${truckName}".
Generate a quick demand prediction for:
- Location: ${location.name}
- Day: ${dayOfWeek}
- Weather: ${weather.temperature}°F, ${weather.conditions}

In 2-3 sentences, predict customer turnout and provide actionable prep advice.`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    return response;
  }
}

module.exports = new OpenRouterService();
