export default class Disk {
	size: number;
	free: number;

	constructor(size: number, free: number) {
		this.size = size;
		this.free = free;
	}

	getSize() {
		return this.size;
	}

	getFree() {
		return this.free;
	}
}
