import type { LogEntry } from "./LogUtil.ts";

export const LOG_BUFFER_CAPACITY = 100000;

export class LogBuffer {
	private entries: LogEntry[];
	private readonly capacity: number;
	private head = 0;
	private count = 0;

	constructor(capacity = LOG_BUFFER_CAPACITY) {
		this.capacity = capacity;
		this.entries = new Array<LogEntry>(capacity);
	}

	// Stream interface used by pino; each chunk is one NDJSON line.
	write(chunk: string): void {
		try {
			this.add(JSON.parse(chunk) as LogEntry);
		} catch {
			// Ignore non-JSON output.
		}
	}

	add(entry: LogEntry): void {
		const index = (this.head + this.count) % this.capacity;

		this.entries[index] = entry;

		if (this.count < this.capacity) {
			this.count++;
		} else {
			this.head = (this.head + 1) % this.capacity;
		}
	}

	// Oldest first.
	getAll(): LogEntry[] {
		const result: LogEntry[] = [];

		for (let i = 0; i < this.count; i++) {
			const entry = this.entries[(this.head + i) % this.capacity];

			if (entry) {
				result.push(entry);
			}
		}

		return result;
	}

	clear(): void {
		this.entries = new Array<LogEntry>(this.capacity);
		this.head = 0;
		this.count = 0;
	}
}

export const logBuffer = new LogBuffer();
