/**
 * memoryLimit.ts
 *
 * Provides memory limit configuration per language runtime.
 */

export interface MemoryLimits {
  /** Node.js V8 heap size limit in MB */
  nodeMaxOldSpaceMB: number;
  /** Python memory soft limit in MB (approximate via resource module) */
  pythonMemoryMB: number;
}

export const DEFAULT_MEMORY_LIMITS: MemoryLimits = {
  nodeMaxOldSpaceMB: 128,
  pythonMemoryMB: 256,
};

/**
 * Returns node flags for memory limiting.
 */
export function getNodeMemoryFlags(limitMB: number = DEFAULT_MEMORY_LIMITS.nodeMaxOldSpaceMB): string[] {
  return [`--max-old-space-size=${limitMB}`];
}

/**
 * Returns a Python preamble that sets soft memory limits via resource module.
 * Note: Only works on Unix/Linux systems.
 */
export function getPythonMemoryPreamble(limitMB: number = DEFAULT_MEMORY_LIMITS.pythonMemoryMB): string {
  const limitBytes = limitMB * 1024 * 1024;
  return `
import resource as _resource
_resource.setrlimit(_resource.RLIMIT_AS, (${limitBytes}, ${limitBytes}))
`;
}
