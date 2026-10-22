import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FeedIcon from "@mui/icons-material/Feed";
import ExtensionIcon from "@mui/icons-material/Extension";
import SettingsIcon from "@mui/icons-material/Settings";
import StorageIcon from "@mui/icons-material/Storage";
import TimerIcon from "@mui/icons-material/Timer";
import prettyBytes from "pretty-bytes";
import SystemApi from "../../api/SystemApi";
import { SystemState } from "../../interface/SystemState";

function formatUptime(uptime: number): string {
	const totalSeconds = Math.floor(uptime);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const time = [hours, minutes, seconds]
		.map((value) => String(value).padStart(2, "0"))
		.join(":");

	return days > 0 ? `${String(days)} pv ${time}` : time;
}

export default function System() {
	const navigate = useNavigate();
	const goBack = () => {
		Promise.resolve(navigate("/")).catch(console.log);
	};

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [stats, setStats] = useState<SystemState>();
	const [uptime, setUptime] = useState<number>();

	useEffect(() => {
		SystemApi.getSystemStats()
			.then((stats) => {
				setLoading(false);
				setStats(stats);
				setUptime(stats.uptime);
			})
			.catch((e: unknown) => {
				setLoading(false);
				setError(true);
				console.log(e);
			});
	}, []);

	useEffect(() => {
		if (stats === undefined) {
			return;
		}

		const interval = window.setInterval(() => {
			setUptime((current) => (current ?? stats.uptime) + 1);
		}, 1000);

		return () => {
			window.clearInterval(interval);
		};
	}, [stats]);

	if (loading) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
		);
	}

	if (error || !stats) {
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
							<SettingsIcon />
							<span>Järjestelmä</span>
						</div>
						<div className="right"></div>
					</h2>
				</section>
				<section className="content">
					<div className="centered">
						Tietojen hakeminen ei onnistunut.
					</div>
				</section>
			</section>
		);
	}

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
						<SettingsIcon />
						<span>Järjestelmä</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					<div className="grid-item">
						<h3 className="centered underline">
							<TimerIcon />
							<span>Palvelin</span>
						</h3>
						<table className="margin-top">
							<tbody>
								<tr>
									<th className="centered">
										<span>Käynnissä</span>
									</th>
									<td className="centered">
										<span>
											{formatUptime(
												uptime ?? stats.uptime
											)}
										</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="grid-item">
						<h3 className="centered underline">
							<StorageIcon />
							<span>Levy</span>
						</h3>
						<table className="margin-top">
							<tbody>
								<tr>
									<th className="centered">
										<span>Koko</span>
									</th>
									<td className="centered">
										<span>
											{prettyBytes(stats.disk.size)}
										</span>
									</td>
								</tr>
								<tr>
									<th className="centered">
										<span>Vapaana</span>
									</th>
									<td className="centered">
										<span>
											{prettyBytes(stats.disk.free)}
										</span>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="grid-item">
						<h3 className="centered underline">
							<FeedIcon />
							<span>Loki</span>
						</h3>
						<table className="margin-top">
							<tbody>
								<tr>
									<th className="centered">
										<span>Loki</span>
									</th>
									<td className="centered">
										<button
											style={{ margin: 0 }}
											onClick={() => {
												Promise.resolve(
													navigate("/system/logs")
												).catch(console.log);
											}}
										>
											Avaa
										</button>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="grid-item">
						<h3 className="centered underline">
							<ExtensionIcon />
							<span>Integraatiot</span>
						</h3>
						<table className="margin-top">
							<tbody>
								{stats.integrations.map((name) => (
									<tr key={name}>
										<th className="centered">
											<span>{name.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
										</th>
										<td className="centered">
											<button
												style={{ margin: 0 }}
												onClick={() => {
													Promise.resolve(
														navigate(
															`/system/integrations/${encodeURIComponent(name)}`
														)
													).catch(console.log);
												}}
											>
												Avaa
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		</section>
	);
}
