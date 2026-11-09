import Icon from "@mui/material/Icon";
import Value from "../ValueView";
import { Device, Measurement } from "../../../interface/Asset";

interface MeasurementRowProps {
	device: Device;
	measurement: Measurement;
	deviceName?: string;
	hideIcon?: boolean;
}

export default function MeasurementRow(props: MeasurementRowProps) {
	const device = props.device;
	const measurement = props.measurement;

	return (
		<tr>
			<th>
				<div>
					{!props.hideIcon && <Icon>{measurement.icon}</Icon>}
					<span>{props.deviceName ?? measurement.name}</span>
				</div>
			</th>
			<td>
				<Value device={device} measurement={measurement} />
			</td>
		</tr>
	);
}
