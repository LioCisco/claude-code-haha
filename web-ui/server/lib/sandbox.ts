/**
 * 沙箱工具 - 提供安全的代码执行环境
 */

export const vm = {
  // 简化的沙箱实现
  createContext(context: Record<string, any>) {
    return new Proxy(context, {
      get(target, prop) {
        if (prop in target) {
          return target[prop as string];
        }
        return undefined;
      },
      set(target, prop, value) {
        target[prop as string] = value;
        return true;
      },
    });
  },

  runInNewContext(code: string, context: Record<string, any>) {
    const func = new Function('context', `with(context) { return ${code}; }`);
    return func(context);
  },
};

export function createSafeSandbox(allowedGlobals: string[] = []) {
  const sandbox: Record<string, any> = {};

  // 只允许特定的全局对象
  for (const key of allowedGlobals) {
    if (key in globalThis) {
      sandbox[key] = (globalThis as any)[key];
    }
  }

  return sandbox;
}
