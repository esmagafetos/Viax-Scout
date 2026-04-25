import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export type NetworkInfo = {
  isConnected: boolean;
  ipAddress: string | null;
  type: string;
};

/**
 * Get the current network state including the device's local IP address.
 * Uses @react-native-community/netinfo (React Native compatible).
 */
export async function getNetworkInfo(): Promise<NetworkInfo> {
  const state: NetInfoState = await NetInfo.fetch();
  return {
    isConnected: state.isConnected ?? false,
    ipAddress: (state.details as any)?.ipAddress ?? null,
    type: state.type,
  };
}

/**
 * Get the local IP address of the device on the current WiFi/Ethernet network.
 * Returns null if unavailable or not connected to a local network.
 */
export async function getLocalIpAddress(): Promise<string | null> {
  const info = await getNetworkInfo();
  if (!info.isConnected) return null;
  return info.ipAddress;
}

/**
 * Subscribe to network state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToNetworkChanges(
  callback: (info: NetworkInfo) => void,
): () => void {
  return NetInfo.addEventListener((state: NetInfoState) => {
    callback({
      isConnected: state.isConnected ?? false,
      ipAddress: (state.details as any)?.ipAddress ?? null,
      type: state.type,
    });
  });
}
