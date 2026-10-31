import { useLocation, useNavigate } from "react-router-dom";
import useAssetPath from "../../../../hooks/useAssetPath";
import ScheduleIcon from "@mui/icons-material/Schedule";
import { Device } from "../../../../interface/Asset";

interface SchedulesRowProps {
	device: Device;
}

export default function SchedulesRow(props: SchedulesRowProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { assetPath } = useAssetPath();
	const openSchedules = () => {
		Promise.resolve(
			navigate(
				`${assetPath}/${props.device.id}/schedules${location.search}`
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
