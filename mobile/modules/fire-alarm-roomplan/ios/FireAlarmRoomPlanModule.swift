import AVFoundation
import ExpoModulesCore
import Foundation
import simd

#if canImport(UIKit)
import UIKit
#endif

#if canImport(RoomPlan)
import RoomPlan
#endif

private enum FireAlarmRoomPlanLifecycleStatus: String {
  case idle
  case starting
  case scanning
  case processing
  case completed
  case stopped
  case error
}

private enum FireAlarmRoomPlanEventName {
  static let status = "FireAlarmRoomPlan:status"
  static let progress = "FireAlarmRoomPlan:progress"
  static let detection = "FireAlarmRoomPlan:detection"
  static let session = "FireAlarmRoomPlan:session"
}

private struct FireAlarmRoomPlanSupportSnapshot {
  let isSupported: Bool
  let platform: String
  let minimumIOSVersion: String
  let requiresPhysicalDevice: Bool
  let hasCameraPermission: Bool?
  let roomPlanAvailable: Bool
  let roomCaptureSessionSupported: Bool
  let reason: String?

  func payload() -> [String: Any] {
    [
      "isSupported": isSupported,
      "supported": isSupported,
      "platform": platform,
      "reason": reason ?? NSNull(),
      "supportsRoomCapture": isSupported,
      "supportsDevicePoseTracking": isSupported,
      "supportsLiveProgressEvents": isSupported,
      "supportsDetectionEvents": false,
      "supportsSessionExport": true,
      "requiredPermissions": ["camera"],
      "metadata": [
        "minimumIOSVersion": minimumIOSVersion,
        "requiresPhysicalDevice": requiresPhysicalDevice,
        "roomPlanAvailable": roomPlanAvailable,
        "roomCaptureSessionSupported": roomCaptureSessionSupported,
        "hasCameraPermission": boxed(hasCameraPermission),
      ],
    ]
  }
}

private struct FireAlarmRoomPlanCaptureMetrics {
  var frameCount: Int = 0
  var wallCount: Int = 0
  var roomCount: Int = 0
  var openingCount: Int = 0
  var objectCount: Int = 0

  func payload() -> [String: Any] {
    [
      "frameCount": frameCount,
      "wallCount": wallCount,
      "roomCount": roomCount,
      "openingCount": openingCount,
      "objectCount": objectCount,
    ]
  }
}

#if canImport(RoomPlan) && canImport(UIKit)
@available(iOS 16.0, *)
private final class FireAlarmRoomPlanCaptureViewController: UIViewController {
  let captureView = RoomCaptureView(frame: .zero)

  private let topOverlay = UIVisualEffectView(effect: UIBlurEffect(style: .systemChromeMaterialDark))
  private let titleLabel = UILabel()
  private let instructionLabel = UILabel()
  private let cancelButton = UIButton(type: .system)
  private let finishButton = UIButton(type: .system)

  var onCancel: (() -> Void)?
  var onFinish: (() -> Void)?

  override func viewDidLoad() {
    super.viewDidLoad()

    modalPresentationStyle = .fullScreen
    view.backgroundColor = .black

    captureView.translatesAutoresizingMaskIntoConstraints = false
    captureView.isModelEnabled = true
    view.addSubview(captureView)

    topOverlay.translatesAutoresizingMaskIntoConstraints = false
    topOverlay.layer.cornerRadius = 20
    topOverlay.clipsToBounds = true
    view.addSubview(topOverlay)

    titleLabel.translatesAutoresizingMaskIntoConstraints = false
    titleLabel.text = "Room capture"
    titleLabel.font = .preferredFont(forTextStyle: .headline)
    titleLabel.textColor = .white
    titleLabel.numberOfLines = 1

    instructionLabel.translatesAutoresizingMaskIntoConstraints = false
    instructionLabel.text = "Move slowly and keep the full room in view."
    instructionLabel.font = .preferredFont(forTextStyle: .subheadline)
    instructionLabel.textColor = .white
    instructionLabel.numberOfLines = 0

    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    cancelButton.setTitle("Cancel", for: .normal)
    cancelButton.tintColor = .white
    cancelButton.backgroundColor = UIColor.white.withAlphaComponent(0.18)
    cancelButton.layer.cornerRadius = 12
    cancelButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
    cancelButton.addTarget(self, action: #selector(handleCancel), for: .touchUpInside)

    finishButton.translatesAutoresizingMaskIntoConstraints = false
    finishButton.setTitle("Finish", for: .normal)
    finishButton.tintColor = .white
    finishButton.backgroundColor = UIColor.systemRed.withAlphaComponent(0.9)
    finishButton.layer.cornerRadius = 12
    finishButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
    finishButton.addTarget(self, action: #selector(handleFinish), for: .touchUpInside)

    topOverlay.contentView.addSubview(titleLabel)
    topOverlay.contentView.addSubview(instructionLabel)
    topOverlay.contentView.addSubview(cancelButton)
    topOverlay.contentView.addSubview(finishButton)

    NSLayoutConstraint.activate([
      captureView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      captureView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      captureView.topAnchor.constraint(equalTo: view.topAnchor),
      captureView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

      topOverlay.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
      topOverlay.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
      topOverlay.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),

      titleLabel.leadingAnchor.constraint(equalTo: topOverlay.contentView.leadingAnchor, constant: 16),
      titleLabel.trailingAnchor.constraint(equalTo: topOverlay.contentView.trailingAnchor, constant: -16),
      titleLabel.topAnchor.constraint(equalTo: topOverlay.contentView.topAnchor, constant: 16),

      instructionLabel.leadingAnchor.constraint(equalTo: topOverlay.contentView.leadingAnchor, constant: 16),
      instructionLabel.trailingAnchor.constraint(equalTo: topOverlay.contentView.trailingAnchor, constant: -16),
      instructionLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),

      cancelButton.leadingAnchor.constraint(equalTo: topOverlay.contentView.leadingAnchor, constant: 16),
      cancelButton.topAnchor.constraint(equalTo: instructionLabel.bottomAnchor, constant: 16),
      cancelButton.bottomAnchor.constraint(equalTo: topOverlay.contentView.bottomAnchor, constant: -16),
      cancelButton.heightAnchor.constraint(equalToConstant: 48),

      finishButton.leadingAnchor.constraint(equalTo: cancelButton.trailingAnchor, constant: 12),
      finishButton.trailingAnchor.constraint(equalTo: topOverlay.contentView.trailingAnchor, constant: -16),
      finishButton.topAnchor.constraint(equalTo: cancelButton.topAnchor),
      finishButton.bottomAnchor.constraint(equalTo: cancelButton.bottomAnchor),
      finishButton.widthAnchor.constraint(equalTo: cancelButton.widthAnchor),
    ])
  }

