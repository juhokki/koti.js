import { useLocation, useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import useDevice from "../../hooks/useDevice";
import { ActionTrigger } from "../../interface/Asset";

const triggerLabels: Record<ActionTrigger, string> = {
	[ActionTrigger.OnChange]: "Arvon muuttuessa",
	[ActionTrigger.OnInitialValue]: "Alkuarvon saapuessa"
};

export default function DeviceActions() {
	const navigate = useNavigate();
	const location = useLocation();
	const { device, devicePath } = useDevice();

	const goBack = () => {
		Promise.resolve(navigate(`${devicePath}${location.search}`)).catch(
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

	const openScript = (measurementId: string, index: number) => {
		const params = new URLSearchParams(location.search);
		params.set("action", `${measurementId}:${String(index)}`);

		Promise.resolve(
			navigate(`${devicePath}/script?${params.toString()}`)
		).catch(console.log);
	};

	const measurements = device.measurements.filter(
		(measurement) => measurement.actions.length > 0
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
					{measurements.length === 0 && (
						<div className="grid-item full-width">
							<div className="centered">Ei toimintoja.</div>
						</div>
					)}
					{measurements.flatMap((measurement) =>
						measurement.actions.map((action, index) => (
							<div
								className="grid-item"
								key={`${measurement.id}-${action.name}-${action.trigger}`}
							>
								<table>
									<tbody>
										<tr>
											<th>Toiminto</th>
											<td>{action.name}</td>
										</tr>
										<tr>
											<th>Laukaisin</th>
											<td>
												{triggerLabels[action.trigger]}
											</td>
										</tr>
										<tr>
											<th>Skripti</th>
											<td>
												<button
													onClick={() => {
														openScript(
															measurement.id,
															index
														);
													}}
												>
													Näytä
												</button>
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						))
					)}
				</div>
			</section>
		</section>
	);
}
