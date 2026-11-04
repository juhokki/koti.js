import cron, { type ScheduledTask } from "node-cron";
import fetch from "node-fetch";
import IntegrationBase from "../IntegrationBase.ts";
import Value from "../../../model/Value.ts";
import DeviceType from "../../../constants/DeviceType.ts";
import type ElectricityPriceIntegrationConfig from "./ElectricityPriceIntegrationConfig.ts";
import type ServiceLocator from "../../ServiceLocator.ts";
import logger from "../../../util/logger.ts";
import type IntegrationParameter from "../IntegrationParameter.ts";

export interface ElectricityPriceEntry {
	Rank: number | null;
	DateTime: string | null;
	PriceNoTax: number | null;
	PriceWithTax: number | null;
}

const SLOT_MS = 15 * 60_000;

interface PriceSlot {
	start: number;
	price: number;
}

function isSameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function average(slots: PriceSlot[]) {
	return slots.reduce((sum, slot) => sum + slot.price, 0) / slots.length;
}

// API prices are in euros, measurements are stored in cents.
function toCents(euros: number) {
	return Number((euros * 100).toFixed(2));
}

export default class ElectricityPriceIntegration extends IntegrationBase {
	options: ElectricityPriceIntegrationConfig;
	task: ScheduledTask | undefined;
	lastUpdated: string | undefined;

	constructor(
		services: ServiceLocator,
		options: ElectricityPriceIntegrationConfig
	) {
		super(services);

		this.options = options;
	}

	override getParameters(): IntegrationParameter[] {
		return [
			{ name: "Region", value: this.options.region },
			{ name: "Schedule", value: this.options.cron },
			{ name: "Last updated", value: this.lastUpdated ?? "Never" }
		];
	}

	override async start() {
		this.task = cron.schedule(this.options.cron, () => {
			this.update().catch((e: unknown) => {
				logger.error(e, "Failed to fetch electricity prices.");
			});
		});

		await this.update();
	}

	override async stop() {
		if (this.task) {
			await this.task.stop();
		}
	}

	async update() {
		const url = `https://api.spot-hinta.fi/TodayAndDayForward?region=${encodeURIComponent(this.options.region)}&priceResolution=15`;
		const response = await fetch(url, { method: "GET" });

		if (!response.ok) {
			throw new Error(
				`Fetching electricity prices failed with status ${String(response.status)}`
			);
		}

		const data = (await response.json()) as ElectricityPriceEntry[];
		const slots: PriceSlot[] = [];

		for (const entry of data) {
			if (entry.DateTime === null || entry.PriceWithTax === null) {
				continue;
			}

			slots.push({
				start: new Date(entry.DateTime).getTime(),
				price: entry.PriceWithTax
			});
		}

		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const nowMs = now.getTime();
		const current = slots.find(
			(slot) => slot.start <= nowMs && nowMs < slot.start + SLOT_MS
		);
		const today = slots.filter((slot) =>
			isSameDay(new Date(slot.start), now)
		);
		const tomorrowSlots = slots.filter((slot) =>
			isSameDay(new Date(slot.start), tomorrow)
		);

		const values: Value[] = [];
		const devices = this.services
			.getAssetService()
			.getDevicesWithType(DeviceType.ElectricityPriceIntegration);

		for (const { id: deviceId } of devices) {
			if (current) {
				values.push(
					new Value(deviceId, "currentPrice", toCents(current.price))
				);
			}

			if (today.length > 0) {
				values.push(
					new Value(
						deviceId,
						"averagePriceToday",
						toCents(average(today))
					)
				);
			}

			if (tomorrowSlots.length > 0) {
				values.push(
					new Value(
						deviceId,
						"averagePriceTomorrow",
						toCents(average(tomorrowSlots))
					)
				);
			}
		}

		await this.services.getDataService().write(values);
		this.lastUpdated = new Date().toISOString();
	}
}
