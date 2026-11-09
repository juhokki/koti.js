import { useContext } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import { AssetsContext } from "../../context/AssetsContext";
import Device from "../devices/DeviceView";
import useAssetPath from "../../hooks/useAssetPath";
import SummaryView from "./SummaryView";

export default function AssetView() {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const { assets, devices: allDevices, loading } = useContext(AssetsContext);
	const { asset, assetPath, parentPath } = useAssetPath();
	const goBack = () => {
		const path =
			searchParams.get("from") === "alarms" ? "/alarms" : parentPath;
		Promise.resolve(navigate(path)).catch(console.log);
	};
	const openLink = (linkedAssetId: string) => {
		Promise.resolve(
			navigate(`${assetPath}/${linkedAssetId}${location.search}`)
		).catch(console.log);
	};

	if (loading) {
		return (
			<div className="loader-container">
				<div className="loader" />
			</div>
		);
	}
	if (!asset) {
		return <section className="content">Kohdetta ei löytynyt.</section>;
	}

	const links = (asset.links ?? [])
		.map((linkedAssetId) => assets.find((a) => a.id === linkedAssetId))
		.filter((linkedAsset) => linkedAsset !== undefined);

	const devices = asset.deviceIds
		.map((id) => allDevices.find((device) => device.id === id))
		.filter((device) => device !== undefined)
		.map((device) => ({
			device,
			displayName: device.name,
			measurements: device.measurements
		}))
		.filter((item) => item.measurements.length > 0);
	const summaryDevices = (asset.summary?.devices ?? []).flatMap((entry) => {
		const device = allDevices.find(
			(device) => device.id === entry.deviceId
		);
		return device
			? [
					{
						device,
						displayName: entry.displayName,
						measurements: entry.measurementIds.flatMap((id) =>
							device.measurements.filter(
								(measurement) => measurement.id === id
							)
						)
					}
				]
			: [];
	});

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
						<Icon>{asset.icon}</Icon>
						<span>{asset.name}</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					{links.map((linkedAsset) => (
						<div className="grid-item" key={linkedAsset.id}>
							<h3
								onClick={() => {
									openLink(linkedAsset.id);
								}}
								className="centered clickable"
							>
								<Icon>{linkedAsset.icon}</Icon>
								<span>{linkedAsset.name}</span>
							</h3>
						</div>
					))}
					{summaryDevices.length > 0 && (
						<SummaryView devices={summaryDevices} />
					)}
					{devices.map(({ device, displayName, measurements }) => (
						<Device
							device={device}
							displayName={displayName}
							measurements={measurements}
							key={device.id}
						/>
					))}
				</div>
			</section>
		</section>
	);
}