  func updateInstruction(_ instruction: String) {
    instructionLabel.text = instruction
  }

  func setProcessingState(_ isProcessing: Bool) {
    finishButton.isEnabled = !isProcessing
    cancelButton.isEnabled = !isProcessing
    finishButton.alpha = isProcessing ? 0.7 : 1
    cancelButton.alpha = isProcessing ? 0.7 : 1
    instructionLabel.text = isProcessing
      ? "Processing captured room geometry."
      : instructionLabel.text
  }

  @objc
  private func handleCancel() {
    onCancel?()
  }

  @objc
  private func handleFinish() {
    onFinish?()
  }
}

@available(iOS 16.0, *)
@MainActor
private final class FireAlarmRoomPlanCaptureCoordinator: NSObject, @preconcurrency RoomCaptureSessionDelegate {
  private let isoFormatter: ISO8601DateFormatter
  private let session: FireAlarmRoomPlanNativeSession
  private let roomBuilder = RoomBuilder(options: [])
  private let onStatus: ([String: Any]) -> Void
  private let onProgress: ([String: Any]) -> Void
  private let onSession: ([String: Any]) -> Void
  private let onFinish: () -> Void

  private let captureViewController = FireAlarmRoomPlanCaptureViewController()
  private weak var presenter: UIViewController?
  private var isFinishing = false
  private var isCancelling = false
  private var latestInstruction: String?

  init(
    isoFormatter: ISO8601DateFormatter,
    session: FireAlarmRoomPlanNativeSession,
    onStatus: @escaping ([String: Any]) -> Void,
    onProgress: @escaping ([String: Any]) -> Void,
    onSession: @escaping ([String: Any]) -> Void,
    onFinish: @escaping () -> Void
  ) {
    self.isoFormatter = isoFormatter
    self.session = session
    self.onStatus = onStatus
    self.onProgress = onProgress
    self.onSession = onSession
    self.onFinish = onFinish
    super.init()
  }

  func present(from presenter: UIViewController) {
    self.presenter = presenter

    captureViewController.captureView.captureSession.delegate = self
    captureViewController.onCancel = { [weak self] in
      self?.cancelCapture()
    }
    captureViewController.onFinish = { [weak self] in
      self?.finishCapture()
    }

    presenter.present(captureViewController, animated: true) {
      var configuration = RoomCaptureSession.Configuration()
      configuration.isCoachingEnabled = true
      self.session.status = .starting
      self.session.lifecycleNotes.append("RoomPlan capture UI presented.")
      self.onStatus(self.session.statusPayload(formatter: self.isoFormatter, phase: "preparing", progress: 0.02, message: "Starting RoomPlan capture."))
      self.captureViewController.captureView.captureSession.run(configuration: configuration)
    }
  }

  func finishCapture() {
    guard !isFinishing else { return }
    isFinishing = true
    session.status = .processing
    session.lifecycleNotes.append("Capture finished by operator.")
    captureViewController.setProcessingState(true)
    onStatus(session.statusPayload(formatter: isoFormatter, phase: "processing", progress: 0.92, message: "Finishing capture and building room geometry."))
    onProgress(progressPayload(progress: 0.92, phase: "processing", message: "Finalizing room capture."))
    captureViewController.captureView.captureSession.stop()
  }

  func cancelCapture() {
    guard !isCancelling && !isFinishing else { return }
    isCancelling = true
    session.lifecycleNotes.append("Capture cancelled by operator.")
    captureViewController.captureView.captureSession.stop()
  }

