/**
 * 模板引擎 - 处理变量插值
 * 支持: {{variableName}} 语法
 */

export function interpolateTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, path) => {
    const trimmedPath = path.trim();
    const value = getValueByPath(variables, trimmedPath);
    return value !== undefined ? String(value) : match;
  });
}

export function interpolateObject<T extends Record<string, any>>(
  obj: T,
  variables: Record<string, any>
): T {
  if (typeof obj === 'string') {
    return interpolateTemplate(obj, variables) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => interpolateObject(item, variables)) as unknown as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, variables);
    }
    return result as T;
  }

  return obj;
}

function getValueByPath(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[key];
  }

  return value;
}

export function evaluateExpression(expression: string, context: Record<string, any>): any {
  try {
    // 创建安全的执行环境
    const func = new Function(
      'context',
      `
        with (context) {
          return ${expression};
        }
      `
    );
    return func(context);
  } catch (error) {
    throw new Error(`表达式执行失败: ${expression} - ${error}`);
  }
}
