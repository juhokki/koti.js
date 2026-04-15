import { useContext, useState, useEffect } from "react";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import ValuesApi from "../../../api/ValuesApi";
import { ValuesContext } from "../../../context/ValuesContext";
import ValueUtil from "../../../util/ValueUtil";
import { Device, DeviceOnlineStatus, Measurement, MeasurementType } from "../../../interface/Asset";
import { Value, ValueType } from "../../../interface/Value";

interface ValueViewProps {
	device: Device;
	measurement: Measurement;
}

export default function ValueView(props: ValueViewProps) {
	const device = props.device;
	const measurement = props.measurement;
	const type = measurement.type;
	const context = useContext(ValuesContext);
	const key = ValueUtil.createValueKey(measurement.deviceId, measurement.id);
	const [value, setValue] = useState(context.values.get(key));
	const [loading, setLoading] = useState(false);
	const [disabled, setDisabled] = useState(
		measurement.disabled ||
			device.onlineStatus === DeviceOnlineStatus.OFFLINE
	);

	useEffect(() => {
		const listener = (value: Value) => {
			setValue(value);
		};

		context.values.on(key, listener);

		return () => {
			context.values.off(key, listener);
		};
	});

	useEffect(() => {
		setDisabled(
			measurement.disabled ||
				device.onlineStatus ===DeviceOnlineStatus.OFFLINE
		);
	}, [measurement.disabled, device.onlineStatus]);

	const changeValue = async (newValue: ValueType) => {
		const oldValue = value;

		setLoading(true);

		try {
			await ValuesApi.control(
				measurement.deviceId,
				measurement.id,
				newValue
			);
			setValue({ 
				deviceId: measurement.deviceId, 
				measurementId: measurement.id,
				value: newValue,
				time: Date.now()
			} satisfies Value);
		} catch (e) {
			setValue(oldValue);
			console.log("Failed to control value.", e);
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="loader-container inline">
				<div className="loader"></div>
			</div>
		);
	}

	if (!value) {
		return <span>Ei arvoa</span>;
	}

	if (measurement.controllable) {
		if (type === MeasurementType.Number) {
			return (
				<Slider
					key={key}
					disabled={disabled}
					min={measurement.min}
					max={measurement.max}
					value={value.value as number}
					onChange={(event: Event, newValue: number | number[], activeThumb: number) => {
						setValue({ 
							deviceId: measurement.deviceId, 
							measurementId: measurement.id,
							value: newValue as number,
							time: Date.now()
						} satisfies Value);
					}}
					onChangeCommitted={(event: React.SyntheticEvent | Event, newValue: number | number[]) => { 
						changeValue(newValue as number)
							.catch((e: unknown) => { 
								console.log(e)
							}); 
					}}
					aria-label="Value slider"
				/>
			);
		} else if (type === MeasurementType.Boolean) {
			return (
				<Switch
					key={key}
					disabled={disabled}
					checked={value.value as boolean}
					onChange={(event: React.ChangeEvent<HTMLInputElement>) => { 
						changeValue(event.target.checked)
							.catch((e: unknown) => { 
								console.log(e)
							}); 
						}}
					inputProps={{ "aria-label": "Toggle value" }}
				/>
			);
		}

		return <span>Puuttuva arvon toteutus!</span>;
	} else {
		if (type === MeasurementType.Number) {
			return (
				<span>
					{value.value} {measurement.unit}
				</span>
			);
		} else if (type === MeasurementType.Boolean) {
			return <span>{value.value ? "Päällä" : "Pois"}</span>;
		}

		return <span>Puuttuva arvon toteutus!</span>;
	}
}
