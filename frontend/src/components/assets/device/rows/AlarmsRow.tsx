import NotificationsIcon from "@mui/icons-material/Notifications";
import { Device } from "../../../../interface/Asset";

interface AlarmsRowProps {
	device: Device;
}

export default function AlarmsRow(props: AlarmsRowProps) {
	return (
		<tr>
			<th>
				<div>
					<NotificationsIcon />
					<span>Hälytykset</span>
				</div>
			</th>
			<td>
				<button style={{ margin: 0 }}>Avaa</button>
			</td>
		</tr>
	);
}
