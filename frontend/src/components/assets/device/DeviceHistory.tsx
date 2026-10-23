import { useState, useContext, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Icon from "@mui/material/Icon";
import { AssetsContext } from "../../../context/AssetsContext";
import ValuesApi from "../../../api/ValuesApi";
import DeviceChart from "./DeviceChart";
import { DeviceChartData } from "../../../interface/DeviceChartData";
import {
	getEndOfWeek,
	getStartOfWeek,
	shortDate
} from "../../../util/TimeUtil";
import { Measurement } from "../../../interface/Asset";

export default function DeviceHistory() {
	const navigate = useNavigate();
	const location = useLocation();
	const assets = useContext(AssetsContext).assets;
	const params = useParams();
	const assetId = params.assetId;
	const asset = assets.find((r) => r.id === params.assetId, 10);
	const deviceId = params.deviceId;
	const device = asset?.devices.find((d) => d.id === deviceId);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [data, setData] = useState<DeviceChartData[]>([]);
	const [date, setDate] = useState(new Date());
	const [startDate, setStartDate] = useState(getStartOfWeek(date));
	const [endDate, setEndDate] = useState(getEndOfWeek(date));

	useEffect(() => {
		if (deviceId) {
			setLoading(true);
			setError(false);

			ValuesApi.getDeviceValues(
				deviceId,
				startDate.getTime(),
				endDate.getTime()
			)
				.then((values) => {
					const measurementValues: Record<string, DeviceChartData> =
						{};

					values.forEach((value) => {
						const deviceChartData =
							measurementValues[value.measurementId];
						const point = {
							x: new Date(value.time),
							y: value.value
						};

						if (!deviceChartData) {
							measurementValues[value.measurementId] = {
								measurementId: value.measurementId,
								data: {
									datasets: [
										{
											data: [point]
										}
									]
								}
							};
						} else {
							deviceChartData.data.datasets[0].data.push(point);
						}
					});

					setLoading(false);
					setData(Object.values(measurementValues));
				})
				.catch((e: unknown) => {
					setLoading(false);
					setError(true);
					console.log("Failed to fetch values.", e);
				});
		} else {
			setLoading(false);
			setError(true);
		}
	}, [deviceId, startDate, endDate]);

	const goBack = () => {
		if (assetId) {
			Promise.resolve(
				navigate(`/assets/${assetId}${location.search}`)
			).catch(console.log);
		}
	};
	const getMeasurement = (measurementId: string): Measurement => {
		if (device) {
			const measurement = device.measurements.find(
				(m) => m.id === measurementId
			);

			if (!measurement) {
				throw new Error("Missing measurement");
			}

			return measurement;
		} else {
			throw new Error("Missing device");
		}
	};
	const changeWeek = (change: number) => {
		const newDate = new Date(date.getTime());
		newDate.setDate(newDate.getDate() + change * 7);

		setDate(newDate);
		updateStartAndEndDate(newDate);
	};
	const updateStartAndEndDate = (date: Date) => {
		setStartDate(getStartOfWeek(date));
		setEndDate(getEndOfWeek(date));
	};

	if (loading || !device) {
		return (
			<div className="loader-container">
				<div className="loader"></div>
			</div>
		);
	}

	return (
		<section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={goBack}
						/>
					</div>
					<div>
						<Icon>{device.icon}</Icon>
						<span>{device.name}</span>
					</div>
					<div className="right"></div>
				</h2>
			</section>
			<section className="header">
				<h2>
					<div className="left">
						<ChevronLeftIcon
							className="clickable"
							onClick={() => {
								changeWeek(-1);
							}}
						/>
					</div>
					<div>
						{shortDate(startDate)} - {shortDate(endDate)}
					</div>
					<div className="right">
						<ChevronRightIcon
							className="clickable"
							onClick={() => {
								changeWeek(1);
							}}
						/>
					</div>
				</h2>
			</section>
			<section className="content">
				<div className="grid">
					{error && (
						<div className="grid-item full-width">
							<div className="centered">
								Tietojen hakeminen ei onnistunut.
							</div>
						</div>
					)}
					{data.length === 0 && (
						<div className="grid-item full-width">
							<div className="centered">
								Arvoja ei löytynyt haetulla aikavälillä.
							</div>
						</div>
					)}
					{data.map((measurementData) => (
						<div
							className="grid-item full-width"
							key={measurementData.measurementId}
						>
							<h3 className="centered">
								<Icon>
									{
										getMeasurement(
											measurementData.measurementId
										).icon
									}
								</Icon>
								<span>
									{
										getMeasurement(
											measurementData.measurementId
										).name
									}
								</span>
							</h3>
							<section>
								<DeviceChart
									measurement={getMeasurement(
										measurementData.measurementId
									)}
									data={measurementData.data}
								/>
							</section>
						</div>
					))}
				</div>
			</section>
		</section>
	);
}
