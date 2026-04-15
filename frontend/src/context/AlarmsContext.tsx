import React, { createContext, useState, useEffect } from "react";
import socket from "../socket";
import * as Messages from "../constants/Messages";
import { Alarm } from "../interface/Alarm";

interface AlarmsContextType {
	alarms: Alarm[] | null;
}

const AlarmsContext = createContext<AlarmsContextType>({} as AlarmsContextType);

const AlarmsContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [alarms, setAlarms] = useState<Alarm[] | null>(null);

	useEffect(() => {
		socket.on(Messages.ALARMS, (alarms: Alarm[]) => {
			setAlarms(alarms);
		});

		return () => {
			socket.off(Messages.ALARMS);
		};
	});

	return (
		<AlarmsContext.Provider value={{ alarms }}>
			{children}
		</AlarmsContext.Provider>
	);
};

export { AlarmsContext, AlarmsContextProvider };
