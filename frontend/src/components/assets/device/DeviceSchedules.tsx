import { useLocation, useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import useAssetPath from "../../../hooks/useAssetPath";

export default function DeviceSchedules() {
	const navigate = useNavigate();
	const location = useLocation();
	const { asset, assetPath, deviceId } = useAssetPath();
	const device = asset?.devices.find((d) => d.id === deviceId);

	const goBack = () => {
		Promise.resolve(navigate(`${assetPath}${location.search}`)).catch(
			console.log
		);
	};

	if (!device) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
		);
	}

	const measurements = device.measurements.filter(
		(measurement) => measurement.schedules.length > 0
	);

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
						<Icon>{device.icon}</Icon>
						<span>{device.name}</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					<div className="grid-item full-width">
						{measurements.length === 0 && (
							<div className="centered">Ei ajastuksia.</div>
						)}
						{measurements.length > 0 && (
							<table>
								<thead>
									<tr className="underline">
										<th>Ajastus</th>
										<th>Ajankohta</th>
									</tr>
								</thead>
								<tbody>
									{measurements.flatMap((measurement) =>
										measurement.schedules.map(
											(schedule) => (
												<tr
													key={`${measurement.id}-${schedule.name}-${schedule.cron}`}
												>
													<td>{schedule.name}</td>
													<td>{schedule.cron}</td>
												</tr>
											)
										)
									)}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</section>
		</section>
	);
}
