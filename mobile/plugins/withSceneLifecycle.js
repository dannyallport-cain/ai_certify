const fs = require('node:fs');
const path = require('node:path');

const { withDangerousMod, withInfoPlist } = require('@expo/config-plugins');

/**
 * iOS 26+ refuses to launch an app that is linked against the current (iOS 27) SDK unless it has
 * adopted the UIScene lifecycle. Without adoption UIKit traps in
 * `-[UIApplication workspace:didCreateScene:withTransitionContext:completion:]` via
 * `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` (EXC_BREAKPOINT / SIGTRAP).
 *
 * React Native 0.81 and the Expo 54 template still create the window in
 * `application(_:didFinishLaunchingWithOptions:)` and declare no scene manifest. The fix has three
 * parts, all applied here:
 *
 * 1. declare `UIApplicationSceneManifest` in Info.plist with `AppDelegate` as the scene delegate
 * 2. make `AppDelegate` conform to `UIWindowSceneDelegate`
 * 3. start React Native from `scene(_:willConnectTo:)` into a `UIWindow(windowScene:)`
 *
 * Step 3 matters: a window created in `didFinishLaunchingWithOptions` has no scene yet, and React
 * Native then presents into a window that never becomes visible — the app runs but shows a black
 * screen. Creating the window from the scene gives it a scene before the root view is mounted.
 *
 * The AppDelegate is written wholesale because the change moves React Native's startup call from
 * one method to another, which a targeted string patch cannot express safely.
 */

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneClassName: 'UIWindowScene',
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).AppDelegate',
      },
    ],
  },
};

const APP_DELEGATE_SOURCE = `import Expo
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate, UIWindowSceneDelegate {
  public var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    self.launchOptions = launchOptions

    bindReactNativeFactory(factory)

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // UIScene lifecycle
  //
  // The window is created from the connected scene so React Native always has a window that is
  // attached to a scene and can present its root view.
  public func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    // UIKit instantiates a *separate* object for the class named by UISceneDelegateClassName, so
    // the React Native factory created in application(_:didFinishLaunchingWithOptions:) lives on
    // the app delegate instance, not on this scene-delegate instance.
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let appWindow = UIWindow(windowScene: windowScene)
    window = appWindow

    factory.startReactNative(
      withModuleName: "main",
      in: appWindow,
      launchOptions: appDelegate.launchOptions
    )

    appWindow.makeKeyAndVisible()
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
`;

function applySceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return cfg;
  });
}

function applySceneDelegate(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectName = cfg.modRequest.projectName;

      if (!projectName) {
        return cfg;
      }

      const appDelegatePath = path.join(
        cfg.modRequest.platformProjectRoot,
        projectName,
        'AppDelegate.swift',
      );

      const directory = path.dirname(appDelegatePath);

      if (!fs.existsSync(directory)) {
        return cfg;
      }

      const existing = fs.existsSync(appDelegatePath)
        ? fs.readFileSync(appDelegatePath, 'utf8')
        : '';

      if (existing !== APP_DELEGATE_SOURCE) {
        fs.writeFileSync(appDelegatePath, APP_DELEGATE_SOURCE);
      }

      return cfg;
    },
  ]);
}

module.exports = function withSceneLifecycle(config) {
  return applySceneDelegate(applySceneManifest(config));
};

module.exports.SCENE_MANIFEST = SCENE_MANIFEST;
module.exports.APP_DELEGATE_SOURCE = APP_DELEGATE_SOURCE;
