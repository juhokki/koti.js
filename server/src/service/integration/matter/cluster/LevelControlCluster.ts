import type { MatterClient } from "@matter-server/ws-client";
import MatterCluster, { type MatterAttributeHandler } from "./MatterCluster.ts";

export default class LevelControlCluster extends MatterCluster {
	static readonly CLUSTER_ID = 8;
	readonly clusterId = LevelControlCluster.CLUSTER_ID;
	protected readonly clusterName = "LevelControl";
	protected readonly attributeHandlers: Record<
		number,
		MatterAttributeHandler
	> = {
		0: {
			parseValue: (value) =>
				typeof value === "number" ? value : undefined,
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
					"moveToLevel",
					{
						level: Number(value),
						transitionTime: null,
						optionsMask: {},
						optionsOverride: {}
					}
				);
			}
		}
	};

	protected invalidValueError(measurementId: string) {
		return new Error(
			`LevelControl value must be numeric for ${measurementId}`
		);
	}
}
