export const TIER_SIZES = {
  fast: 10,
  standard: 24,
  smart: 38,
  power: 49,
  ultra: 55
}

export const ULTRAPLINIAN_MODELS = [
  // ⚡ FAST TIER (models 1-10)
  'google/gemini-2.5-flash',
  'deepseek/deepseek-chat',
  'perplexity/sonar',
  'meta-llama/llama-3.1-8b-instruct',
  'moonshotai/kimi-k2.5',
  'x-ai/grok-code-fast-1',
  'xiaomi/mimo-v2-flash',
  'openai/gpt-oss-20b',
  'stepfun/step-3.5-flash',
  'nvidia/nemotron-3-nano-30b-a3b',

  // 🎯 STANDARD TIER (models 11-24)
  'anthropic/claude-3.5-sonnet',
  'meta-llama/llama-4-scout',
  'deepseek/deepseek-v3.2',
  'nousresearch/hermes-3-llama-3.1-70b',
  'openai/gpt-4o',
  'google/gemini-2.5-pro',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-sonnet-4.6',
  'mistralai/mixtral-8x22b-instruct',
  'meta-llama/llama-3.3-70b-instruct',
  'qwen/qwen-2.5-72b-instruct',
  'nousresearch/hermes-4-70b',
  'z-ai/glm-5-turbo',
  'mistralai/mistral-medium-3.1',

  // 🧠 SMART TIER (models 25-38)
  'google/gemma-3-27b-it',
  'openai/gpt-5',
  'openai/gpt-5.4-chat',
  'qwen/qwen3.5-plus-02-15',
  'z-ai/glm-5',
  'openai/gpt-5.2',
  'google/gemini-3-pro-preview',
  'google/gemini-3.1-pro-preview',
  'anthropic/claude-opus-4.6',
  'openai/gpt-oss-120b',
  'deepseek/deepseek-r1',
  'nvidia/nemotron-3-super-120b-a12b',
  'meta-llama/llama-3.1-405b-instruct',
  'nousresearch/hermes-4-405b',

  // ⚔️ POWER TIER (models 39-49)
  'nousresearch/hermes-3-llama-3.1-405b',
  'x-ai/grok-4',
  'z-ai/glm-4.7',
  'meta-llama/llama-4-maverick',
  'qwen/qwen3-235b-a22b',
  'qwen/qwen3-coder',
  'minimax/minimax-m2.5',
  'xiaomi/mimo-v2-pro',
  'mistralai/mistral-large-2512',
  'google/gemini-3-flash-preview',
  'moonshotai/kimi-k2',

  // 🔱 ULTRA TIER (models 50-55)
  'x-ai/grok-4-fast',
  'x-ai/grok-4.1-fast',
  'anthropic/claude-opus-4',
  'qwen/qwen-2.5-coder-32b-instruct',
  'qwen/qwq-32b',
  'mistralai/codestral-2508'
]

export const getModelsForTier = (tier: string): string[] => {
  switch (tier) {
    case 'fast':
      return ULTRAPLINIAN_MODELS.slice(0, TIER_SIZES.fast)
    case 'standard':
      return ULTRAPLINIAN_MODELS.slice(0, TIER_SIZES.standard)
    case 'smart':
      return ULTRAPLINIAN_MODELS.slice(0, TIER_SIZES.smart)
    case 'power':
      return ULTRAPLINIAN_MODELS.slice(0, TIER_SIZES.power)
    case 'ultra':
      return ULTRAPLINIAN_MODELS.slice(0, TIER_SIZES.ultra)
    default:
      return ULTRAPLINIAN_MODELS.slice(0, TIER_SIZES.standard)
  }
}

export const getModelDisplayName = (id: string): string => {
  const slug = id.split('/').pop() || id
  return slug
    .replace(/-instruct$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b[a-z]/g, c => c.toUpperCase())
    .replace(/(\d+)b\b/gi, '$1B')
    .replace(/\bA(\d)/g, 'A$1')
}
