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

export default class ElectricityPriceIntegration extends IntegrationBase {
	options: ElectricityPriceIntegrationConfig;
	task: ScheduledTask | undefined;
	currentPriceTask: ScheduledTask | undefined;
	lastUpdated: string | undefined;
	private priceSlots: PriceSlot[] = [];
	private currentPriceSlotStart: number | undefined;

	constructor(
		services: ServiceLocator,
		options: ElectricityPriceIntegrationConfig
	) {
		super(services);

		this.options = options;
	}

	private isSameDay(a: Date, b: Date) {
		return (
			a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate()
		);
	}

	private average(slots: PriceSlot[]) {
		return slots.reduce((sum, slot) => sum + slot.price, 0) / slots.length;
	}

	private toCents(euros: number) {
		return Number((euros * 100).toFixed(2));
	}

	private getCurrentPriceSlot(timestamp: number) {
		return this.priceSlots.find(
			(slot) =>
				slot.start <= timestamp && timestamp < slot.start + SLOT_MS
		);
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
		this.currentPriceTask = cron.schedule("*/15 * * * *", () => {
			this.updateCurrentPrice().catch((e: unknown) => {
				logger.error(
					e,
					"Failed to update the current electricity price."
				);
			});
		});

		await this.update();
	}

	override async stop() {
		if (this.task) {
			await this.task.stop();
		}
		if (this.currentPriceTask) {
			await this.currentPriceTask.stop();
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

		this.priceSlots = slots;
		logger.debug(
			{ slotCount: slots.length },
			"Fetched electricity prices."
		);
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const nowMs = now.getTime();
		const current = this.getCurrentPriceSlot(nowMs);
		const currentPriceChanged =
			current !== undefined &&
			current.start !== this.currentPriceSlotStart;
		const today = slots.filter((slot) =>
			this.isSameDay(new Date(slot.start), now)
		);
		const tomorrowSlots = slots.filter((slot) =>
			this.isSameDay(new Date(slot.start), tomorrow)
		);

		const values: Value[] = [];
		const devices = this.services
			.getAssetService()
			.getDevicesWithType(DeviceType.ElectricityPriceIntegration);

		for (const { id: deviceId } of devices) {
			if (currentPriceChanged) {
				values.push(
					new Value(
						deviceId,
						"currentPrice",
						this.toCents(current.price)
					)
				);
			}

			if (today.length > 0) {
				values.push(
					new Value(
						deviceId,
						"averagePriceToday",
						this.toCents(this.average(today))
					)
				);
			}

			if (tomorrowSlots.length > 0) {
				values.push(
					new Value(
						deviceId,
						"averagePriceTomorrow",
						this.toCents(this.average(tomorrowSlots))
					)
				);
			}
		}

		await this.services.getDataService().write(values);
		if (currentPriceChanged) {
			this.currentPriceSlotStart = current.start;
		}
		this.lastUpdated = new Date().toISOString();
	}

	async updateCurrentPrice() {
		const current = this.getCurrentPriceSlot(Date.now());
		if (!current || current.start === this.currentPriceSlotStart) {
			return;
		}

		const devices = this.services
			.getAssetService()
			.getDevicesWithType(DeviceType.ElectricityPriceIntegration);
		if (devices.length === 0) {
			return;
		}

		await this.services
			.getDataService()
			.write(
				devices.map(
					({ id: deviceId }) =>
						new Value(
							deviceId,
							"currentPrice",
							this.toCents(current.price)
						)
				)
			);
		this.currentPriceSlotStart = current.start;
	}
}
