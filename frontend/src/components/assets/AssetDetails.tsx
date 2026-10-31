import { useContext } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import { AssetsContext } from "../../context/AssetsContext";
import Device from "./device/DeviceView";
import useAssetPath from "../../hooks/useAssetPath";

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

	const devices = asset.devices.filter((device) => {
		return device.measurements.length > 0;
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
					{devices.map((device) => (
						<Device device={device} key={device.id} />
					))}
				</div>
			</section>
		</section>
	);
}
