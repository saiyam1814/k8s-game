import React, { useEffect, useRef } from 'react';
import { useCluster } from '../store/clusterContext';
import { PodStatus } from './types';

export function SimulationController() {
    const { state, dispatch } = useCluster();
    const processingPods = useRef(new Set());

    // Scheduler Logic
    useEffect(() => {
        const pendingPods = state.pods.filter(p => p.status === PodStatus.PENDING && !p.nodeId);

        pendingPods.forEach(pod => {
            if (processingPods.current.has(pod.id)) return;
            processingPods.current.add(pod.id);

            // Generate Plan
            const randomNode = state.nodes[0]; // Always node-1 now

            const steps = [
                {
                    description: "API Server receives request and persists Pod to Etcd",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p1-${pod.id}`, from: 'API_SERVER', to: 'ETCD' } }
                    ]
                },
                {
                    description: "Etcd confirms Pod creation to API Server",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p2-${pod.id}`, from: 'ETCD', to: 'API_SERVER' } }
                    ]
                },
                {
                    description: "Scheduler watches API Server for unassigned Pods",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p3-${pod.id}`, from: 'API_SERVER', to: 'SCHEDULER' } }
                    ]
                },
                {
                    description: `Scheduler selects ${randomNode.name} for the Pod`,
                    actions: [
                        { type: 'ADD_LOG', payload: { type: 'SCHEDULER', message: `Scheduler: Selected ${randomNode.name} for ${pod.name}`, timestamp: Date.now() } }
                    ]
                },
                {
                    description: "Scheduler sends binding info to API Server",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p4-${pod.id}`, from: 'SCHEDULER', to: 'API_SERVER' } }
                    ]
                },
                {
                    description: "API Server updates Etcd with node assignment",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p5-${pod.id}`, from: 'API_SERVER', to: 'ETCD' } }
                    ]
                },
                {
                    description: "Etcd confirms update to API Server",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p6-${pod.id}`, from: 'ETCD', to: 'API_SERVER' } },
                        { type: 'ASSIGN_POD_TO_NODE', payload: { podId: pod.id, nodeId: randomNode.id } }
                    ]
                }
            ];

            dispatch({ type: 'ENQUEUE_STEPS', payload: steps });
            processingPods.current.delete(pod.id);
        });
    }, [state.pods, state.nodes, dispatch]);

    // Kubelet Logic (Lifecycle)
    useEffect(() => {
        const scheduledPods = state.pods.filter(p => p.status === PodStatus.PENDING && p.nodeId);

        scheduledPods.forEach(pod => {
            if (processingPods.current.has(pod.id + '-kubelet')) return;
            processingPods.current.add(pod.id + '-kubelet');

            const kubeletId = `kubelet-${pod.nodeId}`;
            const cniId = `cni-${pod.nodeId}-plugin`;
            const criId = `cri-${pod.nodeId}`;
            const podIp = `172.16.0.${Math.floor(Math.random() * 200) + 10}`;

            const steps = [
                {
                    description: "Kubelet watches API Server and sees assigned Pod",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p7-${pod.id}`, from: 'API_SERVER', to: kubeletId } }
                    ]
                },
                {
                    description: "Kubelet instructs CRI to pull container image",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p8-${pod.id}`, from: kubeletId, to: criId } },
                        { type: 'UPDATE_POD_STATUS', payload: { id: pod.id, status: PodStatus.CONTAINER_CREATING } },
                        { type: 'ADD_LOG', payload: { type: 'KUBELET', message: `Kubelet: Pulling image for ${pod.name}...`, timestamp: Date.now() } }
                    ]
                },
                {
                    description: "CRI reports image pulled successfully",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p9-${pod.id}`, from: criId, to: kubeletId } }
                    ]
                },
                {
                    description: "Kubelet instructs CNI to setup networking",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p10-${pod.id}`, from: kubeletId, to: cniId } }
                    ]
                },
                {
                    description: "CNI allocates IP and connects veth pair to cni0",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p11-${pod.id}`, from: cniId, to: kubeletId } },
                        { type: 'ADD_LOG', payload: { type: 'NETWORK', message: `CNI: Allocated IP ${podIp} to ${pod.name}`, timestamp: Date.now() } }
                    ]
                },
                {
                    description: "Kubelet starts the container and updates status",
                    actions: [
                        { type: 'UPDATE_POD_STATUS', payload: { id: pod.id, status: PodStatus.RUNNING, ip: podIp } },
                        { type: 'ADD_LOG', payload: { type: 'KUBELET', message: `Kubelet: Container started for ${pod.name}`, timestamp: Date.now() } }
                    ]
                },
                {
                    description: "Kubelet reports 'Running' status to API Server",
                    actions: [
                        { type: 'ADD_PACKET', payload: { id: `p12-${pod.id}`, from: kubeletId, to: 'API_SERVER' } }
                    ]
                }
            ];

            dispatch({ type: 'ENQUEUE_STEPS', payload: steps });
            processingPods.current.delete(pod.id + '-kubelet');
        });
    }, [state.pods, state.nodes, dispatch]);

    // Service Creation Logic
    useEffect(() => {
        const services = state.services;
        if (services.length === 0) return;
        const latestService = services[services.length - 1];

        if (processingPods.current.has(latestService.id)) return;
        processingPods.current.add(latestService.id);

        const proxyId = 'proxy-node-1';
        const runningPods = state.pods.filter(p => p.status === PodStatus.RUNNING && p.name.includes('nginx'));

        const steps = [
            {
                description: "API Server persists Service to Etcd",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `svc1-${latestService.id}`, from: 'API_SERVER', to: 'ETCD' } }
                ]
            },
            {
                description: "Endpoint Controller detects Service and finds matching Pods",
                actions: [
                    { type: 'ADD_LOG', payload: { type: 'CONTROLLER', message: `Endpoints: Found ${runningPods.length} pods for ${latestService.name}`, timestamp: Date.now() } }
                ]
            },
            {
                description: "Endpoint Controller creates Endpoints object",
                actions: [
                    ...runningPods.map(pod => ({
                        type: 'ADD_ENDPOINT',
                        payload: { service: latestService.name, podIp: pod.ip, node: 'node-1' }
                    })),
                    { type: 'ADD_PACKET', payload: { id: `svc2-${latestService.id}`, from: 'CONTROLLER_MANAGER', to: 'API_SERVER' } }
                ]
            },
            {
                description: "Kube-proxy watches API Server for Service/Endpoint updates",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `svc3-${latestService.id}`, from: 'API_SERVER', to: proxyId } }
                ]
            },
            {
                description: "Kube-proxy writes iptables rules (DNAT) on Worker Node",
                actions: [
                    { type: 'ADD_IPTABLES_RULE', payload: `PREROUTING: ${latestService.clusterIP}:80 -> DNAT` },
                    { type: 'ADD_PACKET', payload: { id: `svc4-${latestService.id}`, from: proxyId, to: 'iptables' } }
                ]
            }
        ];

        dispatch({ type: 'ENQUEUE_STEPS', payload: steps });
        processingPods.current.delete(latestService.id);

    }, [state.services, state.pods, dispatch]);


    // Curl Request Logic
    useEffect(() => {
        const requests = state.controlPlane.apiServer.requests;
        if (requests.length === 0) return;

        const req = requests[requests.length - 1];
        if (processingPods.current.has(req.id)) return;
        processingPods.current.add(req.id);

        const runningPod = state.pods.find(p => p.status === PodStatus.RUNNING);

        const steps = [
            {
                description: "Client sends request to Service IP (10.96.0.10)",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `req1-${req.id}`, from: 'API_SERVER', to: 'eth0' } } // Simulating external/client hitting eth0
                ]
            },
            {
                description: "Packet enters eth0 and hits Iptables (PREROUTING)",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `req2-${req.id}`, from: 'eth0', to: 'iptables' } }
                ]
            },
            {
                description: "Iptables DNATs the packet to Pod IP",
                actions: [
                    { type: 'ADD_LOG', payload: { type: 'NETWORK', message: `Iptables: DNAT 10.96.0.10 -> ${runningPod?.ip || '172.16.0.5'}`, timestamp: Date.now() } }
                ]
            },
            {
                description: "Packet routed to cni0 (Bridge)",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `req3-${req.id}`, from: 'iptables', to: 'cni0' } }
                ]
            }
        ];

        if (runningPod) {
            steps.push({
                description: "Bridge forwards packet to Pod via veth pair",
                actions: [
                    { type: 'ADD_PACKET', payload: { id: `req4-${req.id}`, from: 'cni0', to: `pod-${runningPod.id}` } }
                ]
            });
            steps.push({
                description: "Pod processes the request and responds",
                actions: [
                    { type: 'ADD_LOG', payload: { type: 'POD', message: `Pod ${runningPod.name}: 200 OK`, timestamp: Date.now() } }
                ]
            });
        } else {
            steps.push({
                description: "Network Error: No endpoints found",
                actions: [
                    { type: 'ADD_LOG', payload: { type: 'ERROR', message: `Network: No endpoints found`, timestamp: Date.now() } }
                ]
            });
        }

        dispatch({ type: 'ENQUEUE_STEPS', payload: steps });
        processingPods.current.delete(req.id);

    }, [state.controlPlane.apiServer.requests, state.pods, dispatch]);

    return null;
}
