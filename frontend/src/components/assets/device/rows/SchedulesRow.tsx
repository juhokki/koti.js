import { useLocation, useNavigate, useParams } from "react-router-dom";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { Device } from "../../../../interface/Asset";

interface SchedulesRowProps {
	device: Device;
}

export default function SchedulesRow(props: SchedulesRowProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();
	const openSchedules = () => {
		Promise.resolve(
			navigate(
				`/assets/${params.assetId ?? ""}/${props.device.id}/schedules${location.search}`
			)
		).catch(console.log);
	};

	return (
		<tr>
			<th>
				<div>
					<ScheduleIcon />
					<span>Ajastukset</span>
				</div>
			</th>
			<td>
				<button style={{ margin: 0 }} onClick={openSchedules}>
					Avaa
				</button>
			</td>
		</tr>
	);
}
