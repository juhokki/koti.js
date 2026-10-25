import type { MatterClient } from "@matter-server/ws-client";
import MatterCluster, { type MatterAttributeHandler } from "./MatterCluster.ts";

const parseNumber = (value: unknown) =>
	typeof value === "number" ? value : undefined;

export default class ColorControlCluster extends MatterCluster {
	static readonly CLUSTER_ID = 768;
	readonly clusterId = ColorControlCluster.CLUSTER_ID;
	protected readonly clusterName = "ColorControl";
	protected readonly attributeHandlers: Record<
		number,
		MatterAttributeHandler
	> = {
		0: {
			parseValue: parseNumber,
			control: async (
				client: MatterClient,
				nodeId: number | bigint,
				endpointId: number,
				value: unknown
			) => {
				await client.deviceCommand(
					nodeId,
					endpointId,
					this.clusterId,
					"moveToHue",
					{
						hue: Number(value),
						direction: 0,
						transitionTime: 0,
						optionsMask: {},
						optionsOverride: {}
					}
				);
			}
		},
		1: {
			parseValue: parseNumber,
			control: async (
				client: MatterClient,
				nodeId: number | bigint,
				endpointId: number,
				value: unknown
			) => {
				await client.deviceCommand(
					nodeId,
					endpointId,
					this.clusterId,
					"moveToSaturation",
					{
						saturation: Number(value),
						transitionTime: 0,
						optionsMask: {},
						optionsOverride: {}
					}
				);
			}
		},
		7: {
			parseValue: parseNumber,
			control: async (
				client: MatterClient,
				nodeId: number | bigint,
				endpointId: number,
				value: unknown
			) => {
				await client.deviceCommand(
					nodeId,
					endpointId,
					this.clusterId,
					"moveToColorTemperature",
					{
						colorTemperatureMireds: Number(value),
						transitionTime: 0,
						optionsMask: {},
						optionsOverride: {}
					}
				);
			}
		}
	};

	protected invalidValueError(measurementId: string) {
		return new Error(
			`ColorControl value must be numeric for ${measurementId}`
		);
	}
}
