import React, { createContext, useState, useEffect } from "react";
import socket from "../socket";
import * as Messages from "../constants/Messages";
import { Asset } from "../interface/Asset";

interface AssetsContextType {
	assets: Asset[];
}

const AssetsContext = createContext<AssetsContextType>({} as AssetsContextType);

const AssetsContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [assets, setAssets] = useState<Asset[]>([]);

	useEffect(() => {
		socket.on(Messages.ASSETS, (assets: Asset[]) => {
			setAssets(assets);
		});

		return () => {
			socket.off(Messages.ASSETS);
		};
	});

	return (
		<AssetsContext.Provider value={{ assets }}>
			{children}
		</AssetsContext.Provider>
	);
};

export { AssetsContext, AssetsContextProvider };
