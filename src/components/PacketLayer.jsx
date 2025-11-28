import React from 'react';
import { useCluster } from '../store/clusterContext';
import { usePositionRegistry } from '../store/PositionRegistry';
import { motion, AnimatePresence } from 'framer-motion';

export function PacketLayer() {
    const { state, dispatch } = useCluster();
    const { positions } = usePositionRegistry();

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            <AnimatePresence>
                {state.packets.map(packet => (
                    <Packet
                        key={packet.id}
                        packet={packet}
                        positions={positions}
                        onComplete={() => dispatch({ type: 'REMOVE_PACKET', payload: packet.id })}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

function Packet({ packet, positions, onComplete }) {
    let startPos = positions[packet.from];
    let endPos = positions[packet.to];

    // Handle special "INTERNET" location
    if (packet.from === 'INTERNET') {
        startPos = { x: window.innerWidth / 2, y: -50 };
    }
    if (packet.to === 'INTERNET') {
        endPos = { x: window.innerWidth / 2, y: -50 };
    }

    if (!startPos || !endPos) return null;

    return (
        <motion.div
            initial={{ x: startPos.x, y: startPos.y, opacity: 1, scale: 0 }}
            animate={{ x: endPos.x, y: endPos.y, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 2.5, ease: "easeInOut" }}
            onAnimationComplete={onComplete}
            className="absolute w-6 h-6 bg-neon-blue rounded-full shadow-[0_0_15px_#00f3ff] flex items-center justify-center -ml-3 -mt-3"
        >
            <div className="w-3 h-3 bg-white rounded-full" />
        </motion.div>
    );
}