  func captureSession(_ session: RoomCaptureSession, didStartWith configuration: RoomCaptureSession.Configuration) {
    self.session.status = .scanning
    self.session.startedAt = self.session.startedAt ?? Date()
    self.session.lifecycleNotes.append("RoomCaptureSession started.")
    onStatus(self.session.statusPayload(formatter: isoFormatter, phase: "capturing", progress: 0.05, message: "Move around the room and scan all walls."))
    onProgress(progressPayload(progress: 0.05, phase: "capturing", message: "Capture started."))
    onSession([
      "session": self.session.payload(formatter: isoFormatter),
      "timestamp": isoFormatter.string(from: Date()),
    ])
  }

  func captureSession(_ session: RoomCaptureSession, didProvide instruction: RoomCaptureSession.Instruction) {
    latestInstruction = instructionText(for: instruction)
    captureViewController.updateInstruction(latestInstruction ?? "Move slowly and keep the full room in view.")
    onProgress(progressPayload(progress: estimatedLiveProgress(), phase: "capturing", message: latestInstruction))
  }

  func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {
    updateLiveRoom(room)
  }

  func captureSession(_ session: RoomCaptureSession, didAdd room: CapturedRoom) {
    updateLiveRoom(room)
  }

  func captureSession(_ session: RoomCaptureSession, didChange room: CapturedRoom) {
    updateLiveRoom(room)
  }

  func captureSession(_ session: RoomCaptureSession, didRemove room: CapturedRoom) {
    self.session.lifecycleNotes.append("RoomPlan reported a room removal event.")
  }

  func captureSession(_ session: RoomCaptureSession, didEndWith data: CapturedRoomData, error: Error?) {
    if let error {
      if isCancelling {
        finishAsStopped(reason: "Capture cancelled before processing completed.")
        return
      }

      finishAsError(error)
      return
    }

    if isCancelling {
      finishAsStopped(reason: "Capture cancelled by operator.")
      return
    }

    Task { @MainActor in
      do {
        let capturedRoom = try await roomBuilder.capturedRoom(from: data)
        self.session.latestCapturedRoom = capturedRoom
        self.session.updateMetrics(from: capturedRoom)
        self.session.rawArtifacts = self.persistArtifacts(for: capturedRoom, roomData: data)
        self.session.status = .completed
        self.session.endedAt = Date()
        self.session.lifecycleNotes.append("Room geometry processing completed.")

        self.onProgress(self.progressPayload(progress: 1, phase: "completed", message: "Room capture complete."))
        self.onStatus(self.session.statusPayload(formatter: self.isoFormatter, phase: "completed", progress: 1, message: "Room capture complete."))
        self.onSession([
          "session": self.session.payload(formatter: self.isoFormatter),
          "timestamp": self.isoFormatter.string(from: Date()),
        ])

        self.dismissCaptureUI()
      } catch {
        self.finishAsError(error)
      }
    }
  }

  private func updateLiveRoom(_ room: CapturedRoom) {
    session.latestCapturedRoom = room
    session.updateMetrics(from: room)
    session.metrics.frameCount += 1
    let progress = estimatedLiveProgress()
    let message = latestInstruction ?? "Keep scanning until all walls and openings are captured."

    onProgress(progressPayload(progress: progress, phase: "capturing", message: message))
  }

  private func finishAsStopped(reason: String) {
    session.status = .stopped
    session.endedAt = Date()
    session.lifecycleNotes.append(reason)
    onStatus(session.statusPayload(formatter: isoFormatter, phase: "stopped", progress: nil, message: reason))
    onSession([
      "session": session.payload(formatter: isoFormatter),
      "timestamp": isoFormatter.string(from: Date()),
    ])
    dismissCaptureUI()
  }

  private func finishAsError(_ error: Error) {
    session.status = .error
    session.endedAt = Date()
    session.errorCode = "roomplan_capture_failed"
    session.errorMessage = error.localizedDescription
    session.lifecycleNotes.append("Room capture failed: \(error.localizedDescription)")
    onStatus(session.statusPayload(formatter: isoFormatter, phase: "failed", progress: nil, message: error.localizedDescription))
    onSession([
      "session": session.payload(formatter: isoFormatter),
      "timestamp": isoFormatter.string(from: Date()),
    ])
    dismissCaptureUI()
  }

  private func dismissCaptureUI() {
    let presenter = presenter
    let completion = {
      self.onFinish()
    }

    if captureViewController.presentingViewController != nil {
      captureViewController.dismiss(animated: true, completion: completion)
    } else if presenter?.presentedViewController === captureViewController {
      presenter?.dismiss(animated: true, completion: completion)
    } else {
      completion()
    }
  }

  private func estimatedLiveProgress() -> Double {
    let wallFactor = min(Double(session.metrics.wallCount) / 6.0, 0.45)
    let openingFactor = min(Double(session.metrics.openingCount) / 4.0, 0.15)
    let frameFactor = min(Double(session.metrics.frameCount) / 120.0, 0.25)
    return min(0.1 + wallFactor + openingFactor + frameFactor, 0.88)
  }

