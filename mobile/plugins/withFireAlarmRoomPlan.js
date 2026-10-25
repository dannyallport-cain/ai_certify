const {
  withInfoPlist,
  withPodfileProperties,
  withXcodeProject,
} = require('expo/config-plugins');

const ROOMPLAN_MIN_IOS_VERSION = '16.0';

function ensureValue(value, fallback) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function withRoomPlanInfoPlist(config, props) {
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
}

// The RoomPlan podspec declares iOS 16.0. CocoaPods skips any pod whose minimum
// is above the target platform, so the whole native module silently disappears
// from the build (and the JS bridge then reports it as "not installed").
function withRoomPlanDeploymentTarget(config) {
  const withPodfileTarget = withPodfileProperties(config, (configWithProperties) => {
    configWithProperties.modResults['ios.deploymentTarget'] = ROOMPLAN_MIN_IOS_VERSION;
    return configWithProperties;
  });

  return withXcodeProject(withPodfileTarget, (configWithProject) => {
    configWithProject.modResults.updateBuildProperty(
      'IPHONEOS_DEPLOYMENT_TARGET',
      ROOMPLAN_MIN_IOS_VERSION
    );

    return configWithProject;
  });
}

module.exports = function withFireAlarmRoomPlan(config, props = {}) {
  return withRoomPlanDeploymentTarget(withRoomPlanInfoPlist(config, props));
};

module.exports.ROOMPLAN_MIN_IOS_VERSION = ROOMPLAN_MIN_IOS_VERSION;
