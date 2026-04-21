/**
 * A basic embedded Uiua interpreter implemented in TypeScript.
 * This is a subset of the full Uiua language.
 */

export interface UiuaValue {
  type: 'number' | 'array' | 'string';
  data: any;
  shape: number[];
}

export function valToNumber(v: UiuaValue): number {
  if (v.type === 'number') return v.data;
  if (v.type === 'array' && v.data.length === 1) return valToNumber(v.data[0]);
  return 0;
}

export function valToArray(v: UiuaValue): UiuaValue[] {
  if (v.type === 'array') return v.data;
  return [v];
}

export function createNumber(n: number): UiuaValue {
  return { type: 'number', data: n, shape: [] };
}

export function createArray(arr: UiuaValue[]): UiuaValue {
  // Simple shape calculation
  let shape: number[] = [arr.length];
  if (arr.length > 0 && arr[0].type === 'array') {
    shape = [arr.length, ...arr[0].shape];
  }
  return { type: 'array', data: arr, shape };
}

export function formatValue(v: UiuaValue): string {
  if (v.type === 'number') return v.data.toString();
  if (v.type === 'string') return `"${v.data}"`;
  if (v.type === 'array') {
    return `[${v.data.map((x: any) => formatValue(x)).join(' ')}]`;
  }
  return '';
}

export class UiuaInterpreter {
  stack: UiuaValue[] = [];
  logs: string[] = [];
  warnings: string[] = [];

  constructor() {}

  reset() {
    this.stack = [];
    this.logs = [];
    this.warnings = [];
  }

  execute(code: string) {
    // 1. Tokenize (Simple)
    // We need to handle symbols properly.
    // Uiua symbols are often multi-byte or unique.
    const tokens = this.tokenize(code);
    
    // 2. Evaluate Right-to-Left
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      this.evalToken(token);
    }
  }

  private tokenize(code: string): string[] {
    // This is a naive tokenizer.
    // Real Uiua handles strings, comments, and glyphs.
    const tokens: string[] = [];
    let current = '';
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      // Handle comments
      if (char === '#') {
        while (i < code.length && code[i] !== '\n') i++;
        continue;
      }
      
      // Handle multi-char numbers/words or single glyphs
      if (/[a-zA-Z0-9\.]/.test(char)) {
        current += char;
      } else {
        if (current) {
          tokens.push(current);
          current = '';
        }
        if (!/\s/.test(char)) {
          tokens.push(char);
        }
      }
    }
    if (current) tokens.push(current);
    
    return tokens;
  }

  private evalToken(token: string) {
    // Check for numbers
    const num = parseFloat(token);
    if (!isNaN(num)) {
      this.stack.push(createNumber(num));
      return;
    }

    // Handle Symbols
    switch (token) {
      // Math
      case '+': this.binOp((a, b) => a + b); break;
      case '-': this.binOp((a, b) => a - b); break;
      case '×': this.binOp((a, b) => a * b); break;
      case '÷': this.binOp((a, b) => a / b); break;
      case 'ⁿ': this.binOp((a, b) => Math.pow(a, b)); break;
      case '◿': this.binOp((a, b) => a % b); break;
      case '√': this.unaryOp(a => Math.sqrt(a)); break;
      case '⌵': this.unaryOp(a => Math.abs(a)); break;
      
      // Stack
      case '.': {
        const top = this.stack.pop();
        if (top) {
          this.stack.push(top);
          this.stack.push({ ...top });
        }
        break;
      }
      case ',': {
        if (this.stack.length >= 2) {
          const second = this.stack[this.stack.length - 2];
          this.stack.push({ ...second });
        }
        break;
      }
      case ':': {
        if (this.stack.length >= 2) {
          const a = this.stack.pop()!;
          const b = this.stack.pop()!;
          this.stack.push(a);
          this.stack.push(b);
        }
        break;
      }
      case '◌': {
        this.stack.pop();
        break;
      }

      // Logic
      case '=': this.binOp((a, b) => a === b ? 1 : 0); break;
      case '≠': this.binOp((a, b) => a !== b ? 1 : 0); break;
      case '>': this.binOp((a, b) => a > b ? 1 : 0); break;
      case '<': this.binOp((a, b) => a < b ? 1 : 0); break;
      case '¬': this.unaryOp(a => a === 0 ? 1 : 0); break;

      // Arrays
      case '↯': { // Reshape
        const shapeVal = this.stack.pop();
        const dataVal = this.stack.pop();
        if (shapeVal && dataVal) {
          // Fake reshape: just return data for now or flatten
          this.stack.push(dataVal);
        }
        break;
      }
      case '△': { // Shape
        const val = this.stack.pop();
        if (val) {
          this.stack.push(createArray(val.shape.map(n => createNumber(n))));
        }
        break;
      }

      // Output
      case '?': {
        const top = this.stack[this.stack.length - 1];
        if (top) this.logs.push(formatValue(top));
        break;
      }

      default:
        // Unknown or unimplemented
        this.warnings.push(`Token '${token}' not yet implemented in embedded interpreter.`);
    }
  }

  private binOp(fn: (a: number, b: number) => number) {
    if (this.stack.length >= 2) {
      const a = this.stack.pop()!;
      const b = this.stack.pop()!;
      // Handle rank-broadcasting (simple)
      this.stack.push(createNumber(fn(valToNumber(a), valToNumber(b))));
    }
  }

  private unaryOp(fn: (a: number) => number) {
    if (this.stack.length >= 1) {
      const a = this.stack.pop()!;
      this.stack.push(createNumber(fn(valToNumber(a))));
    }
  }
}
