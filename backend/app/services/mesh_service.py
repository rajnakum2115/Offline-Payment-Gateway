"""
Mesh simulator — in-memory Bluetooth-style mesh of virtual devices.

Five devices: alice, bob, charlie, dave, bridge.
Only bridge has hasInternet=True (the phone that walks outside).
Gossip rounds broadcast every packet to every neighbour and decrement TTL.
"""

import copy
from dataclasses import dataclass, field
from typing import Dict, List

from app.models.mesh_packet import MeshPacket


@dataclass
class VirtualDevice:
    """A simulated phone in the mesh."""
    name: str
    has_internet: bool = False
    packets: Dict[str, MeshPacket] = field(default_factory=dict)
    # packets keyed by packet_id for dedup within the device

    def hold(self, packet: MeshPacket):
        """Accept a packet if we don't already have it."""
        if packet.packet_id not in self.packets:
            p = packet.clone()
            p.hops.append(self.name)
            self.packets[packet.packet_id] = p

    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'has_internet': self.has_internet,
            'packet_count': len(self.packets),
            'packets': [p.to_dict() for p in self.packets.values()],
        }


# ── Module-level mesh singleton ────────────────────────────────────

def _build_mesh() -> List[VirtualDevice]:
    return [
        VirtualDevice(name='phone-alice'),
        VirtualDevice(name='phone-bob'),
        VirtualDevice(name='phone-charlie'),
        VirtualDevice(name='phone-dave'),
        VirtualDevice(name='phone-bridge', has_internet=True),
    ]


_devices: List[VirtualDevice] = _build_mesh()


# ── Public API ──────────────────────────────────────────────────────

def inject_packet(device_name: str, packet: MeshPacket) -> bool:
    """Place a packet onto a specific device.  Returns False if device not found."""
    for dev in _devices:
        if dev.name == device_name:
            dev.hold(packet)
            return True
    return False


def gossip_round() -> dict:
    """
    One gossip round: every device broadcasts all its packets to every
    other device.  TTL is decremented for each new recipient.

    Returns summary stats.
    """
    # Collect all (device, packet) pairs *before* mutating
    broadcasts: list[tuple[str, MeshPacket]] = []
    for dev in _devices:
        for pkt in list(dev.packets.values()):
            if pkt.ttl > 0:
                broadcasts.append((dev.name, pkt))

    new_deliveries = 0
    for source_name, pkt in broadcasts:
        for target in _devices:
            if target.name == source_name:
                continue
            if pkt.packet_id not in target.packets:
                forwarded = pkt.clone()
                forwarded.ttl = pkt.ttl - 1
                target.hold(forwarded)
                new_deliveries += 1

    return {
        'new_deliveries': new_deliveries,
        'devices': [d.to_dict() for d in _devices],
    }


def get_bridge_packets() -> List[MeshPacket]:
    """Return all packets held by devices with has_internet=True."""
    result = []
    for dev in _devices:
        if dev.has_internet:
            result.extend(dev.packets.values())
    return result


def clear_bridge_packets():
    """Remove uploaded packets from bridge devices (they've been sent)."""
    for dev in _devices:
        if dev.has_internet:
            dev.packets.clear()


def reset():
    """Clear all device buffers (but keep the devices themselves)."""
    for dev in _devices:
        dev.packets.clear()


def status() -> list[dict]:
    """Return the state of every device for the dashboard."""
    return [d.to_dict() for d in _devices]
