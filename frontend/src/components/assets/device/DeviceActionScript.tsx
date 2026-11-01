import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import useAssetPath from "../../../hooks/useAssetPath";
import ActionsApi from "../../../api/ActionsApi";

export default function DeviceActionScript() {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const { asset, assetPath, deviceId } = useAssetPath();
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<{ ok: boolean; error?: string }>();
	const device = asset?.devices.find((d) => d.id === deviceId);

	const goBack = () => {
		const params = new URLSearchParams(location.search);
		params.delete("action");
		const search = params.size > 0 ? `?${params.toString()}` : "";

		Promise.resolve(
			navigate(`${assetPath}/${deviceId ?? ""}/actions${search}`)
		).catch(console.log);
	};

	if (!device) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
		);
	}

	const [measurementId, index] = (searchParams.get("action") ?? "").split(
		":"
	);
	const measurement = device.measurements.find((m) => m.id === measurementId);
	const action = measurement?.actions[Number(index)];

	const run = () => {
		if (!measurement || !action) {
			return;
		}

		setRunning(true);
		setResult(undefined);
		ActionsApi.executeAction(
			device.id,
			measurement.id,
			action.name,
			action.trigger
		)
			.then(setResult)
			.catch((error: unknown) => {
				setResult({
					ok: false,
					error:
						error instanceof Error ? error.message : String(error)
				});
			})
			.finally(() => {
				setRunning(false);
			});
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
						<Icon>{device.icon}</Icon>
						<span>{action?.name ?? device.name}</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					<div className="grid-item full-width">
						{!action && (
							<div className="centered">Ei skriptiä.</div>
						)}
						{action && (
							<>
								<pre className="script">{action.script}</pre>
								<div className="centered margin-top">
									<button onClick={goBack}>Takaisin</button>
									<button onClick={run} disabled={running}>
										Suorita
									</button>
								</div>
								{running && (
									<div className="loader-container">
										<div className="loader"></div>
									</div>
								)}
								{result?.ok === true && (
									<div className="centered margin-top">
										OK
									</div>
								)}
								{result?.ok === false && (
									<div className="centered margin-top danger">
										{result.error}
									</div>
								)}
							</>
						)}
					</div>
				</div>
			</section>
		</section>
	);
}
