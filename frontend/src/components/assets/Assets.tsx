import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import RoomPreferencesIcon from "@mui/icons-material/RoomPreferences";
import Icon from "@mui/material/Icon";
import { AssetsContext } from "../../context/AssetsContext";

export default function Assets() {
	const navigate = useNavigate();
	const assets = useContext(AssetsContext).assets;
	const goBack = () => {
		Promise.resolve(navigate("/")).catch(console.log);
	};
	const open = (assetId: string) => {
		Promise.resolve(navigate(`/assets/${assetId}`)).catch(console.log);
	};

	const filteredAssets = assets.filter((asset) => {
		return asset.devices.length > 0;
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
						<RoomPreferencesIcon />
						<span>Kodinohjaus</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					{filteredAssets.map((asset) => (
						<div className="grid-item" key={asset.id}>
							<h3
								onClick={() => {
									open(asset.id);
								}}
								className="centered clickable"
							>
								<Icon>{asset.icon}</Icon>
								<span>{asset.name}</span>
							</h3>
						</div>
					))}
				</div>
			</section>
		</section>
	);
}
