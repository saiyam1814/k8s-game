import React from 'react';
import { useCluster } from '../store/clusterContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Box } from 'lucide-react';

export function Visualizer() {
    const { state } = useCluster();

    return (
        <div className="p-8 h-full w-full overflow-auto flex items-center justify-center gap-12">
            <AnimatePresence>
                {state.nodes.map((node) => (
                    <Node key={node.id} node={node} pods={state.pods.filter(p => p.nodeId === node.id)} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function Node({ node, pods }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-64 min-h-[300px] bg-slate-900/80 backdrop-blur border border-slate-700 rounded-xl p-4 flex flex-col gap-4 shadow-2xl relative group"
        >
            {/* Node Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Server size={20} className="text-blue-400" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-200 text-sm">{node.name}</h3>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs text-slate-500">{node.status}</span>
                    </div>
                </div>
            </div>

            {/* Pods Container */}
            <div className="flex-1 bg-slate-950/50 rounded-lg p-3 space-y-3 border border-slate-800/50 min-h-[100px]">
                <div className="text-xs text-slate-600 font-mono mb-2 uppercase tracking-wider">Pods</div>
                <AnimatePresence>
                    {pods.map(pod => (
                        <Pod key={pod.id} pod={pod} />
                    ))}
                </AnimatePresence>
                {pods.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-700 text-xs italic">
                        No pods running
                    </div>
                )}
            </div>

            {/* Node Stats (Fake) */}
            <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-slate-800">
                <div className="bg-slate-800/50 rounded p-2">
                    <div className="text-[10px] text-slate-500 uppercase">CPU</div>
                    <div className="text-xs font-mono text-blue-400">12%</div>
                </div>
                <div className="bg-slate-800/50 rounded p-2">
                    <div className="text-[10px] text-slate-500 uppercase">MEM</div>
                    <div className="text-xs font-mono text-purple-400">2.4GB</div>
                </div>
            </div>
        </motion.div>
    );
}

function Pod({ pod }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="bg-slate-800 rounded border border-slate-700 p-3 flex items-center gap-3 shadow-sm hover:border-blue-500/50 transition-colors cursor-pointer"
        >
            <div className={`w-8 h-8 rounded flex items-center justify-center ${pod.status === 'Running' ? 'bg-green-500/20 text-green-400' :
                    pod.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                }`}>
                <Box size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300 truncate">{pod.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{pod.status}</div>
            </div>
        </motion.div>
    )
}
