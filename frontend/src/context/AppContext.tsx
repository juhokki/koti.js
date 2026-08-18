import React, { createContext, useState, useEffect } from "react";
import socket from "../socket";
import * as Messages from "../constants/Messages";

interface AppContextType {
	connected: boolean;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({
	children
}) => {
	const [connected, setConnected] = useState<boolean>(false);

	useEffect(() => {
		socket.on(Messages.CONNECT, () => {
			setConnected(true);
		});

		socket.on(Messages.DISCONNECT, () => {
			setConnected(false);
		});

		return () => {
			socket.off(Messages.CONNECT);
			socket.off(Messages.DISCONNECT);
		};
	});

	return (
		<AppContext.Provider value={{ connected }}>
			{children}
		</AppContext.Provider>
	);
};

export { AppContext, AppContextProvider };