  private func progressPayload(progress: Double, phase: String, message: String?) -> [String: Any] {
    [
      "sessionId": session.id,
      "timestamp": isoFormatter.string(from: Date()),
      "status": session.status.rawValue,
      "phase": phase,
      "progress": progress,
      "framesCaptured": session.metrics.frameCount,
      "roomsDetected": session.metrics.roomCount,
      "surfacesDetected": session.metrics.wallCount + session.metrics.openingCount,
      "detectedDeviceCount": 0,
      "message": message ?? NSNull(),
      "metadata": [
        "instruction": boxed(latestInstruction),
      ],
    ]
  }

  private func persistArtifacts(for room: CapturedRoom, roomData: CapturedRoomData) -> [String: Any] {
    let fileManager = FileManager.default
    let baseDirectory = fileManager.temporaryDirectory
      .appendingPathComponent("FireAlarmRoomPlan", isDirectory: true)
      .appendingPathComponent(session.id, isDirectory: true)

    do {
      try fileManager.createDirectory(at: baseDirectory, withIntermediateDirectories: true)
    } catch {
      session.lifecycleNotes.append("Unable to create artifact directory: \(error.localizedDescription)")
      return [:]
    }

    var artifacts: [String: Any] = [:]
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

    let roomDataURL = baseDirectory.appendingPathComponent("captured-room-data.json")
    if let encodedRoomData = try? encoder.encode(roomData) {
      try? encodedRoomData.write(to: roomDataURL)
      artifacts["capturedRoomDataURL"] = roomDataURL.absoluteString
    }

    let roomJSONURL = baseDirectory.appendingPathComponent("captured-room.json")
    if let encodedRoom = try? encoder.encode(room) {
      try? encodedRoom.write(to: roomJSONURL)
      artifacts["capturedRoomJSONURL"] = roomJSONURL.absoluteString
    }

    let roomUSDZURL = baseDirectory.appendingPathComponent("captured-room.usdz")
    do {
      try room.export(to: roomUSDZURL, exportOptions: .mesh)
      artifacts["capturedRoomUSDZURL"] = roomUSDZURL.absoluteString
    } catch {
      session.lifecycleNotes.append("Unable to export USDZ artifact: \(error.localizedDescription)")
    }

    return artifacts
  }
}
#endif

private final class FireAlarmRoomPlanNativeSession {
  let id: String
  let createdAt: Date
  let options: [String: Any]
  let support: FireAlarmRoomPlanSupportSnapshot

  var startedAt: Date?
  var endedAt: Date?
  var status: FireAlarmRoomPlanLifecycleStatus
  var latestCapturedRoom: CapturedRoom?
  var metrics = FireAlarmRoomPlanCaptureMetrics()
  var lifecycleNotes: [String] = []
  var rawArtifacts: [String: Any] = [:]
  var exportHistory: [[String: Any]] = []
  var errorCode: String?
  var errorMessage: String?

  init(
    id: String,
    createdAt: Date,
    status: FireAlarmRoomPlanLifecycleStatus,
    options: [String: Any],
    support: FireAlarmRoomPlanSupportSnapshot
  ) {
    self.id = id
    self.createdAt = createdAt
    self.status = status
    self.options = options
    self.support = support
  }

  func updateMetrics(from room: CapturedRoom) {
    metrics.wallCount = room.walls.count
    metrics.roomCount = 1
    metrics.openingCount = room.doors.count + room.windows.count + room.openings.count
    metrics.objectCount = room.objects.count
  }

