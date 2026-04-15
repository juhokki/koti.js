import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { AlarmsContext } from "../../context/AlarmsContext";
import { timeElapsed } from "../../util/TimeUtil";

export default function Alarms() {
	const navigate = useNavigate();
	const context = useContext(AlarmsContext);
	const alarms = context.alarms;
	const goBack = () => {
		Promise.resolve(navigate("/")).catch(console.log);
	};
	const goToAsset = (assetId: string) => {
		Promise.resolve(navigate(`/assets/${assetId}`)).catch(console.log);
	};

	if (alarms === null) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
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
						<NotificationsIcon />
						<span>Hälytykset</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					<div className="grid-item full-width">
						{alarms.length === 0 && (
							<div className="centered">
								Ei aktiivisia hälytyksiä.
							</div>
						)}
						{alarms.length > 0 && (
							<table>
								<thead>
									<tr className="underline">
										<th>Kohde</th>
										<th>Hälytys</th>
										<th>Alkanut</th>
									</tr>
								</thead>
								<tbody>
									{alarms.map((alarm) => (
										<tr
											key={`${alarm.assetName}-${alarm.deviceName}-${alarm.measurementName}-${alarm.type}`}
										>
											<td>
												<span
													className="clickable"
													onClick={() => {
														goToAsset(alarm.assetId)
													}}
												>
													{alarm.assetName}
												</span>
											</td>
											<td>{alarm.name}</td>
											<td>
												{timeElapsed(alarm.time)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</section>
		</section>
	);
}
