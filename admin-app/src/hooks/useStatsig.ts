import { 
  useStatsigClient, 
  useFeatureGate, 
  useExperiment,
  useDynamicConfig 
} from '@statsig/react-bindings';

// Re-export hooks for convenience
export { useStatsigClient, useFeatureGate, useExperiment, useDynamicConfig };

// Custom hook for checking feature gates with a default value
export const useStatsigGate = (gateName: string, defaultValue = false) => {
  const gate = useFeatureGate(gateName);
  return gate.value ?? defaultValue;
};

// Custom hook for getting experiment values
export const useStatsigExperiment = <T extends Record<string, unknown>>(
  experimentName: string,
  defaultValues: T
): T => {
  const experiment = useExperiment(experimentName);
  
  return Object.keys(defaultValues).reduce((acc, key) => {
    acc[key as keyof T] = experiment.get(key, defaultValues[key]) as T[keyof T];
    return acc;
  }, {} as T);
};

// Custom hook for dynamic config
export const useStatsigConfig = <T extends Record<string, unknown>>(
  configName: string,
  defaultValues: T
): T => {
  const config = useDynamicConfig(configName);
  
  return Object.keys(defaultValues).reduce((acc, key) => {
    acc[key as keyof T] = config.get(key, defaultValues[key]) as T[keyof T];
    return acc;
  }, {} as T);
};
