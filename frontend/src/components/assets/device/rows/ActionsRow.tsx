import { useLocation, useNavigate, useParams } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { Device } from "../../../../interface/Asset";

interface ActionsRowProps {
	device: Device;
}

export default function ActionsRow(props: ActionsRowProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const params = useParams();
	const openActions = () => {
		Promise.resolve(
			navigate(
				`/assets/${params.assetId ?? ""}/${props.device.id}/actions${location.search}`
			)
		).catch(console.log);
	};

	return (
		<tr>
			<th>
				<div>
					<AutoAwesomeIcon />
					<span>Toiminnot</span>
				</div>
			</th>
			<td>
				<button style={{ margin: 0 }} onClick={openActions}>
					Avaa
				</button>
			</td>
		</tr>
	);
}
