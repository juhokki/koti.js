export function timeElapsed(timestamp: number) {
	if (timestamp <= 0) {
		return "Ei arvoa";
	}

	const now = Date.now();
	const elapsed = now - timestamp;

	let elapsedString;

	if (elapsed < 60000) {
		elapsedString = "Hetki sitten";
	} else if (elapsed < 3600000) {
		const minutes = Math.floor(elapsed / 60000);
		elapsedString = `${minutes.toString()} minuutti${minutes > 1 ? "a" : ""} sitten`;
	} else if (elapsed < 86400000) {
		const hours = Math.floor(elapsed / 3600000);
		elapsedString = `${hours.toString()} tunti${hours > 1 ? "a" : ""} sitten`;
	} else {
		const days = Math.floor(elapsed / 86400000);
		elapsedString = `${days.toString()} päivä${days > 1 ? "ä" : ""} sitten`;
	}

	return elapsedString;
}

export function shortDate(date: Date) {
	const day = date.getDate();
	const month = date.getMonth() + 1;

	return `${day.toString()}.${month.toString()}.`;
}

export function getStartOfDay(date: Date) {
	const startOfDay = new Date(date.getTime());
	startOfDay.setHours(0, 0, 0, 0);

	return startOfDay;
}

export function getEndOfDay(date: Date) {
	const endOfDay = new Date(date.getTime());
	endOfDay.setHours(23, 59, 59, 999);

	return endOfDay;
}

export function getStartOfWeek(date: Date) {
	const startOfWeek = getStartOfDay(date);
	const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
	startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);

	return startOfWeek;
}

export function getEndOfWeek(date: Date) {
	const endOfWeek = getStartOfWeek(date);
	endOfWeek.setDate(endOfWeek.getDate() + 6);

	return getEndOfDay(endOfWeek);
}

export function formatTime(timestamp: number) {
	return new Date(timestamp).toLocaleTimeString("fi-FI", {
		hour12: false
	});
}