  func payload(formatter: ISO8601DateFormatter) -> [String: Any] {
    let normalizedFloorplan = latestCapturedRoom.map { normalizeFloorplan(from: $0, sessionName: (options["roomName"] as? String)) } ?? emptyFloorplanPayload(sessionName: options["roomName"] as? String)
    let rawPayload = buildRawPayload(session: self)

    var payload: [String: Any] = [
      "id": id,
      "status": status.rawValue,
      "metadata": [
        "startedAt": startedAt.map { formatter.string(from: $0) } ?? formatter.string(from: createdAt),
        "endedAt": boxed(endedAt.map { formatter.string(from: $0) }),
        "durationMs": boxed(durationMs()),
        "platform": "ios",
        "deviceModel": deviceModelIdentifier(),
        "osVersion": ProcessInfo.processInfo.operatingSystemVersionString,
        "scannerVersion": "native-roomplan-v1",
        "sessionName": ((options["roomName"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? options["roomName"] : "Room capture") ?? "Room capture",
        "captureState": capturePhase(),
        "framesCaptured": metrics.frameCount,
        "roomsDetected": metrics.roomCount,
        "surfacesDetected": metrics.wallCount + metrics.openingCount,
        "permissionState": permissionStateString(),
        "supportFlags": [
          "supportsRoomCapture": support.isSupported,
          "supportsDevicePoseTracking": support.isSupported,
          "supportsLiveProgressEvents": true,
          "supportsDetectionEvents": false,
          "supportsSessionExport": true,
        ],
        "metadata": [
          "support": support.payload(),
          "metrics": metrics.payload(),
          "lifecycleNotes": lifecycleNotes,
        ],
      ],
      "devices": [],
      "floorplan": normalizedFloorplan,
      "rawPayload": rawPayload,
    ]

    if let errorCode, let errorMessage {
      payload["error"] = [
        "code": errorCode,
        "message": errorMessage,
        "details": [
          "support": support.payload(),
        ],
      ]
    }

    return payload
  }

  func statusPayload(
    formatter: ISO8601DateFormatter,
    phase: String?,
    progress: Double?,
    message: String?
  ) -> [String: Any] {
    var payload: [String: Any] = [
      "status": status.rawValue,
      "sessionId": id,
      "timestamp": formatter.string(from: Date()),
      "phase": phase ?? NSNull(),
      "progress": boxed(progress),
      "message": message ?? NSNull(),
      "metadata": [
        "metrics": metrics.payload(),
      ],
    ]

    if let errorCode, let errorMessage {
      payload["error"] = [
        "code": errorCode,
        "message": errorMessage,
      ]
    } else {
      payload["error"] = NSNull()
    }

    return payload
  }

  private func capturePhase() -> String {
    switch status {
    case .idle:
      return "idle"
    case .starting:
      return "preparing"
    case .scanning:
      return "capturing"
    case .processing:
      return "processing"
    case .completed:
      return "completed"
    case .stopped:
      return "stopped"
    case .error:
      return "failed"
    }
  }

  private func permissionStateString() -> String {
    switch support.hasCameraPermission {
    case true:
      return "granted"
    case false:
      return "denied"
    case nil:
      return "not-determined"
    }
  }

  private func durationMs() -> Int? {
    guard let startedAt else { return nil }
    let end = endedAt ?? Date()
    return Int(end.timeIntervalSince(startedAt) * 1000)
  }
}

private final class FireAlarmRoomPlanSessionStore {
  static let shared = FireAlarmRoomPlanSessionStore()

  private var sessions: [String: FireAlarmRoomPlanNativeSession] = [:]

  private init() {}

  fileprivate func save(_ session: FireAlarmRoomPlanNativeSession) {
    sessions[session.id] = session
  }

  fileprivate func session(for id: String) -> FireAlarmRoomPlanNativeSession? {
    sessions[id]
  }
}

private func buildRawPayload(session: FireAlarmRoomPlanNativeSession) -> [String: Any] {
  var roomPlanObjects: [[String: Any]] = []

  if let latestCapturedRoom = session.latestCapturedRoom {
    roomPlanObjects = latestCapturedRoom.objects.map { object in
      [
        "id": object.identifier.uuidString,
        "category": String(describing: object.category),
        "confidence": confidenceScore(object.confidence),
        "dimensions": vectorPayload(object.dimensions),
        "transform": matrixPayload(object.transform),
      ]
    }
  }

  return [
    "source": "native-roomplan",
    "roomPlanAvailable": session.support.roomPlanAvailable,
    "roomCaptureSessionSupported": session.support.roomCaptureSessionSupported,
    "supportsLiveProgressEvents": true,
    "deviceRecognition": [
      "enabled": false,
      "manufacturerRecognitionEnabled": false,
      "status": "not-started",
      "note": "Room geometry capture is complete. Fire alarm device recognition remains a separate milestone.",
    ],
    "artifacts": session.rawArtifacts,
    "roomPlanObjects": roomPlanObjects,
    "exportHistory": session.exportHistory,
    "options": session.options,
  ]
}

private func emptyFloorplanPayload(sessionName: String?) -> [String: Any] {
  [
    "units": "meters",
    "rooms": [[
      "id": UUID().uuidString,
      "name": ((sessionName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) ? sessionName! : "Captured room"),
      "level": 0,
      "areaSquareMeters": NSNull(),
      "perimeterMeters": NSNull(),
      "outline": [],
      "wallSegments": [],
      "openings": [],
      "devices": [],
    ]],
    "deviceCount": 0,
    "wallCount": 0,
  ]
}

@available(iOS 16.0, *)
private func normalizeFloorplan(from room: CapturedRoom, sessionName: String?) -> [String: Any] {
  let wallSegments = room.walls.map(normalizeWallSegment)
  let uniqueOutline = sortPlanPoints(Array(Set(wallSegments.flatMap { [$0.start, $0.end] })))
  let metrics = polygonMetrics(points: uniqueOutline)

  let openings = (room.doors + room.windows + room.openings).map(normalizeOpening)

  return [
    "units": "meters",
    "rooms": [[
      "id": room.identifier.uuidString,
      "name": ((sessionName?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false) ? sessionName! : "Captured room"),
      "level": 0,
      "areaSquareMeters": boxed(metrics.area),
      "perimeterMeters": boxed(metrics.perimeter),
      "outline": uniqueOutline.map { $0.payload() },
      "wallSegments": wallSegments.map { $0.payload() },
      "openings": openings,
      "devices": [],
    ]],
    "deviceCount": 0,
    "wallCount": wallSegments.count,
  ]
}

private struct FireAlarmPlanPoint: Hashable {
  let x: Double
  let y: Double
  let z: Double?

  init(x: Double, y: Double, z: Double? = nil) {
    self.x = rounded(x)
    self.y = rounded(y)
    self.z = z.map(rounded)
  }

  func payload() -> [String: Any] {
    var payload: [String: Any] = [
      "x": x,
      "y": y,
    ]

    payload["z"] = boxed(z)
    return payload
  }
}

private struct FireAlarmWallSegmentPayload {
  let id: String
  let start: FireAlarmPlanPoint
  let end: FireAlarmPlanPoint
  let height: Double?
  let length: Double?

  func payload() -> [String: Any] {
    [
      "id": id,
      "start": start.payload(),
      "end": end.payload(),
      "height": boxed(height),
      "length": boxed(length),
    ]
  }
}

@available(iOS 16.0, *)
private func normalizeWallSegment(_ surface: CapturedRoom.Surface) -> FireAlarmWallSegmentPayload {
  let endpoints = wallEndpoints(for: surface)
  return FireAlarmWallSegmentPayload(
    id: surface.identifier.uuidString,
    start: endpoints.start,
    end: endpoints.end,
    height: rounded(Double(surface.dimensions.y)),
    length: rounded(Double(max(surface.dimensions.x, surface.dimensions.z))),
  )
}

@available(iOS 16.0, *)
private func normalizeOpening(_ surface: CapturedRoom.Surface) -> [String: Any] {
  let translation = translationVector(surface.transform)
  return [
    "id": surface.identifier.uuidString,
    "kind": surfaceKind(surface.category),
    "position": planPoint(from: translation).payload(),
    "width": rounded(Double(max(surface.dimensions.x, surface.dimensions.z))),
    "height": rounded(Double(surface.dimensions.y)),
  ]
}

@available(iOS 16.0, *)
private func wallEndpoints(for surface: CapturedRoom.Surface) -> (start: FireAlarmPlanPoint, end: FireAlarmPlanPoint) {
  let center = translationVector(surface.transform)
  let rightAxis = normalize(SIMD3<Float>(surface.transform.columns.0.x, surface.transform.columns.0.y, surface.transform.columns.0.z))
  let halfLength = max(surface.dimensions.x, surface.dimensions.z) / 2
  let start = center - rightAxis * halfLength
  let end = center + rightAxis * halfLength
  return (planPoint(from: start), planPoint(from: end))
}

private func translationVector(_ transform: simd_float4x4) -> SIMD3<Float> {
  SIMD3<Float>(transform.columns.3.x, transform.columns.3.y, transform.columns.3.z)
}

private func vectorPayload(_ vector: SIMD3<Float>) -> [String: Any] {
  [
    "x": rounded(Double(vector.x)),
    "y": rounded(Double(vector.y)),
    "z": rounded(Double(vector.z)),
  ]
}

private func matrixPayload(_ matrix: simd_float4x4) -> [[Double]] {
  [
    [rounded(Double(matrix.columns.0.x)), rounded(Double(matrix.columns.0.y)), rounded(Double(matrix.columns.0.z)), rounded(Double(matrix.columns.0.w))],
    [rounded(Double(matrix.columns.1.x)), rounded(Double(matrix.columns.1.y)), rounded(Double(matrix.columns.1.z)), rounded(Double(matrix.columns.1.w))],
    [rounded(Double(matrix.columns.2.x)), rounded(Double(matrix.columns.2.y)), rounded(Double(matrix.columns.2.z)), rounded(Double(matrix.columns.2.w))],
    [rounded(Double(matrix.columns.3.x)), rounded(Double(matrix.columns.3.y)), rounded(Double(matrix.columns.3.z)), rounded(Double(matrix.columns.3.w))],
  ]
}

private func planPoint(from vector: SIMD3<Float>) -> FireAlarmPlanPoint {
  FireAlarmPlanPoint(
    x: Double(vector.x),
    y: Double(vector.z),
    z: Double(vector.y)
  )
}

private func sortPlanPoints(_ points: [FireAlarmPlanPoint]) -> [FireAlarmPlanPoint] {
  guard points.count > 2 else { return points }

  let centerX = points.reduce(0.0) { $0 + $1.x } / Double(points.count)
  let centerY = points.reduce(0.0) { $0 + $1.y } / Double(points.count)

  return points.sorted { left, right in
    atan2(left.y - centerY, left.x - centerX) < atan2(right.y - centerY, right.x - centerX)
  }
}

private func polygonMetrics(points: [FireAlarmPlanPoint]) -> (area: Double?, perimeter: Double?) {
  guard points.count >= 3 else {
    return (nil, nil)
  }

  var area = 0.0
  var perimeter = 0.0

  for index in points.indices {
    let current = points[index]
    let next = points[(index + 1) % points.count]
    area += (current.x * next.y) - (next.x * current.y)
    perimeter += hypot(next.x - current.x, next.y - current.y)
  }

  return (rounded(abs(area) / 2.0), rounded(perimeter))
}

private func surfaceKind(_ category: CapturedRoom.Surface.Category) -> String {
  switch category {
  case .door:
    return "door"
  case .window:
    return "window"
  case .opening:
    return "opening"
  case .wall:
    return "wall"
  case .floor:
    return "floor"
  @unknown default:
    return "unknown"
  }
}

@available(iOS 16.0, *)
private func confidenceScore(_ confidence: CapturedRoom.Confidence) -> Double {
  switch confidence {
  case .high:
    return 0.9
  case .medium:
    return 0.65
  case .low:
    return 0.35
  @unknown default:
    return 0.5
  }
}

@available(iOS 16.0, *)
private func instructionText(for instruction: RoomCaptureSession.Instruction) -> String {
  switch instruction {
  case .moveCloseToWall:
    return "Move closer to the wall so RoomPlan can resolve the room edges."
  case .moveAwayFromWall:
    return "Step back slightly to keep more of the room in view."
  case .slowDown:
    return "Slow down and keep the phone steady."
  case .turnOnLight:
    return "Increase the lighting so RoomPlan can track the room."
  case .lowTexture:
    return "Aim at more textured surfaces and keep scanning the room."
  case .normal:
    return "Keep scanning slowly until all walls and openings are captured."
  @unknown default:
    return "Continue scanning the room."
  }
}

private func permissionState(from authorizationStatus: AVAuthorizationStatus) -> Bool? {
  switch authorizationStatus {
  case .authorized:
    return true
  case .denied, .restricted:
    return false
  case .notDetermined:
    return nil
  @unknown default:
    return nil
  }
}

private func rounded(_ value: Double) -> Double {
  (value * 1000).rounded() / 1000
}

private func boxed(_ value: Any?) -> Any {
  value ?? NSNull()
}

private func deviceModelIdentifier() -> String {
  var systemInfo = utsname()
  uname(&systemInfo)
  let mirror = Mirror(reflecting: systemInfo.machine)
  return mirror.children.reduce(into: "") { identifier, element in
    guard let value = element.value as? Int8, value != 0 else { return }
    identifier.append(String(UnicodeScalar(UInt8(value))))
  }
}

private func topViewController(from rootViewController: UIViewController?) -> UIViewController? {
  if let navigationController = rootViewController as? UINavigationController {
    return topViewController(from: navigationController.visibleViewController)
  }

  if let tabBarController = rootViewController as? UITabBarController {
    return topViewController(from: tabBarController.selectedViewController)
  }

  if let presentedViewController = rootViewController?.presentedViewController {
    return topViewController(from: presentedViewController)
  }

  return rootViewController
}

public final class FireAlarmRoomPlanModule: Module {
  private let isoFormatter = ISO8601DateFormatter()
  private var activeSessionId: String?

#if canImport(RoomPlan) && canImport(UIKit)
  @available(iOS 16.0, *)
  @MainActor
  private var activeCoordinator: FireAlarmRoomPlanCaptureCoordinator?
#endif

  public func definition() -> ModuleDefinition {
    Name("FireAlarmRoomPlan")

    Events(
      FireAlarmRoomPlanEventName.status,
      FireAlarmRoomPlanEventName.progress,
      FireAlarmRoomPlanEventName.detection,
      FireAlarmRoomPlanEventName.session
    )

    Constants([
      "minimumIOSVersion": "16.0",
      "supportsRoomPlanOnDeviceOnly": true,
    ])

    AsyncFunction("isSupported") { () -> [String: Any] in
      self.supportSnapshot().payload()
    }

    AsyncFunction("startScan") { (options: [String: Any]?) async throws -> [String: Any] in
      let sanitizedOptions = self.sanitizedOptions(options)
      let cameraPermission = try await self.ensureCameraPermission()
      let support = self.supportSnapshot(hasCameraPermissionOverride: cameraPermission)

      guard support.isSupported else {
        throw NSError(domain: "FireAlarmRoomPlan", code: 1001, userInfo: [
          NSLocalizedDescriptionKey: support.reason ?? "RoomPlan scanning is not supported on this device.",
        ])
      }

#if canImport(RoomPlan) && canImport(UIKit)
      if #available(iOS 16.0, *) {
        return try await MainActor.run {
          try self.startNativeCapture(options: sanitizedOptions, support: support)
        }
      }
#endif

      throw NSError(domain: "FireAlarmRoomPlan", code: 1002, userInfo: [
        NSLocalizedDescriptionKey: "RoomPlan is unavailable in this build.",
      ])
    }

    AsyncFunction("stopScan") { () async -> Void in
#if canImport(RoomPlan) && canImport(UIKit)
      if #available(iOS 16.0, *) {
        await MainActor.run {
          self.activeCoordinator?.finishCapture()
        }
      }
#endif
    }

    AsyncFunction("exportSession") { (sessionPayload: [String: Any]) -> [String: Any] in
      let sessionId = (sessionPayload["id"] as? String) ?? self.activeSessionId ?? UUID().uuidString
      let exportedAt = Date()

      if let existing = FireAlarmRoomPlanSessionStore.shared.session(for: sessionId) {
        existing.exportHistory.append([
          "exportedAt": self.isoFormatter.string(from: exportedAt),
          "format": "json",
          "transport": "bridge",
        ])
      }

      return [
        "sessionId": sessionId,
        "format": "json",
        "exportedAt": self.isoFormatter.string(from: exportedAt),
        "data": sessionPayload,
      ]
    }
  }

