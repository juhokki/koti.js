import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FeedIcon from "@mui/icons-material/Feed";
import LogsApi from "../../api/LogsApi";
import { LogEntry, LogLevelName } from "../../interface/Log";
import {
	formatTime,
	getEndOfDay,
	getStartOfDay,
	shortDate
} from "../../util/TimeUtil";

const LEVEL_NAMES: Record<number, string> = {
	10: "trace",
	20: "debug",
	30: "info",
	40: "warn",
	50: "error",
	60: "fatal"
};
const LEVELS: LogLevelName[] = ["debug", "info", "warn", "error"];

function levelName(level: number): string {
	return LEVEL_NAMES[level] ?? String(level);
}

export default function Logs() {
	const navigate = useNavigate();
	const goBack = () => {
		Promise.resolve(navigate("/system")).catch(console.log);
	};

	const [levels, setLevels] = useState<LogLevelName[]>([
		"info",
		"warn",
		"error"
	]);
	const [date, setDate] = useState(new Date());
	const [entries, setEntries] = useState<LogEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const startDate = getStartOfDay(date);
	const endDate = getEndOfDay(date);
	const start = startDate.getTime();
	const end = endDate.getTime();
	const isToday = start === getStartOfDay(new Date()).getTime();

	useEffect(() => {
		setError(false);
		if (levels.length === 0) {
			setEntries([]);
			setLoading(false);
			return;
		}
		setLoading(true);

		LogsApi.getLogs(start, end, levels)
			.then((page) => {
				setEntries(page.entries);
			})
			.catch((e: unknown) => {
				setEntries([]);
				setError(true);
				console.log(e);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [start, end, levels]);

	const changeDay = (change: number) => {
		const newDate = new Date(date.getTime());
		newDate.setDate(newDate.getDate() + change);
		setDate(newDate);
	};

	return (
		<section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={goBack}
						/>
					</div>
					<div>
						<FeedIcon />
						<span>Loki</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={() => {
								changeDay(-1);
							}}
						/>
					</div>
					<div>{shortDate(date)}</div>
					<div className="right">
						{!isToday && (
							<ChevronRightIcon
								className="clickable"
								onClick={() => {
									changeDay(1);
								}}
							/>
						)}
					</div>
				</h2>
			</section>
			<section className="content">
				<div className="centered margin-bottom log-level-filters">
					{LEVELS.map((levelName) => {
						const enabled = levels.includes(levelName);

						return (
							<button
								key={levelName}
								type="button"
								aria-pressed={enabled}
								aria-label={`${levelName} logs`}
								onClick={() => {
									setLevels((currentLevels) =>
										enabled
											? currentLevels.filter(
													(level) =>
														level !== levelName
												)
											: [...currentLevels, levelName]
									);
								}}
							>
								{levelName}
							</button>
						);
					})}
				</div>
				{error && (
					<div className="centered">
						Tietojen hakeminen ei onnistunut.
					</div>
				)}
				<div className="logs">
					{entries.map((entry, i) => (
						<div className="log-item" key={i}>
							<div className="log-header">
								<span>{formatTime(entry.time)}</span>
								<span>{levelName(entry.level)}</span>
							</div>
							<div className="log-message">{entry.msg}</div>
						</div>
					))}
				</div>
				{loading && (
					<div className="loader-container">
						<div className="loader"></div>
					</div>
				)}
				{!loading &&
					!error &&
					entries.length === 0 &&
					levels.length > 0 && (
						<div className="centered">
							Lokimerkintöjä ei löytynyt valitulta päivältä.
						</div>
					)}
				{!loading && !error && levels.length === 0 && (
					<div className="centered">
						Valitse vähintään yksi lokitaso.
					</div>
				)}
			</section>
		</section>
	);
}
