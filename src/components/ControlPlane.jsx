import React from 'react';
import { Activity, Database, Cpu, Layers } from 'lucide-react';

export function ControlPlane() {
    return (
        <div className="space-y-4">
            <ControlComponent
                icon={<Activity size={16} />}
                name="API Server"
                status="Active"
                color="text-blue-400"
                bg="bg-blue-500/10"
            />
            <ControlComponent
                icon={<Database size={16} />}
                name="etcd"
                status="Active"
                color="text-green-400"
                bg="bg-green-500/10"
            />
            <ControlComponent
                icon={<Cpu size={16} />}
                name="Scheduler"
                status="Idle"
                color="text-purple-400"
                bg="bg-purple-500/10"
            />
            <ControlComponent
                icon={<Layers size={16} />}
                name="Controller Manager"
                status="Active"
                color="text-orange-400"
                bg="bg-orange-500/10"
            />
        </div>
    );
}

function ControlComponent({ icon, name, status, color, bg, onClick, hasAction }) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-800 transition-colors ${hasAction ? 'hover:bg-slate-800/50 cursor-pointer hover:border-purple-500/30' : ''}`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded ${bg} ${color}`}>
                    {icon}
                </div>
                <span className="text-sm font-medium text-slate-300">{name}</span>
            </div>
            <div className="flex items-center gap-2">
                {hasAction && <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">Click to View</span>}
                <span className="text-xs font-mono text-slate-500">{status}</span>
            </div>
        </div>
    );
}
