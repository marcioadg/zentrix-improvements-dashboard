
import { FormulaComponent } from '@/types/weeklyMetrics';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

export type FormulaErrorType = 'METRIC_NOT_FOUND' | 'INVALID_FORMULA' | 'CALCULATION_ERROR' | 'DIVISION_BY_ZERO';

export interface FormulaCalculationResult {
  value: number | null;
  error?: string;
  errorType?: FormulaErrorType;
}

export const calculateFormula = (
  formulaComponents: FormulaComponent[],
  allMetrics: WeeklyMetricWithOwner[],
  weekStart: string
): FormulaCalculationResult => {
  if (!formulaComponents || formulaComponents.length === 0) {
    return { value: null, error: 'No formula components provided' };
  }

  try {
    // Check if this is an assignment formula (contains "=")
    const hasAssignment = formulaComponents.some(comp => comp.type === 'operator' && comp.value === '=');
    
    if (hasAssignment) {
      return handleAssignmentFormula(formulaComponents, allMetrics, weekStart);
    }

    // Handle regular arithmetic formula
    return handleArithmeticFormula(formulaComponents, allMetrics, weekStart);
  } catch (error) {
    logger.error('Formula calculation error:', error);
    return { value: null, error: `Formula calculation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

const handleAssignmentFormula = (
  formulaComponents: FormulaComponent[],
  allMetrics: WeeklyMetricWithOwner[],
  weekStart: string
): FormulaCalculationResult => {
  // Find the "=" operator
  const equalIndex = formulaComponents.findIndex(comp => comp.type === 'operator' && comp.value === '=');
  
  if (equalIndex === -1) {
    return { value: null, error: 'Assignment operator "=" not found' };
  }

  // For assignment, we only care about what's on the right side of "="
  const rightSide = formulaComponents.slice(equalIndex + 1);
  
  if (rightSide.length === 0) {
    return { value: null, error: 'No value specified after "=" operator' };
  }

  // For simple assignment, expect only one metric on the right side
  if (rightSide.length === 1 && rightSide[0].type === 'metric') {
    // Try to find metric by ID first, then by name as fallback
    let metric = allMetrics.find(m => m.id === rightSide[0].value);
    if (!metric && rightSide[0].displayName) {
      // Fallback: try to find by metric name
      metric = allMetrics.find(m => m.metric_name === rightSide[0].displayName);
    }
    
    if (!metric) {
      return { value: null, error: `Metric not found: ${rightSide[0].displayName}`, errorType: 'METRIC_NOT_FOUND' };
    }
    
    const metricValue = metric.weeklyValues?.[weekStart];
    
    // Treat null/undefined as 0 instead of error
    if (metricValue === null || metricValue === undefined) {
      return { value: 0 };
    }
    
    return { value: metricValue };
  }

  // For complex expressions on the right side, evaluate them
  return handleArithmeticFormula(rightSide, allMetrics, weekStart);
};

const handleArithmeticFormula = (
  formulaComponents: FormulaComponent[],
  allMetrics: WeeklyMetricWithOwner[],
  weekStart: string
): FormulaCalculationResult => {
  // Convert formula components to a calculable expression
  let expression = '';
  let hasValidMetrics = false;
  let nullMetrics: string[] = [];

  for (let i = 0; i < formulaComponents.length; i++) {
    const component = formulaComponents[i];

    switch (component.type) {
      case 'metric':
        // Try to find metric by ID first, then by name as fallback
        let metric = allMetrics.find(m => m.id === component.value);
        if (!metric && component.displayName) {
          // Fallback: try to find by metric name
          metric = allMetrics.find(m => m.metric_name === component.displayName);
        }
        if (!metric) {
          return { value: null, error: `Metric not found: ${component.displayName}`, errorType: 'METRIC_NOT_FOUND' };
        }
        
        const metricValue = metric.weeklyValues?.[weekStart];
        // Treat null/undefined as 0 instead of error
        if (metricValue === null || metricValue === undefined) {
          nullMetrics.push(component.displayName || 'Unknown metric');
          expression += '0';
        } else {
          expression += metricValue.toString();
        }
        
        hasValidMetrics = true;
        break;

      case 'number':
        const numValue = parseFloat(component.value);
        if (isNaN(numValue)) {
          return { value: null, error: `Invalid number: ${component.value}` };
        }
        expression += numValue.toString();
        break;

      case 'operator':
        let operator = component.value;
        // Convert display operators to JavaScript operators
        if (operator === '×') operator = '*';
        if (operator === '÷') operator = '/';
        
        if (!['+', '-', '*', '/'].includes(operator)) {
          return { value: null, error: `Invalid arithmetic operator: ${component.value}` };
        }
        expression += ` ${operator} `;
        break;

      default:
        return { value: null, error: `Unknown component type: ${component.type}` };
    }
  }

  if (!hasValidMetrics) {
    return { value: null, error: 'Formula must contain at least one metric' };
  }

  // Evaluate the expression safely
  const result = evaluateExpression(expression);
  
  // Handle special cases for invalid results
  if (isNaN(result)) {
    return { value: null, error: 'Formula calculation resulted in invalid number (NaN)' };
  }
  
  if (!isFinite(result)) {
    // Check if it's a division by zero case
    if (result === Infinity || result === -Infinity) {
      return { value: null, error: 'Division by zero - check if denominator metric has a value', errorType: 'DIVISION_BY_ZERO' };
    }
    return { value: null, error: 'Formula calculation resulted in invalid number (not finite)', errorType: 'CALCULATION_ERROR' };
  }

  return { value: result };
};

// Safe arithmetic expression evaluator — recursive descent parser.
// Supports +, -, *, / and parentheses. No eval/Function constructor.
const evaluateExpression = (expression: string): number => {
  const cleanExpression = expression.replace(/\s/g, '');

  if (!/^[\d+\-*/().]+$/.test(cleanExpression)) {
    throw new Error('Invalid characters in expression');
  }

  let pos = 0;

  const peek = (): string => cleanExpression[pos] || '';
  const consume = (): string => cleanExpression[pos++];

  // Grammar:  expr = term (('+' | '-') term)*
  //           term = factor (('*' | '/') factor)*
  //           factor = ['-'] ( '(' expr ')' | number )

  const parseNumber = (): number => {
    const start = pos;
    while (pos < cleanExpression.length && (/[\d.]/).test(cleanExpression[pos])) pos++;
    if (pos === start) throw new Error('Expression evaluation failed');
    const num = Number(cleanExpression.slice(start, pos));
    if (isNaN(num)) throw new Error('Expression evaluation failed');
    return num;
  };

  const parseFactor = (): number => {
    if (peek() === '-') { consume(); return -parseFactor(); }
    if (peek() === '(') {
      consume(); // '('
      const val = parseExpr();
      if (peek() !== ')') throw new Error('Expression evaluation failed');
      consume(); // ')'
      return val;
    }
    return parseNumber();
  };

  const parseTerm = (): number => {
    let val = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parseFactor();
      val = op === '*' ? val * right : val / right;
    }
    return val;
  };

  const parseExpr = (): number => {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  };

  const result = parseExpr();
  if (pos < cleanExpression.length) throw new Error('Expression evaluation failed');
  return result;
};

export const validateFormulaComponents = (
  formulaComponents: FormulaComponent[],
  availableMetrics: WeeklyMetricWithOwner[]
): { isValid: boolean; error?: string } => {
  if (!formulaComponents || formulaComponents.length === 0) {
    return { isValid: false, error: 'Formula cannot be empty' };
  }

  // Check if this is an assignment formula
  const hasAssignment = formulaComponents.some(comp => comp.type === 'operator' && comp.value === '=');
  
  if (hasAssignment) {
    return validateAssignmentFormula(formulaComponents, availableMetrics);
  }

  return validateArithmeticFormula(formulaComponents, availableMetrics);
};

const validateAssignmentFormula = (
  formulaComponents: FormulaComponent[],
  availableMetrics: WeeklyMetricWithOwner[]
): { isValid: boolean; error?: string } => {
  const equalIndex = formulaComponents.findIndex(comp => comp.type === 'operator' && comp.value === '=');
  
  if (equalIndex === -1) {
    return { isValid: false, error: 'Assignment operator "=" not found' };
  }

  // Check that there's only one "=" operator
  const equalCount = formulaComponents.filter(comp => comp.type === 'operator' && comp.value === '=').length;
  if (equalCount > 1) {
    return { isValid: false, error: 'Only one "=" operator is allowed' };
  }

  const rightSide = formulaComponents.slice(equalIndex + 1);
  
  if (rightSide.length === 0) {
    return { isValid: false, error: 'No value specified after "=" operator' };
  }

  // Validate the right side
  if (rightSide.length === 1 && rightSide[0].type === 'metric') {
    // Simple metric assignment
    const metric = availableMetrics.find(m => m.id === rightSide[0].value);
    if (!metric) {
      return { isValid: false, error: `Metric not found: ${rightSide[0].displayName}` };
    }
    return { isValid: true };
  }

  // For complex expressions on the right side, validate them as arithmetic
  return validateArithmeticFormula(rightSide, availableMetrics);
};

const validateArithmeticFormula = (
  formulaComponents: FormulaComponent[],
  availableMetrics: WeeklyMetricWithOwner[]
): { isValid: boolean; error?: string } => {
  let hasMetrics = false;
  let lastComponentType: string | null = null;

  for (let i = 0; i < formulaComponents.length; i++) {
    const component = formulaComponents[i];

    switch (component.type) {
      case 'metric':
        // Try to find metric by ID first, then by name as fallback
        let metric = availableMetrics.find(m => m.id === component.value);
        if (!metric && component.displayName) {
          // Fallback: try to find by metric name
          metric = availableMetrics.find(m => m.metric_name === component.displayName);
        }
        if (!metric) {
          return { isValid: false, error: `Metric not found: ${component.displayName}` };
        }
        hasMetrics = true;
        
        // Check if we have two consecutive values without an operator
        if (lastComponentType === 'metric' || lastComponentType === 'number') {
          return { isValid: false, error: 'Missing operator between values' };
        }
        break;

      case 'number':
        const numValue = parseFloat(component.value);
        if (isNaN(numValue)) {
          return { isValid: false, error: `Invalid number: ${component.value}` };
        }
        
        // Check if we have two consecutive values without an operator
        if (lastComponentType === 'metric' || lastComponentType === 'number') {
          return { isValid: false, error: 'Missing operator between values' };
        }
        break;

      case 'operator':
        if (!['+', '-', '×', '÷', '='].includes(component.value)) {
          return { isValid: false, error: `Invalid operator: ${component.value}` };
        }
        
        // Check if we have two consecutive operators
        if (lastComponentType === 'operator' || lastComponentType === null) {
          return { isValid: false, error: 'Invalid operator placement' };
        }
        break;

      default:
        return { isValid: false, error: `Unknown component type: ${component.type}` };
    }

    lastComponentType = component.type;
  }

  // Check if formula ends with an operator
  if (lastComponentType === 'operator') {
    return { isValid: false, error: 'Formula cannot end with an operator' };
  }

  if (!hasMetrics) {
    return { isValid: false, error: 'Formula must contain at least one metric' };
  }

  return { isValid: true };
};
