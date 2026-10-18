import { useLocation, useNavigate, useParams } from "react-router-dom";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { Device } from "../../../../interface/Asset";

interface AlarmsRowProps {
	device: Device;
}

export default function AlarmsRow(props: AlarmsRowProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();
	const openAlarms = () => {
		Promise.resolve(
			navigate(
				`/assets/${params.assetId ?? ""}/${props.device.id}/alarms${location.search}`
			)
		).catch(console.log);
	};

	return (
		<tr>
			<th>
				<div>
					<NotificationsIcon />
					<span>Hälytykset</span>
				</div>
			</th>
			<td>
				<button style={{ margin: 0 }} onClick={openAlarms}>
					Avaa
				</button>
			</td>
		</tr>
	);
}
