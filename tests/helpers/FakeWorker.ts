import { type MainToWorker, type WorkerToMain } from "@vlab/shared";

export class FakeWorker {
  private messageListeners: ((event: { data: WorkerToMain }) => void)[] = [];
  public sentMessages: MainToWorker[] = [];

  public addEventListener(type: string, listener: (event: { data: WorkerToMain }) => void): void {
    if (type === "message") {
      this.messageListeners.push(listener);
    }
  }

  public removeEventListener(
    type: string,
    listener: (event: { data: WorkerToMain }) => void,
  ): void {
    if (type === "message") {
      this.messageListeners = this.messageListeners.filter((l) => l !== listener);
    }
  }

  public postMessage(message: MainToWorker): void {
    this.sentMessages.push(message);
  }

  public emit(message: WorkerToMain): void {
    for (const listener of this.messageListeners) {
      listener({ data: message });
    }
  }

  public terminate(): void {
    this.messageListeners = [];
  }
}
