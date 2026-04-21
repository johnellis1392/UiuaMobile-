/**
 * This service mimics the official Uiua WASM bridge pattern.
 * Official Uiua (uiua.org) uses a Leptos-integrated WASM binary.
 * 
 * Pattern:
 * 1. Initialize the WASM module.
 * 2. Send code bit-by-bit or as a block.
 * 3. Receive stack snapshots.
 */

import { UiuaInterpreter } from './uiua-interpreter';

export interface StackValue {
  type: 'number' | 'array' | 'string' | 'box';
  data: any;
  shape?: number[];
}

export interface EvalResult {
  stack: StackValue[];
  output: string[];
  error?: string;
  warnings: string[];
}

const interpreter = new UiuaInterpreter();

export async function evaluateUiua(code: string, inputs: string): Promise<EvalResult> {
  try {
    interpreter.reset();
    
    // Parse inputs into stack if any (stub for now)
    if (inputs.trim()) {
      // In a real app, inputs would be pre-parsed or provided to the state
    }

    interpreter.execute(code);
    
    return {
      stack: interpreter.stack as any,
      output: interpreter.logs,
      error: undefined,
      warnings: interpreter.warnings
    };
  } catch (err: any) {
    return {
      stack: [],
      output: [],
      error: `Interpreter Crash: ${err.message}`,
      warnings: []
    };
  }
}
