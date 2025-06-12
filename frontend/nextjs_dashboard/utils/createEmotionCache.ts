/**
 * Emotion cache creation utility for TalentTriage
 * 
 * This utility creates a client-side emotion cache for styling with MUI.
 */
import createCache from '@emotion/cache';

/**
 * Creates a client-side emotion cache
 * @returns Emotion cache instance
 */
export default function createEmotionCache() {
  return createCache({ key: 'css', prepend: true });
}