  private func supportSnapshot(hasCameraPermissionOverride: Bool? = nil) -> FireAlarmRoomPlanSupportSnapshot {
    let systemVersion = ProcessInfo.processInfo.operatingSystemVersion
    let meetsVersionRequirement = systemVersion.majorVersion >= 16
    let permissionStatus = AVCaptureDevice.authorizationStatus(for: .video)
    let hasCameraPermission = hasCameraPermissionOverride ?? permissionState(from: permissionStatus)

#if targetEnvironment(simulator)
    let isSimulator = true
#else
    let isSimulator = false
#endif

#if canImport(RoomPlan)
    let roomPlanAvailable = true
    if #available(iOS 16.0, *) {
      let roomCaptureSessionSupported = RoomCaptureSession.isSupported
      let supported = meetsVersionRequirement && !isSimulator && roomPlanAvailable && roomCaptureSessionSupported && hasCameraPermission != false

      let reason: String?
      if !meetsVersionRequirement {
        reason = "RoomPlan requires iOS 16.0 or later."
      } else if isSimulator {
        reason = "RoomPlan requires a physical iOS device."
      } else if !roomCaptureSessionSupported {
        reason = "This iPhone does not support RoomPlan capture."
      } else if hasCameraPermission == false {
        reason = "Camera permission is denied for this app."
      } else {
        reason = nil
      }

      return FireAlarmRoomPlanSupportSnapshot(
        isSupported: supported,
        platform: "ios",
        minimumIOSVersion: "16.0",
        requiresPhysicalDevice: true,
        hasCameraPermission: hasCameraPermission,
        roomPlanAvailable: roomPlanAvailable,
        roomCaptureSessionSupported: roomCaptureSessionSupported,
        reason: reason
      )
    }
#else
    let roomPlanAvailable = false
#endif

