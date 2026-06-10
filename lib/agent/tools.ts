export const tools = [
    {
      name: 'build_segment',
      description: 'Build a customer segment from natural language. Returns customer count, sample customers, and SQL WHERE clause.',
      input_schema: {
        type: 'object',
        properties: {
          nl_query: { type: 'string', description: 'Natural language segment description' },
          segment_name: { type: 'string', description: 'Short name for this segment' },
        },
        required: ['nl_query', 'segment_name'],
      },
    },
    {
      name: 'recommend_channel',
      description: 'Recommend best communication channel based on segment and goal.',
      input_schema: {
        type: 'object',
        properties: {
          campaign_goal: { type: 'string' },
          segment_size: { type: 'number' },
          avg_spend: { type: 'number' },
        },
        required: ['campaign_goal', 'segment_size', 'avg_spend'],
      },
    },
    {
      name: 'draft_messages',
      description: 'Generate personalized messages for each customer in the segment.',
      input_schema: {
        type: 'object',
        properties: {
          campaign_goal: { type: 'string' },
          channel: { type: 'string' },
          customers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                city: { type: 'string' },
                totalSpend: { type: 'number' },
                lastOrderAt: { type: 'string' },
              },
            },
          },
        },
        required: ['campaign_goal', 'channel', 'customers'],
      },
    },
    {
      name: 'create_campaign',
      description: 'Save campaign to database after marketer approval.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          goal_text: { type: 'string' },
          segment_id: { type: 'string' },
          channel: { type: 'string' },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                customerId: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
          ai_reasoning: { type: 'string' },
        },
        required: ['name', 'goal_text', 'segment_id', 'channel', 'messages', 'ai_reasoning'],
      },
    },
  ]