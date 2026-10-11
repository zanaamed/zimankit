import type { Dialect } from "./text";
export class LanguageEngine {
  private worker: Worker;
  private serial = 0;
  private pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  constructor() {
    this.worker = new Worker("/kurdish-worker.js", { type: "module" });
    this.worker.onmessage = ({ data }) => {
      const task = this.pending.get(data.id);
      if (!task) return;
      clearTimeout(task.timer);
      this.pending.delete(data.id);
      if (data.error) task.reject(new Error(data.error));
      else task.resolve(data.result);
    };
    this.worker.onerror = () =>
      this.fail(new Error("The language engine could not start. Reload to retry."));
  }
  request<T>(type: string, dialect: Dialect, payload: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.serial;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Language processing timed out. Try a shorter document or reload."));
      }, 90_000);
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject, timer });
      this.worker.postMessage({ id, type, dialect, ...payload });
    });
  }
  private fail(error: Error) {
    for (const task of this.pending.values()) {
      clearTimeout(task.timer);
      task.reject(error);
    }
    this.pending.clear();
  }
  dispose() {
    this.worker.terminate();
    this.fail(new Error("Language engine closed."));
  }
}
