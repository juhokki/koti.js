import { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Icon from "@mui/material/Icon";
import { AssetsContext } from "../../context/AssetsContext";
import Device from "./device/DeviceView";

export default function AssetDetails() {
	const navigate = useNavigate();
	const params = useParams();
	const assets = useContext(AssetsContext).assets;
	const asset = assets.find((r) => r.id === params.assetId, 10);
	const goBack = () => {
		Promise.resolve(navigate("/assets")).catch(console.log);
	};

	if (!asset) {
		return null;
	}

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
					{devices.map((device) => (
						<Device device={device} asset={asset} key={device.id} />
					))}
				</div>
			</section>
		</section>
	);
}
