/**
 * Feature Flags Configuration
 * 
 * Allows enabling/disabling features without code changes.
 * These can later be fetched remotely (e.g. LaunchDarkly).
 */
export const FEATURE_FLAGS = {
  AI_ENABLED: false,
  OCR_ENABLED: false,
  SYNC_ENABLED: true,
  ANALYTICS_ENABLED: false,
};

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
