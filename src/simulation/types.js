export const ResourceType = {
    POD: 'Pod',
    NODE: 'Node',
    SERVICE: 'Service',
    ENDPOINT: 'Endpoint',
};

export const PodStatus = {
    PENDING: 'Pending',
    CONTAINER_CREATING: 'ContainerCreating',
    RUNNING: 'Running',
    TERMINATING: 'Terminating',
    FAILED: 'Failed',
    SUCCEEDED: 'Succeeded',
};

export const NodeStatus = {
    READY: 'Ready',
    NOT_READY: 'NotReady',
};

export const ComponentNames = {
    API_SERVER: 'kube-apiserver',
    ETCD: 'etcd',
    SCHEDULER: 'kube-scheduler',
    CONTROLLER_MANAGER: 'kube-controller-manager',
    KUBELET: 'kubelet',
    KUBE_PROXY: 'kube-proxy',
    CNI: 'CNI Plugin',
    CRI: 'Container Runtime',
};
