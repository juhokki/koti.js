import { Environment, Filesystem, Logger, StorageService } from "@matter/main";
import { GeneralCommissioning } from "@matter/main/clusters";
import { NodeId, QrPairingCodeCodec } from "@matter/main/types";
import { NodeJsFilesystem } from "@matter/nodejs";
import "@matter/nodejs-ble";
import { CommissioningController } from "@project-chip/matter.js";
import process from "node:process";
import type IntegrationConfig from "../src/service/integration/IntegrationConfig.js";
import MatterIntegration from "../src/service/integration/matter/MatterIntegration.js";
import type MatterIntegrationSettings from "../src/service/integration/matter/MatterIntegrationConfig.js";
import { readConfigFile } from "../src/util/FileUtil.js";

const qrCodeArg = process.argv[2];

if (!qrCodeArg) {
	throw new Error("QR code missing");
}

const config = readConfigFile<IntegrationConfig[]>("../conf/integrations.json");
const integrationConfig = config.find((c) => c.name === MatterIntegration.name);

if (!integrationConfig) {
	throw new Error("Config not found");
}

const settings = integrationConfig as MatterIntegrationSettings;

// TODO:
const pairing = {
	wifiSsid: "",
	wifiCredentials: ""
};

pair(qrCodeArg).catch((e: unknown) => {
	console.log(e);
});

// Pairing with Windows does not work currently: https://github.com/stoprocent/noble/issues/11
export default async function pair(qrCode: string) {
	Environment.default.vars.set("ble.enable", true);

	const environment = Environment.default;
	environment.set(
		Filesystem,
		new NodeJsFilesystem(() => settings.storageLocation)
	);

	const storageService = environment.get(StorageService);

	const controllerStorage = (
		await storageService.open("controller")
	).createContext("data");

	await controllerStorage.set("uniqueid", settings.controllerId);

	if (!qrCode) {
		throw new Error("Missing QR code!");
	}

	const pairingCodeCodec = QrPairingCodeCodec.decode(qrCode)[0];

	if (!pairingCodeCodec) {
		throw new Error("Missing QR code data");
	}

	//const shortDiscriminator = undefined;
	const longDiscriminator = pairingCodeCodec.discriminator;
	const setupPin = pairingCodeCodec.passcode;
	console.log(
		`Data extracted from pairing code: ${JSON.stringify(pairingCodeCodec)}`
	);

	const commissioningOptions = {
		regulatoryLocation:
			GeneralCommissioning.RegulatoryLocationType.IndoorOutdoor,
		regulatoryCountryCode: "FI",
		wifiNetwork: {
			wifiSsid: pairing.wifiSsid,
			wifiCredentials: pairing.wifiCredentials
		}
	};

	const commissioningController = new CommissioningController({
		environment: {
			environment,
			id: settings.controllerId
		},
		autoConnect: false,
		adminFabricLabel: "Koti.js"
	});

	await commissioningController.start();

	if (!commissioningController.isCommissioned()) {
		const options = {
			commissioning: commissioningOptions,
			discovery: {
				identifierData: { longDiscriminator },
				discoveryCapabilities: {
					ble: true
				}
			},
			passcode: setupPin
		};

		console.log(`Commissioning ... ${JSON.stringify(options)}`);

		const nodeId = await commissioningController.commissionNode(options);

		console.log(
			`Commissioning successfully done with nodeId ${nodeId.toString()}`
		);
	}

	const nodes = commissioningController.getCommissionedNodes();
	console.log("Found commissioned nodes:", Logger.toJSON(nodes));

	const firstNode = nodes[0];

	if (!firstNode) {
		throw new Error("No commissioned nodes");
	}

	const nodeId = NodeId(firstNode);
	if (!nodes.includes(nodeId)) {
		throw new Error(
			`Node ${nodeId.toString()} not found in commissioned nodes`
		);
	}

	const node = await commissioningController.connectNode(nodeId);
	const devices = node.getDevices();

	return devices;

	/*
	try {
		const nodes = commissioningController.getCommissionedNodes();
		console.log("Found commissioned nodes:", Logger.toJSON(nodes));

		const nodeId = NodeId(nodes[0]);
		if (!nodes.includes(nodeId)) {
			throw new Error(`Node ${nodeId} not found in commissioned nodes`);
		}
		const node = await commissioningController.connectNode(nodeId);
		node.events.attributeChanged.on(
			({ path: { nodeId: nodeId2, clusterId, endpointId, attributeName }, value }) => console.log(
				`attributeChangedCallback ${nodeId2}: Attribute ${endpointId}/${clusterId}/${attributeName} changed to ${JSON.stringify(value)}`
			)
		);
		node.events.eventTriggered.on(
			({ path: { nodeId: nodeId2, clusterId, endpointId, eventName }, events }) => console.log(
				`eventTriggeredCallback ${nodeId2}: Event ${endpointId}/${clusterId}/${eventName} triggered with ${JSON.stringify(events)}`
			)
		);
		node.events.stateChanged.on((info2) => {
			switch (info2) {
				case NodeStates.Connected:
					console.log(`state changed: Node ${nodeId} connected`);
					break;
				case NodeStates.Disconnected:
					console.log(`state changed: Node ${nodeId} disconnected`);
					break;
				case NodeStates.Reconnecting:
					console.log(`state changed: Node ${nodeId} reconnecting`);
					break;
				case NodeStates.WaitingForDeviceDiscovery:
					console.log(`state changed: Node ${nodeId} waiting for device discovery`);
					break;
			}
		});
		node.events.structureChanged.on(() => {
			console.log(`Node ${nodeId} structure changed`);
		});
		//await node.events.initialized;
		node.logStructure();
		const descriptor = node.getRootClusterClient(DescriptorCluster);
		if (descriptor !== void 0) {
			console.log(await descriptor.attributes.deviceTypeList.get());
			console.log(await descriptor.getServerListAttribute());
		} else {
			console.log("No Descriptor Cluster found. This should never happen!");
		}
		const info = node.getRootClusterClient(BasicInformationCluster);
		if (info !== void 0) {
			console.log(await info.getProductNameAttribute());
		} else {
			console.log("No BasicInformation Cluster found. This should never happen!");
		}
		const devices = node.getDevices();
		if (devices[0] && devices[0].number === 1) {
			const onOff = devices[0].getClusterClient(OnOff.Complete);
			if (onOff !== void 0) {
				let onOffStatus = await onOff.getOnOffAttribute();
				console.log("initial onOffStatus", onOffStatus);
				onOff.addOnOffAttributeListener((value) => {
					console.log("subscription onOffStatus", value);
					onOffStatus = value;
				});
				setInterval(() => {
					onOff.toggle().then(() => {
						onOffStatus = !onOffStatus;
						console.log("onOffStatus", onOffStatus);
					}).catch((error) => logger.error(error));
				}, 6e4);
			}
		}
	} catch (e) {
		console.log(e);
	}
	*/
}
