import { useLocation, useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import useAssetPath from "../../../hooks/useAssetPath";
import { ActionTrigger } from "../../../interface/Asset";

const triggerLabels: Record<ActionTrigger, string> = {
	[ActionTrigger.OnChange]: "Arvon muuttuessa"
};

export default function DeviceActions() {
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
					<div className="grid-item full-width">
						{measurements.length === 0 && (
							<div className="centered">Ei toimintoja.</div>
						)}
						{measurements.length > 0 && (
							<table>
								<thead>
									<tr className="underline">
										<th>Toiminto</th>
										<th>Laukaisin</th>
									</tr>
								</thead>
								<tbody>
									{measurements.flatMap((measurement) =>
										measurement.actions.map((action) => (
											<tr
												key={`${measurement.id}-${action.name}-${action.trigger}`}
											>
												<td>{action.name}</td>
												<td>
													{
														triggerLabels[
															action.trigger
														]
													}
												</td>
											</tr>
										))
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
