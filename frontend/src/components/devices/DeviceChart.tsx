import { useContext, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
	Chart,
	TimeScale,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
	ChartOptions
} from "chart.js";
import "chartjs-adapter-luxon";
import { UserContext } from "../../context/UserContext";
import CssUtil from "../../util/CssUtil";
import { Measurement, MeasurementType } from "../../interface/Asset";
import {
	DeviceChartDataObject,
	DeviceChartDataPoint
} from "../../interface/DeviceChartData";

Chart.register(TimeScale, LinearScale, PointElement, LineElement, Tooltip);

interface DeviceChartProps {
	measurement: Measurement;
	data: DeviceChartDataObject;
}

const MAX_POINTS = 500;

export function downsample(
	points: DeviceChartDataPoint[],
	maxPoints = MAX_POINTS
): DeviceChartDataPoint[] {
	const sorted = [...points].sort((a, b) => a.x.getTime() - b.x.getTime());

	if (sorted.length <= maxPoints) {
		return sorted;
	}

	const numeric = sorted.every((point) => typeof point.y === "number");

	if (!numeric) {
		return sorted.filter(
			(point, index) =>
				index === 0 ||
				index === sorted.length - 1 ||
				point.y !== sorted[index - 1]?.y
		);
	}

	const bucketCount = Math.max(1, Math.floor(maxPoints / 4));
	const start = sorted[0]?.x.getTime() ?? 0;
	const span = (sorted[sorted.length - 1]?.x.getTime() ?? 0) - start || 1;
	const buckets = new Map<number, DeviceChartDataPoint[]>();

	sorted.forEach((point) => {
		const bucket = Math.min(
			bucketCount - 1,
			Math.floor(((point.x.getTime() - start) / span) * bucketCount)
		);
		const bucketPoints = buckets.get(bucket);

		if (bucketPoints) {
			bucketPoints.push(point);
		} else {
			buckets.set(bucket, [point]);
		}
	});

	const kept = new Set<DeviceChartDataPoint>();

	buckets.forEach((bucketPoints) => {
		let min = bucketPoints[0];
		let max = bucketPoints[0];

		bucketPoints.forEach((point) => {
			if (min && Number(point.y) < Number(min.y)) {
				min = point;
			}

			if (max && Number(point.y) > Number(max.y)) {
				max = point;
			}
		});

		[
			bucketPoints[0],
			bucketPoints[bucketPoints.length - 1],
			min,
			max
		].forEach((point) => {
			if (point) {
				kept.add(point);
			}
		});
	});

	return sorted.filter((point) => kept.has(point));
}

export function getBooleanStateChanges(
	points: DeviceChartDataPoint[]
): DeviceChartDataPoint[] {
	const sorted = [...points].sort((a, b) => a.x.getTime() - b.x.getTime());

	return sorted.filter(
		(point, index) =>
			index === 0 ||
			index === sorted.length - 1 ||
			point.y !== sorted[index - 1]?.y
	);
}

// Expects points sorted by time.
export function getHighlightIndexes(
	points: DeviceChartDataPoint[],
	isBooleanMeasurement = false
): Set<number> {
	const highlights = new Set<number>();

	if (points.length === 0) {
		return highlights;
	}

	highlights.add(0);
	highlights.add(points.length - 1);

	if (isBooleanMeasurement) {
		points.forEach((point, index) => {
			if (index > 0 && point.y !== points[index - 1]?.y) {
				highlights.add(index);
			}
		});
		return highlights;
	}

	if (!points.every((point) => typeof point.y === "number")) {
		return highlights;
	}

	interface Extremes {
		min: number;
		minValue: number;
		max: number;
		maxValue: number;
	}
	const update = (extremes: Extremes, index: number, value: number) => {
		if (value < extremes.minValue) {
			extremes.min = index;
			extremes.minValue = value;
		}

		if (value > extremes.maxValue) {
			extremes.max = index;
			extremes.maxValue = value;
		}
	};
	const create = (index: number, value: number): Extremes => ({
		min: index,
		minValue: value,
		max: index,
		maxValue: value
	});

	let global: Extremes | undefined;
	const days = new Map<string, Extremes>();

	points.forEach((point, index) => {
		const value = Number(point.y);
		const key = point.x.toDateString();
		const day = days.get(key);

		if (global) {
			update(global, index, value);
		} else {
			global = create(index, value);
		}

		if (day) {
			update(day, index, value);
		} else {
			days.set(key, create(index, value));
		}
	});

	if (global) {
		highlights.add(global.min);
		highlights.add(global.max);
	}

	days.forEach((day) => {
		highlights.add(day.min);
		highlights.add(day.max);
	});

	return highlights;
}

