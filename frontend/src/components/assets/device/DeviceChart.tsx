import { useContext } from "react";
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
import { UserContext } from "../../../context/UserContext";
import CssUtil from "../../../util/CssUtil";
import { Measurement } from "../../../interface/Asset";
import { DeviceChartDataObject } from "../../../interface/DeviceChartData";

Chart.register(TimeScale, LinearScale, PointElement, LineElement, Tooltip);

interface DeviceChartProps {
	measurement: Measurement;
	data: DeviceChartDataObject;
}

export default function DeviceChart(props: DeviceChartProps) {
	const measurement = props.measurement;
	const data = props.data;

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
	const highlightedPoints = (() => {
		const highlights: number[] = [];
		const datasetData = data.datasets[0].data;
		const values = datasetData.map((point) => point.y);
		const numberValues = values.map((value) => Number(value)); // TODO: String value handling
		const min = Math.min(...numberValues);
		const max = Math.max(...numberValues);

		let maxUsed = false;
		let minUsed = false;

		datasetData.forEach((point, index) => {
			if (index === 0 || index - 1 === datasetData.length) {
				highlights.push(index);
			} else {
				if (point.y === max && !maxUsed) {
					highlights.push(index);
					maxUsed = true;
				} else if (point.y === min && !minUsed) {
					highlights.push(index);
					minUsed = true;
				}
			}
		});

		return highlights;
	})();

	const options: ChartOptions<"line"> = {
		locale: user?.locale,
		datasets: {
			line: {
				//lineTension: 0,
				borderWidth: 2,
				borderColor: highlightColor,
				pointBorderWidth: 0,
				pointBackgroundColor: fontColor,
				pointHoverRadius: pointActiveSize,
				pointHitRadius: 3,
				pointRadius: (context) => {
					if (highlightedPoints.includes(context.dataIndex)) {
						return pointActiveSize;
					} else {
						return 0;
					}
				}
			}
		},
		plugins: {
			tooltip: {
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
						// TODO: Check logic

						let label = context.dataset.label ?? "";

						if (label) {
							label += " c";
						}

						label +=
							(context.parsed.y?.toFixed(1) ?? "") +
							` ${measurement.unit}`;

						return label;
					}
				}
			}
		},
		scales: {
			y: {
				grid: {},
				ticks: {
					padding: spacing,
					precision: 1,
					callback: (value, index, ticks) => {
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