    let reason: String
    if !meetsVersionRequirement {
      reason = "RoomPlan requires iOS 16.0 or later."
    } else if isSimulator {
      reason = "RoomPlan requires a physical iOS device."
    } else if hasCameraPermission == false {
      reason = "Camera permission is denied for this app."
    } else {
      reason = "RoomPlan framework is unavailable in this build."
    }

    return FireAlarmRoomPlanSupportSnapshot(
      isSupported: false,
      platform: "ios",
      minimumIOSVersion: "16.0",
      requiresPhysicalDevice: true,
      hasCameraPermission: hasCameraPermission,
      roomPlanAvailable: roomPlanAvailable,
      roomCaptureSessionSupported: false,
      reason: reason
    )
  }

  private func sanitizedOptions(_ options: [String: Any]?) -> [String: Any] {
    var payload = options ?? [:]
    payload["preferredUnits"] = (options?["preferredUnits"] as? String) ?? "meters"
    payload["detectDevices"] = (options?["detectDevices"] as? Bool) ?? false
    payload["detectManufacturers"] = (options?["detectManufacturers"] as? Bool) ?? false
    return payload
  }

  private func ensureCameraPermission() async throws -> Bool? {
    let currentStatus = AVCaptureDevice.authorizationStatus(for: .video)

    switch currentStatus {
    case .authorized:
      return true
    case .denied, .restricted:
      return false
    case .notDetermined:
      return try await withCheckedThrowingContinuation { continuation in
        AVCaptureDevice.requestAccess(for: .video) { granted in
          continuation.resume(returning: granted)
        }
      }
    @unknown default:
      return nil
    }
  }