export default function DeviceChart(props: DeviceChartProps) {
	const measurement = props.measurement;
	const source = props.data;
	const isBooleanMeasurement = measurement.type === MeasurementType.Boolean;

	const spacing = CssUtil.getVarInt("--spacing");
	const fontWeight = CssUtil.getVarInt("--font-weight");
	const highlightColor = CssUtil.getVar("--highlight-color");
	const backgroundColor = CssUtil.getVar("--background-color");
	const fontFamily = CssUtil.getVar("--font-family");
	const fontColor = CssUtil.getVar("--font-color");

	Chart.defaults.color = fontColor;
	Chart.defaults.borderColor = backgroundColor;
	Chart.defaults.backgroundColor = highlightColor;
	Chart.defaults.font.family = fontFamily;

	const pointActiveSize = 6;
	const context = useContext(UserContext);
	const user = context.user;
	const { data, highlightedPoints } = useMemo(() => {
		const sourcePoints = isBooleanMeasurement
			? getBooleanStateChanges(source.datasets[0].data)
			: source.datasets[0].data;
		const points = downsample(sourcePoints);
		const chartPoints = isBooleanMeasurement
			? points.map((point) => ({
					...point,
					y: point.y === true ? 1 : 0
				}))
			: points;

		return {
			data: {
				datasets: [{ ...source.datasets[0], data: chartPoints }]
			},
			highlightedPoints: getHighlightIndexes(
				chartPoints,
				isBooleanMeasurement
			)
		};
	}, [source, isBooleanMeasurement]);

	const options: ChartOptions<"line"> = {
		locale: user?.locale,
		animation: false,
		datasets: {
			line: {
				//lineTension: 0,
				stepped: isBooleanMeasurement ? "before" : false,
				borderWidth: 2,
				borderColor: highlightColor,
				pointBorderWidth: 0,
				pointBackgroundColor: fontColor,
				pointHoverRadius: pointActiveSize,
				pointHitRadius: (context) =>
					highlightedPoints.has(context.dataIndex) ? 3 : 0,
				pointRadius: (context) =>
					highlightedPoints.has(context.dataIndex)
						? pointActiveSize
						: 0
			}
		},
		plugins: {
			tooltip: {
				filter: (item) => highlightedPoints.has(item.dataIndex),
				backgroundColor: backgroundColor,
				titleFont: {
					weight: fontWeight
				},
				boxPadding: spacing,
				padding: spacing,
				titleMarginBottom: spacing,
				usePointStyle: true,
				callbacks: {
					label: function (context) {
						if (isBooleanMeasurement) {
							return context.parsed.y === 1 ? "Päällä" : "Pois";
						}

						return `${context.parsed.y?.toFixed(1) ?? ""} ${measurement.unit}`;
					}
				}
			}
		},
		scales: {
			y: {
				grid: {},
				ticks: {
					padding: spacing,
					...(isBooleanMeasurement
						? { stepSize: 1 }
						: { precision: 1 }),
					callback: (value, index, ticks) => {
						if (isBooleanMeasurement) {
							if (Number(value) === 1) {
								return "Päällä";
							}
							return Number(value) === 0 ? "Pois" : "";
						}

						return String(value) + ` ${measurement.unit}`;
					}
				}
			},
			x: {
				type: "time",
				grid: {},
				ticks: {
					padding: spacing
				},
				time: {
					unit: "day"
				}
			}
		}
	};

	return <Line options={options} data={data} />;
}
