import React, { createContext, useState, useEffect } from "react";
import socket from "../socket";
import * as Messages from "../constants/Messages";
import { Asset, Device } from "../interface/Asset";

interface AssetsContextType {
	assets: Asset[];
	devices: Device[];
	loading?: boolean;
}

const AssetsContext = createContext<AssetsContextType>({} as AssetsContextType);

const AssetsContextProvider: React.FC<{ children: React.ReactNode }> = ({
	children
}) => {
	const [assets, setAssets] = useState<Asset[]>([]);
	const [devices, setDevices] = useState<Device[]>([]);
	const [assetsReceived, setAssetsReceived] = useState(false);
	const [devicesReceived, setDevicesReceived] = useState(false);

	useEffect(() => {
		socket.on(Messages.ASSETS, (assets: Asset[]) => {
			setAssets(assets);
			setAssetsReceived(true);
		});
		const receiveDevices = (devices: Device[]) => {
			setDevices(devices);
			setDevicesReceived(true);
		};
		socket.on(Messages.DEVICES, receiveDevices);

		return () => {
			socket.off(Messages.ASSETS);
			socket.off(Messages.DEVICES, receiveDevices);
		};
	}, []);

	return (
		<AssetsContext.Provider
			value={{
				assets,
				devices,
				loading: !assetsReceived || !devicesReceived
			}}
		>
			{children}
		</AssetsContext.Provider>
	);
};

export { AssetsContext, AssetsContextProvider };
