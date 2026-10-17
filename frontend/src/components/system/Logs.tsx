import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import FeedIcon from "@mui/icons-material/Feed";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import LogsApi from "../../api/LogsApi";
import { LogEntry, LogLevelName } from "../../interface/Log";
import {
	formatTime,
	getEndOfDay,
	getStartOfDay,
	shortDate
} from "../../util/TimeUtil";

const LEVELS: { name: LogLevelName; value: number }[] = [
	{ name: "trace", value: 10 },
	{ name: "debug", value: 20 },
	{ name: "info", value: 30 },
	{ name: "warn", value: 40 },
	{ name: "error", value: 50 },
	{ name: "fatal", value: 60 }
];

function levelName(level: number): string {
	return LEVELS.find((l) => l.value === level)?.name ?? String(level);
}

export default function Logs() {
	const navigate = useNavigate();
	const goBack = () => {
		Promise.resolve(navigate("/system")).catch(console.log);
	};

	const [level, setLevel] = useState<LogLevelName>("warn");
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
		setLoading(true);
		setError(false);

		LogsApi.getLogs(start, end, level)
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
	}, [start, end, level]);

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
				<div className="centered margin-bottom">
					<Select
						size="small"
						value={level}
						onChange={(e) => {
							setLevel(e.target.value);
						}}
					>
						{LEVELS.map((l) => (
							<MenuItem key={l.name} value={l.name}>
								{l.name}
							</MenuItem>
						))}
					</Select>
				</div>
				{error && (
					<div className="centered">
						Tietojen hakeminen ei onnistunut.
					</div>
				)}
				<table className="logs">
					<tbody>
						{entries.map((entry, i) => (
							<tr key={i}>
								<td className="log-time">
									{formatTime(entry.time)}
								</td>
								<td className="log-level">
									{levelName(entry.level)}
								</td>
								<td>{entry.msg}</td>
							</tr>
						))}
					</tbody>
				</table>
				{loading && (
					<div className="loader-container">
						<div className="loader"></div>
					</div>
				)}
				{!loading && !error && entries.length === 0 && (
					<div className="centered">
						Lokimerkintöjä ei löytynyt valitulta päivältä.
					</div>
				)}
			</section>
		</section>
	);
}
