import React, { createContext, useContext, useState, useCallback } from 'react';

const PositionContext = createContext();

export function PositionRegistryProvider({ children }) {
    const [positions, setPositions] = useState({});

    const registerPosition = useCallback((id, element) => {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        setPositions(prev => ({
            ...prev,
            [id]: {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            }
        }));
    }, []);

    return (
        <PositionContext.Provider value={{ positions, registerPosition }}>
            {children}
        </PositionContext.Provider>
    );
}

export function usePositionRegistry() {
    return useContext(PositionContext);
}
