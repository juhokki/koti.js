import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FeedIcon from "@mui/icons-material/Feed";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import LogsApi from "../../api/LogsApi";
import { LogEntry, LogLevelName } from "../../interface/Log";

const PAGE_SIZE = 100;

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

	const [level, setLevel] = useState<LogLevelName>("info");
	const [entries, setEntries] = useState<LogEntry[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	const load = useCallback(
		(start: number, reset: boolean) => {
			setLoading(true);
			setError(false);

			LogsApi.getLogs(start, PAGE_SIZE, level)
				.then((page) => {
					setTotal(page.total);
					setEntries((prev) =>
						reset ? page.entries : [...prev, ...page.entries]
					);
				})
				.catch((e: unknown) => {
					setError(true);
					console.log(e);
				})
				.finally(() => {
					setLoading(false);
				});
		},
		[level]
	);

	useEffect(() => {
		load(0, true);
	}, [load]);

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
				<table>
					<tbody>
						{entries.map((entry, i) => (
							<tr key={i}>
								<td>{new Date(entry.time).toLocaleString()}</td>
								<td>{levelName(entry.level)}</td>
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
					<div className="centered">Ei lokimerkintöjä.</div>
				)}
				{!loading && entries.length < total && (
					<div className="centered">
						<button
							onClick={() => {
								load(entries.length, false);
							}}
						>
							Lataa lisää
						</button>
					</div>
				)}
			</section>
		</section>
	);
}
