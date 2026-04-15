const { withInfoPlist } = require('expo/config-plugins');

const ROOMPLAN_MIN_IOS_VERSION = '16.0';

function ensureValue(value, fallback) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

module.exports = function withFireAlarmRoomPlan(config, props = {}) {
  return withInfoPlist(config, (configWithInfoPlist) => {
    const infoPlist = configWithInfoPlist.modResults;

    infoPlist.NSCameraUsageDescription = ensureValue(
      infoPlist.NSCameraUsageDescription,
      props.cameraPermission ||
        'This app uses the camera to scan rooms and identify fire alarm devices.'
    );

    infoPlist.NSRoomPlanUsageDescription = ensureValue(
      infoPlist.NSRoomPlanUsageDescription,
      props.roomPlanPermission ||
        'This app uses RoomPlan to capture indoor room geometry for fire alarm planning.'
    );

    infoPlist.FireAlarmRoomPlanMinimumIOSVersion = ROOMPLAN_MIN_IOS_VERSION;
    infoPlist.FireAlarmRoomPlanNotes =
      'RoomPlan requires a physical iOS device running iOS 16.0+ with LiDAR-capable hardware. Simulator support is not available for real scans.';

    return configWithInfoPlist;
  });
};

module.exports.ROOMPLAN_MIN_IOS_VERSION = ROOMPLAN_MIN_IOS_VERSION;