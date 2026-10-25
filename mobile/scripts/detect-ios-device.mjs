/**
 * Selects the iOS device that a build should target from `devicectl` JSON output.
 *
 * Usage: node detect-ios-device.mjs <devicectl-json-path>
 *
 * Prints "<udid>\t<name>\t<osVersion>" for the best paired, booted, physical
 * iOS device, or nothing when no such device is present. `devicectl` reports a
 * usable phone as "available (paired)" with a tunnel that may still read
 * "disconnected" over Wi-Fi, so tunnel state is used for ranking only.
 */
import { readFileSync } from "node:fs";

const FIELD_SEPARATOR = "\t";

const TUNNEL_CONNECTED_SCORE = 4;
const LOCAL_NETWORK_SCORE = 1;

const STARTUP_FAILURE = 2;
const READ_FAILURE = 3;

function isPhysicalIosDevice(device) {
  const hardware = device.hardwareProperties ?? {};
  const properties = device.deviceProperties ?? {};
  const connection = device.connectionProperties ?? {};

  return (
    hardware.reality === "physical" &&
    hardware.platform === "iOS" &&
    properties.bootState === "booted" &&
    connection.pairingState === "paired"
  );
}

function scoreDevice(device) {
  const connection = device.connectionProperties ?? {};
  let score = 0;

  if (connection.tunnelState === "connected") {
    score += TUNNEL_CONNECTED_SCORE;
  }

  if (connection.transportType === "localNetwork") {
    score += LOCAL_NETWORK_SCORE;
  }

  return score;
}

function describeDevice(device) {
  const udid = device.hardwareProperties?.udid ?? device.identifier ?? "";
  const name =
    device.deviceProperties?.name ??
    device.hardwareProperties?.marketingName ??
    "";
  const osVersion = device.deviceProperties?.osVersionNumber ?? "";

  return [udid, name, osVersion].join(FIELD_SEPARATOR);
}

function main() {
  const jsonPath = process.argv[2];

  if (!jsonPath) {
    process.stderr.write("usage: detect-ios-device.mjs <devicectl-json-path>\n");
    process.exit(STARTUP_FAILURE);
  }

  let parsed;

  try {
    parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (error) {
    process.stderr.write(`Could not read devicectl output: ${error.message}\n`);
    process.exit(READ_FAILURE);
  }

  const candidates = (parsed?.result?.devices ?? [])
    .filter(isPhysicalIosDevice)
    .sort((left, right) => scoreDevice(right) - scoreDevice(left));

  if (candidates.length === 0) {
    return;
  }

  process.stdout.write(`${describeDevice(candidates[0])}\n`);
}

main();