#if canImport(RoomPlan) && canImport(UIKit)
  @available(iOS 16.0, *)
  @MainActor
  private func startNativeCapture(options: [String: Any], support: FireAlarmRoomPlanSupportSnapshot) throws -> [String: Any] {
    guard activeCoordinator == nil else {
      throw NSError(domain: "FireAlarmRoomPlan", code: 1003, userInfo: [
        NSLocalizedDescriptionKey: "A RoomPlan capture session is already active.",
      ])
    }

    let rootViewController = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first(where: \.isKeyWindow)?
      .rootViewController

    guard let presenter = topViewController(from: rootViewController) else {
      throw NSError(domain: "FireAlarmRoomPlan", code: 1004, userInfo: [
        NSLocalizedDescriptionKey: "Unable to locate a presenter for RoomPlan capture.",
      ])
    }

    let sessionId = UUID().uuidString
    let session = FireAlarmRoomPlanNativeSession(
      id: sessionId,
      createdAt: Date(),
      status: .starting,
      options: options,
      support: support
    )
    session.startedAt = Date()
    session.lifecycleNotes.append("Native RoomPlan capture session created.")
    FireAlarmRoomPlanSessionStore.shared.save(session)

    let coordinator = FireAlarmRoomPlanCaptureCoordinator(
      isoFormatter: isoFormatter,
      session: session,
      onStatus: { [weak self] payload in
        self?.sendEvent(FireAlarmRoomPlanEventName.status, payload)
      },
      onProgress: { [weak self] payload in
        self?.sendEvent(FireAlarmRoomPlanEventName.progress, payload)
      },
      onSession: { [weak self] payload in
        FireAlarmRoomPlanSessionStore.shared.save(session)
        self?.sendEvent(FireAlarmRoomPlanEventName.session, payload)
      },
      onFinish: { [weak self] in
        self?.activeSessionId = nil
        if #available(iOS 16.0, *) {
          self?.activeCoordinator = nil
        }
      }
    )

    activeCoordinator = coordinator
    activeSessionId = sessionId
    coordinator.present(from: presenter)

    return session.payload(formatter: isoFormatter)
  }
#endif
}
