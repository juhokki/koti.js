import React, { createContext, useState, useEffect } from "react";
import socket from "../socket";
import * as Messages from "../constants/Messages";
import { User } from "../interface/User";

interface UserContextType {
	user: User | null;
	setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType>({} as UserContextType);

const UserContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		socket.on(Messages.USER, (user: User) => {
			setUser(user);
		});

		return () => {
			socket.off(Messages.USER);
		};
	});

	return (
		<UserContext.Provider value={{ user, setUser }}>
			{children}
		</UserContext.Provider>
	);
};

export { UserContext, UserContextProvider };
