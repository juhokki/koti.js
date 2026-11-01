import { useContext } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import { AssetsContext } from "../../context/AssetsContext";
import Device from "./device/DeviceView";
import useAssetPath from "../../hooks/useAssetPath";
import AssetSummaryView from "./AssetSummaryView";

export default function AssetDetails() {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const assets = useContext(AssetsContext).assets;
	const { asset, assetPath, parentPath } = useAssetPath();
	const goBack = () => {
		const path =
			searchParams.get("from") === "alarms" ? "/alarms" : parentPath;
		Promise.resolve(navigate(path)).catch(console.log);
	};
	const openChild = (childId: string) => {
		Promise.resolve(
			navigate(`${assetPath}/${childId}${location.search}`)
		).catch(console.log);
	};

	if (!asset) {
		return null;
	}

	const children = asset.children
		.map((childId) => assets.find((a) => a.id === childId))
		.filter((child) => child !== undefined);

	const devices = asset.devices
		.map((device) => {
			const override = (asset.deviceNameOverrides ?? []).find(
				(item) => item.id === device.id
			);
			const measurements = device.measurements.filter(
				(measurement) =>
					asset.measurementFilter == null ||
					measurement.id === asset.measurementFilter
			);

			return {
				device,
				displayName: override?.name ?? device.name,
				measurements
			};
		})
		.filter((item) => item.measurements.length > 0);

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
					{children.map((child) => (
						<div className="grid-item" key={child.id}>
							<h3
								onClick={() => {
									openChild(child.id);
								}}
								className="centered clickable"
							>
								<Icon>{child.icon}</Icon>
								<span>{child.name}</span>
							</h3>
						</div>
					))}
					{asset.isSummaryAsset
						? devices.length > 0 && (
								<AssetSummaryView devices={devices} />
							)
						: devices.map(
								({ device, displayName, measurements }) => (
									<Device
										device={device}
										displayName={displayName}
										measurements={measurements}
										key={device.id}
									/>
								)
							)}
				</div>
			</section>
		</section>
	);
}
