import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { Device } from "../../../../interface/Asset";

interface ActionsRowProps {
	device: Device;
}

export default function ActionsRow(props: ActionsRowProps) {
	return (
		<tr>
			<th>
				<div>
					<AutoAwesomeIcon />
					<span>Toiminnot</span>
				</div>
			</th>
			<td>
				<button style={{ margin: 0 }}>Avaa</button>
			</td>
		</tr>
	);
}
