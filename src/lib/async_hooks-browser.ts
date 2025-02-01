// Browser-compatible polyfill for AsyncLocalStorage
class AsyncLocalStorage<T = any> {
  private static instance: AsyncLocalStorage;
  private store: T | undefined;

  static getInstance<T>(): AsyncLocalStorage<T> {
    if (!AsyncLocalStorage.instance) {
      AsyncLocalStorage.instance = new AsyncLocalStorage<T>();
    }
    return AsyncLocalStorage.instance as AsyncLocalStorage<T>;
  }

  run<R>(store: T, callback: (...args: any[]) => R): R {
    const previousStore = this.store;
    this.store = store;
    try {
      return callback();
    } finally {
      this.store = previousStore;
    }
  }

  getStore(): T | undefined {
    return this.store;
  }

  disable(): void {
    this.store = undefined;
  }

  enterWith(store: T): void {
    this.store = store;
  }
}

export { AsyncLocalStorage };
export default { AsyncLocalStorage }; 
