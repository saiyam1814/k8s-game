import React, { useEffect, useRef } from 'react';
import { usePositionRegistry } from '../store/PositionRegistry';
import { useCluster } from '../store/clusterContext';
import { Activity, Database, Cpu, Layers, Box, Server, Network, Settings, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function TrackedComponent({ id, children, className }) {
    const ref = useRef(null);
    const { registerPosition } = usePositionRegistry();

    useEffect(() => {
        const updatePosition = () => {
            if (ref.current) {
                registerPosition(id, ref.current);
            }
        };

        if (ref.current) {
            updatePosition();

            // Re-register on resize
            const resizeObserver = new ResizeObserver(updatePosition);
            resizeObserver.observe(ref.current);

            // Re-register on scroll (capture phase to catch all scrolls)
            window.addEventListener('scroll', updatePosition, { capture: true, passive: true });

            return () => {
                resizeObserver.disconnect();
                window.removeEventListener('scroll', updatePosition, { capture: true });
            };
        }
    }, [id, registerPosition]);

    return <div ref={ref} className={className}>{children}</div>;
}

export function ControlPlaneNode() {
    return (
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col gap-6">
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 pb-2">Control Plane</div>

            <div className="grid grid-cols-2 gap-6">
                <TrackedComponent id="API_SERVER" className="col-span-2">
                    <ComponentCard icon={<Activity />} name="API Server" color="text-blue-400" bg="bg-blue-500/10" />
                </TrackedComponent>

                <TrackedComponent id="ETCD">
                    <ComponentCard icon={<Database />} name="etcd" color="text-green-400" bg="bg-green-500/10" />
                </TrackedComponent>

                <TrackedComponent id="SCHEDULER">
                    <ComponentCard icon={<Cpu />} name="Scheduler" color="text-purple-400" bg="bg-purple-500/10" />
                </TrackedComponent>

                <TrackedComponent id="CONTROLLER_MANAGER" className="col-span-2">
                    <ComponentCard icon={<Layers />} name="Controller Manager" color="text-orange-400" bg="bg-orange-500/10" />
                </TrackedComponent>
            </div>
        </div>
    );
}

export function WorkerNode({ node }) {
    const { state } = useCluster();
    const pods = state.pods.filter(p => p.nodeId === node.id);

    return (
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 shadow-xl flex flex-col gap-6 min-w-[450px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{node.name}</div>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-slate-500">Ready</span>
                </div>
            </div>

            {/* Network Interface & Bridge */}
            <div className="grid grid-cols-2 gap-4">
                <TrackedComponent id="eth0">
                    <div className="bg-slate-950 border border-slate-800 rounded p-3 flex items-center gap-3">
                        <Network size={16} className="text-blue-400" />
                        <div>
                            <div className="text-xs font-bold text-slate-400">eth0</div>
                            <div className="text-[10px] text-slate-600">10.0.1.2</div>
                        </div>
                    </div>
                </TrackedComponent>
                <TrackedComponent id="cni0">
                    <div className="bg-slate-950 border border-slate-800 rounded p-3 flex items-center gap-3">
                        <Layers size={16} className="text-pink-400" />
                        <div>
                            <div className="text-xs font-bold text-slate-400">cni0</div>
                            <div className="text-[10px] text-slate-600">172.16.0.1</div>
                        </div>
                    </div>
                </TrackedComponent>
            </div>

            {/* Iptables & Endpoints */}
            <div className="grid grid-cols-2 gap-4">
                <TrackedComponent id="iptables">
                    <div className="bg-slate-950 border border-slate-800 rounded p-3 min-h-[80px]">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Shield size={10} /> Iptables (NAT)
                        </div>
                        <div className="space-y-1">
                            {state.networking.iptablesRules.length === 0 ? (
                                <div className="text-[10px] text-slate-700 italic">No rules</div>
                            ) : (
                                state.networking.iptablesRules.map((rule, i) => (
                                    <div key={i} className="text-[9px] font-mono text-green-400 truncate" title={rule}>{rule}</div>
                                ))
                            )}
                        </div>
                    </div>
                </TrackedComponent>

                <TrackedComponent id="endpoints">
                    <div className="bg-slate-950 border border-slate-800 rounded p-3 min-h-[80px]">
                        <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Database size={10} /> Endpoints
                        </div>
                        <div className="space-y-1">
                            {state.networking.endpoints.length === 0 ? (
                                <div className="text-[10px] text-slate-700 italic">No endpoints</div>
                            ) : (
                                state.networking.endpoints.map((ep, i) => (
                                    <div key={i} className="text-[9px] font-mono text-blue-400 flex justify-between">
                                        <span>{ep.service}</span>
                                        <span>{ep.podIp}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </TrackedComponent>
            </div>

            {/* Internal Components */}
            <div className="grid grid-cols-4 gap-2">
                <TrackedComponent id={`kubelet-${node.id}`}>
                    <ComponentCard icon={<Settings size={14} />} name="Kubelet" color="text-yellow-400" bg="bg-yellow-500/10" small />
                </TrackedComponent>
                <TrackedComponent id={`proxy-${node.id}`}>
                    <ComponentCard icon={<Network size={14} />} name="Proxy" color="text-cyan-400" bg="bg-cyan-500/10" small />
                </TrackedComponent>
                <TrackedComponent id={`cni-${node.id}-plugin`}>
                    <ComponentCard icon={<Activity size={14} />} name="CNI" color="text-pink-400" bg="bg-pink-500/10" small />
                </TrackedComponent>
                <TrackedComponent id={`cri-${node.id}`}>
                    <ComponentCard icon={<Shield size={14} />} name="CRI" color="text-indigo-400" bg="bg-indigo-500/10" small />
                </TrackedComponent>
            </div>

            {/* Pods Area */}
            <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 min-h-[150px]">
                <div className="text-xs text-slate-600 font-mono mb-3 uppercase tracking-wider">Pods</div>
                <div className="space-y-2">
                    <AnimatePresence>
                        {pods.map(pod => (
                            <TrackedComponent key={pod.id} id={`pod-${pod.id}`}>
                                <PodCard pod={pod} />
                            </TrackedComponent>
                        ))}
                    </AnimatePresence>
                    {pods.length === 0 && <div className="text-center text-slate-700 text-xs italic py-4">No pods running</div>}
                </div>
            </div>
        </div>
    );
}

function ComponentCard({ icon, name, color, bg, small }) {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/50 ${small ? 'py-2' : ''}`}>
            <div className={`p-2 rounded ${bg} ${color}`}>
                {React.cloneElement(icon, { size: small ? 16 : 20 })}
            </div>
            <span className={`font-medium text-slate-300 ${small ? 'text-xs' : 'text-sm'}`}>{name}</span>
        </div>
    );
}

function PodCard({ pod }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="bg-slate-800 rounded border border-slate-700 p-2 flex items-center gap-3 shadow-sm"
        >
            <div className={`w-6 h-6 rounded flex items-center justify-center ${pod.status === 'Running' ? 'bg-green-500/20 text-green-400' :
                pod.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                }`}>
                <Box size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300 truncate">{pod.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{pod.status}</div>
            </div>
        </motion.div>
    )
}
