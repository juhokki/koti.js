import { useContext, useEffect, useState } from "react";
import Icon from "@mui/material/Icon";
import Value from "../ValueView";
import { Device, Measurement } from "../../../../interface/Asset";
import { ValuesContext } from "../../../../context/ValuesContext";
import ValueUtil from "../../../../util/ValueUtil";
import { timeElapsed } from "../../../../util/TimeUtil";
import { Value as MeasurementValue } from "../../../../interface/Value";

interface MeasurementRowProps {
	device: Device;
	measurement: Measurement;
	deviceName?: string;
	showLastUpdated?: boolean;
	hideIcon?: boolean;
}

function MeasurementLastUpdated(props: {
	device: Device;
	measurement: Measurement;
}) {
	const context = useContext(ValuesContext);
	const key = ValueUtil.createValueKey(props.device.id, props.measurement.id);
	const [updatedAt, setUpdatedAt] = useState(
		context.values.get(key)?.time ?? 0
	);

	useEffect(() => {
		setUpdatedAt(context.values.get(key)?.time ?? 0);

		const listener = (value: MeasurementValue) => {
			setUpdatedAt(value.time);
		};

		context.values.on(key, listener);

		return () => {
			context.values.off(key, listener);
		};
	}, [context.values, key]);

	return (
		<td className="hide-on-small-screen">
			<span title="Päivitetty">{timeElapsed(updatedAt)}</span>
		</td>
	);
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
			{props.showLastUpdated && (
				<MeasurementLastUpdated
					device={device}
					measurement={measurement}
				/>
			)}
		</tr>
	);
}
