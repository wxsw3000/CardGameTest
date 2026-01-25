/**
 * @file Utils.ts
 * @description Utility functions for the engine.
 */

/**
 * Performs a deep copy of a JSON-serializable object.
 * @param obj The object to copy.
 * @returns A deep copy of the object.
 */
export function deepCopy<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    // Using JSON.parse and JSON.stringify is a common and simple way to deep copy
    // objects that don't contain functions, undefined, Symbols, or circular references.
    // Our IGameState is purely data, so this is safe.
    return JSON.parse(JSON.stringify(obj));
}
