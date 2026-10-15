import type { LogEntry } from "./LogUtil.ts";

export const LOG_BUFFER_CAPACITY = 5000;

export class LogBuffer {
	private entries: LogEntry[] = [];
	private readonly capacity: number;

	constructor(capacity = LOG_BUFFER_CAPACITY) {
		this.capacity = capacity;
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
		this.entries.push(entry);

		if (this.entries.length > this.capacity) {
			this.entries.shift();
		}
	}

	getAll(): readonly LogEntry[] {
		return this.entries;
	}

	clear(): void {
		this.entries = [];
	}
}

export const logBuffer = new LogBuffer();
