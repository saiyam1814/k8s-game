import React from 'react';
import { useCluster } from '../store/clusterContext';
import { usePositionRegistry } from '../store/PositionRegistry';
import { motion, AnimatePresence } from 'framer-motion';

export function ConnectionLayer() {
    const { state } = useCluster();
    const { positions } = usePositionRegistry();

    return (
        <svg className="fixed inset-0 pointer-events-none z-[50] overflow-visible w-full h-full">
            <AnimatePresence>
                {state.activeConnections.map(connection => (
                    <Connection
                        key={connection.id}
                        connection={connection}
                        positions={positions}
                    />
                ))}
            </AnimatePresence>
        </svg>
    );
}

function Connection({ connection, positions }) {
    const startPos = positions[connection.from];
    const endPos = positions[connection.to];

    if (!startPos || !endPos) return null;

    // Calculate center points (assuming elements are roughly centered at the registered position)
    // The registry stores the rect, so we can get width/height if needed, 
    // but usually it stores the element itself. 
    // Let's assume registerPosition stores the DOM element and we get rects here.
    // Actually, looking at PositionRegistry.jsx (implied), it likely stores rects or we need to get them.
    // Let's check how PacketLayer does it. 
    // PacketLayer uses positions[id] which seems to be {x, y} or rect.
    // Let's assume it's a rect-like object with x, y, width, height.

    const x1 = startPos.x + (startPos.width / 2);
    const y1 = startPos.y + (startPos.height / 2);
    const x2 = endPos.x + (endPos.width / 2);
    const y2 = endPos.y + (endPos.height / 2);

    return (
        <motion.g
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <defs>
                <marker
                    id={`arrowhead-${connection.id}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={connection.color || '#fbbf24'} />
                </marker>
            </defs>
            <motion.path
                d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 50} ${x2} ${y2}`} // Quadratic curve for nicer look
                fill="none"
                stroke={connection.color || '#fbbf24'}
                strokeWidth="3"
                strokeDasharray="5,5"
                markerEnd={`url(#arrowhead-${connection.id})`}
                style={{ filter: `drop-shadow(0 0 5px ${connection.color || '#fbbf24'})` }}
                animate={{ strokeDashoffset: [0, -10] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {connection.label && (
                <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 60}
                    fill={connection.color || '#fbbf24'}
                    textAnchor="middle"
                    className="text-xs font-mono font-bold"
                >
                    {connection.label}
                </text>
            )}
        </motion.g>
    );
}
