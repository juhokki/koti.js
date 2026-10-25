import type { MatterClient } from "@matter-server/ws-client";

export interface MatterMeasurementAddress {
	measurementId: string;
	endpointId: number;
	clusterId: number;
	attributeId: number;
}

export type MatterValue = boolean | number;

export interface MatterAttributeHandler {
	parseValue(value: unknown): MatterValue | undefined;
	control(
		client: MatterClient,
		nodeId: number | bigint,
		endpointId: number,
		value: unknown
	): Promise<void>;
}

export default abstract class MatterCluster {
	abstract readonly clusterId: number;
	protected abstract readonly clusterName: string;
	protected abstract readonly attributeHandlers: Record<
		number,
		MatterAttributeHandler
	>;

	protected abstract invalidValueError(measurementId: string): Error;

	parseValue(attributeId: number, value: unknown) {
		return this.attributeHandlers[attributeId]?.parseValue(value);
	}

	supportsAttribute(attributeId: number) {
		return this.attributeHandlers[attributeId] !== undefined;
	}

	async control(
		client: MatterClient,
		nodeId: number | bigint,
		measurement: MatterMeasurementAddress,
		value: unknown
	) {
		const handler = this.attributeHandlers[measurement.attributeId];
		if (!handler) {
			throw new Error(
				`Unsupported ${this.clusterName} attribute ${String(measurement.attributeId)}`
			);
		}
		const parsedValue = handler.parseValue(value);
		if (parsedValue === undefined) {
			throw this.invalidValueError(measurement.measurementId);
		}
		await handler.control(
			client,
			nodeId,
			measurement.endpointId,
			parsedValue
		);
	}

	async restorePreviousState(
		client: MatterClient,
		nodeId: number | bigint,
		measurement: MatterMeasurementAddress,
		storedValue: unknown,
		currentValue: unknown
	) {
		const handler = this.attributeHandlers[measurement.attributeId];
		if (!handler) {
			return false;
		}
		const parsedStoredValue = handler.parseValue(storedValue);
		const parsedCurrentValue = handler.parseValue(currentValue);
		if (
			parsedStoredValue === undefined ||
			parsedCurrentValue === undefined
		) {
			return false;
		}
		await handler.control(
			client,
			nodeId,
			measurement.endpointId,
			parsedStoredValue
		);
		return true;
	}
}
