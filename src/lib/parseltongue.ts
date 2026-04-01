export type ObfuscationTechnique = 'light' | 'medium' | 'heavy' | 'leetspeak' | 'base64' | 'rot13' | 'emoji';

export const DEFAULT_TRIGGERS = [
  'jailbreak',
  'bypass',
  'filter',
  'restrict',
  'refuse',
  'ethical',
  'standard',
  'policy',
  'assistant',
  'safety',
  'guideline',
  'instruction'
];

export const getAvailableTechniques = () => [
  { id: 'light', name: 'Light', description: 'Minimal synonym replacement' },
  { id: 'medium', name: 'Medium', description: 'Moderate character scrambling' },
  { id: 'heavy', name: 'Heavy', description: 'Cryptic and complex transformations' },
  { id: 'leetspeak', name: 'L33t5p34k', description: 'H4ck3r-5p34k encoding' },
  { id: 'base64', name: 'Base64', description: 'Standard base64 message encoding' },
  { id: 'rot13', name: 'ROT13', description: 'Classic caesar cipher rotation' },
  { id: 'emoji', name: 'Emoji Cipher', description: 'Replaces words with cryptic emoji strings' }
];

export const detectTriggers = (text: string, custom: string[] = []): string[] => {
  const allTriggers = [...DEFAULT_TRIGGERS, ...custom];
  const lowercaseText = text.toLowerCase();
  return allTriggers.filter(trigger => lowercaseText.includes(trigger.toLowerCase()));
};

export const applyParseltongue = (text: string, config: { enabled: boolean; technique: string; intensity: string; customTriggers: string[] }) => {
  if (!config.enabled) return { transformedText: text, triggersFound: [] };
  
  const triggersFound = detectTriggers(text, config.customTriggers);
  if (triggersFound.length === 0) return { transformedText: text, triggersFound: [] };

  // Simple placeholder transformation for now
  let transformedText = text;
  triggersFound.forEach(trigger => {
    const regex = new RegExp(trigger, 'gi');
    transformedText = transformedText.replace(regex, (match) => {
      // Mock transformation: just wrap in brackets or something
      return `[${match}]`;
    });
  });

  return { transformedText, triggersFound };
};

