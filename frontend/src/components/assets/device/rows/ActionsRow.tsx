import { useLocation, useNavigate } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { Device } from "../../../../interface/Asset";
import useAssetPath from "../../../../hooks/useAssetPath";

interface ActionsRowProps {
	device: Device;
}

export default function ActionsRow(props: ActionsRowProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { assetPath } = useAssetPath();
	const openActions = () => {
		Promise.resolve(
			navigate(
				`${assetPath}/${props.device.id}/actions${location.search}`
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
