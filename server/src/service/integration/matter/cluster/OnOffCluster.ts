import type { MatterClient } from "@matter-server/ws-client";
import MatterCluster, { type MatterAttributeHandler } from "./MatterCluster.ts";

export default class OnOffCluster extends MatterCluster {
	static readonly CLUSTER_ID = 6;
	readonly clusterId = OnOffCluster.CLUSTER_ID;
	protected readonly clusterName = "OnOff";
	protected readonly attributeHandlers: Record<
		number,
		MatterAttributeHandler
	> = {
		0: {
			parseValue: (value) =>
				typeof value === "boolean" ? value : undefined,
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
					value === true ? "on" : "off"
				);
			}
		}
	};

	protected invalidValueError(measurementId: string) {
		return new Error(`OnOff value must be boolean for ${measurementId}`);
	}
}
