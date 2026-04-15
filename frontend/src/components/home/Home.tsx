import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import RoomPreferencesIcon from "@mui/icons-material/RoomPreferences";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SettingsIcon from "@mui/icons-material/Settings";
import { AlarmsContext } from "../../context/AlarmsContext";

export default function Home() {
	const navigate = useNavigate();
	const context = useContext(AlarmsContext);
	const alarms = context.alarms;
	const goToAssets = () => {
		Promise.resolve(navigate("/assets/")).catch(console.log);
	};
	const goToShoppingList = () => {
		Promise.resolve(navigate("/shoppinglist/")).catch(console.log);
	};
	const goToAlarms = () => {
		Promise.resolve(navigate("/alarms/")).catch(console.log);
	};
	const goToSystem = () => {
		Promise.resolve(navigate("/system/")).catch(console.log);
	};

	return (
		<div className="grid">
			<div className="grid-item">
				<h3 onClick={goToAssets} className="centered clickable">
					<RoomPreferencesIcon />
					<span>Kodinohjaus</span>
				</h3>
			</div>
			<div className="grid-item">
				<h3 onClick={goToShoppingList} className="centered clickable">
					<ShoppingCartIcon />
					<span>Ostoslista</span>
				</h3>
			</div>
			<div className="grid-item">
				<h3
					onClick={goToAlarms}
					className={
						alarms && alarms.length > 0
							? "danger centered clickable"
							: "centered clickable"
					}
				>
					<NotificationsIcon />
					<span>Hälytykset</span>
				</h3>
			</div>
			<div className="grid-item">
				<h3 onClick={goToSystem} className="centered clickable">
					<SettingsIcon />
					<span>Asetukset</span>
				</h3>
			</div>
		</div>
	);
}
