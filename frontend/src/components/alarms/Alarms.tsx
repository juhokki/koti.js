import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { AlarmsContext } from "../../context/AlarmsContext";
import { AssetsContext } from "../../context/AssetsContext";
import { findAssetPath } from "../../util/AssetPathUtil";
import { timeElapsed } from "../../util/TimeUtil";
import { findDeviceAsset } from "../../util/AssetUtil";

const STARTED_AT_COLUMN_MIN_WIDTH = 800;

export default function Alarms() {
	const [showStartedAt, setShowStartedAt] = useState(
		() => window.innerWidth > STARTED_AT_COLUMN_MIN_WIDTH
	);
	const navigate = useNavigate();
	const context = useContext(AlarmsContext);
	const alarms = context.alarms;
	const assets = useContext(AssetsContext).assets;
	useEffect(() => {
		const updateColumnVisibility = () => {
			setShowStartedAt(window.innerWidth > STARTED_AT_COLUMN_MIN_WIDTH);
		};

		window.addEventListener("resize", updateColumnVisibility);

		return () => {
			window.removeEventListener("resize", updateColumnVisibility);
		};
	}, []);

	const goBack = () => {
		Promise.resolve(navigate("/")).catch(console.log);
	};
	const goToAsset = (assetId: string) => {
		const path = findAssetPath(assets, assetId) ?? [assetId];

		Promise.resolve(
			navigate(`/assets/${path.join("/")}?from=alarms`)
		).catch(console.log);
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
										{showStartedAt && <th>Alkanut</th>}
									</tr>
								</thead>
								<tbody>
									{alarms.map((alarm) => {
										const asset = findDeviceAsset(
											alarm.deviceId,
											assets
										);

										if (!asset) {
											throw new Error(
												`Asset not found for device ${alarm.deviceId}`
											);
										}

										return (
											<tr
												key={`${asset.name}-${alarm.deviceName}-${alarm.measurementName}-${alarm.type}`}
											>
												<td>
													<span
														className="clickable"
														onClick={() => {
															goToAsset(asset.id);
														}}
													>
														{asset.name}
													</span>
												</td>
												<td>{alarm.name}</td>
												{showStartedAt && (
													<td>
														{timeElapsed(
															alarm.time
														)}
													</td>
												)}
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</section>
		</section>
	);
}
