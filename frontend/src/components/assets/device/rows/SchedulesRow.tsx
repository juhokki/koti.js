import ScheduleIcon from "@mui/icons-material/Schedule";
import { Device } from "../../../../interface/Asset";

interface SchedulesRowProps {
	device: Device;
}

export default function SchedulesRow(props: SchedulesRowProps) {
	return (
		<tr>
			<th>
				<div>
					<ScheduleIcon />
					<span>Ajastukset</span>
				</div>
			</th>
			<td>
				<button style={{ margin: 0 }}>Avaa</button>
			</td>
		</tr>
	);
}
