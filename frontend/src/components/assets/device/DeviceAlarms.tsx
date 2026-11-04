import { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import useAssetPath from "../../../hooks/useAssetPath";
import { AlarmsContext } from "../../../context/AlarmsContext";
import { timeElapsed } from "../../../util/TimeUtil";

export default function DeviceAlarms() {
	const navigate = useNavigate();
	const location = useLocation();
	const { asset, assetPath, deviceId } = useAssetPath();
	const activeAlarms = useContext(AlarmsContext).alarms ?? [];
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
		(measurement) => measurement.alarms.length > 0
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
							<div className="centered">Ei hälytyksiä.</div>
						)}
						{measurements.length > 0 && (
							<table>
								<thead>
									<tr className="underline">
										<th>Hälytys</th>
										<th>Raja-arvo</th>
										<th>Tila</th>
									</tr>
								</thead>
								<tbody>
									{measurements.flatMap((measurement) =>
										measurement.alarms.map((alarm) => {
											const active = activeAlarms.find(
												(a) =>
													a.deviceId === device.id &&
													a.measurementId ===
														measurement.id &&
													(a.type as string) ===
														(alarm.type as string)
											);

											return (
												<tr
													key={`${measurement.id}-${alarm.type}-${alarm.name}`}
												>
													<td>{alarm.name}</td>
													<td>{alarm.limit}</td>
													<td>
														{active
															? `Alkanut ${timeElapsed(active.time)}`
															: "OK"}
													</td>
												</tr>
											);
										})
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
